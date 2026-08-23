# Phase 1A.9 Wave 3D: Promotion and Evidence Contracts

## Scope and authority boundary

This Phase 1A.9 Wave 3D package is a deterministic contract and evidence projection layer for the governed scheduler. It does not activate scheduling lanes, dispatch tasks, execute promotions, or touch any Git remote surface.

The authority boundary is limited to the in-memory evaluation of candidate governance, evidence integrity, and blocking decisions. All decisions remain projection-only and are represented as structured records without execution side effects.

The scheduler remains disabled, with `schedulerEnabled = false`, `activeLaneStage = S0_SINGLE`, `runtime lane limit = 1`, `promotion lane limit = 1`, `multipleRuntimeLanesAllowed = false`, and all safety fields remain false. `promotionExecutable` remains `false` in all governance results.

No promotion is executed.
No Git operation is performed.
No merge or deployment occurs.
No rollback, recovery, or compensation is executed.
No evidence is written, uploaded, persisted, or sealed.

## PromotionController authority boundary

The `PromotionController` validates promotion candidates, evaluates eligibility, serializes eligible candidates, projects cancellation states, and projects failure disposition. It does not execute a promotion, merge, deploy, or call any Git or remote provider client.

### Candidate validation

Candidate validation is performed by `PromotionController.validateCandidate` and the supporting `PromotionCandidate` contract. The implementation checks:

- required workflow and runtime identity fields
- source task, artifact, checkpoint, and evidence references
- required validation and security evidence
- required rollback and recovery references
- fresh approval validity
- required scope equality between approved and current scope hash
- risk class enforcement requiring `R4` and rejecting `R5`
- protected promotion-only parallel safety class enforcement
- promotion lane limit enforcement
- candidate version validity and material-change gating
- target environment and policy version checks

A valid candidate is accepted only when all required governance conditions are satisfied without any prohibited promotion risk classification or stale approval.

### Fresh R4 Rahul approval

Fresh approval is required for a protected promotion candidate. The `approvalExpiresAt` value must still be valid at the evaluation time, and the `approvedScopeHash` must match the `currentScopeHash`. An expired approval or scope mismatch will reject the candidate before any serialization or promotion decision is made.

### R5 prohibition

`R5` remains prohibited under the governing promotion contract. The risk class is explicitly rejected by validation, and the candidate is blocked before any promotion serialization can be selected as a projection.

### Scope and policy validation

The promotion contract validates:

- approval policy version compatibility
- target branch and environment compatibility
- stable scope hash alignment
- material-change classification before a new approval or candidate version is accepted

This prevents stale or mismatched approvals from being treated as actionable promotion decisions.

### S5 single-lane isolation

The promotion candidate contract keeps promotion safety isolated to the S5 promotion stage with a single-lane ceiling. `promotionLaneLimit` remains `1`, and the candidate must declare `S5_PROMOTE_ONE` stage semantics. The implementation keeps promotion scheduling isolated to a single serialized candidate selection without enabling multiple runtime lanes or dispatch.

### Global promotion-lock eligibility

Promotion eligibility evaluation requires that promotion-lock, checkpoint, join, cancellation, budget, recovery, permission, memory, connector, context, validation-evidence, and security-evidence references are all present. These checks prevent a candidate from progressing to any executable state while the scheduler remains disabled and the lane stage remains `S0_SINGLE`.

### Serialization

`PromotionController.evaluateSerialization` orders candidates deterministically by `promotionCandidateId`, selects at most one eligible candidate as a projection, and leaves the remainder queued. The decision is a serialization projection only; it does not execute promotion or issue a merge/deploy command.

### Material changes

Candidate materiality is classified via `classifyMaterialChange` and is gated by source task, artifact, checkpoint, and contract-version completeness. A material change requires a new approval or candidate version before a promoted candidate could be considered eligible; otherwise the result is blocked.

### Candidate versioning and supersession

The promotion candidate model retains `candidateVersion`, `supersedesCandidateId`, and version gating. A candidate cannot supersede an earlier candidate without valid version and scope alignment. Supersession is tracked as a governance decision only; it does not trigger any remote branch mutation or deployment.

