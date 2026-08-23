# Phase 1A.9 Wave 2A: DependencyResolver and Ready-Set Contracts

## Overview

Wave 2A implements deterministic dependency resolution and ready-set evaluation for the ONYX Phase 1A.9 Governed Scheduler. This document specifies the contracts, implementation, and safety guarantees.

## Dependency Resolution Contract

### Request Structure

The `DependencyResolutionRequest` contains:

- `dependencyResolutionRequestId`: Unique request identifier
- `schedulerConfigId`: Reference to scheduler configuration
- `workflowId`: Workflow context
- `runtimeId`: Runtime context
- `runtimeSessionId`: Session context
- `dependencyGraphId`: Graph reference (Phase 1A.8)
- `taskReferenceIds`: Task IDs to validate
- `currentWorkflowState`: Workflow state context
- `approvalDecisionIds`: Approval references (not evaluated in Wave 2A)
- `permissionDecisionIds`: Permission references (not evaluated in Wave 2A)
- `memoryDecisionIds`: Memory access references (not evaluated in Wave 2A)
- `connectorDecisionIds`: Connector scope references (not evaluated in Wave 2A)
- `contextPackageIds`: Context package references
- `checkpointDigests`: Checkpoint references
- `evidenceArtifactIds`: Evidence artifact references
- `reconciliationRecordIds`: Reconciliation references
- `promotionEligibilityIds`: Promotion eligibility references
- `laneStage`: Active lane stage
- `scopeHash`: Scope hash for validation
- `requestedAt`: Request timestamp
- `contractVersion`: Contract version (1.0.0)

### Response Structure

The `DependencyResolutionResult` contains:

- `dependencyResolutionResultId`: Unique result identifier
- `dependencyResolutionRequestId`: Request correlation
- `workflowId`: Workflow context
- `dependencyGraphId`: Graph context
- `orderedTaskIds`: Topologically sorted task IDs (stable order)
- `readyCandidateTaskIds`: Valid candidates for ready set
- `blockedTaskIds`: Tasks blocked by failed dependencies
- `failedDependencyTaskIds`: Tasks with failed predecessors
- `cancelledDependencyTaskIds`: Tasks with cancelled predecessors
- `optionalDependencyTaskIds`: Tasks with optional failures
- `cycleDetected`: Boolean flag for cycle detection
- `unknownTaskReferenceIds`: Invalid task references
- `missingDependencyReferenceIds`: Missing dependency references
- `materialDependencyChangeDetected`: Boolean for dependency changes
- `reconciliationRequired`: Boolean for reconciliation flag
- `resultClassification`: One of VALID, VALID_WITH_OPTIONAL_FAILURES, BLOCKED, FAILED_SAFE, RECONCILIATION_REQUIRED, PROHIBITED
- `decisionReasons`: Array of explanation strings
- `evidenceArtifactIds`: Evidence artifact references
- `resolvedAt`: Resolution timestamp
- `contractVersion`: Contract version (1.0.0)

### Validation Rules

#### Graph Validation

The dependency resolver performs comprehensive graph validation:

1. **Unique Task Nodes**: All task node IDs must be unique
2. **Unique Edges**: No duplicate edges (same source, target, type, required flag)
3. **Supported Edge Types**: Only Phase 1A.8 edge types (REQUIRES_COMPLETION, REQUIRES_SUCCESS, REQUIRES_EVIDENCE, REQUIRES_APPROVAL, REQUIRES_CHECKPOINT, REQUIRES_CONTEXT, REQUIRES_RECONCILIATION, REQUIRES_PROMOTION, OPTIONAL_INPUT)
4. **No Self-Dependencies**: A task cannot depend on itself
5. **Valid References**: All edge endpoints must reference existing task nodes
6. **Acyclic**: The graph must not contain cycles (detected via topological sort)

#### Task Reference Validation

1. All `taskReferenceIds` from the request must exist in the graph
2. Missing task references result in FAILED_SAFE classification

### Phase 1A.8 Dependency Edge Type Semantics

