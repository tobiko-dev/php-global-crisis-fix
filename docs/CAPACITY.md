# Browser capacity experiment

Protocol set on **October 21, 2026, America/Chicago**, before running the measurements below.

## Hypothesis and scope

**A representative fleet reaches the import/filter paint checkpoint within chosen budgets at the advertised 1,000-record limit.** This experiment measures rendering and filtering latency in one desktop browser. It does not measure a person's task time, comprehension, willingness to use the app, or performance on another computer.

The original qualitative hypothesis said "without the UI becoming unresponsive." Review found that wording broader than the measurements: synchronous rendering can block input during the recorded interval. The supported claim is completion latency to the measured checkpoint; uninterrupted input responsiveness was not tested.

## Criteria chosen before measurement

- Import and paint all records correctly for fictional fleets of 10, 100, and 1,000 assets.
- All three measured imports at 10 and 100 assets finish within **2,000 ms**; all three at 1,000 assets within **5,000 ms**.
- Each exact-customer filter paints the expected number of rows within **1,000 ms**.
- Exported/stored inventory retains the expected total; the browser reports no JavaScript or CSP errors and makes no external requests.

These are engineering budgets chosen for this experiment, not established human usability thresholds. Report failures against the original budgets without changing them after measurement.

### Scope correction after review

The original "exported/stored inventory" wording above is retained to make this correction visible. The runner checks `localStorage` record count and rendered row counts. It does **not** export the fleet, compare every stored field, or inspect every row's identity/content. The export part of that original wording is **untested by this experiment**. The separate engine experiments and browser walkthrough exercise specific export cases. No timing budget, sample, or count result was changed after measurement.

## Method

`scripts/measure-browser-capacity.mjs` starts the real local server and creates three independent fresh browser contexts per fleet size. Each imports a labeled fictional JSON file through the application's actual preview/replace flow. Each then applies the exact customer filter. The measurement starts inside the browser's submit/change event and ends after two animation frames, so it includes rendering rather than only the pure assessment function.

Only `Date` is fixed inside the catalog review window; performance timing and animation frames continue normally. Desktop viewport: 1440 × 1000. The fixture cycles the eight built-in demo cases with unique record IDs and ten fictional customer labels. This is a representative mixed-status fixture, not a worst-case 5 MiB inventory. The first browser process launch and file-selection automation are outside the timing window. Repeated runs and operating-system caching can affect timings.

## Observed result

**All nine trials met the implemented timing and count checks.** Rendered import/filter row counts and stored record counts matched the expected totals. No JavaScript/CSP errors or external requests occurred during these trials. The broader export and responsiveness claims described above remain untested by this runner.

| Assets | JSON input | Import median | Import range | Customer-filter median | Customer-filter range |
|---|---|---|---|---|---|
| 10 | 6,297 bytes | 36 ms | 34–42 ms | 30 ms | 18–33 ms |
| 100 | 61,762 bytes | 105 ms | 78–169 ms | 23 ms | 20–26 ms |
| 1,000 | 620,381 bytes | 751 ms | 579–1,479 ms | 81 ms | 72–114 ms |

The experiment supports the narrowed completion-latency and count hypothesis **for the measured fixture and environment**. It does not establish that the UI accepted input throughout rendering, that users can find the right record, understand the evidence, work faster than a spreadsheet, or run similarly on a low-powered laptop. Three trials are insufficient for tail-latency or reliability guarantees. This was a shared test host; concurrent work and caching can influence measurements.

The complete raw samples, environment, criteria, and assessment date are in [browser-capacity.json](evidence/browser-capacity.json). See [EXPERIMENTS.md](EXPERIMENTS.md) for pure-engine/reporting experiments and input boundaries.

## Reproduce

Using the separate Playwright installation described in [VALIDATION.md](VALIDATION.md):

```bash
PLAYWRIGHT_MODULE_PATH=/tmp/php-response-browser-check/node_modules/playwright \
  node scripts/measure-browser-capacity.mjs /tmp/php-response-capacity.json
```

Optionally set `CHROMIUM_EXECUTABLE_PATH` to an installed Chromium. A failing criterion is retained in the JSON and produces a nonzero exit code.
