# Business hypothesis research

**Reviewed: October 21, 2026, America/Chicago.** This is a desk-research snapshot of public primary sources, not customer discovery or sales validation. Provider notices and prices can change. The Aikido page retrieved for this review displays an October 22 update date; that publisher date is preserved below.

## Finding

There is evidence of a real coordination problem during this incident: customers wanted reliable progress information, and different hosting products required different actions. There is also substantial counterevidence to selling a generic dashboard or customer report. Established tools already provide those features, including free options. Some managed providers handled the runtime updates themselves.

The narrower hypothesis worth testing is **a human-assisted evidence review for agencies with mixed providers and remaining operator responsibilities**. The customer would buy the time saved identifying owners, resolving contradictory observations, and producing a useful handover. Whether customers need that help, whether this application improves their existing workflow, and whether they will pay remain untested.

## Evidence register

Every source below was reviewed on the date above. “Strong” means direct support for the stated product feature or provider instruction; it does not mean strong evidence of demand for this project. Descriptions are paraphrases.

| ID and primary source | What the source actually supports | Implication and limit |
|---|---|---|
| E1 — [Kinsta community incident discussion](https://community.kinsta.com/t/critical-php-security-release/8314) | October 21 posts include first-person reports of support queues and uncertainty about what to tell clients. A staff reply describes updates through chat. Later posts 19–20 report patches beginning to appear. | Direct, historical evidence of communication friction from self-selected participants. It does **not** establish current unpatched status, prevalence among agencies, or willingness to pay an outside operator. Customer reports of support replies are not independent platform-wide verification. |
| E2 — [Laravel response update](https://laravel.com/blog/php-critical-vulnerability-response-updates) | At its October 21, 23:26 UTC update, Laravel said every running Cloud application had been patched in place without redeployment. Forge customers were told to update each server. Vapor native-runtime customers needed to redeploy; custom/Docker runtimes needed a new deployment. | Strong evidence that responsibilities differ even within one vendor. Fully handled managed environments are a poor target for a patching offer. Mixed responsibilities could create a coordination need; that commercial inference still needs customer evidence. These are the provider's statements, not our independent audit. |
| E3 — [Forge security guidance](https://laravel.com/forge/docs/knowledge-base/php-security-release-october-2026) | Forge says its automatic security updates do not update PHP. Its PHP update restarts the relevant FPM service, while long-running PHP processes need restarting separately. It offers dashboard and API update paths. | Strong evidence of remaining operator work. Existing provider controls also reduce the value of merely providing update instructions. The source does not show that customers need another tool or outside help. |
| E4 — [ManageWP Client Reports](https://managewp.com/features/client-report/) and [pricing](https://managewp.com/pricing/) | Free reports include logos, custom work notes, templates, and PDF downloads, with a ManageWP watermark. Premium reporting is advertised at **$1 per site per month**, or **$25 per month for up to 100 sites**, adding features such as scheduling and watermark removal. | Strong counterevidence to reports or basic branding being unique. These are substitute **software subscription list prices**, not evidence that customers will buy our one-time service. A report's appearance alone is a weak reason to switch. |
| E5 — [ManageWP getting started](https://managewp.com/guide/getting-started/) | Its WordPress workflow already organizes sites and clients and filters by PHP version. | Strong counterevidence to a PHP-version inventory being distinctive by itself. Mixed WordPress, Laravel, and custom-PHP estates are a possible narrower segment; this review does not establish demand or exhaustively audit integrations. |
| E6 — [MainWP pricing](https://mainwp.com/signup/) and [Pro Reports documentation](https://docs.mainwp.com/add-ons/agency/pro-reports-extension-overview) | MainWP advertises a free core, unlimited sites, self-hosting, and open source. Pro is listed at **$29 monthly**, **$199 yearly**, or **$599 once for a lifetime license**. Its reporting extension supports customized PDF reports and one-time or recurring delivery. | Strong counterevidence to a separate dashboard, local data control, or recurring reports being sufficient differentiation. Prices are substitute **software subscription/license prices**, not observed purchases or a comparable labor rate. An existing customer's configured workflow could be cheaper to extend than replace. |
| E7 — [MainWP site-management documentation](https://docs.mainwp.com/sites/management/manage-child-sites) | The documented site-hardening PHP check tests whether the version is at least 8.0; the documentation explicitly says it is not a live support-status lookup. | A general PHP-version check is not proof that these particular CVEs are resolved. This is a narrow documented limit of that check, **not** a claim that all MainWP security features or integrations lack vulnerability information. |
| E8 — [Aikido incident guidance](https://www.aikido.dev/blog/critical-vulnerabilities-in-php-php2shell) | Published October 21 and displaying an October 22 update, the page offers a free public-URL checker and free patched PHP images. It says a negative checker result does not establish that the server is patched. | Basic detection and patch distribution already have free substitutes. The stated verification limitation makes careful evidence review plausible, but does not establish a paid market. We did not run the checker or test its effectiveness. |
| E9 — [PHP support policy and dates](https://www.php.net/supported-versions.php) | PHP branches have two years of active support followed by two years of critical-security support. PHP 8.2 security support is listed through December 31, 2026. | Strong evidence that runtime maintenance continues beyond this incident. Recurring customer demand for our service does not follow automatically. The current application covers two specific CVEs, not a maintained general lifecycle or vulnerability service. |

The software prices are advertised amounts at the review date. This research did not verify checkout totals, taxes, discounts, sales volume, or satisfaction. A software subscription and a scoped human verification engagement deliver different things; their prices cannot validate one another.

## Hypotheses after this review

| Hypothesis | Result | What would change the conclusion? |
|---|---|---|
| Agencies can lose time establishing status and communicating during an urgent PHP update. | **Partially supported.** E1 shows actual incident friction; E2–E3 show different responsibilities. Its frequency and cost remain unknown. | Qualified operators reconstructing their own recent incidents, with concrete tasks, delays, and time spent. |
| A dashboard, version list, or polished customer report is enough differentiation. | **Contradicted as a uniqueness claim.** E4–E7 document substantial existing functionality. | A comparison showing an important task that the buyer's existing setup handles poorly and this workflow improves. |
| Any organization using PHP is a plausible customer. | **Too broad.** E2 includes customers whose provider already completed the relevant work. | A specific unresolved responsibility, evidence gap, or customer communication task that the buyer wants help completing. |
| A $150–300 verification pilot will sell. | **Untested.** This is the proposed price in [BUSINESS.md](BUSINESS.md), not a price inferred from competitor subscriptions. | An accepted, scoped offer and actual payment, followed by satisfactory delivery economics. Interest or a hypothetical price answer is weaker evidence. |
| The offer has value after the emergency. | **Operationally plausible, commercially untested.** E9 supports ongoing maintenance work. | A customer requesting and paying for a later review or another update cycle without emergency pressure. |
| A local application is a sufficient reason to adopt it. | **Unproven.** E6 shows self-hosted alternatives; another manual record can also add work. | Customers demonstrating a material data-handling constraint and preferring this workflow after using it. |

## Revised buyer and offer to test

Recruiting criteria should prioritize an agency responsible for several customer environments across at least two hosting arrangements, with at least one environment requiring its own action. The provider and site counts are **proposed screening choices**, not measured market boundaries. An operator who handles both WordPress and Laravel/custom PHP may be a better fit than one whose entire estate is already covered by a single management tool.

The useful qualifying question is: **What remains unresolved after your host and existing maintenance tools have done their work?** Ask to see the customer's current process before proposing replacement software. A spreadsheet, ticket system, or existing report may already be sufficient.

Keep the first paid experiment small: the existing **unvalidated $150–300 pilot** covers one straightforward server and an explicitly agreed set of sites. It should purchase an inventory, evidence review, unresolved-action list, and handover. It does not purchase an entire multi-provider fleet review at that price. Remediation, compatibility changes, migrations, and incident response require separate scope. Do not charge for repeating a provider's completed work without a concrete additional benefit.

Three differentiators to test are clearer responsibility across providers, fewer false assurances from incomplete runtime evidence, and less operator time preparing a customer-specific handover. These are proposed outcomes, not established advantages over competitors. Where an agency already uses ManageWP or MainWP, an export or service working alongside that setup may be more useful than another dashboard.

## Next experiments — not yet performed

These are proposed decision rules for a small pilot, not statistically established thresholds or completed research.

| Experiment | Evidence to record | Decision rule to choose before starting |
|---|---|---|
| Conduct 8–12 qualified, retrospective interviews. | Actual environments, existing tools, who owned each action, evidence requested, interruptions, time spent, and what remained after provider updates. Distinguish recorded time from estimates. | Continue only if a repeated unresolved task appears among a clearly defined segment. Narrow or stop if providers and current tools already handle it. |
| Compare the buyer's existing workflow with this application using the same fictional inventory and tasks. | Time to identify missing evidence, wrong conclusions, missing owners, report corrections, and data-entry effort. Alternate task order to reduce learning effects. | Require no false completion conclusions and a material time benefit agreed in advance. A proposed 20% time reduction is a test target, not a result. |
| Offer a precisely scoped paid pilot after discovery. | Quoted amount, accepted scope, actual payment, delivery hours, revisions, access delays, and unresolved work. | Several independent paid completions with acceptable delivery cost would justify further investment. Free trials and compliments do not satisfy this test. |
| Follow up after the incident or at the next planned update. | A concrete request for repeat work, what evidence needed refreshing, and whether a repeat engagement was purchased. | Expand recurring functionality only when repeat need and purchase behavior appear. |

The comparison must include manual data entry and obtaining evidence outside the application. Timing only report generation would omit much of the service's cost. Local tests and screenshots establish behavior and usability examples; they cannot establish customer demand or paid time savings.

## Limits and recommendation

This review used public product documentation, vendor notices, and one incident discussion. It did not include interviews, outreach, customer access, competitor product trials, payments, or production remediation. The public comments are neither a representative sample nor evidence of a budget. There is no verified market-size estimate or acquisition-cost estimate here.

Provider communications also require technical context. Mitigation announcements are not equivalent to patch verification. Vendor backports can retain older version numbers; broad statements that all older branches have no fix should not override PHP's own advisory or distribution-specific evidence. A CLI version alone does not establish the active web runtime. See [SOURCES.md](SOURCES.md) and [RUNBOOK.md](RUNBOOK.md) for those distinctions.

**Continue as a narrowly scoped service prototype and discovery exercise.** Test whether the operator's review and handover create enough additional value over existing hosting support, spreadsheets, and management tools. Defer a broader hosted product or recurring subscription until actual pilots establish demand and delivery economics.
