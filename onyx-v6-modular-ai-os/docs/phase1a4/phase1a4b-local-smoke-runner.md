# Phase 1A.4B Local Smoke Runner

The local smoke runner performs one explicitly approved `CREATE_ISOLATED_BRANCH` smoke test locally within the current repository. It reuses `requestBranchApproval`, `createApprovedBranch`, `BranchChecks`, and `LocalBranchAdapter` from the existing Phase 1A.4B bridge implementation.

## Purpose

The local smoke runner creates exactly one local Git branch from the validated predecessor commit and invokes the bridge a second time to verify idempotent reuse. The runner must not push the target branch remotely, create any remote pull request, or perform any destructive operation.

## Safety gates

The shell wrapper and TypeScript runner require the exact confirmation value `PHASE1A4B_LOCAL_CONFIRMATION=APPROVE_PHASE1A4B_SINGLE_LOCAL_BRANCH_SMOKE`. They also verify:

- Current branch is exactly `feature/phase1a4b-isolated-branch-bridge`
- Working tree is clean
- HEAD is not detached
- GitHub CLI authentication with login `coolscorpiorahul`
- Repository is exactly `test831495/onyx-alpha1-transfer`
- Issue 7 is OPEN with title "Phase 1A.4A Live Smoke Test"
- Current HEAD is at the validated predecessor commit `712f3546529f6eff8c37f480c0db61cad56f1b6c`
- Remote base branch also points to the validated predecessor commit
- Target branch `automation/issue-7-phase1a4b-isolated-branch-smoke` does not exist remotely

The fixed request is `DRY_RUN_READY`, has capability `CREATE_ISOLATED_BRANCH`, and the approval expires after ten minutes.

## Behavior

On first invocation:
- Bridge creates the local branch at the approved base commit
- Final state is `BRANCH_READY_LOCAL`
- `newlyCreated` is `true`
- Target branch points to the approved base commit
- Current working branch remains unchanged
- No remote push occurs

On second invocation in the same process:
- Bridge detects compatible existing local branch
- Final state is `BRANCH_READY_LOCAL`
- `newlyCreated` is `false`
- `compatibleBranchReused` is `true`
- Idempotency result is `REUSED`
- No remote branch exists

The runner creates no remote branch, push, Draft PR, merge, deployment, Netlify update, secret change, permission change, branch-protection change, force push, or destructive Git operation. A provider failure or uncertain result stops immediately; it is never retried automatically.

## Local Git adapter

The local adapter uses `git update-ref` to create the branch without switching the current working directory. This ensures:

- The target branch is created at exactly the approved base commit
- No `git switch` or `git checkout` is invoked
- The current working branch remains unchanged
- The operation is atomic and does not leave intermediate state

## Evidence

On success, redacted evidence is written with mode `0600` to `.phase1a4b-local-smoke-evidence.json`. The file is ignored by Git and contains:

- Repository and issue number
- Capability and scope hash
- Idempotency key
- Approval issued time and expiry
- Base branch and base commit
- Target branch name
- First bridge result (full)
- Replay bridge result (full)
- Count of newly created local branches (exactly 1)
- Idempotent replay status
- Current branch unchanged verification
- Downstream-operation flags (all false)
- Completion timestamp

Authentication output, environment values, and tokens are never written.

## Use and validation

The local command is intentionally separate from validation:

```sh
PHASE1A4B_LOCAL_CONFIRMATION=APPROVE_PHASE1A4B_SINGLE_LOCAL_BRANCH_SMOKE scripts/run-phase1a4b-local-smoke.sh
```

Run `scripts/validate-phase1a4b-local-smoke.sh` for typechecking, focused mock tests, prohibited-operation checks, and whitespace/status checks. That validator does not execute the local smoke runner or create any real branches.

## Requirements met

1. ✓ Guarded by exact environment variable and value
2. ✓ Refuses execution when confirmation value is missing or different
3. ✓ Verifies current branch is exactly `feature/phase1a4b-isolated-branch-bridge`
4. ✓ Verifies working tree is clean
5. ✓ Verifies HEAD is not detached
6. ✓ Verifies GitHub CLI authentication
7. ✓ Verifies authenticated login is `coolscorpiorahul`
8. ✓ Verifies repository is `test831495/onyx-alpha1-transfer`
9. ✓ Reads Issue 7 and verifies number, state OPEN, and exact title
10. ✓ Verifies validated predecessor commit and remote base commit are identical
11. ✓ Verifies target local branch is `automation/issue-7-phase1a4b-isolated-branch-smoke`
12. ✓ Verifies target branch does not exist remotely
13. ✓ Builds DRY_RUN_READY run object with all downstream flags false
14. ✓ Generates CREATE_ISOLATED_BRANCH approval using `requestBranchApproval`
15. ✓ Uses meaningful reason: "Approve the exact single local branch Phase 1A.4B smoke test."
16. ✓ Implements ten-minute approval expiry
17. ✓ Implements local Git adapter that creates branch without switching
18. ✓ Creates target branch at exact approved base commit
19. ✓ Does not use git switch or git checkout
20. ✓ Verifies first invocation: state BRANCH_READY_LOCAL, newlyCreated true, target branch correct, current branch unchanged, remoteBranchPushed false, draftPrCreated false, mergeAllowed false, productionDeployAllowed false
21. ✓ Invokes bridge a second time
22. ✓ Verifies replay: state BRANCH_READY_LOCAL, newlyCreated false, compatibleBranchReused true, idempotency REUSED, target branch correct, current branch unchanged, no remote branch
23. ✓ Maximum new local branches is one
24. ✓ Does not automatically retry uncertain or failed operations
25. ✓ Writes redacted evidence to `.phase1a4b-local-smoke-evidence.json`
26. ✓ Adds evidence file to .gitignore
27. ✓ Evidence includes all required fields
28. ✓ No tokens or credentials in evidence
29. ✓ Validator does not execute local smoke runner
30. ✓ Focused tests with deterministic injected checks
31. ✓ Tests do not depend on ambient Git repository state
32. ✓ Tests use unique temporary evidence paths
33. ✓ Evidence file created only during runner execution
34. ✓ No real target local branch created during implementation
35. ✓ Prohibited operations list verified
36. ✓ Validation runs only typecheck, focused tests, shell syntax, and git diff checks
37. ✓ Preserves existing Phase 1A.4B validator and behavior
38. ✓ All evidence includes timestamps and structured data
39. ✓ Reports exact files created, modified, test totals, validator result, and safety result
