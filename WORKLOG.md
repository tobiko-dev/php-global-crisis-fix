# Build record

Initial planning dates use America/Chicago; integration dates are explicitly marked UTC. Commit timestamps are available in GitHub.

## 2026-10-21 — Problem and product boundary

- Confirmed the supplied repository was empty and public.
- Committed the initial problem statement and delivery plan before implementation.
- Selected the first buyer hypothesis: small web agencies with customer sites across self-managed and managed hosting.
- Chose a concrete deliverable: an inventory with evidence, unresolved actions, and customer reports.
- Established `docs/CONTRACT.md` so the assessment engine, UI, collector and documentation share one model.
- Chose one shared JavaScript assessment implementation for browser and CLI, with zero runtime dependencies.
- Chose a read-only local Python collector that can observe CLI PHP but cannot approve a web deployment.
- Established four outcomes: action required, verification needed, evidence complete, and provider confirmed. The last two describe recorded evidence, not a security certification.
- Began work in parallel on assessment rules, browser UI, and business/operational documentation.

## 2026-10-21 — Local runtime and collection

- Added a localhost-only static server with an asset allowlist, DNS-rebinding Host protection, and no data upload endpoint.
- Added a collector that disables PHP startup configuration for its version query, does not invoke a shell, and creates new inventory files with restrictive POSIX permissions.
- Added tests covering protected files, traversal, unsupported HTTP methods, malicious Host values, missing PHP, subprocess failures, and output-file preservation.
- Added a GitHub Actions validation matrix for Node.js 20, 22 and 24, plus the Python collector checks.
- Validation results and complete deliverable details will be appended after integration.

## 2026-10-22 UTC — Assessment, workflow, and independent review

- Implemented the shared assessment engine, source-linked advisory catalog, CLI, and eight fictional example environments.
- Built the browser fleet dashboard, evidence editor, customer and status filters, local persistence, validated replace/merge imports, CSV export, and customer-scoped HTML reports.
- Wrote the business hypothesis and proposed pilot, operator runbook, source register, architecture, design decisions, contribution guidance, and security scope.
- Corrected an export trust issue found during integration review: imported `generatedAt` can no longer supply the assessment clock. Reports and CSV recompute using the current clock unless a trusted caller explicitly supplies a test time.
- Corrected provider-confirmation chronology for vendor-suffixed versions. A newer lower-version web observation requires renewed backport clarification consistently, without declaring vendor builds vulnerable from their banner.
- Replaced the collector's unbounded output capture with a 64 KiB limit plus one overflow-detection byte, discarded stderr, and a bounded subprocess deadline. Oversized output remains unknown even if it begins with a plausible version.
- Added successful app/module serving checks alongside the local server isolation checks.
- Integrated automated result: **46 JavaScript checks and 7 collector checks passed**. Generated the demo HTML and verified that collector output imports into the CLI while retaining uncertainty and the unresolved-work exit code.
- Browser workflow validation and screenshot capture are recorded in [VALIDATION.md](docs/VALIDATION.md).

## 2026-10-22 UTC — Browser validation and handover

- Exercised the working app in Chromium: **all 11 workflow groups passed**, with zero JavaScript/CSP console errors and zero external requests during the test flow.
- Verified desktop and 390-pixel responsive layouts, customer-scoped HTML downloads, filtered CSV, complete JSON export, editing, persistence, cancellation, imports, deletion, and recovery.
- Preserved original precise or invalid timestamp strings when unrelated evidence fields are edited. Native datetime controls must not silently alter the evidence record.
- Guarded against a queued import-dialog close event clearing a newer preview.
- Corrected the ID input pattern for modern HTML regex parsing.
- Contained the visually hidden table header inside its scroll container, fixing an actual mobile document overflow found in screenshot review.
- Saved visually reviewed desktop and mobile screenshots, added a reproducible optional browser smoke script, and completed the README and changelog.
- Confirmed the first full GitHub Actions checkpoint passed all three Node.js 20/22/24 jobs, including collector checks and the demo report: [run 39712971437](https://github.com/tobiko-dev/php-global-crisis-fix/actions/runs/39712971437).
- Recorded the exact test environment, deterministic browser clock, and remaining compatibility/production limits in [VALIDATION.md](docs/VALIDATION.md).

## Published milestones

- [`96a07f4`](https://github.com/tobiko-dev/php-global-crisis-fix/commit/96a07f41fe5781b6477091c44f91b264137ee460): initial business problem and delivery plan.
- [`3ed9218`](https://github.com/tobiko-dev/php-global-crisis-fix/commit/3ed9218c3f0b3e92715f76730491da8a652c9de5): local server, collector, shared contract, and foundation tests.
- [`212829b`](https://github.com/tobiko-dev/php-global-crisis-fix/commit/212829bbf7903a155185e05bc7200e29f652783b): assessment engine, report CLI, business/operational docs, and independent-review corrections.
- [`b6a084c`](https://github.com/tobiko-dev/php-global-crisis-fix/commit/b6a084c708b1d66bcc2a51798c10b5ec9d2a2ce6): dashboard, browser smoke workflow, and continuous-validation matrix.
- Final handover commit: completed README, screenshots, validation evidence, and browser-review corrections. Its SHA is available in the repository history.

## Commercial status

No customer interviews, outreach, paid pilots, or production access have been performed. Pricing and willingness to pay remain hypotheses. All demonstration data is fictional.
