# Contributing

Read [the implementation contract](docs/CONTRACT.md), [architecture](docs/ARCHITECTURE.md), and [source register](docs/SOURCES.md) before changing assessment behavior.

## Changes that need particular care

- Preserve the difference between installed packages, CLI observations, active web-runtime evidence, and provider assertions.
- Do not make an unknown version or incomplete record pass merely to simplify the interface.
- Keep the browser and CLI on the same rules. Demonstration data must remain explicitly fictional.
- Treat import data as untrusted. Preserve HTML escaping, link restrictions, CSV formula protection, client isolation, and import bounds.
- Do not introduce remote scanning, automatic patching, credentials, analytics, or network-based attestations as incidental additions. Those would require a deliberate change to the product's scope and security model.

Use fictional fixtures and a deterministic assessment time when testing dates. Include focused coverage for a changed decision rule or a concrete regression risk. Record checks actually run; distinguish untested assumptions from observed behavior.

## Advisory updates

Consult the PHP project's primary advisories and the exact package vendor before updating version or backport rules. Update catalog dates and source notes together. A newer version number alone is not enough reason to extend a branch rule, and a catalog expiry should not be advanced without reviewing the sources.

## Pull requests

Explain the user problem, resulting behavior, relevant validation, and remaining limits. Do not include real customer inventories or generated reports. Business demand, pricing, and delivery claims must remain hypotheses until actual evidence exists.

See [SECURITY.md](SECURITY.md) for sensitive defect reporting and handling customer data.
