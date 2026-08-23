# Phase 1A.9 Wave 3A: Cancellation Controller and Join Coordinator Contracts

**Status**: Contract-only implementation (no execution, no dispatch, no runtime activation)
**Wave**: Wave 3A (Cancellation and Join Barriers)
**Test Matrix**: T14 (Cancellation), T15-T17 (Join)

## Overview

Wave 3A implements deterministic, evaluation-only contracts for:
1. **Cancellation Controller** - handling task cancellation states and propagation
2. **Join Coordinator** - managing multi-task synchronization with 6 merge policies

All behavior is contract-based, deterministic, and requires explicit evaluation calls. No background schedulers, no automatic transitions, no task dispatch.

## Cancellation Controller

### States (9 states)

The cancellation state machine defines how a task cancellation request progresses:

- **REQUESTED**: Initial state when cancellation is requested
- **ACKNOWLEDGING**: Cancellation has been acknowledged, waiting for participants
- **WAITING_FOR_SAFE_BOUNDARY**: Leased task waiting for acknowledgements at safe boundary
- **PARTIALLY_ACKNOWLEDGED**: Some participants have acknowledged, propagation in progress
- **BLOCKED_BY_UNCERTAINTY**: Cannot proceed due to uncertainty (join participants, promotion in flight)
- **CANCELLED**: Cancellation complete, all participants acknowledged
- **FAILED_SAFE**: Safe failure due to incompatibility (e.g., promotion in flight)
- **RECONCILIATION_REQUIRED**: Uncertain outcome, requires manual intervention
- **PROHIBITED**: Cancellation not allowed due to authorization or contract violations

### Context Types

Cancellation applies to different task lifecycle stages:

- `QUEUED_TASK`: Task waiting in queue for assignment
- `LEASED_TASK`: Task currently leased to a worker
- `PARENT`: Parent task cancellation affects children
- `PROMOTION`: Task in promotion lane
- `REPEAT`: Repeated task instance

### Evaluation Function

```typescript
function evaluateCancellationStateTransition(
  request: CancellationRequest,
  requesterIsAuthorized: boolean,
  isRequesterSameAgent: boolean
): CancellationEvaluationResult
```

**Decision outputs**:
- `CANCELLATION_ACKNOWLEDGED`: Move to ACKNOWLEDGING, await participants
- `AWAITING_SAFE_BOUNDARY`: Wait for safe point (leased tasks)
- `PARTIALLY_ACKNOWLEDGED_CONTINUE`: Continue with partial acks, propagate
- `BLOCKED_DEFER_DECISION`: Deferred due to uncertainty
- `CANCELLATION_COMPLETE`: All conditions met, move to CANCELLED
- `FAILED_SAFE_REQUIRED`: Safe failure mode (promotion conflict)
- `RECONCILIATION_REQUIRED`: Uncertain state needs manual review
- `CANCELLATION_PROHIBITED`: Authorization or contract violation

### Propagation

```typescript
function evaluateCancellationPropagation(
  request: CancellationPropagationRequest,
  targetTaskStates: Record<string, CancellationState>
): PropagationDecision
```

Determines which target tasks can receive cancellation:
- **DOWNSTREAM**: Parent → children propagation
- **UPSTREAM**: Child → parent notification
- Validates direction matches relationship
- Blocks propagation if source is uncertain
- Returns allowed, denied, and reconciliation lists

### Acknowledgements

```typescript
function evaluateCancellationAcknowledgement(
  request: CancellationAcknowledgementRequest,
  allPendingAcknowledgements: readonly string[],
  otherJoinParticipantsReady: boolean
): AcknowledgementResult
```

Validates individual acknowledgements:
- Join participants block if others not ready
- Unexpected IDs rejected
- "Not ready" rejections respected
- Calculates when all acks received

## Join Coordinator

### Policies (6 policies)

Different merge semantics for multi-task joins:

#### ALL_SUCCESS
- **Requirement**: All participants must succeed
- **Failure**: Any failure or cancellation fails the join
- **Release**: Only when all satisfied
- **Use case**: AND logic, strict synchronization

#### MINIMUM_SUCCESS
- **Requirement**: At least N participants succeed
- **Failure**: Cannot reach minimum due to failures/cancellations
- **Release**: When minimum met
- **Use case**: Quorum-based decisions, flexible thresholds

#### FIRST_VALID
- **Requirement**: First success satisfies join
- **Failure**: All participants fail or cancel
- **Release**: On first success
- **Use case**: OR logic, any-of semantics

#### COLLECT_ALL
- **Requirement**: All participants reach terminal state (any outcome)
- **Failure**: Never fails, collects results
- **Release**: When all reach terminal state
- **Use case**: Aggregation, result collection

#### ORDERED_MERGE
- **Requirement**: Participants succeed in sequence order
- **Failure**: Out-of-order failure or cancellation
- **Release**: When all in sequence succeed
- **Use case**: Ordered pipelines, stage gates

#### REVIEW_GATE
- **Requirement**: External human review
- **State**: Always BLOCKED until external approval
- **Release**: On external review completion
- **Use case**: Approval workflows, manual gates

### States (8 states)

