# Phase 1A.9 Wave 3C — Recovery and Reconciliation

Wave 3C adds deterministic, projection-only recovery and reconciliation contracts for the governed scheduler. The package does not execute recovery, rehydrate the scheduler, mutate SchedulerConfig, resume tasks, call providers, or change runtime lane state. All outcomes are advisory: they describe the safe action the scheduler would recommend while remaining disabled.

## Authority boundary

The RecoveryCoordinator is a decision projection layer. It evaluates failure evidence and policy constraints using supplied references and invariants only. It does not execute provider-side actions, mutate the active runtime, or infer task success from partial state. The coordinator remains inside the deterministic scheduler contract boundary and never crosses into execution or remote mutation.

Recovery decisions are projections only.

- No recovery is executed.
- No provider is queried.
- No task is retried, resumed, or reassigned.
- No rollback or compensation is executed.
- Scheduler remains disabled.
- Active stage remains S0_SINGLE.
- Runtime lane limit remains one.
- Promotion lane limit remains one.

The scheduler can recommend a safe reduction to S0, a stop-and-reconcile disposition, or a provider-truth reconciliation requirement, but it never performs the action itself.

## Failure classes

The recovery contract enumerates explicit failure classes for lease loss, heartbeat loss, worker crash, stale worker output, lock-owner loss, expired locks, checkpoint CAS conflict, checkpoint corruption, schema mismatch, dependency failure, join timeout, cancellation uncertainty, budget exhaustion, evidence failure, unknown and uncertain external effects, restart reconstruction, workflow and runtime divergence, approval invalidation, permission invalidation, memory and connector invalidation, context provenance and poisoning failures, memory tombstones, promotion failure, Council escalation, Saved Draft invalidation, and prohibited effects.

Those classes map into deterministic recovery dispositions, including `NO_RECOVERY_REQUIRED`, `WAIT_FOR_OWNER`, `CHECKPOINT_AND_STOP`, `RELOAD_AND_REPLAN`, `RESTART_RECONSTRUCTION`, `STOP_AND_RECONCILE`, `REDUCE_TO_S0`, `RECONCILE_PROVIDER_TRUTH`, `RECONCILE_APPROVAL`, `RECONCILE_PERMISSION`, `RECONCILE_MEMORY_SCOPE`, `RECONCILE_CONNECTOR_SCOPE`, `RECONCILE_CONTEXT`, `REVALIDATE_DRAFT`, `ROLLBACK_CANDIDATE`, `ESCALATE_TO_RAHUL`, and `FAILED_SAFE`.

## Recovery dispositions

`projectRecoveryFailureDisposition` assigns a primary disposition and secondary candidates from the supplied failure class. That mapping is deterministic and contract-level; it is not a live control loop. The coordinator then applies additional policy gates for unknown external effects, invalid approvals, draft invalidation, Council disagreement, checkpoint-cas conflict, budget hard stop, zone divergence, promotion failure, and worker crash conditions.

A recovery recommendation is blocked when the overall state is unsafe, when evidence is missing or invalid, when remote effects are unknown or uncertain, or when governance references are stale or invalid. The decision may require reconciliation before any continuation.

## Retry, resume, and reassignment prohibitions

The recovery coordinator enforces strict prohibitions under unsafe conditions:

- Automatic retry remains prohibited when remote effects are uncertain, provider truth is required, or evidence is missing or invalid.
- Automatic resume remains prohibited when approvals, permissions, checkpoint lineage, or scope validation are invalid, or when the checkpoint or runtime divergence indicates an unsafe restart.
- Automatic reassignment remains prohibited when the failure is externally uncertain, the runtime state has diverged, or the task requires a provider-truth or policy-level reconciliation.

These restrictions are encoded directly in `evaluateRecoveryCoordinator` and in the reconciliation decision result. They do not execute a retry, resume, or reassignment action.

## Lease and worker failure

Lease loss and heartbeat loss are classified as recovery-sensitive states. If the evidence is locally valid and there is no uncertainty, a lease-loss condition may yield a `RESUME_CANDIDATE` recommendation, but automatic resume remains blocked where provider truth or governance validity is questionable. For heartbeat loss or stale worker results, the recommendation escalates to `WAIT_FOR_OWNER` or `RECONCILE_PROVIDER_TRUTH`, with reconciliation required.

Worker crash and stale-worker classification do not invoke a worker or runtime restart. They instead recommend runtime-state reconciliation and safe pause or reduction.

## Lock-owner loss and lock invalidation

Lock-owner loss and invalid lock state are treated as governance and scope problems. A scheduler lock is never reactivated by reconstruction logic. The recommendation is a safe stop, a scope reconciliation, or a restart reconstruction recommendation with invalid lock references rejected before any safe resume.

## Checkpoint and CAS failure

Checkpoint CAS conflicts, corrupt checkpoints, and schema or lineage mismatches are classified as `RELOAD_AND_REPLAN`, `RECONCILE_CHECKPOINT`, or `FAILED_SAFE`, depending on what remains valid. Automatic resume is denied when a checkpoint is stale, corrupt, or inconsistent. Recovery guidance is limited to reconciliation and safe stop.

## Dependency failure

Dependency resolution and ready-set logic are intentionally deterministic and projection-only. Dependency failure, cancellation, unknown status, or join timeout are treated as conditions requiring safe stop, wait, or reconciliation, not execution or retry.

