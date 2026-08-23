# Phase 1A.4D.1 guarded live Draft PR runner

This runner wraps the validated Phase 1A.4D bridge and requires a single explicit confirmation token:

PHASE1A4D_LIVE_CONFIRMATION=APPROVE_PHASE1A4D_SINGLE_DRAFT_PR

It enforces the exact repository, issue, implementation branch, clean worktree, non-detached HEAD, GitHub CLI authentication, actor identity, exact branch and commit binding, and one-time approval replay behavior. The runner never executes a live shell command from the core file and uses argument arrays for its GitHub adapter calls.

The adapter logic is intentionally bounded to the exact Draft PR creation path. It does not allow ready-for-review conversion, merge, auto-merge, close, reopen, branch deletion, force push, production deployment, Netlify updates, secret changes, permission changes, branch-protection changes, or arbitrary repository/base/head selection.

Evidence is written to a stable absolute path rooted at the repository root as `.phase1a4d-live-draft-pr-evidence.json`. The file contains the repository, issue, capability, scope hash, evidence digest, idempotency key, approval timestamps, base and head branch metadata, the Draft PR title, first result, replay result, PR number, URL, count of new PRs, replay status, and safety flags.

The live runner is never executed during development validation. The project uses mock adapters and deterministic checks to validate safety rules without creating a live pull request.
