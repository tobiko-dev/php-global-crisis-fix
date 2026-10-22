# Operator runbook

Use this workflow to assemble a reviewable record for an agreed fleet. The tool neither changes a remote server nor establishes that an environment was never compromised. Confirm current advisories and the scope of authorized work before using a report for a production decision.

## 1. Start locally

From the repository root, with Node.js 20 or later:

```bash
node scripts/serve.mjs
```

Open `http://127.0.0.1:4380`. Keep the service local. Working browser data stays in that browser profile; export inventory JSON for a transferable record. Do not put credentials or sensitive log dumps in evidence notes.

To generate a separate fictional example without customer data:

```bash
node bin/php-response.mjs demo --format html --out /tmp/php-response-demo.html
```

A demo exercises the workflow, not a real assessment. Keep its demonstration label when showing it to someone else.

CLI exports refuse to overwrite an existing file. Use a new filename for each run, or deliberately move an older export after reviewing it.

## 2. Establish the inventory

List each site or environment, its customer, provider, responsible owner, and relevant PHP installation. A production site and its staging environment are separate records when their runtime or update state differs.

For an optional initial observation, run the collector on a system you administer, using Python 3.9 or later:

```bash
python3 collectors/collect.py \
  --id web-01 \
  --client 'Example Customer' \
  --name 'Customer website' \
  --organization 'Example Agency' \
  --owner 'Operations' \
  --provider 'Self-managed VPS' \
  --environment production \
  --php php \
  --out inventory.json
```

Replace the example identifiers with the agreed inventory labels. `--id` and `--client` are required. `--php` may identify a specific executable; it is not a shell command. Without `--out`, JSON is written to standard output. The collector refuses to overwrite an existing output file and creates a mode `0600` file on POSIX systems.

The collector invokes CLI PHP with `-n -v` and records that limited observation. It does not collect configuration files, environment values, hostnames, certificates, or secrets. If PHP is unavailable, it records an unknown observation. It does not confirm an installed vendor patch, the web runtime, worker restarts, or application checks. Running it on your workstation says nothing about a separate hosting server.

Import the fleet JSON into the browser to review it. Keep an inventory export as the main working copy. CLI assessment JSON can also be imported, but supplied summaries and assessments are discarded and recomputed.

## 3. Review evidence for each environment

1. **Determine the runtime and package source.** Record whether the version came from a web-runtime observation, a package, or CLI PHP. For a vendor or custom build, obtain the vendor's exact package advisory or a specific provider statement about both CVEs. Do not decide solely from an upstream-looking banner.
2. **Resolve necessary changes outside the tool.** Agree on the change and recovery process with the system owner. Apply the relevant vendor update through the existing operating procedure. This tool has no patch command.
3. **Confirm the running processes.** Establish that all relevant workers use the intended updated runtime. Record the restart time rather than inferring it from package installation. Forge's documented PHP-FPM restart does not cover every long-running PHP process; see [SOURCES.md](SOURCES.md).
4. **Record a subsequent runtime observation and smoke check.** Use an agreed set of non-destructive checks for important application behavior. A smoke check is a limited functional check, not a penetration test or a guarantee of complete compatibility.
5. **Record who reviewed the evidence and where it came from.** Use timezone-qualified timestamps and a useful note or reference. The expected order is restart, observation, then smoke check. Do not fill missing fields with guessed times.

For provider-managed environments, record a specific reference, reviewer, confirmation date, and whether the provider explicitly covers both CVEs. This produces a separate provider-confirmed outcome; it is not independent verification by the application.

## 4. Interpret the outcome

| Outcome | Operator interpretation |
|---|---|
| Action required | A recognized upstream observation requires an update. This is not evidence of compromise. |
| Verification needed | Information is missing, stale, inconsistent, unsupported, or insufficient for either completion path. |
| Evidence complete | The recorded upstream runtime evidence meets the tool's rules for these two CVEs. Review its source and scope. |
| Provider confirmed | A qualifying provider assertion has been recorded. Review the referenced statement and its coverage. |

An empty inventory means nothing has been assessed. Evidence older than 72 hours does not establish completion. An expired or future-dated catalog cannot establish a positive outcome. See the [contract](CONTRACT.md) for exact conditions and the [source register](SOURCES.md) before renewing a catalog.

## 5. Export and hand over

Export inventory JSON from the browser before closing or transferring the working record. For a CLI-generated customer report:

```bash
node bin/php-response.mjs assess inventory.json \
  --format html \
  --client 'Example Customer' \
  --out /tmp/customer-report.html
```

The customer filter is an exact name match. Review the report for the intended customer, current dates, remaining actions, and demonstration labels before sharing it. HTML is printable; CSV is useful for operational review; JSON preserves structured records. Protect all exports as customer information.

To make unresolved records visible to a calling script:

```bash
node bin/php-response.mjs assess inventory.json --format json --fail-on-open
```

Exit `0` means successful processing; with `--fail-on-open`, it also requires a nonempty inventory with no records in the two unresolved outcomes. Exit `1` means an input or usage error. Exit `2` means unresolved assets or an empty inventory under `--fail-on-open`. Without that flag, a successful command can still report required actions. Operator-entered assertions remain assertions even when the command exits successfully.

## Pilot acceptance

A human reviewer should be able to identify every in-scope environment, its owner, the evidence supporting its outcome, and the owner of each open action. Test the real application's relevant behavior outside this tool and record the result accurately. Mark incomplete work as incomplete; report generation alone does not finish the engagement.
