# Business hypothesis and first pilot

**Proposed offer: an operator-led PHP evidence review and customer handover for agencies with unresolved work across hosting arrangements.** PHP Response Desk supports the person delivering that service. The first sale to test is a scoped verification engagement.

**Demand, willingness to pay, human time savings, and delivery economics remain unvalidated.** The completed [hypothesis review](HYPOTHESES.md) combines primary-source research with software experiments. It documents no customers, revenue, outreach, production access, or completed remediation.

## What testing changed

The initial dashboard-and-report idea has substantial substitutes. [ManageWP](https://managewp.com/features/client-report/) already provides free branded reports and paid enhancements, and [MainWP](https://mainwp.com/signup/) offers free self-hosted site management and paid reporting capabilities. These are direct counterexamples to treating those features as unique.

The remaining hypothesis concerns work between systems and people: establishing who owns an update, reconciling incomplete runtime observations or provider assertions, and explaining what remains open. [Laravel's incident notice](https://laravel.com/blog/php-critical-vulnerability-response-updates) describes different responsibilities across Cloud, Forge, and Vapor; some customers' providers have already completed the relevant update. Historical [Kinsta community comments](https://community.kinsta.com/t/critical-php-security-release/8314) show communication friction during the rollout, with later posts reporting progress. They do not establish current unpatched status or willingness to pay.

See [RESEARCH.md](RESEARCH.md) for dated observations, exact substitute prices, and source limits. Software subscription prices are not evidence of what a customer will pay for a human service.

## Customer and problem

The revised customer hypothesis is an agency maintaining several customer environments across at least two hosting arrangements, with at least one environment still requiring its own action or evidence review. Agencies handling a mix of WordPress, Laravel, and custom PHP may have a gap spanning their current tools. These are recruiting hypotheses, not measured market boundaries.

Ask: **What remains unresolved after your hosts and current maintenance tools have done their work?** Look at the existing spreadsheet, tickets, and management platform. An adequate current process is a reason to decline or change the offer. Requiring a second dashboard can add work.

This is a plausible gap, not proof of a market. For example, [Laravel Forge's incident guidance](https://laravel.com/forge/docs/knowledge-base/php-security-release-october-2026) says its automatic security updates do not update PHP. However, an agency whose provider has already patched and supplied adequate evidence may need no additional service. The [source register](SOURCES.md) distinguishes these facts from the product hypothesis.

## Offer to test

**Proposed pilot price: $150–300 for one straightforward server and an agreed set of sites.** This is an unvalidated price experiment, not a researched market rate or a promise of revenue. It does not cover an entire multi-provider fleet. Quote additional environments and any remediation separately after assessment.

The pilot deliverables are:

- An inventory with a responsible person for each environment.
- Recorded observations and provider references for the two covered CVEs.
- A list of missing evidence or required actions.
- A brief customer report describing the evidence, its age, and its limits.

Patch installation, application changes, migrations, malware removal, incident response, and ongoing monitoring are separate scopes. A report is not a security certificate. No promise of uninterrupted operation or absence of past compromise is part of the pilot.

## Manual pilot workflow

1. Confirm that the customer has authority over the listed systems and agree on the deliverables, access method, and permitted work.
2. Ask whether the hosting provider has already resolved the issue. Close this question before proposing work the customer does not need.
3. Record environment ownership, package source, and the PHP runtime actually serving each site. Collect references through the customer's approved channels.
4. Use the [runbook](RUNBOOK.md) and [illustrated walkthrough](WALKTHROUGH.md) to organize evidence. Keep unresolved observations visible.
5. If a change is needed, propose a separate scoped change with a recovery plan. The application does not execute it.
6. Review the report with the customer, record missing work and its owner, and ask whether this problem recurs outside emergencies.

## Discovery questions

- What happened when you first heard about this PHP advisory?
- How did you determine which client environments used PHP and who owned them?
- What evidence convinced you an update was active?
- Where did you wait for a provider, developer, or client response?
- What did this interrupt, and how much operator time did it consume?
- What tools or maintenance services do you already pay for?
- Which part would still be useful next month?
- Would you accept the specific pilot above? What would have to change?

## Measures and decision points

The product experiments passed 15 engineering checks, nine browser-capacity trials, and 16 illustrated scenarios using fictional inventories. They demonstrate specific software behavior, including incomplete-evidence handling and customer export scope. They do not measure evidence-collection labor, a person's task time, report comprehension, or commercial demand. A well-designed spreadsheet or existing agency platform could already solve the same task.

After retrospective discovery, compare the buyer's current process with this workflow on matched fictional tasks, alternating task order. Include data entry and evidence collection as well as report preparation. Choose a success target in advance and record wrong conclusions, missing owners, corrections, and total time. The proposed 20% time benefit in the [next-experiment plan](HYPOTHESES.md#next-experiments--defined-not-performed) has not been measured.

Track qualified conversations, accepted paid pilots, hours per pilot, unresolved environments, report corrections, and requests for repeat work. Record actual amounts and time; do not substitute positive interview comments for purchases.

A proposed early decision point is to review the hypothesis after 8–12 qualified interviews. Several paid pilots with a repeated problem would justify more automation. No purchases, already sufficient hosting support, or expensive compatibility work would suggest changing the offer or stopping. These are operating choices, not evidence that demand exists.

Free checkers and patched images already exist. The proposed differentiator is accountable follow-through across providers: clear ownership, a record of what was checked, and a handover the customer can use. Test that value before building a hosted product or offering broad emergency support.
