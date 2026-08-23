# Phase 1A.9 Wave 2D: Lock and Checkpoint Projections

Wave 2D adds deterministic, in-memory contract evaluation for scheduler lock and checkpoint decisions. It does not acquire or persist locks, write checkpoints, execute CAS against a store, migrate schemas, or resume tasks.

## Authority

The scheduler imports Phase 1A.8 lock modes, checkpoint-CAS contract lineage, and parallel-safety classes. Workflow state, runtime state, leases, permissions, memory scope, connector scope, approvals, evidence, and promotion authority remain owned by their predecessor contracts.

## Locks

`canonicalizeResourceKeys` validates stable resource keys, rejects empty, malformed, duplicate, and ambiguous keys, and returns lexicographic canonical order. All multi-resource projections use this order. Shared reads are compatible only when workflow and scope lineage match. Read/write and same-resource write conflicts are denied or wait-required. Disjoint writes require an explicit relationship proof and never infer disjointness from missing information.

`evaluateLockAcquisition` returns a projection result only. `evaluateLockRenewal` and `evaluateLockRelease` require exact owner, task, workflow, lease generation, scope, mode, and lock-generation lineage. Expiry and lost-owner helpers classify invalidation and retain reconciliation when external effects or resource state are uncertain. Scope escalation is classified as material where it changes mode, resources, connector account, memory-write scope, GitHub mutation scope, or promotion scope.

Promotion locks require the protected promotion class, R4 risk, fresh Rahul approval, exact global promotion resource, validation/security evidence, rollback and recovery references, target environment, and the singular promotion lane. No promotion is activated.

## Checkpoints

Checkpoint requests carry references and digests only. State hashes and payload digests use the deterministic `sha256:` form; payloads are never inspected or stored. `evaluateCheckpointCreate` accepts only the initial version transition or one exact next version. `evaluateCheckpointCas` rejects stale writers and version gaps and classifies an identical deterministic request as an auditable read-compatible projection. No retry or store mutation occurs.

Schema comparison distinguishes exact, compatible-read, migration-required, and unsupported versions. Migration-required and unsupported schemas do not resume automatically. Lineage validation checks workflow, runtime, runtime session, task, lease, lock, scope, schema, resume point, and evidence references.

`projectSafeResume` is advisory. It blocks automatic resume for corrupt or stale checkpoints, uncertain remote effects, changed governance, invalid lineage, missing idempotency keys, promotion-only work, and R4 review requirements. `concurrentImmutableReadersCompatible` permits only matching, read-compatible immutable references and cannot advance or mutate a checkpoint.

## Focused validation

- `tests/lock-manager.test.ts`: six deterministic lock projection tests.
- `tests/checkpoint-store.test.ts`: four deterministic checkpoint and safe-resume tests.
- T09-T13 are executable Wave 2D registry entries.
- P19-LOCK and P19-CHECKPOINT remain pending acceptance records.
