# Legacy Premium Voice Provider Migration

**Status:** Deferred non-blocking technical debt

The existing Train A premium voice compatibility paths remain sealed for C1.
No provider migration, activation, credential configuration, or behavior change
is included in this release.

Future work may place those paths behind the C1 adapter contracts, establish
provider-specific packages and parity fixtures, gate a controlled flag switch,
verify rollback, and remove direct paths only after demonstrated parity.