**Note**: Wave 2A does not evaluate the governing conditions for each edge type (approvals, evidence, context, etc.). Those are deferred to future waves. Wave 2A validates only graph structure.

- `REQUIRES_COMPLETION`: Predecessor must reach terminal state
- `REQUIRES_SUCCESS`: Predecessor must succeed
- `REQUIRES_EVIDENCE`: Referenced evidence must exist and be valid
- `REQUIRES_APPROVAL`: Governed approval must be valid and non-expired
- `REQUIRES_CHECKPOINT`: Referenced checkpoint must be compatible
- `REQUIRES_CONTEXT`: Context package must be valid and permission-compatible
- `REQUIRES_RECONCILIATION`: Reconciliation record must explicitly authorize progression
- `REQUIRES_PROMOTION`: Promotion prerequisite must be satisfied
- `OPTIONAL_INPUT`: Failure may permit continuation

### Topological Sort and Stable Ordering

The dependency resolver uses deterministic topological sort with stable tie-breaking:

1. Perform Kahn's algorithm on the dependency graph
2. When multiple tasks have zero in-degree (eligible), select by lexicographic task ID order
3. The resulting `orderedTaskIds` array is stable across multiple invocations
4. No reliance on object insertion order, random values, or timestamps

## Ready-Set Decision Contract

### Request Structure

The `ReadySetDecisionRequest` contains:

- `readySetDecisionId`: Unique decision identifier
- `dependencyResolutionResultId`: Correlation to dependency resolution
- `schedulerConfigId`: Scheduler configuration reference
- `workflowId`: Workflow context
- `runtimeId`: Runtime context
- `runtimeSessionId`: Session context
- `candidateTaskReferenceIds`: Tasks to evaluate for readiness
- `laneStage`: Active lane stage (S0_SINGLE in Wave 2A)
- `laneCapacity`: Maximum tasks eligible for dispatch (1 in Wave 2A)
- `approvalDecisionIds`: Approval references (not evaluated in Wave 2A)
- `permissionDecisionIds`: Permission references (not evaluated in Wave 2A)
- `memoryDecisionIds`: Memory access references (not evaluated in Wave 2A)
- `connectorDecisionIds`: Connector scope references (not evaluated in Wave 2A)
- `budgetDecisionIds`: Budget decision references (not evaluated in Wave 2A)
- `contextPackageIds`: Context package references
- `lockEligibilityDecisionIds`: Lock eligibility references (not evaluated in Wave 2A)
- `checkpointDigests`: Checkpoint references
- `recoveryDispositionIds`: Recovery disposition references (not evaluated in Wave 2A)
- `promotionEligibilityIds`: Promotion eligibility references (not evaluated in Wave 2A)
- `scopeHash`: Scope hash for validation
- `evaluatedAt`: Evaluation timestamp
- `contractVersion`: Contract version (1.0.0)

### Response Structure

The `ReadySetDecisionResult` contains:

- `readySetDecisionId`: Unique result identifier
- `workflowId`: Workflow context
- `runtimeId`: Runtime context
- `eligibleTaskIds`: Tasks eligible and selected for ready set (up to lane capacity)
- `ineligibleTaskIds`: Tasks not in ordered list
- `blockedTaskIds`: Tasks blocked by dependency resolution failure
- `reconciliationTaskIds`: Tasks requiring reconciliation
- `prohibitedTaskIds`: Tasks prohibited by policy
- `orderedTaskIds`: Complete stable order from dependency resolution
- `capacityLimitedTaskIds`: Eligible tasks beyond lane capacity
- `decisionReasonsByTask`: Mapping of task ID to reason strings
- `evidenceArtifactIds`: Evidence artifact references
- `resultClassification`: One of READY_SET_AVAILABLE, EMPTY_READY_SET, BLOCKED, REQUIRES_RECONCILIATION, PROHIBITED
- `evaluatedAt`: Evaluation timestamp
- `contractVersion`: Contract version (1.0.0)

