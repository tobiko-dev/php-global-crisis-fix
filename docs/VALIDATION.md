# Validation record

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

Real-browser interaction and responsive checks are in progress. The validation result and reproducible smoke command will be recorded here before the build is handed over.

## Continuous integration

`.github/workflows/ci.yml` runs the JavaScript checks on Node.js **20, 22, and 24**, collector checks with Python **3.11**, and the demo report command. The Actions result for the published commit is the authority for whether those hosted runs passed; configuration alone is not a passing result.

## Limits

- PHP itself is not installed in the local build environment. Collector tests use controlled subprocesses and the real missing-executable path. No live PHP-FPM, Apache, vendor package, or customer deployment was validated.
- Linux is the locally exercised operating system. Windows and macOS have not been tested here.
- Operator-entered evidence, the local clock, and provider references are trusted inputs. These checks cannot authenticate them.
- No customer interviews, production changes, paid pilots, or security certifications have been performed.
- The catalog is a reviewed snapshot, with a deliberate expiry. Later advisories require a new source review.
