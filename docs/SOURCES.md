# Source register

**Sources checked: October 21, 2026, America/Chicago.** These are a dated baseline, not a live advisory feed. Read the current vendor advisory before making a production change.

## Primary sources

| Source | Exact URL | What it supports |
|---|---|---|
| PHP announcements and security advisory | https://www.php.net/archive/2026.php | October 21 releases, affected web-serving deployments, fixed upstream versions, limitations of configuration mitigations, and exceptional legacy source backports. |
| PHP: RCE via OOM corruption | https://github.com/php/php-src/security/advisories/GHSA-w8hw-w9fx-j79w | CVE-2026-109618, severity, affected/fixed versions, deployment-specific susceptibility, and remediation limits. |
| PHP: RCE via stale global state | https://github.com/php/php-src/security/advisories/GHSA-6wmf-4rv5-p3rp | CVE-2026-109619, cross-request state lifetime, conditional attack paths, and remediation limits. |
| CERT-EU advisory 2026-018 | https://cert.europa.eu/publications/security-advisories/2026-018 | Immediate patching advice, inventory scope, distribution backports, and isolation when prompt patching is infeasible. |
| UK NCSC alert | https://www.ncsc.gov.uk/news/critical-security-issue-affecting-php | Inventorying PHP dependencies in third-party software and assessing suspected compromise. |
| Laravel Forge operational guidance | https://laravel.com/forge/docs/knowledge-base/php-security-release-october-2026 | Forge update responsibility, package sources, PHP-FPM restart behavior, and restarting long-running PHP processes. |
| Aikido's own incident guidance | https://www.aikido.dev/blog/critical-vulnerabilities-in-php-php2shell | Availability of its free checker and patched images; the vendor's warning that a clean external scan does not establish a patched deployment. |

The last two sources describe their own products and workflows. They do not determine the status of unrelated hosting environments. Aikido's external checker is not integrated into this project.

## Supported advisory baseline

The PHP project identifies these minimum fixed upstream releases:

| Branch | Minimum fixed release |
|---|---|
| 8.2 | 8.2.35 |
| 8.3 | 8.3.36 |
| 8.4 | 8.4.27 |
| 8.5 | 8.5.12 |

These comparisons cover **CVE-2026-109618 and CVE-2026-109619 only**. A matching version does not establish protection from other vulnerabilities or absence of prior compromise.

PHP lists all web-serving installation types as needing attention. It considers `mod_php` highest risk. FPM's susceptibility and confirmed attack paths differ between the two advisories; it is not appropriate to infer that all deployments are equally exploitable or that FPM is exempt.

## Interpretation rules

**Backports:** Linux distributions and support vendors may fix older package releases without adopting the upstream version number. PHP also published minimal source backports for 7.4, 8.0, and 8.1 despite those branches no longer receiving normal upstream releases. A vendor suffix or custom build therefore requires specific evidence. A banner alone cannot settle its status.

**Provider-specific instructions:** Forge's statement that its automatic security updates do not patch PHP applies to Forge's package arrangement. It is not a statement about all Ubuntu installations or managed hosting. Its normal update procedure restarts PHP-FPM, while long-running CLI processes require separate attention. Check the actual deployment rather than assuming the described restart occurred.

**Conflicting or incomplete summaries:** Some provider summaries describe older PHP branches as having no fix; the PHP project's exceptional source backports and vendor packages make that too broad. Use the PHP advisory for upstream facts and the relevant vendor for the exact package. Leave unknown builds unresolved rather than copying a reassuring or alarming generalization.

**Completion evidence:** An operator timestamp, note, or provider reference records a claim. The software neither contacts the provider nor authenticates that claim. A remote scan, an installed package, and the runtime serving a request are different observations.

## Catalog maintenance

The initial catalog is reviewed on 2026-10-21 and expires at `2026-10-28T23:59:59Z`. The 72-hour evidence age and catalog expiry are **product review policies**, not vendor guarantees that evidence remains valid for that period.

To renew the catalog, reread the PHP advisories and release announcements, review affected branches and vendor caveats, update the catalog and this register, and exercise the assessment cases. Do not extend its expiry merely to obtain a positive status. New or unrecognized branches remain unresolved until deliberately reviewed.

Reports preserve their generation time and catalog dates. Later advisory changes do not retroactively update an exported report.
