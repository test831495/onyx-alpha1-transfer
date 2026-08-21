# Phase 1A.4D Draft PR Bridge

This bridge enforces a single approval-gated Draft PR creation flow for Issue 7. It verifies the authenticated GitHub actor, repository, issue state, exact branch/commit binding, approval scope, evidence digest, idempotency marker, and a compatible existing Draft PR before any mock adapter is invoked.

## Safety boundaries

- Draft mode is required at all times.
- Merge remains disabled.
- Production deployment remains disabled.
- No real GitHub PR write is performed.
- No retry is attempted after provider failure or uncertain outcomes.

## Key invariants

- Capability: CREATE_DRAFT_PR
- Repository: test831495/onyx-alpha1-transfer
- Issue: #7, OPEN, "Phase 1A.4A Live Smoke Test"
- Base branch: feature/phase1a4a-github-issue-bridge
- Head branch: automation/issue-7-phase1a4b-isolated-branch-smoke
- Head commit: 712f3546529f6eff8c37f480c0db61cad56f1b6c
- Approval authority: Rahul Kumar
- Hosted evidence digest and idempotency key are bound to the exact deterministic package

## Result contract

The result includes repository, issue number, PR metadata, branch/commit details, created-vs-reused state, idempotency outcome, evidence, and final state.
