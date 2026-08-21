# Phase 1A.4C.1 Live Isolated-Branch Push Runner

The live runner is a guarded terminal entry point around the validated Phase 1A.4C bridge. It requires `PHASE1A4C_LIVE_CONFIRMATION=APPROVE_PHASE1A4C_SINGLE_BRANCH_PUSH`, the exact implementation branch, a clean non-detached worktree, authenticated actor `coolscorpiorahul`, repository `test831495/onyx-alpha1-transfer`, Issue 7, and the exact local branch and approved commit.

Real command execution is isolated in `git-push-adapter.ts`, which accepts only `origin`, the exact branch, the exact commit, and the identical branch refspec. The runner creates a fresh capability-specific approval, performs one normal push, invokes the bridge again for compatible replay, and writes credential-safe evidence to `.phase1a4c-live-push-evidence.json` at the repository root.

The validation script never invokes the live runner and verifies that the remote automation branch remains absent. Live execution is intentionally a separate, explicitly confirmed operation.
