# Phase 1A.9 Simulation and Fault Injection

## Authority boundary

This Wave 5A module is a deterministic local simulation layer for the Phase 1A.9 governed scheduler. It is not execution. It does not dispatch tasks, acquire leases, write checkpoints, launch workers, mutate memory, invoke Council, persist drafts, call providers, or execute promotion flows.

The simulation authority boundary remains limited to:

- scenario definition and validation
- deterministic event and decision projection
- deterministic digest generation for replay verification
- fault injection registration and classification
- failure matrix coverage checks
- evidence artifact references and scenario coverage projection
- safety-state comparison against the frozen scheduler safety profile

This simulation is not a live scheduler, runtime, or execution host. It never activates a scheduler stage, increases lane limits, or exposes executable operator actions.

## Simulation contract

The simulation contract is defined in `packages/phase1a9-governed-scheduler/src/local-simulation/simulation-contracts.ts` and enforces the schema used for deterministic scheduler scenarios and results.

Required fields for a scenario include:

- scenario ID and version
- covered acceptance IDs and T IDs
- initial scheduler config, workflow state, and runtime state
- task, dependency, lane, lease, heartbeat, lock, checkpoint, cancellation, join, budget, recovery, promotion, evidence, memory, Council, draft, and connector fixtures
- fault injections
- fixed timestamps
- expected events and decisions
- expected final projection
- expected evidence classes
- expected recovery disposition
- expected safety state
- expected result classification
- contract version

The scenario schema is intentionally strict. Incomplete or inconsistent scenarios are rejected.

## Scenario registry

The scenario registry is defined in `packages/phase1a9-governed-scheduler/src/local-simulation/scenario-registry.ts`.

Wave 5A contains a deterministic, read-only simulation registry for the scheduler. The registry is intentionally scoped to the local simulation package and does not alter any Phase 1A.8 predecessor scenario definitions. The predecessor registry remains 44 scenarios with 43 PASS results and one intentional reconciliation scenario.

The implementation includes the following deterministic scenario IDs:

- SIM_A1_SCHEDULER_DISABLED
- SIM_B1_CYCLE_REJECTION
- SIM_B2_STABLE_ORDERING
- SIM_C1_S0_CAPACITY
- SIM_C2_S1_DENIED
- SIM_D1_LEASE_RACE
- SIM_D2_HEARTBEAT_LOSS

These keep the registry focused on authority, dependencies, lane constraints, leases, and heartbeat treatment while preserving the frozen safety state.

## Determinism rules

Determinism is enforced by these rules:

- fixed ISO timestamps are used for scenario setup and replay
- event ordering is stable
- decision ordering is stable
- final projection values are derived from scenario fixtures and expected outcomes
- evidence classes are deterministic
- recovery disposition is derived from scenario expectations
- digest inputs are assembled from stable IDs and timestamps
- no wall-clock time, random values, workers, timers, filesystem timestamps, or network state are used

Replay verification compares the same scenario and same fixtures across runs. Any mismatch triggers a nondeterministic result classification.

## Fixed timestamps and IDs

Each local simulation scenario includes fixed timestamps such as:

- scenarioStartedAt
- leaseAcquiredAt
- heartbeatExpectedAt
- lockAcquiredAt
- checkpointCreatedAt
- taskCompletedAt
- simulationEvaluatedAt

They are generated from a fixed base time and remain stable across reruns. Scenario and fault IDs are deterministic and explicitly named; there are no generated random IDs in the simulation path.

## Fault-injection model

Fault injection is defined in `packages/phase1a9-governed-scheduler/src/local-simulation/fault-injection.ts` and is intentionally limited to scenario-level contract validation, not execution.

The accepted fault classes include dependency, lease, heartbeat, lock, checkpoint, cancellation, join, budget, evidence, external state, approval, permission, memory, Council, draft, connector, and promotion failures. The registry validates duplicate IDs and unknown classes, and uses a fixed activation point plus an expected disposition.

Matches in documentation or deny-lists are not executable findings. There is no runtime access to providers, memory, child processes, workers, timers, polling, or task execution.

