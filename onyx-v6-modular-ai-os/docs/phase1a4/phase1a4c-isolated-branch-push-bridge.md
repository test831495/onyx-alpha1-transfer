# Phase 1A.4C Isolated Branch Push Bridge

Phase 1A.4C adds a mock-only, approval-gated `PUSH_ISOLATED_BRANCH` bridge. It accepts only Issue 7, actor `coolscorpiorahul`, repository `test831495/onyx-alpha1-transfer`, and the exact Phase 1A.4B branch and commit.

The push approval is separate from the Phase 1A.4B branch-creation approval. It binds Rahul Kumar, capability, issue, repository, local and remote branch, commit, origin, scope hash, reason, expiry, idempotency key, and consumed state. The bridge permits only one normal non-force push to `origin`; it does not run Git commands or provide a live runner.

An exact existing remote commit is reusable. A different remote commit is rejected. Deterministic adapter failures become `PUSH_FAILED_SAFE`; uncertain outcomes become `PUSH_RECONCILIATION_REQUIRED`, with no automatic retry.
