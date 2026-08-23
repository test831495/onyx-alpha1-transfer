# Phase 1A.9.1 Rollback Plan

Rollback is a Git-owner action after Rahul's approval. This document does not execute it.

1. Stop at the current disabled scheduler and promotion state.
2. Preserve this closure package and the pre-existing evidence for audit.
3. Use the approved Git closure mechanism to restore the last explicitly accepted baseline if rollback is required.
4. Re-run Command Center build/typecheck, focused shell tests, Wave 4B exact tests, E.10, scheduler typecheck/tests, validator replay, and `git diff --check`.
5. Confirm no staged files, no remote mutation, and no deployment before declaring rollback complete.

Rollback must not silently alter memory, approval, connector, workflow, or operational-truth contracts.
