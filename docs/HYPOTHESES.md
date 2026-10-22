# Hypothesis ledger: what survived testing?

**Review date: October 21, 2026, America/Chicago.** Raw execution records use UTC. This ledger combines public-source research, scripted product experiments, and real-browser observations. All test inventories, customer names, and operational assertions are fictional.

**Decision: continue with a narrow service pilot hypothesis.** The software handled the tested evidence and customer-handover workflows. Research weakened the original idea that another agency dashboard or report would be distinctive. The offer now focuses on agencies that still have unresolved responsibilities across hosting arrangements. No customer demand or price has been validated.

## Business hypotheses

| Hypothesis | Evidence and result | Decision |
| --- | --- | --- |
| Agencies can struggle to establish update status and communicate it to customers. | **Partially supported.** Historical incident comments describe support queues and uncertainty about customer communication. Vendor notices assign different work to different hosting products. These sources do not measure prevalence, operator cost, or a budget for outside help. See [research E1–E3](RESEARCH.md#evidence-register). | Investigate the remaining work in a specific agency's recent incident. |
| A dashboard, version inventory, or customer report is enough differentiation. | **Contradicted as a uniqueness claim.** ManageWP and MainWP already document substantial inventory/reporting features, including free options. See [research E4–E7](RESEARCH.md#evidence-register). | Sell a useful review and handover only where the existing process leaves a gap. Compare against the buyer's actual tools. |
| Any organization running PHP is a potential buyer for this incident service. | **Too broad.** The Laravel notice describes both fully handled managed environments and products requiring customer action. See [research E2](RESEARCH.md#evidence-register). | Prioritize agencies with mixed hosting arrangements and a concrete unresolved responsibility. |
| An agency will pay $150–300 for a scoped verification pilot. | **Untested.** No offers, payments, or customer engagements were performed. Competitor software prices cannot validate a human service price. | Keep the amount explicitly experimental and the scope limited to one straightforward server and an agreed set of sites. |
| The workflow can support recurring revenue after the emergency. | **Untested commercially.** PHP's lifecycle creates continuing maintenance work, but that does not establish repeat purchases for this service. See [research E9](RESEARCH.md#evidence-register). | Require an actual later engagement before investing in recurring or hosted features. |

The [research record](RESEARCH.md) contains primary links, counterevidence, advertised substitute prices, and the limits of each source. The [revised business plan](BUSINESS.md) turns these findings into a proposed buyer and pilot scope.

## Product hypotheses

The six engine/export hypotheses and their criteria were written before the experiment run. **All 15 declared checks passed.** The [full protocol and results](EXPERIMENTS.md) preserve the methods, limitations, and every timing sample through linked raw files.

| Hypothesis | Observed result | What this establishes |
| --- | --- | --- |
| H1: represent an operator journey without closing unfinished work | Five upstream stages and four vendor stages produced the declared outcomes. JSON round-trip preserved the final inventory and assessments. | These supplied evidence transitions work; the tool does not perform the underlying patch or checks. |
| H2: generate a handover for only the selected customer | HTML contained exactly two selected environment cards; CSV contained two data rows. Neither full export contained any of 18 markers from the other two fictional customers. | Isolation of these export cases; this is not multi-user authorization. |
| H3: reopen positive records when evidence or the catalog expires | Advancing observations by 73 hours reopened both positive outcomes. Crossing catalog expiry also reopened them with otherwise fresh evidence. | The tested clock boundaries prevent those stale records retaining a positive outcome. |
| H4: enforce inventory limits without damaging prior work | API and CLI accepted a representative 1,000-record input, rejected 1,001 records and a separate input over 5 MiB, and preserved source hashes and an earlier good report. | Count and byte boundaries behave as declared for these inputs. A fleet can exceed the byte limit before the count limit. |
| H5: assess and export a representative maximum-size fleet within chosen engineering budgets | At 1,000 records, assessment p95 was **50.569 ms**; combined HTML + CSV generation p95 was **226.857 ms**, across 25 samples after three warmups. The export maximum was **815.463 ms** and remains in the results. | Local engine capacity for this fixture and shared host. File writing, browser rendering, and human work are outside these timings. |
| H6: show information omitted by a deliberately version-only rule | The published rules disagreed on 12 of 15 deliberately selected examples, including incomplete operational evidence and vendor/backport context. | A demonstration of policy differences. It is not an agency error rate, a competitor benchmark, or a comparison with a well-designed spreadsheet. |

### Browser evidence

Two separate browser exercises cover the actual interface rather than only the shared engine:

- **Capacity:** nine fresh-context trials imported and filtered fleets of 10, 100, and 1,000 records. All met the implemented timing and row-count checks. At 1,000 records, import-to-paint ranged from **579 to 1,479 ms** and customer filtering from **72 to 114 ms**. There were no JavaScript/CSP errors or external requests. See [protocol, scope correction, raw results, and environment](CAPACITY.md).
- **Walkthrough:** 16 scenarios each paired an actual screenshot with executable assertions. They cover incomplete evidence, saved completion, provider assertions, merge and rejected imports, the downloaded customer report, empty state, sources, mobile use, cancellation, and catalog expiry. See the [illustrated walkthrough](WALKTHROUGH.md) and [capture manifest](assets/walkthrough/manifest.json).

These results demonstrate the recorded interface behaviors. The capacity runner checks counts and event-to-two-frame timing, not field-level persistence, exports, or input responsiveness during rendering. Three trials per size do not establish tail latency, and scripted operation does not establish human usability or faster work. The screenshots use a controlled test-browser clock within the catalog window, with a separate expiry scenario. The application itself uses the actual clock.

## What changed because of the evidence

1. **Narrow the buyer.** Look for an agency that can point to unfinished evidence or ownership work after its providers and existing tools have done their part. A provider's completed update can remove the need for this service.
2. **Make the operator's work the offer.** The proposed deliverable is a reviewed inventory, unresolved-action list, and customer handover. The app supports that work. Its dashboard and report formatting are not proven reasons to switch tools.
3. **Keep the trust boundary visible.** Provider assertions and operator-entered evidence can be fictional and still satisfy the software rules. A positive outcome describes the record; it does not authenticate the assertion or establish a patched deployment.
4. **Avoid scaling assumptions from fast rendering.** The 1,000-record HTML export was over 1.3 MB. Generating it quickly does not establish that a long report is useful. The service still needs customer scoping, evidence collection, and review time.
5. **Retain the inconvenient results.** The large-field inventory was rejected despite having only 1,000 records, the slow export sample is published, and research found strong existing substitutes. These observations constrain the pitch and implementation promises.

## Next experiments — defined, not performed

No outreach, interviews, customer-system access, offers, or payments were undertaken in this phase. The following are proposed next experiments; they are not entries in the completed-results count.

| Experiment | Method and evidence | Proposed decision criterion |
| --- | --- | --- |
| Retrospective discovery | Interview 8–12 qualified agency operators about a recent incident. Record providers, existing tools, unresolved tasks, delays, and actual or explicitly estimated time. | Continue only if a repeated, concrete problem remains after existing support and tools. Narrow or stop if that process is sufficient. |
| Human workflow comparison | Ask operators to perform matched fictional tasks with their current process and this app; alternate order. Include data entry and evidence collection, and record missing owners, wrong conclusions, corrections, and total time. | Choose a material time target beforehand; a proposed starting target is 20% less total time with no false completion conclusions. This is a test target, not an observed benefit. |
| Paid delivery test | Offer the precise single-server scope, then record actual price, payment, hours, revisions, access delays, and report acceptance. | Several independent paid completions at acceptable delivery cost would justify more investment. Positive comments and free trials do not meet this criterion. |
| Repeat-need test | At a later update or agreed review, record what needs refreshing and whether the customer buys another engagement. | Build recurring features only after repeat need and purchase behavior appear. |

Keep anonymized aggregate findings in this ledger if those tests happen. Customer inventories, credentials, internal reports, and identifying interview notes do not belong in this public repository.

## Reproduce or inspect

```sh
# Zero-dependency engine, export, CLI-boundary, and comparison experiments
npm run experiments -- --out reports/experiments-recheck
```

Use a new output directory for each run. [EXPERIMENTS.md](EXPERIMENTS.md) explains clocks and measurement boundaries. [CAPACITY.md](CAPACITY.md) and [WALKTHROUGH.md](WALKTHROUGH.md) provide optional Playwright reproduction commands. The existing [correctness suite and CI](VALIDATION.md) remain separate from machine-dependent latency budgets.