- **WAITING**: Collecting participant results
- **PARTIALLY_SATISFIED**: Some but not all conditions met
- **SATISFIED**: Join conditions met, ready to release
- **BLOCKED**: Join blocked by policy (REVIEW_GATE) or uncertainty
- **FAILED_SAFE**: Join failed, safe failure applied
- **RECONCILIATION_REQUIRED**: Uncertain outcome
- **CANCELLED**: All participants cancelled
- **RELEASED**: Join released, parent task can continue

### Evaluation Function

```typescript
function evaluateJoinCoordination(
  request: JoinCoordinatorRequest,
  minimumSuccessThreshold?: number
): JoinEvaluationResult
```

Routes to policy-specific evaluator, returns:
- Decision (join state transition)
- Target state after evaluation
- Whether parent task can be released
- Satisfied and blocked participant lists
- Denial reasons if applicable

### Threshold Calculation

```typescript
function evaluateJoinThresholdCalculation(
  request: JoinThresholdCalculationRequest
): ThresholdCalculationResult
```

Calculates minimum success requirements:

- **STRICT**: Require exact configured count
- **LENIENT**: Allow specified failures/cancellations
- **ADAPTIVE**: Dynamic based on 50% or required, whichever is higher

Validates constraints:
- Total participants > 0
- Required count within valid range
- Failure + cancel + success ≤ total participants

### Participant Ordering

```typescript
function evaluateJoinParticipantOrdering(
  request: JoinParticipantOrderingRequest
): ParticipantOrderingResult
```

Applies stable lexicographic sort:
1. Primary: priority (ascending)
2. Secondary: participantId (lexicographic)

Detects cycles in dependency graph:
- Rejects circular dependencies
- Validates DAG structure
- Returns topologically consistent ordering

### Timeout Classification

```typescript
function classifyJoinTimeout(
  request: JoinTimeoutRequest
): TimeoutClassificationResult
```

Classifies timeout status:
- **HEALTHY**: Well within deadline
- **WARNING**: Approaching deadline (2x threshold)
- **APPROACHING_DEADLINE**: Near deadline (< threshold)
- **EXCEEDED**: Past deadline, recovery required
- **INDETERMINATE**: Invalid timestamp configuration

Provides time remaining in milliseconds.

### State Recovery

```typescript
function evaluateJoinStateRecovery(
  request: JoinStateRecoveryRequest
): RecoveryDecision
```

Routes recovery based on timeout classification:
- **CONTINUE_WAITING**: Healthy state, no action
- **INITIATE_RECOVERY_PROTOCOL**: Progress made, prepare recovery
- **ESCALATE_TO_RECONCILIATION**: No progress, require manual intervention
- **SAFE_STOP**: Indeterminate state, stop safely

## Implementation Details

### Determinism Guarantees

All functions are:
- **Deterministic**: Same inputs produce same outputs
- **Stateless**: No side effects or global state mutations
- **Synchronous**: No async operations, timers, or worker threads
- **Projection-only**: Evaluate future state without executing transitions

### No Execution Surfaces

Explicitly prevented:
- No task dispatch
- No scheduler activation
- No lease acquisition
- No lock acquisition
- No checkpoint writes
- No join execution
- No cancellation execution
- No recovery execution
- No promotion execution
- No memory writes
- No model API calls
- No GitHub writes

### Contract Validation

All request types include:
- Version checking (must match PHASE1A9_SCHEDULER_CONTRACT_VERSION = "1.0.0")
- Required identifier validation
- State validity checking
- Type assertions via `assertXRequest()` functions

## Test Coverage

### Cancellation Tests (T14)
- T14-A to T14-X: State transitions, parent/child propagation, acknowledgements
- T14-Y: Verify 9 states exist
- T14-Z, T14-AA: Precondition verification (no execution)

### Join Tests (T15-T17)
- T15-A to T15-O: All 6 policies tested with multiple scenarios
- T16-A to T16-H: Threshold calculation and participant ordering
- T17-A to T17-J: Timeout classification and state recovery
- T17-K to T17-O: Contract validation
- T17-P to T17-T: Precondition verification

## Contract Versions

- **Cancellation Controller**: 1.0.0
- **Join Coordinator**: 1.0.0
- **Join Thresholds**: 1.0.0 (embedded)
- **Join Timeout**: 1.0.0 (embedded)

All versions validated against `PHASE1A9_SCHEDULER_CONTRACT_VERSION = "1.0.0"`.

## Integration Points

Exported from `@onyx/phase1a9-governed-scheduler`:

```typescript
// Cancellation
export { evaluateCancellationStateTransition, evaluateCancellationPropagation, evaluateCancellationAcknowledgement }
export type { CancellationRequest, CancellationEvaluationResult, CancellationState }

// Joins
export { evaluateJoinCoordination, evaluateJoinThresholdCalculation, evaluateJoinParticipantOrdering }
export { classifyJoinTimeout, evaluateJoinStateRecovery }
export type { JoinCoordinatorRequest, JoinEvaluationResult, JoinPolicy, JoinState }
```

## Future Waves

Wave 3A defines contracts only. Future implementations will:
- **Wave 4**: Add recovery protocol execution (reconciliation)
- **Wave 5**: Add join execution with actual participant coordination
- **Wave 6**: Add promotion lane cancellation handling
- **Wave 7**: Integrate with memory and ledger systems

All future waves must maintain backward compatibility with Wave 3A contracts.
