# Phase 1A.6 — Runtime Contracts

## Versioning

| Constant | Value | Source |
| --- | --- | --- |
| `RUNTIME_CONTRACT_VERSION` | `"1.0.0"` | `packages/phase1a6-workflow-runtime/src/contracts.ts` |
| `COMPATIBLE_WORKFLOW_CONTRACT_VERSION` | `"1.0.0"` | bound to Phase 1A.5 `WORKFLOW_CONTRACT_VERSION` |

The module throws at import time if `COMPATIBLE_WORKFLOW_CONTRACT_VERSION`
ever drifts from the imported `WORKFLOW_CONTRACT_VERSION`.

## Deterministic identifiers

- `makeRuntimeId(workflow)` — a stable ID derived from the runtime contract
  version, the workflow's contract version, repository, workflow ID, and
  scope hash. Calling it twice with the same workflow identity always yields
  the same ID.
- `makeRuntimeSessionId(runtimeId, approvalDigest)` — a stable session ID
  bound to the runtime ID and the exact approval digest it is consuming.

## Adapter registry (`adapter-registry.ts`)

`AdapterRegistry` holds one `CapabilityAdapter` per Phase 1A.5 capability.
There is no generic command or shell entry point — only
`register(adapter)` and `resolve(capability)`, both of which validate the
capability against the frozen `CAPABILITIES` list:

- `register` rejects an unsupported capability and a duplicate registration.
- `resolve` rejects an unsupported capability and a missing adapter.

## Runtime host (`runtime-host.ts`)

`RuntimeHost` accepts exactly one frozen, approved Phase 1A.5 `Workflow`.
Construction validates, in order:

1. the workflow is not in `WORKFLOW_CREATED` (i.e. it has been frozen),
2. the workflow repository equals the governed repository,
3. the frozen scope has not been mutated (`digest(scope) === scopeHash`),
4. the workflow contract version is compatible,
5. an approval package is present and not already marked consumed,
6. the approval passes `validateApproval` (repository, workflow ID, contract
   version, scope hash, digest, expiry),
7. the approval's ordered capability sequence is exactly `CAPABILITIES` —
   rejecting any reordering, expansion, or reduction.

Each `runNextStep()` call re-validates the approval and the specific
capability boundary via `validateCapabilityBoundary` immediately before
invoking the adapter, writes a pre-step checkpoint, invokes the adapter, then
writes a post-step checkpoint and appends exactly one evidence entry
(reusing Phase 1A.5's `EvidenceTimeline`, including secret redaction).

Execution is strictly sequential: `laneLimit` is fixed at
`RUNTIME_EXECUTION_LANE_LIMIT` (`1`), and `run()` awaits each step before
starting the next.

### Classification handling

- `DETERMINISTIC_SUCCESS` / `COMPATIBLE_REUSE` — capability marked completed,
  workflow state advances to the capability's completed state (or
  `WORKFLOW_COMPLETED` after the last capability).
- `DETERMINISTIC_FAILURE` / `PROHIBITED_OPERATION` — retried only for
  `RUN_VALIDATION`, bounded by `workflow.scope.validationPlan.retryLimit`
  (policy controlled). Every other capability uses the default remote
  mutation retry budget of zero (`RUNTIME_DEFAULT_REMOTE_RETRY_BUDGET`), so a
  single failure immediately marks the workflow `WORKFLOW_FAILED_SAFE`.
- `UNCERTAIN_RESULT` — never retried. The workflow moves to
  `WORKFLOW_RECONCILIATION_REQUIRED`, and further `runNextStep()` calls throw
  until reconciliation is resolved out of band.

### Pause and cancellation

- `requestPause()` takes effect after the in-flight capability completes
  (never mid-step). The workflow state is recorded as `WORKFLOW_PAUSED` and
  the prior state is retained so `resume()` can restore it exactly.
- `cancel()` is only permitted at a safe checkpoint boundary: it throws if
  reconciliation is required (an uncertain remote outcome must never be
  cancelled) or if the workflow has already completed.

## Runtime snapshot (`runtime-snapshot.ts`)

`buildRuntimeSnapshot()` returns an `Object.freeze`-sealed `RuntimeSnapshot`
containing the runtime ID, workflow ID, contract version, repository, scope
hash, approval digest, current workflow state and projected status, current
step, ordered/completed/pending capabilities, checkpoint and evidence
counters, recovery/reconciliation/pause/cancel availability, the lane limit,
and the four permanently-`false` safety flags.

## Status projector (`status-projector.ts`)

`projectRuntimeStatus(state)` maps every one of the 32 Phase 1A.5 states onto
one of eleven stable `RUNTIME_STATUSES` values:
`CREATED`, `WAITING_FOR_APPROVAL`, `READY`, `RUNNING`, `PAUSED`, `COMPLETED`,
`FAILED_SAFE`, `RECONCILIATION_REQUIRED`, `ROLLBACK_REQUIRED`,
`ROLLED_BACK`, `CANCELLED`. The mapping is read-only: it never mutates the
underlying Phase 1A.5 state, and `assertCompleteStatusProjection()` proves
every state has a projection.

## Rollback (`runtime-host.ts` + Phase 1A.5 `rollback-policy.ts`)

`RuntimeHost.projectRollback(reason)` is only callable from
`WORKFLOW_FAILED_SAFE`. It transitions to `WORKFLOW_ROLLBACK_REQUIRED` and
returns a Phase 1A.5 `RollbackPolicyResult` via `classifyRollback`, which is
always policy-only: `remoteDeletionPermitted`, `forcePushPermitted`,
`mergePermitted`, and `productionActionPermitted` are always `false`.
`completeRollback()` transitions to `WORKFLOW_ROLLED_BACK` without touching
any remote resource.
