# Validation record

## Hypothesis experiments and illustrated use — October 21, 2026 America/Chicago

This follow-up phase tested product assumptions with fictional inventories and researched business assumptions through public primary sources. UTC timestamps in the raw execution records fall on October 22. No customer participated and no real deployment was changed.

| Exercise | Observed result | Evidence |
| --- | --- | --- |
| Six engine/export hypotheses | **15 checks passed.** Staged operator evidence, exact-customer HTML/CSV isolation, evidence/catalog expiry, and API/CLI input boundaries matched their declared criteria. | [Protocol and interpretation](EXPERIMENTS.md), [raw results](../examples/experiments/run-2026-10-22/results.json) |
| Engine/report capacity | **75 timed samples plus nine warmups.** At 1,000 records, assessment p95 was 50.569 ms; combined HTML/CSV export p95 was 226.857 ms. All samples, including the 815.463 ms export maximum, are retained. | [Measurements and workload](EXPERIMENTS.md#measured-scale) |
| Actual browser capacity | **Nine trials passed**, three each at 10, 100, and 1,000 records. Implemented event-to-paint timing and stored/rendered count checks passed; no JavaScript/CSP errors or external requests. | [Methods, scope correction, and results](CAPACITY.md), [raw samples](evidence/browser-capacity.json) |
| Illustrated browser workflow | **All 16 scenarios passed**, each with a real screenshot and assertions. The actual downloaded HTML was saved and opened; customer scope, mobile cancellation, and expired-catalog behavior were checked. No JavaScript/CSP errors or external requests. | [Walkthrough](WALKTHROUGH.md), [capture manifest](assets/walkthrough/manifest.json) |
| Commercial hypotheses | Research found evidence of coordination friction and strong existing dashboard/report substitutes. Price, human productivity, paid demand, and repeat purchasing remain untested. | [Research](RESEARCH.md), [hypothesis ledger](HYPOTHESES.md) |

The browser used Chromium **131.0.6778.0** and Playwright **1.62.1**. Timing and capture clocks, machine information, output sizes, and interpretation limits are in the linked protocols. Screenshots are unretouched captures of fictional data. No application source changes were required by this phase. The new experiment scripts supplement the existing correctness tests; local latency budgets are not imposed on arbitrary CI machines.

## Local automated run — October 22, 2026 UTC

Environment: Linux, Node.js **24.19.0**, Python **3.12.14**. Results below describe this build environment; they do not establish production compatibility or verify any customer's systems.

| Check | Observed result |
|---|---|
| `npm test` | **46 passed, 0 failed, 0 skipped** across the shared assessment engine, CLI, reports, and localhost server. |
| `npm run test:collector` | **7 passed** covering collector behavior and file handling. |
| `npm run demo` | Generated the fictional standalone HTML report successfully. |
| Collector → CLI integration | Missing-PHP observation imported successfully, retained its timestamp and uncertainty, and returned exit `2` with `--fail-on-open`. |

The execution environment restricts localhost binding and child-process pipes. The JavaScript suite and integration check were run with those local permissions enabled. No production host was contacted.

## What the automated checks establish

- Numeric version boundaries for all four reviewed branches; conservative handling of legacy, vendor, unknown, future, and prerelease builds.
- Required provenance, reviewer, evidence, restart, and application-check chronology for upstream completion.
- Freshness and real calendar validation; rejection of future evidence and expired/future catalogs.
- Separation of provider assertions from runtime completion, including contrary upstream evidence and newer vendor observations.
- Recalculation of imported statuses and summaries; imported generation times cannot revive stale evidence.
- JSON shape, type, size, duplicate-ID, and prototype-payload handling.
- HTML escaping, safe reference URLs, spreadsheet formula protection, and exact-customer report isolation.
- CLI error/exit behavior, empty inventories, and refusal to overwrite input files or existing outputs.
- Static serving of the actual app modules, protected repository files, path traversal, HTTP method restrictions, Host validation, and response headers.
- Collector command arguments, bounded output, timeout, process failure, vendor suffix preservation, timestamp precision, restrictive output permissions, and overwrite protection.

## Browser workflow validation

**All 11 browser verification groups passed** using Playwright **1.62.1** and Chromium **131.0.6778.0** on Linux. The run observed **zero JavaScript/CSP console errors and zero external requests** during the tested workflow.

The checks covered:

1. Eight-site demo, all four outcomes, persistence, and desktop bounds.
2. Search, customer filters, isolated HTML reports, filtered CSV, and complete raw JSON export.
3. Status filters, filter toggling, and evidence queue navigation.
4. Cancel behavior, focus restoration, saved edits, and untouched timestamp precision.
5. Clear confirmation, add, completed-evidence outcome, reload persistence, and delete/cancel.
6. Import preview/cancel, literal untrusted text, unsafe links, invalid timestamp preservation, and retained data after malformed, oversized, or duplicate-ID input.
7. Merge/replace semantics and separation of demo records from real inventory.
8. Demo restoration, source dialog, workspace naming, and desktop capture.
9. A 390-pixel viewport, document/editor bounds, navigation, Escape cancellation, and mobile reset/demo controls.
10. Corrupt stored-data recovery without automatic overwrite.
11. Browser error and external-request assertions.

[Desktop screenshot](assets/dashboard.png) · [Mobile screenshot](assets/mobile.png)

The screenshots use fictional data. The smoke script fixes its browser clock inside the checked-in catalog's review window, so positive test outcomes remain reproducible; the production app uses the actual clock. Separate core tests exercise expired and future catalogs. A viewport check is not a real-device or accessibility certification. Firefox, Safari, and other browser versions were not exercised here.

### Reproduce the optional browser check

Playwright is a separate development tool, not an application dependency. On Linux, one way to install it outside the repository is:

```bash
npm install --prefix /tmp/php-response-browser-check playwright@1.62.1
/tmp/php-response-browser-check/node_modules/.bin/playwright install chromium
PLAYWRIGHT_MODULE_PATH=/tmp/php-response-browser-check/node_modules/playwright \
  node scripts/smoke-ui.mjs
```

Set `CHROMIUM_EXECUTABLE_PATH` to use a separately installed Chromium. Set `UI_SCREENSHOT_DIR` to retain screenshots in a chosen directory. The local validation used a separately installed Chromium binary because the environment's normal browser download failed; that binary and its installer are not included in the repository.

## Continuous integration

`.github/workflows/ci.yml` runs the JavaScript checks on Node.js **20, 22, and 24**, collector checks with Python **3.11**, and the demo report command.

The first integration checkpoint, [`b6a084c`](https://github.com/tobiko-dev/php-global-crisis-fix/commit/b6a084c708b1d66bcc2a51798c10b5ec9d2a2ce6), passed **all three hosted matrix jobs** in [Actions run 39712971437](https://github.com/tobiko-dev/php-global-crisis-fix/actions/runs/39712971437). Each job completed the JavaScript suite, collector checks, and demo report generation successfully. Consult [the latest workflow runs](https://github.com/tobiko-dev/php-global-crisis-fix/actions/workflows/ci.yml) for subsequent commits.

The published hypothesis/research checkpoint, [`48533e2`](https://github.com/tobiko-dev/php-global-crisis-fix/commit/48533e2cd1068991c1458237012648f389a69da7), also passed **all three Node.js 20/22/24 jobs**, including JavaScript tests, collector checks, and demo generation, in [Actions run 39721124501](https://github.com/tobiko-dev/php-global-crisis-fix/actions/runs/39721124501). The optional timing experiments and screenshots have their separately recorded local results above; those measurements are not part of this CI matrix.

## Limits

- PHP itself is not installed in the local build environment. Collector tests use controlled subprocesses and the real missing-executable path. No live PHP-FPM, Apache, vendor package, or customer deployment was validated.
- Linux is the locally exercised operating system. Windows and macOS have not been tested here.
- Operator-entered evidence, the local clock, and provider references are trusted inputs. These checks cannot authenticate them.
- No customer interviews, production changes, paid pilots, or security certifications have been performed.
- The catalog is a reviewed snapshot, with a deliberate expiry. Later advisories require a new source review.