### Eligibility Gates

A task may appear in the ready set only when:

1. Dependency resolution succeeded (VALID classification)
2. The task appears in the ordered task list
3. Lane capacity permits selection
4. Scope hash matches request scope
5. All required governance references are present (not evaluated in Wave 2A)
6. **Critical**: No task is dispatched or executed in Wave 2A

### S0 Single Lane Capacity Limit

At S0_SINGLE stage with lane capacity = 1:

1. At most one task is selected from `eligibleTaskIds`
2. Selection follows stable task order (topological + lexicographic)
3. All additional eligible tasks appear in `capacityLimitedTaskIds`
4. Capacity-limited tasks are visible in `decisionReasonsByTask`
5. No silent discarding of eligible tasks

## Material Dependency Changes

Material dependency changes invalidate prior approvals and ready-set results:

- Added required dependency edges
- Removed required dependency edges
- Changed approval dependencies
- Changed promotion dependencies
- Changed join relationships
- Modification of edge required/optional status
- Modification of edge success policy
- Modification of cancellation policy

Non-material changes (metadata-only):

- Timestamp updates
- Evidence reference updates
- Description updates

## Evidence References

The resolver and evaluator generate evidence references for:

- Graph validation (unique nodes, unique edges, supported types)
- Cycle detection
- Topological sort stability
- Task reference validation
- Dependency edge validation
- Unknown reference detection
- Ready-set capacity limitation
- Lane stage compatibility

Evidence references use the identifier scheme:

```
1a9:schedulerEvidenceArtifactId:<component>:<context>
```

## Security and Prohibited Actions

Wave 2A explicitly does NOT:

- Execute or dispatch tasks
- Activate scheduler lanes
- Enable the scheduler
- Create runtime workers
- Use Promise.all for task execution
- Acquire leases or locks
- Write checkpoints
- Execute cancellation or recovery
- Consume budgets
- Call connector APIs or access live content
- Modify durable memory
- Call model providers
- Render UI
- Create pull requests or mutations on GitHub
- Modify predecessor packages
- Weaken Wave 1 tests

A task appearing in `eligibleTaskIds` does NOT imply:

- Dispatch authority
- Execution authority
- Permission grant
- Memory access grant
- Connector access grant
- Budget grant
- Promotion authority

## Determinism Guarantees

- Topological sort is deterministic (Kahn's algorithm with lexicographic tie-breaking)
- Ready-set ordering is deterministic (stable across evaluations)
- No use of:
  - Current time for ordering
  - Random values
  - Non-deterministic object insertion order
  - Floating-point comparisons
  - Ambient Git or process state

## Test Coverage

### T04: Cycle Detection

- Direct cycles (A → B → A)
- Self-dependencies (A → A)
- Multi-task cycles (A → B → C → A)
- Valid graph passes without cycle flag

### T05: Stable Ready-Set Ordering

- Lexicographic ordering for independent tasks
- Topological precedence over lexicographic order
- Stable ordering across repeated evaluations
- S0 single lane capacity selects at most one task
- Capacity-limited tasks remain visible
- No task dispatch in ready-set

## Contract Versions

- `PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION`: 1.0.0
- `PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION`: 1.0.0

## Integration Points

- **Phase 1A.8**: Reuses `TaskDependencyGraph`, `TaskDependencyEdge`, `TASK_DEPENDENCY_EDGE_TYPES`, topological sort
- **Phase 1A.5**: References workflow states (not evaluated)
- **Phase 1A.6**: References runtime state (not evaluated)
- **Phase 1A.9 Wave 1**: Leverages scheduler configuration and lane stages

## Future Waves

Future waves will implement:

- Approval evaluation
- Evidence validation
- Checkpoint compatibility
- Context package validation
- Memory access evaluation
- Connector scope evaluation
- Budget eligibility
- Lock and lease evaluation
- Recovery disposition
- Promotion eligibility
- Task dispatch
- Lane activation
- Checkpoint writing
- Live evidence emission
