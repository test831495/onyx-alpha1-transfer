# Phase 1A.4A Live Smoke Runner

The live runner performs one explicitly approved `CREATE_GITHUB_ISSUE` smoke test against `test831495/onyx-alpha1-transfer`. It reuses `GhWriteCommandRunner`, `GitHubApprovalGatedWriteAdapter`, `InMemoryIdempotencyStore`, `requestIssueApproval`, and `createApprovedIssue` from the existing bridge.

## Safety gates

The shell wrapper and TypeScript runner require the exact confirmation value `PHASE1A4A_LIVE_CONFIRMATION=APPROVE_PHASE1A4A_SINGLE_ISSUE_SMOKE`. They also require the expected branch, a clean worktree, successful `gh auth status`, login `coolscorpiorahul`, and the exact repository. The fixed request is `DRY_RUN_READY`, has capability `CREATE_GITHUB_ISSUE`, and expires after ten minutes.

The runner creates no branch, push, Draft PR, merge, deployment, Netlify update, secret change, permission change, branch-protection change, force push, or destructive Git operation. A provider failure or uncertain result stops immediately; it is never retried automatically.

## Evidence

On success, redacted evidence is written with mode `0600` to `.phase1a4a-live-smoke-evidence.json`. The file is ignored by Git and contains the deterministic scope hash, idempotency key, approval timestamps, both bridge results, issue number and URL, one new issue count, replay status, downstream-operation flags, and completion time. Authentication output and environment values are never written.

## Use and validation

The live command is intentionally separate from validation:

```sh
PHASE1A4A_LIVE_CONFIRMATION=APPROVE_PHASE1A4A_SINGLE_ISSUE_SMOKE scripts/run-phase1a4a-live-smoke.sh
```

Run `scripts/validate-phase1a4a-live-smoke.sh` for typechecking, focused mock tests, the Phase 1A.4A validator, prohibited-operation checks, and whitespace/status checks. That validator does not execute the live command.