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

## Commercial status

No customer interviews, outreach, paid pilots, or production access have been performed. Pricing and willingness to pay remain hypotheses. All demonstration data is fictional.
