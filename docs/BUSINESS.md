# Business hypothesis and first pilot

PHP Response Desk is a proposed service workflow for small web agencies and managed service providers that need to account for PHP updates across several customer environments. The first sale to test is a scoped verification engagement. The software supports the operator doing that work.

**Demand, willingness to pay, and delivery economics remain unvalidated.** This repository does not document customers, revenue, outreach, production access, or completed remediation.

## Customer and problem

The initial customer hypothesis is an agency that maintains several PHP sites across self-managed servers or more than one hosting provider, with no dedicated infrastructure engineer. During an urgent update, someone must identify the environments, assign an owner, establish what each provider has done, and communicate what remains open.

This is a plausible gap, not proof of a market. For example, [Laravel Forge's incident guidance](https://laravel.com/forge/docs/knowledge-base/php-security-release-october-2026) says its automatic security updates do not update PHP. However, an agency whose provider has already patched and supplied adequate evidence may need no additional service. The [source register](SOURCES.md) distinguishes these facts from the product hypothesis.

## Offer to test

**Proposed pilot price: $150–300 for one straightforward server and an agreed set of sites.** This is an unvalidated price experiment, not a researched market rate or a promise of revenue. Quote additional environments and any remediation separately after assessment.

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
4. Use the local workflow in [RUNBOOK.md](RUNBOOK.md) to organize evidence. Keep unresolved observations visible.
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

Track qualified conversations, accepted paid pilots, hours per pilot, unresolved environments, report corrections, and requests for repeat work. Record actual amounts and time; do not substitute positive interview comments for purchases.

A proposed early decision point is to review the hypothesis after 8–12 qualified interviews. Several paid pilots with a repeated problem would justify more automation. No purchases, already sufficient hosting support, or expensive compatibility work would suggest changing the offer or stopping. These are operating choices, not evidence that demand exists.

Free checkers and patched images already exist. The proposed differentiator is accountable follow-through across providers: clear ownership, a record of what was checked, and a handover the customer can use. Test that value before building a hosted product or offering broad emergency support.
