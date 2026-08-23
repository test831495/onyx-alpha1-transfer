# Phase 1A.7 — Recovery and Reconciliation UX

## Controller guards

`LocalAutomationRuntimeController` wraps a Phase 1A.6 `RuntimeHost` and
`RecoveryHost` driven by scripted, deterministic, mock-only capability
adapters (`buildMockRegistry` from
`@onyx/phase1a6-workflow-runtime/local-runtime-simulation`). Every dashboard
action is guarded on top of the guards already enforced inside the reused
Phase 1A.6 host:

- `pause()` — rejected once the runtime has reached a terminal status
  (`COMPLETED` or `CANCELLED`), rejected if already `PAUSED`, and rejected if
  a pause request is already pending (no repeated pause).
- `resume()` — rejected unless the current status is exactly `PAUSED`.
- `cancel()` — rejected at a terminal status, and rejected while
  `reconciliationRequired` is `true` (no unsafe cancellation).
- `recover()` — rejected while `reconciliationRequired` is `true` (no
  automatic retry of an uncertain result), and rejected when
  `recoveryAvailable` is `false`.

Every action after the runtime reaches `COMPLETED` or `CANCELLED` is
rejected, including a further `runNextStep()` call.

## Recovery panel

`buildRecoveryPanelViewModel(snapshot, options)` derives, from the reused
`RuntimeSnapshot` alone:

- `lastTrustedCheckpointDigest`, `checkpointCount`, `targetState`
  (`snapshot.currentWorkflowState`), `firstIncompleteCapability`
  (`snapshot.pendingCapabilities[0]`)
- `recoveryAvailable`, computed as `snapshot.recoveryAvailable &&
  !snapshot.reconciliationRequired && (every trust check passed)`
- `blockedReason`, defaulting to an explicit reconciliation-required message
  or a trust-verification-failed message when recovery is unavailable

`options` (`scopeVerified`, `approvalVerified`, `checkpointChainVerified`,
`repositoryVerified`) are supplied by the caller from the same verification
that `RecoveryHost.recover()` already performs
(`verifyCheckpointChain`, `validateApproval`, repository and contract-version
checks) — the panel never re-implements that verification, it only displays
its result. `AutomationRecoveryPanel` never performs remote repair.

## Reconciliation panel

`AutomationReconciliationPanel` renders the Phase 1A.6
`ReconciliationHandoff` type directly (no redefinition): uncertain
operation, current state, current capability, idempotency key, resource
references, evidence references, and recommended read-only checks. It always
displays `automaticRetryPermitted`, `remoteDeletionPermitted`,
`forcePushPermitted`, `mergePermitted`, and `productionPermitted` as `false`,
and it never executes reconciliation.

## Deterministic fixtures

`PAUSED`, `FAILED_SAFE`, `RECONCILIATION_REQUIRED`, `ROLLBACK_REQUIRED`,
`COMPLETED`, and `CANCELLED` fixtures exercise every terminal and
interrupted lifecycle branch without a live workflow or the current clock.
