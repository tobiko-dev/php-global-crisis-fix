# Version 1 implementation contract

Product: **PHP Response Desk**. A local-only, operator-assisted agency workflow for PHP patch evidence and customer handover. Node.js 20+; zero runtime dependencies. Browser UI and CLI share ES modules. Python 3.9+ collector uses only standard library. No external network calls, scanners, automatic patching, or stored credentials.

## Fleet JSON

```json
{
  "schemaVersion": 1,
  "organization": "Example Agency",
  "demo": false,
  "assets": [{
    "id": "site-001",
    "client": "Example Customer",
    "name": "Customer website",
    "environment": "production",
    "provider": "Self-managed VPS",
    "owner": "Operations",
    "phpVersion": "8.4.27",
    "distribution": "upstream",
    "observation": "web-runtime",
    "observedAt": "2026-10-22T02:00:00Z",
    "evidenceUrl": "https://example.com/internal-ticket",
    "evidenceNote": "Reviewer recorded the active web runtime after updating all relevant workers.",
    "reviewer": "Example operator",
    "restartConfirmedAt": "2026-10-22T01:55:00Z",
    "smokeTestAt": "2026-10-22T02:05:00Z",
    "providerConfirmation": {
      "coversBothCves": false,
      "confirmedAt": "",
      "reference": "",
      "reviewer": ""
    }
  }]
}
```

All fields except schemaVersion, organization, assets, id, client and name can normalize to documented defaults. Strings only for text fields. No coercion of object/boolean into text. No duplicate asset IDs. Maximum 1,000 assets, 5 MiB JSON. Unknown fields should be rejected or stripped, never used as properties/prototypes. UI can display errors without losing previously stored data.

Enumerations:

- environment: production, staging, development
- distribution: upstream, vendor, unknown
- observation: web-runtime, installed-package, cli, unknown

Optional text fields accept empty strings. ISO timestamps must be real timezone-qualified dates to count as evidence; invalid, stale, and future dates never establish completion. Dates in data are observations, not proof of trust.

## Public JavaScript API (src/core.mjs)

- `normalizeFleet(input)` returns validated/normalized fleet, throws descriptive Error for invalid shape/types. Does not mutate input.
- `assessAsset(asset, options = {})` returns `{status, label, reasons: string[], nextActions: string[], fixedVersion: string|null, evidenceAgeHours: number|null}`. options.now accepts Date/string; options.catalog can override imported catalog for tests.
- `assessFleet(fleet, options = {})` returns `{schemaVersion: 1, organization, demo, generatedAt, catalogReviewedAt, catalogExpiresAt, catalogFresh, assets: [{...asset, assessment}], summary: {total, actionRequired, verificationNeeded, evidenceComplete, providerConfirmed}}`.
- `makeDemoFleet(now = new Date())` returns 8 fictional assets covering all four outcomes and meaningful edge cases. Clearly sets demo:true. No real clients or private details.
- `fleetToCsv(fleet, options = {})` produces spreadsheet-safe RFC4180 CSV. It recomputes assessments using the current clock, or the explicit trusted `options.now` supplied by a caller.
- `renderReport(fleet, options = {})` produces a self-contained printable HTML report. `options.client` filters an exact client; never render other-client data into that output. It recomputes assessments using the current clock, or explicit `options.now`. Imported `generatedAt`, statuses, and summaries never control the assessment. No external resources or executable imported content.

Status identifiers: `action-required`, `verification-needed`, `evidence-complete`, `provider-confirmed`.

The advisory catalog (src/catalog.mjs) exports `CATALOG`: id, reviewedAt, expiresAt, maxEvidenceAgeHours (72), cves (the two strings), fixedVersions mapping (`8.2`: `8.2.35`, `8.3`: `8.3.36`, `8.4`: `8.4.27`, `8.5`: `8.5.12`), sources array of `{title,url}`. Reviewed 2026-10-21; expires 2026-10-28T23:59:59Z. Expired/future catalog does not establish positive status. Catalog only covers these two CVEs.

Conservative rules:

- An exact stable upstream version observed in the web runtime below the known branch minimum => action-required. Legacy upstream 5.x/7.x/8.0/8.1 web-runtime observations also require action. CLI and installed-package observations remain verification-needed. This is an update decision, never evidence of compromise. Recognized unfavorable upstream web-runtime evidence takes precedence over a provider confirmation.
- Vendor/custom/suffixed versions, unknown/future branches, CLI-only or installed-package observations => verification-needed unless a valid specific provider confirmation supports provider-confirmed. Merely a modern version or old banner does not settle vendor backports.
- evidence-complete requires fresh catalog; exact fixed-or-later stable upstream version in a known branch; fresh web-runtime observation; named reviewer; meaningful evidence note or reference; restart confirmation for all relevant workers; a subsequent smoke check; consistent non-future chronology (restart <= observedAt <= smokeTestAt). Label explicitly means recorded evidence complete, not independently verified security or absence of compromise.
- provider-confirmed requires a fresh catalog and provider-confirmation timestamp; explicit coversBothCves true; a specific reference of at least 8 characters and a named reviewer. Label remains distinct from evidence-complete. It is an operator-recorded provider assertion. A lower-version web observation after the assertion requires renewed backport clarification, including vendor-suffixed builds. Future branches and prerelease builds cannot be closed by this catalog.
- Missing, stale (over 72h), invalid or future evidence never turns green. Empty fleet remains explicitly empty.

Report exports must HTML-escape every imported value; only http(s) reference links (no credentials) are linkable. CSV protects formula-leading = + - @ including whitespace/control prefixes. Reports identify demo data, generated timestamp, catalog scope and freshness, evidence limitations, source URLs and unresolved actions. JSON remains the round-trip source of truth.

## Runtime layout

- public/index.html, public/styles.css, public/app.mjs: browser UI; import shared modules from /src/core.mjs.
- scripts/serve.mjs: serve static allowlisted paths on 127.0.0.1:4380 only, reject traversal and non-GET/HEAD; no API for remote access or shell execution.
- bin/php-response.mjs: `demo --format html|json|csv [--out path]`; `assess FILE --format ... [--out path] [--client name] [--fail-on-open]`. JSON output is an assessed report; imported inventory JSON keeps fleet shape. Exit 0 success; 1 input/usage errors; 2 unresolved assets or an empty inventory with --fail-on-open. Output files must be new paths.
- collectors/collect.py: run by the operator on their own server; records local CLI observations only and creates fleet JSON. Never marks web runtime/restarts/checks verified.

