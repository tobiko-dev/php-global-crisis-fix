# Design decisions

## 1. Start with an assisted verification service

**Decision:** support an operator accounting for a finite customer fleet.

**Reason:** demand for a standalone security product is unproven. A manual paid pilot can test whether customers value the handover and ownership record before integrations or hosting are built.

**Tradeoff:** the operator must gather and review evidence. The application cannot discover forgotten environments by itself.

## 2. Keep execution local

**Decision:** use a loopback static interface, local files, and browser storage. Do not provide accounts, remote agents, or a backend database.

**Reason:** the first workflow does not require credentials or a central service.

**Tradeoff:** browser data is neither encrypted by the application nor shared between operators. Access control, backups, and transfer of exported records are the operator's responsibility.

## 3. Share the assessment implementation

**Decision:** the browser and CLI call the same ES module rules and advisory catalog.

**Reason:** a customer report should not change classification solely because it was generated through a different interface.

**Tradeoff:** module and data-format compatibility must be considered together when making changes.

## 4. Separate observations from assurances

**Decision:** distinguish CLI, installed-package, and web-runtime observations; keep provider confirmations separate from upstream evidence completion.

**Reason:** vendor backports and persistent workers make a single version string insufficient. Provider references are claims recorded by an operator, not trusted remote attestation.

**Tradeoff:** some correctly patched environments will remain unresolved until suitable evidence is added. The tool favors a visible question over a false assurance.

## 5. Bound scope and freshness

**Decision:** cover two named CVEs and known upstream branches, with a dated catalog and a 72-hour evidence review policy.

**Reason:** a report must not silently imply coverage of new advisories or indefinite validity.

**Tradeoff:** catalog review and renewed evidence are manual work. The dates are product policy, not a security warranty.

## 6. Exclude automatic changes and network scans

**Decision:** do not install updates, restart services, run exploits, or probe remote websites.

**Reason:** application compatibility, permission, availability, and recovery requirements depend on the actual environment. An external negative result also cannot prove installation of a patch.

**Tradeoff:** this is an evidence and coordination tool; it cannot finish remediation on its own.

## 7. Make handover portable

**Decision:** use JSON for working records, spreadsheet-safe CSV, and self-contained printable HTML with client filtering.

**Reason:** a customer or agency should be able to review a result without adopting a hosted platform.

**Tradeoff:** exports are copies with their own access and retention needs. They do not update when the inventory or advisory catalog changes.
