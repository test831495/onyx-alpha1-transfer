# Phase 1A.8 Acceptance and Simulation Audit

This Wave 4B record is an acceptance audit for the contract-only Phase 1A.8
package. It does not claim production readiness, scheduler readiness, Git
closure, branch push, or tag completion.

## Acceptance IDs

The acceptance manifest records all 29 IDs: P18-CONTRACT, P18-AGENT,
P18-CAPABILITY, P18-TASK, P18-LEASE, P18-HEARTBEAT, P18-RECOVERY,
P18-DEPENDENCY, P18-LOCK, P18-CAS, P18-EVIDENCE, P18-CANCELLATION, P18-JOIN,
P18-AGGREGATION, P18-APPROVAL, P18-PERMISSION, P18-CONNECTOR, P18-BUDGET,
P18-MEMORY, P18-PERSONA, P18-CONTEXT, P18-POISONING, P18-COUNCIL, P18-DRAFT,
P18-PROMOTION, P18-UX-CONTRACT, P18-ACCESSIBILITY, P18-SECURITY, and
P18-SIMULATION. Each entry identifies implementation symbols, existing test
files, validation, evidence, status, and this documentation reference.

## Simulation inventory

The 44 registered scenarios are:

SIM_AGENT_REGISTRATION, SIM_CAPABILITY_DECLARATION, SIM_TASK_DEPENDENCY_GRAPH,
SIM_LEASE_HEARTBEAT, SIM_ABANDONED_TASK_RECOVERY, SIM_LOCK_CONFLICT,
SIM_CHECKPOINT_CAS_APPLIED, SIM_CHECKPOINT_CAS_STALE_WRITER,
SIM_PARALLEL_READ_ELIGIBILITY, SIM_SEQUENTIAL_MUTATION_REJECTION,
SIM_PARALLEL_EVIDENCE_MERGE, SIM_CROSS_AGENT_CANCELLATION,
SIM_CANCELLATION_BLOCKED_BY_UNCERTAINTY, SIM_JOIN_BARRIER_RELEASE,
SIM_JOIN_BARRIER_BLOCKED, SIM_DETERMINISTIC_AGGREGATION,
SIM_PROMOTION_LANE_REJECTION, SIM_MEMORY_TIER_RETRIEVAL,
SIM_M1_TO_M2_PROMOTION, SIM_MEMORY_CORRECTION, SIM_MEMORY_SUPERSESSION,
SIM_MEMORY_DELETION, SIM_TOMBSTONE_PROPAGATION,
SIM_DELETED_MEMORY_NON_RESURRECTION, SIM_MEMORY_POISONING_QUARANTINE,
SIM_CONTEXT_ASSEMBLY, SIM_CONTEXT_PROVENANCE_FAILURE,
SIM_MODEL_ROUTING_LOCAL_FIRST, SIM_MODEL_ROUTING_BUDGET_FALLBACK,
SIM_CONNECTOR_ACCOUNT_ISOLATION, SIM_COUNCIL_MODE_AGREEMENT,
SIM_COUNCIL_MODE_DISAGREEMENT, SIM_COUNCIL_MODE_RAHUL_APPROVAL_REQUIRED,
SIM_SAVED_DRAFT_RESUME, SIM_SAVED_DRAFT_SAME_SCOPE_UPDATE,
SIM_SAVED_DRAFT_MATERIAL_VERSION, SIM_AUTOMATION_CENTER_V2_PROJECTION,
SIM_ACCESSIBILITY_RELEASE_ALLOWED, SIM_ACCESSIBILITY_RELEASE_BLOCKED,
SIM_COMPATIBILITY_VERSIONS, SIM_ACTIVE_RUNTIME_LANE_LIMIT,
SIM_SECURITY_BOUNDARY_REJECTION, SIM_P0_MUTATION_REJECTION, and
SIM_COMPLETE_FAIL_SAFE.

Every scenario has explicit contract groups, fixtures, result, evidence class,
risk class, parallel-safety class, literal false live-action permission, and
contract version. The runner resolves every ID, validates every fixture, emits
one evidence reference per scenario, and includes every result in the digest
and final counts.

## Reconciliation and determinism

SIM_COMPLETE_FAIL_SAFE is the single intentional
RECONCILIATION_REQUIRED scenario. It preserves evidence, audit references,
checkpoint lineage, and false safety flags while preventing retry,
reassignment, join release, promotion, invalid context creation, and
accessibility release. The focused test proves 44 scenarios, 43 PASS, one
reconciliation, and zero unexpected failures.

Two complete runs use the fixed clock and identifier source and are equal in
scenario order, classifications, evidence order, identifiers, result digest,
final evidence digest, and counts. No actual concurrency or remote operation
is used.

## Security and compatibility proof

The audit checks all eight governed safety flags as literal false defaults and
scans governed production source for executable shell, child-process, worker,
remote GitHub, connector, model, database, vector-store, cache, and paid API
surfaces. The denylist definition file is excluded from its own substring
scan. The package reuses the Phase 1A.5 workflow contract 1.0.0, Phase 1A.6
runtime contract 1.0.0, and Phase 1A.7 UI contract 1.0.0, including all 32
workflow states by reference.

The active runtime limit is one and the protected promotion lane is one.
Operation class, parallel-safety class, and risk class remain independent.
M0-M5 and P0 preserve their lifecycle boundaries; P0 has no writer path and
ONYX/NOVA remain distinct. Council agreement does not approve itself or alter
P0. Saved Draft material changes invalidate approval and create a new version.
Approval and recovery projections expose governance context and retain unsafe
mutation flags as false. Accessibility FAIL, NOT_EVALUATED, BLOCKED, and
REQUIRES_REMEDIATION block release; NOT_APPLICABLE requires justification.
Agent Activity excludes chain-of-thought and Evidence Viewer requires a
complete package.

## Known exclusions and next phase

There is no scheduler, no multi-lane execution, no live connector or GitHub
operation, no model call, no durable memory write, no deployment authority,
and no UI rendering in this audit. Phase 1A.9 prerequisites remain bounded
scheduler design, controlled lane execution, and its separate validation
evidence. Wave 4C owns predecessor package regressions and is intentionally
outside this audit.