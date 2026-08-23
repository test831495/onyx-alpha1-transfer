# Phase 1A.8 Wave 3A: Memory Contracts

Wave 3A defines contract-only, deterministic boundaries for governed memory. It does not create a durable store, execute export, rehydration, deletion propagation, indexing, context assembly, or model routing.

## Tiers

`M0` is request-scoped and ephemeral; it requires expiry and may reference sources only by stable identifiers. `M1` is editable session continuity. It never becomes `M2` through retrieval or summarization. Promotion to `M2` requires an explicit, scoped, attributed, non-expired governed decision.

`M2` is retained user and project memory. A user-authored statement may be canonical for that user's stated preference or instruction. References to repository, ADR, architecture, connector, or external sources do not replace those canonical sources. Inference, recommendation, hypothesis, and summary records are derived and non-canonical.

`M3` contains indexed references. Indexes, embeddings, and summaries are derived and rebuildable; ranking does not create authority. `M4` is a separate operational ledger containing stable workflow, runtime, task, lease, checkpoint, evidence, approval, and decision identifiers. It is not personal, relationship, persona, approval, or execution authority. `M5` is retention-governed archive material and is never automatically retrieved, injected, or rehydrated. `P0` is reserved for immutable persona baselines and is exposed only through read-only metadata.

Every memory record declares a tier, source attribution, trust classification, scope, permission profile, retention policy, correction state, supersession state, deletion state, and audit references. Trust labels describe provenance; they do not grant permission or authority. Memory records cannot grant workflow approval, execution, connector or secret access, promotion, merge, production, paid-action, or persona-modification authority.

## Lifecycle foundations

Correction, supersession, deletion, export, and audit are represented as versioned contracts. Corrections preserve the prior digest and audit trail. Applied supersession removes a record from active retrieval without deleting history. Deletion requires authorization and marks the foundation for later tombstone propagation; a deleted record is inactive. Export requires an explicit permission decision and redaction remains required where applicable.

Retention is compatible with tier but never overrides deletion authorization. M0 uses `EPHEMERAL`; M1 uses `SESSION` or `SHORT_TERM`; M2 uses `DURABLE`; M4 uses `OPERATIONAL`; M5 uses `ARCHIVAL`; P0 uses `IMMUTABLE_PERSONA`.

## Scope

Track A and Track B remain separate namespaces and communicate only through stable identifiers. Character attribution, agent identity, Council participation, lease ownership, and connector ownership do not expand a memory access profile. Profiles deny by default, explicitly list read/write tiers and scopes, and permanently disallow P0 writes.

Deferred to later waves: poisoning detection, prompt-injection detection, quarantine workflows, complete tombstone propagation and non-resurrection, cache/index execution, source rehydration, context assembly/ranking, routing, Council runtime contracts, and live memory storage.
