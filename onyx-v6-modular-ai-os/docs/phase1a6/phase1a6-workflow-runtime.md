# Phase 1A.6 — Workflow Runtime

## Objective

Phase 1A.6 builds a mock-only workflow runtime host that consumes the frozen
Phase 1A.5 governed workflow contract, coordinates capability-specific
adapters, exposes deterministic orchestration APIs and runtime snapshots,
supports recovery from trusted checkpoints, and never introduces a new write
capability.

Phase 1A.6 does not fork or duplicate the Phase 1A.5 contract. It reuses:

- `WORKFLOW_CONTRACT_VERSION` ("1.0.0")
- all 32 `WORKFLOW_STATES`
- the ordered `CAPABILITIES` sequence
- the approval package, checkpoint store, evidence timeline, rollback policy,
  executor contract, and state machine exported by
  `@onyx/phase1a5-workflow-engine`

## Package layout

```
packages/phase1a6-workflow-runtime/
  src/
    contracts.ts               runtime contract identity, IDs, security helpers
    adapter-registry.ts         capability-specific adapter registration/resolution
    runtime-snapshot.ts         immutable RuntimeSnapshot type and builder
    status-projector.ts         32-state -> 11-status projection (read-only)
    runtime-host.ts             sequential capability execution, pause/cancel
    recovery-host.ts            checkpoint-driven recovery and resumption
    reconciliation-handoff.ts   deterministic, read-only reconciliation package
    e10-runtime-adapter.ts      E.10 DRY_RUN_READY -> runtime intake conversion
    local-runtime-simulation.ts mock-only end-to-end simulation
    index.ts                   package entry point
  tests/                        vitest coverage for every acceptance ID
  acceptance-manifest.json      P16-* requirement -> implementation/test mapping
```

## Runtime lifecycle

1. A Phase 1A.5 `Workflow` is created, frozen, and approved using the existing
   `WorkflowEngine` (`create` / `freeze` / `approve`).
2. A `RuntimeHost` is constructed from that frozen, approved workflow and an
   `AdapterRegistry`. Construction validates repository, contract version,
   scope hash, approval binding (repository, workflow ID, contract version,
   scope hash, digest, expiry, exact ordered capability sequence), and
   approval consumed state.
3. `runNextStep()` executes exactly one capability: it re-validates the
   approval and capability boundary, writes a pre-step checkpoint, invokes the
   capability adapter, classifies the result, writes a post-step checkpoint,
   and appends one evidence entry.
4. `run()` loops `runNextStep()` sequentially (lane limit one) until the
   workflow completes, pauses, is cancelled, fails safe, or requires
   reconciliation.
5. `snapshot()` exposes an immutable `RuntimeSnapshot` at any point.

See [phase1a6-runtime-contracts.md](./phase1a6-runtime-contracts.md) for the
full contract surface, [phase1a6-recovery-and-reconciliation.md](./phase1a6-recovery-and-reconciliation.md)
for recovery/reconciliation behavior, and
[phase1a6-e10-integration.md](./phase1a6-e10-integration.md) for the E.10
adapter.

## Safety invariants

`mergeAllowed`, `productionDeployAllowed`, `forcePushAllowed`, and
`branchDeletionAllowed` are `false` in every runtime snapshot and are never
set to `true` anywhere in this package. The runtime never performs a live
GitHub action, never imports `node:child_process`, and exposes no arbitrary
command or shell execution method.