## Result classifications

The simulation result model includes these classifications:

- PASS
- EXPECTED_BLOCK
- EXPECTED_RECONCILIATION
- EXPECTED_FAILED_SAFE
- EXPECTED_PROHIBITED
- UNEXPECTED_FAILURE
- UNEXPECTED_SUCCESS
- NONDETERMINISTIC_RESULT
- INVALID_SCENARIO

These classifications preserve fail-safe behavior and provide deterministic outcomes for scenario validation without live scheduling.

## Replay validation

Replay validation is performed through the scheduler simulation runner. The same scenario run twice with the same inputs must produce the same:

- event ordering
- decision ordering
- final projection
- evidence classes
- recovery disposition
- digest input
- safety state

The runner also checks that a governed fixture change produces a detectable difference, unknown scenarios are rejected, duplicate scenarios are rejected, invalid faults are rejected, prohibited operations are detected, and safety mismatches are flagged.

## Cross-contract chains

The simulation layer intentionally cross-references the scheduler contract, the failure matrix, and the evidence model. The event and decision flow remains deterministic, and failure signal chains are preserved as scenario-level assertions rather than live execution. The implementation stays within the read-only governance boundary.

## Failure matrix

The failure matrix is defined in `packages/phase1a9-governed-scheduler/src/local-simulation/failure-matrix.ts`.

It preserves primary dispositions, allowed secondary dispositions, retry and resume prohibitions, provider-truth requirements, Rahul-decision requirements, lane reduction, required evidence, scenario coverage, P19 coverage, and T coverage. It does not weaken prior fail-safe rules.

## T01-T40 scenario mapping

Wave 5A is a local-simulation validation layer and must not change the ownership of predecessor implementation waves.

The ownership preservation is:

- T01-T25 remain existing approved waves
- T28-T29 remain WAVE_4B
- T31-T40 remain WAVE_4A
- T26, T27, T30 retain their existing ownership unless prior implementation evidence established otherwise

The simulation registry is evidence-only and does not replace implementation ownership. Wave 5A is limited to deterministic coverage and validation metadata.

## Phase 1A.8 44-scenario preservation

The Phase 1A.8 scenario registry remains authoritative and unmodified. The Wave 5A local-simulation package does not reconstruct, edit, or replace predecessor scenarios. The preserved baseline is:

- 44 scenarios total
- 43 PASS
- 1 intentional RECONCILIATION_REQUIRED
- 0 unexpected failures

## Phase 1A.9 scenario count

The Wave 5A registry intentionally contains a minimal deterministic set of scenarios that validate the local-simulation contract, failure-injection registry, and safety-state freeze. It is not a production execution simulator and not a live operational scheduler.

## Evidence projections

Evidence artifacts are generated as deterministic references against the scenario and failure matrix. The evidence model is intentionally read-only; it does not persist final evidence or write any artifacts to the repository or runtime.

## Safety-state assertions

The simulation asserts that the scheduler remains in the frozen governance state:

- schedulerEnabled = false
- activeLaneStage = S0_SINGLE
- runtime lane limit = 1
- promotion lane limit = 1
- multipleRuntimeLanesAllowed = false
- promotionExecutable = false
- all safety fields = false

The simulation must preserve those safety invariants across all scenarios and fault injections.

## Known limitations

This simulation intentionally does not claim final Phase 1A.9 acceptance. It does not perform live execution, and it does not make real scheduling or promotion decisions. It is only a deterministic local validation layer.

## Explicit non-goals

The simulation does not:

- enable the scheduler
- activate later stages
- increase lane limits
- dispatch tasks
- execute recovery, retry, resume, or reassignment
- acquire locks or leases
- write checkpoints
- access memory or connectors
- invoke Council agents
- persist drafts
- query providers
- invoke models
- perform paid API calls
- execute promotion
- perform Git writes
- create or update pull requests
- merge or deploy
- persist final evidence

Provider outcomes in this simulation are synthetic fixtures only.
