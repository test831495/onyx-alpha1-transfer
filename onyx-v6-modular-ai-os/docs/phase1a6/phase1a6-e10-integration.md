# Phase 1A.6 — E.10 Integration

## Purpose

`e10-runtime-adapter.ts` converts an E.10 supervised run (Command Center
Automation Center, `apps/command-center/src/automationOrchestrationService.ts`)
that has reached the `DRY_RUN_READY` state into a Phase 1A.5 workflow runtime
request, without performing any live GitHub action.

## `convertE10DryRunToRuntimeIntake(run, expectedScopeHash)`

Accepts a structural `E10DryRunReadyInput` (the same shape as E.10's
`SupervisedRun`) and an `expectedScopeHash` supplied by the caller, then:

1. Rejects any input whose `state` is not exactly `"DRY_RUN_READY"`.
2. Rejects a repository mismatch (`run.repository !== GOVERNED_REPOSITORY`).
3. Rejects a scope-hash mismatch (`run.scopeHash !== expectedScopeHash`).
4. Builds a Phase 1A.5 `WorkflowInput` from the E.10 plan (objective, allowed
   paths, base/head branch, validation plan, acceptance criteria, rollback
   plan), preserving the repository and scope hash.
5. Returns an `E10RuntimeIntake` with every remote-write flag forced `false`
   (`remoteWritesPerformed`, `branchCreated`, `issueCreated`,
   `draftPrCreated`, `mergeAllowed`, `productionDeployAllowed`,
   `forcePushAllowed`, `branchDeletionAllowed`) — these flags are `false`
   regardless of what the source E.10 run reported, because no Phase 1A.5
   workflow has been created or approved yet.

This function never calls the GitHub API, never invokes
`node:child_process`, and never mutates the E.10 run it was given.

## `previewRuntimeSnapshotFromE10Intake(intake, now)`

Produces a preview `RuntimeSnapshot` shaped exactly like a real
`RuntimeHost.snapshot()`, but before any Phase 1A.5 workflow has been
created or approved (`currentWorkflowState: "WORKFLOW_CREATED"`, no
completed capabilities, no checkpoints, no evidence, `recoveryAvailable:
false`). This lets the Automation Center display E.10 intake state using the
same snapshot shape the runtime host uses once a real workflow exists.

## What this adapter intentionally does not do

- It does not create a Phase 1A.5 `Workflow`, freeze it, or approve it — that
  remains an explicit, human-approved step using
  `@onyx/phase1a5-workflow-engine`'s `WorkflowEngine`.
- It does not execute any capability.
- It does not import or call anything from `node:child_process`.
