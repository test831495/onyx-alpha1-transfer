# Phase 1A.6 — Recovery and Reconciliation

## Recovery host (`recovery-host.ts`)

`RecoveryHost.recover(workflow, clock)` reconstructs runtime state
exclusively from the trusted Phase 1A.5 checkpoint chain for that
`workflowId`. It:

1. Requires a bound approval package and validates it with the same
   `validateApproval` used at runtime-host acceptance (repository, workflow
   ID, contract version, scope hash, digest, expiry).
2. Confirms the approval's ordered capability sequence still matches
   `CAPABILITIES` exactly — a reordered, expanded, or reduced sequence is
   rejected.
3. Loads all checkpoints for the workflow and calls
   `verifyCheckpointChain` (Phase 1A.5), which rejects a corrupted digest
   chain, a changed scope hash, a changed repository, and a changed
   contract version.
4. Rejects automatic resume if the last checkpoint's `nextPermittedState` is
   `WORKFLOW_RECONCILIATION_REQUIRED` — an uncertain remote outcome must be
   resolved by a human or a separate reconciliation process before any
   automatic resume is permitted.
5. Determines the set of capabilities that completed with a
   `DETERMINISTIC_SUCCESS` or `COMPATIBLE_REUSE` classification, in the
   canonical `CAPABILITIES` order, and never treats a failed-safe or
   uncertain step as completed.
6. Reconstructs an evidence timeline summary (`ReconstructedEvidenceEntry[]`)
   directly from the checkpoint records (step ID, provider classification,
   checkpoint digest, resource references, and completion timestamp).
7. Returns a `RuntimeSnapshot` reflecting the recovered state.

`RecoveryHost.resumeHost(workflow, registry, recovered, clock)` constructs a
new `RuntimeHost` that already knows which capabilities are complete
(`alreadyCompleted`) and the last trusted checkpoint digest
(`previousCheckpointDigest`), so a recovered runtime host never repeats a
completed capability and its checkpoint chain stays continuous.

## Reconciliation handoff (`reconciliation-handoff.ts`)

When `RuntimeHost.runNextStep()` classifies a result as `UNCERTAIN_RESULT`,
the host records an `UncertainOperation` (capability, idempotency key,
resource references, detail) and moves the workflow to
`WORKFLOW_RECONCILIATION_REQUIRED`.

`createReconciliationHandoff(snapshot, uncertainOperation, now)` produces a
deterministic, `Object.freeze`-sealed package containing:

- workflow ID, runtime ID, repository, current state, current step
- the last trusted checkpoint digest
- the uncertain operation and its idempotency key
- resource and evidence references
- a list of **read-only** recommended reconciliation checks
- `automaticRetryPermitted: false`
- `remoteDeletionPermitted: false`
- `forcePushPermitted: false`
- `mergePermitted: false`
- `productionPermitted: false`
- a creation timestamp

This function never executes reconciliation. It only describes what a human
or downstream process must verify — reading remote state, comparing it
against the idempotency key, and escalating — before any further action.