### Cancellation projection

`PromotionController.projectCancellation` projects cancellation decisions and preserves the external-effect status in the result. If the effect is uncertain, the result is routed to reconciliation instead of execution.

### Failure projection

`PromotionController.projectFailure` preserves the source task, artifact, checkpoint, validation, and security evidence references while setting promotion, merge, and deployment blocking flags. It also preserves `rollbackCandidate`, `recoveryCandidate`, and `compensationCandidate` references, but none of those actions are executed.

### Rollback and recovery references

The failure projection includes:

- `rollbackPlanReferenceId`
- `recoveryPlanReferenceId`
- `rollbackCandidate`
- `recoveryCandidate`
- `compensationCandidate`

These entries remain non-operational references for governance and reconciliation only. Automatic rollback, recovery, and compensation remain `false`.

## EvidenceEmitter authority boundary

The `EvidenceEmitter` validates evidence sequencing, registers artifact metadata, evaluates package completeness, and produces manifest projections. It does not read, write, upload, persist, or seal evidence files.

### Event sequencing

`EvidenceEmitter.validateSequence` delegates to `validateEvidenceSequence`. It rejects:

- duplicate event IDs
- duplicate logical sequence numbers
- unknown causal parents
- unauthorized cross-workflow parents
- non-monotonic event ordering
- detected causal cycles

The sequence result remains deterministic and projection-only.

### Causal graph

Evidence events carry `causalParentEventIds`. The validation routine verifies parent existence, cross-workflow guard rails, and cycle detection across the event graph. This ensures evidence provenance is reproducible and not silently corrupted.

### Artifact registration

`EvidenceEmitter.registerArtifact` rejects missing digests, invalid formats, absent provenance, absent permissions, missing redaction decisions, and invalid retention policy metadata. Valid artifacts are registered as `REGISTERED_AS_PROJECTION` only; no file is created or uploaded.

### Mandatory evidence classes

Evidence package evaluation enforces required classes and checks for:

- missing evidence classes
- invalid artifact IDs
- conflicting artifacts
- unredacted evidence
- unauthorized evidence
- provenance-invalid artifacts
- retention-invalid artifacts
- sequence invalidity
- causal graph invalidity

If any mandatory evidence class is missing or invalid, promotion is blocked and sealing remains unavailable.

### Evidence package projection

`EvidenceEmitter.evaluatePackage` calculates completeness and promotion eligibility without persisting evidence. `promotionEligible` is only `true` when the package is complete and valid; otherwise it remains `false`.

### Evidence manifest projection

`EvidenceEmitter.evaluateManifest` sorts artifact and event entries deterministically and preserves manifest metadata in a projection-only structure. It is not a live evidence registry or artifact hash publication step.

### Redaction, permissions, provenance, retention

The evidence contract enforces redaction decisions, permission decisions, provenance validity, and retention policy validity. Any violation blocks the package and prevents promotion use.

### Evidence budget behavior

The evidence package and manifest projections are capped by governance rules and required class coverage. They model evidence sufficiency and completeness without any budget spend, retrieval, or persistence activity.

### Sealing eligibility

Sealing remains a projection-only capability. `manifestEligibleForSealing` and the underlying evidence package state may report eligibility, but no live seal is performed and no artifact is treated as persisted.

### Promotion blocking conditions

Promotion remains blocked when:

- required evidence is missing or invalid
- mandatory classes are absent
- causal or sequence validation fails
- artifact metadata conflicts or is unauthorized
- provenance or retention is invalid
- redaction or permission checks fail
- the scheduler remains disabled or promotion remains a projection-only state

## Explicit non-goals

This Wave 3D package does not implement:

- promotion execution
- Git writes or branch mutation
- merge execution
- deployment execution
- rollback execution
- recovery execution
- compensation execution
- evidence persistence
- file upload or remote artifact sealing
- provider or connector execution
- child processes, workers, timers, polling, or network clients

This is a constraint-driven governance and evidence projection layer only, preserving the safety and non-execution requirements of the Phase 1A.9 bounded scheduler.
