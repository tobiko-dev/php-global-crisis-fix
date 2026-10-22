# Changelog

## 0.1.0 — October 22, 2026

First local MVP of PHP Response Desk, supporting an agency's PHP update evidence and customer handover workflow.

### Added

- Browser fleet inventory, evidence editor, ownership, customer/status filters, and an unresolved-work queue.
- Local persistence, recovery export, validated replace/merge JSON imports, and separation of demo and real inventory.
- Shared conservative assessment rules for the two October 2026 PHP advisories, with explicit catalog and evidence expiry.
- Separate provider-confirmation and runtime-evidence outcomes.
- Customer-scoped printable HTML reports, spreadsheet-safe CSV, and editable inventory JSON.
- CLI assessment, demo report generation, exact client filters, and unresolved-work exit codes.
- Optional read-only Python collector with bounded output and timeout, no shell, and private non-overwriting files.
- Local static server, automated correctness/security regressions, optional browser smoke checks, and a Node.js CI matrix.
- Business hypothesis, pilot scope, source register, runbook, architecture, design decisions, and validation record.

### Review corrections before handover

- Recompute report assessments against the current clock instead of trusting an imported generation timestamp.
- Apply the newer-observation provider review consistently to vendor version suffixes.
- Preserve precise or invalid imported timestamps when an unrelated field is edited.
- Preserve corrupt stored data for recovery rather than silently overwriting it.

See [WORKLOG.md](WORKLOG.md) for the build record and [docs/VALIDATION.md](docs/VALIDATION.md) for observed results and remaining limits.