## Join and cancellation failure

Join timeout and cancellation uncertainty are evaluated as deterministic policy states. When a join cannot satisfy its threshold or when the outcome is uncertain, the recommendation is to route to reconciliation or a safe stop. Cancellation propagation must not execute or mutate the live scheduler.

## Budget exhaustion

Budget warnings and hard stops are evaluated as projection-only decisions. When budget exhaustion or a hard stop is reached, the package recommends a checkpoint and safe stop, not a live task rerun or a provider grant. Automatic retry remains barred.

## Evidence failure

Evidence failures are blocking. Missing or invalid evidence, or storage pressure that would delete required evidence, blocks completion. `evaluateReconciliationDecision` treats evidence, provenance, or validation gaps as governance blockers. The scheduler records the block; it does not create or delete evidence artifacts as part of recovery execution.

## Unknown external effects

Unknown remote writes, uncertain provider response, or uncertain remote-side effects are always treated as `RECONCILE_PROVIDER_TRUTH` conditions. The result denies retry, resume, and reassignment and requires reconciliation before any continuation. This ensures provider truth is resolved before action.

## Provider-truth reconciliation requirement

The reconciliation contract specifically demands provider-truth reconciliation whenever a remote effect is uncertain or a provider state is unknown. It does not attempt to resolve provider truth from the scheduler itself; it only requires a truthful human or system reconciliation gate before the scheduler may proceed.

## Restart reconstruction

`evaluateRestartReconstruction` validates authoritative workflow and runtime references during restart recovery. It rejects expired leases, invalid locks, invalid approvals, invalid permissions, invalid memory or connector state, invalid context provenance, and tombstoned memory. If invalid state exists, the recommendation is a safe reduction to S0_SINGLE or a reconciliation requirement. No scheduler restart or rehydration is executed.

## State divergence

`evaluateStateDivergence` classifies workflow, runtime, checkpoint, approval, permission, memory, connector, context, and evidence divergence. Critical multidomain divergence returns `REDUCE_TO_S0` and requires reconciliation. Stabilization-compatible anomalies may be recommended as `S4_STABILIZE_TWO`, but only when the divergence set is small and compatible. No SchedulerConfig mutation or lane transition occurs.

## Safe reduction to S0

Safe reduction is the primary recommendation when the scheduler detects workflow/runtime divergence, critical cross-domain divergence, or invalid restart reconstruction. The recommendation is a reduction to `S0_SINGLE`, not a lane transition or scheduler activation.

## Stabilization recommendation to S4

An `S4_STABILIZE_TWO` recommendation is permitted only for narrow, stabilization-compatible conditions. The package explicitly limits this recommendation to safe, small divergence cases and never converts it into a live execution transition.

## Approval invalidation

Approval invalidation, approval mismatch, and draft approval invalidation result in `RECONCILE_APPROVAL` or `REVALIDATE_DRAFT` dispositions. The coordinator denies automatic retry, resume, and reassignment and requires governance revalidation before proceeding.

## Permission invalidation

Permission invalidation and scope invalidation result in reconciliation requirements; the scheduler stops and waits for governance truth. No permission change is applied by the recovery contract.

## Memory invalidation

Memory scope invalidation and tombstoned memory are treated as memory governance failures. The recommended action is reconciliation, not resurrection or rehydration. Tombstoned memory is not resurrected on restart.

## Connector invalidation

Connector scope invalidation is handled as a provider-boundary issue requiring reconciliation and safe stop. The contract does not contact a provider or mutate a connector state.

## Context-provenance failure

Context provenance invalidation, polluted context, and quarantined context are all reconciled as context integrity failures. The coordinator blocks advancement and requires proof of valid context before any action is considered.

## Poisoning and quarantine

Poisoned or quarantined context is treated as explicit risk: the recovery result requires safe stop and reconciliation. It is not permitted to continue from a poisoned snapshot.

## Tombstone and non-resurrection

The restart reconstruction and divergence logic specifically avoids resurrecting tombstoned memory, invalid state, or stale task success. The scheduler never infers task completion from incomplete or diverged state.

## Council escalation

Where the Council disagrees or a required Council decision is absent, `ESCALATE_TO_RAHUL` is used. This does not imply a live Council action. It simply marks the decision as requiring a human escalation path before continuation.

## Saved Draft invalidation

Saved Draft invalidation or a mismatched draft approval triggers a `REVALIDATE_DRAFT` requirement. The scheduler rejects automatic continuation until the draft has been revalidated.

## Promotion failure

Promotion failure is treated as a rollback candidate and a blocked promotion. No promotion execution is initiated. Any live promotion state is treated as an unsafe condition requiring safe stop and governance review.

## Evidence requirements

The recovery and reconciliation contracts require authoritative evidence records for completion, restart reconstruction, and divergence handling. Missing or invalid evidence blocks completion. The recovery layer records the block and requires reconciliation or evidence repair, but it never performs the repair itself.

## Explicit non-goals

This Wave 3C recovery package does not implement:

- a live recovery executor
- provider calls or live remote writes
- automatic retry, resume, or reassignment under unsafe conditions
- a scheduler restart or runtime rehydration
- rollback or compensation execution
- task dispatch, execution, or promotion activation
- any mutation of `SchedulerConfig`
- any lane transition beyond in-memory recommendation

The package is expressly scoped to contract evaluation and deterministic recommendation, not production mutation.
