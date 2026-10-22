# Security scope

PHP Response Desk organizes operator-supplied patch evidence. It is not a vulnerability exploit scanner, incident-response service, or security certification system. A positive outcome describes the recorded evidence for the two cataloged CVEs; it does not prove absence of compromise or coverage of other vulnerabilities.

## Data handling

- Use the local server on `127.0.0.1`; do not expose it as a hosted multi-user application.
- Do not enter passwords, API tokens, session cookies, private keys, or credential-bearing URLs in records.
- Browser working data is stored in the local profile, without application-level encryption. Anyone who can access that profile or the exported files may be able to read customer information.
- Treat JSON, CSV, and HTML exports as customer records. Review client filters and contents before sharing them.
- Imported values are untrusted. HTML must be escaped, unsafe links must remain non-clickable, and CSV formula-leading cells must be neutralized.

There is no authentication, signed evidence, trusted remote attestation, or independent verification of a provider statement. The operator's data and local clock can be wrong. The catalog and observations also expire for assessment purposes.

## Reporting a project defect

No dedicated private disclosure channel is configured in this repository. For a non-sensitive bug, provide a minimal fictional inventory, steps to reproduce, and the affected version through the repository's available issue channel. Do not post customer records, server details, credentials, or a working exploit against a live system.

For a security-sensitive defect, first ask the maintainer for a private reporting route without publishing the sensitive details. Keep proof of the problem confined to local fixtures or systems you are authorized to test.

## Operating changes

The collector does not patch or restart services. Perform production changes through the system owner's normal change process, including recovery planning and relevant application checks. If compromise is suspected, a patch-evidence report is not a substitute for investigation.
