# Phase 1A.4B Isolated Branch Bridge

Phase 1A.4B adds the approval-gated `CREATE_ISOLATED_BRANCH` capability for the validated Phase 1A.4A Issue 7 input. It creates only a local branch through the injected adapter contract. The implementation never invokes a remote GitHub branch write and does not create a Draft PR, merge, or production deployment.

## Governed scope

- Actor: `coolscorpiorahul`
- Repository: `test831495/onyx-alpha1-transfer`
- Issue: `7`, open, titled `Phase 1A.4A Live Smoke Test`
- Base branch: `feature/phase1a4a-github-issue-bridge`
- Validated predecessor commit: `712f3546529f6eff8c37f480c0db61cad56f1b6c`
- Proposed local branch: `automation/issue-7-phase1a4b-isolated-branch-smoke`

Approval records bind Rahul Kumar, the capability, issue, repository, exact branches and base commit, scope hash, meaningful reason, issued and expiry timestamps, deterministic idempotency key, and consumed state. The bridge validates actor, repository, issue, approval, scope, expiry, branch policy, worktree cleanliness, detached HEAD, and predecessor commit through injectable checks.

## States and outcomes

The lifecycle states are `AWAITING_BRANCH_APPROVAL`, `APPROVED_FOR_BRANCH_CREATION`, `BRANCH_CREATION_IN_PROGRESS`, `BRANCH_READY_LOCAL`, `BRANCH_CREATION_FAILED_SAFE`, and `BRANCH_RECONCILIATION_REQUIRED`. Compatible local branches are reused idempotently. An incompatible existing branch is rejected. Adapter failures do not retry; uncertain outcomes require reconciliation.

Every result reports the branch name, base branch, base commit, creation/reuse outcome, idempotency result, redacted evidence, and final state. The safety flags remain `remoteBranchPushed: false`, `draftPrCreated: false`, `mergeAllowed: false`, and `productionDeployAllowed: false`.

## Validation

The focused tests use mock checks and a mock local adapter. They do not depend on ambient Git state and leave no temporary evidence files. Run `bash scripts/validate-phase1a4b.sh` from the repository root to validate the package, focused tests, shared regressions, security denials, whitespace, and prohibited-operation scans.