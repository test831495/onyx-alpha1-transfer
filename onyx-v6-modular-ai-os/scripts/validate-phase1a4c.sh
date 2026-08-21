#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
src=packages/phase1a4c-push-bridge/src/index.ts
tests=packages/phase1a4c-push-bridge/tests/push-bridge.test.ts

echo "[1/10] required files"
for file in packages/phase1a4c-push-bridge/package.json packages/phase1a4c-push-bridge/tsconfig.json "$src" "$tests" docs/phase1a4/phase1a4c-isolated-branch-push-bridge.md; do test -f "$file"; done

echo "[2/10] states, capability, and bindings"
for value in AWAITING_PUSH_APPROVAL APPROVED_FOR_ISOLATED_BRANCH_PUSH PUSH_IN_PROGRESS BRANCH_PUSHED_REMOTE PUSH_FAILED_SAFE PUSH_RECONCILIATION_REQUIRED PUSH_ISOLATED_BRANCH coolscorpiorahul test831495/onyx-alpha1-transfer 'PUSH_ISSUE_NUMBER = 7' 'Phase 1A.4A Live Smoke Test' automation/issue-7-phase1a4b-isolated-branch-smoke PUSH_COMMIT PUSH_REMOTE scopeHash idempotencyKey consumed; do grep -Fq "$value" "$src"; done

echo "[3/10] security test coverage"
for value in "missing approval" "wrong actor" "wrong repository" "wrong issue" "closed issue" "wrong issue title" "wrong capability" "expired approval" "scope-hash mismatch" "idempotency-key mismatch" "dirty worktree" "detached HEAD" "missing local branch" "wrong local commit" "protected branch" "invalid branch name" "remote absent" "compatible remote reuse" "incompatible remote rejection" "force push rejection" "branch deletion rejection" "arbitrary remote rejection" "arbitrary refspec rejection" "idempotent replay" "no duplicate push"; do grep -Fq "$value" "$tests"; done

echo "[4/10] focused package checks"
pnpm --filter @onyx/phase1a4c-push-bridge typecheck
pnpm --filter @onyx/phase1a4c-push-bridge test

echo "[5/10] predecessor and shared checks"
pnpm --filter @onyx/github-automation typecheck
pnpm --filter @onyx/github-automation test
pnpm --filter @onyx/phase1a4b-branch-bridge typecheck
pnpm --filter @onyx/phase1a4b-branch-bridge test
bash scripts/validate-phase1a4a.sh
bash scripts/validate-phase1a3e10.sh

echo "[6/10] shell and prohibited operations"
bash -n scripts/validate-phase1a4c.sh
if grep -REn 'git push|gh issue create|gh pr create|gh pr merge|netlify deploy|force-push|branch deletion|git reset --hard|git clean -fd|child_process|execSync|spawnSync' packages/phase1a4c-push-bridge/src; then exit 1; fi

echo "[7/10] safety flags"
for value in 'forcePushUsed: false' 'branchDeleted: false' 'draftPrCreated: false' 'mergeAllowed: false' 'productionDeployAllowed: false' 'force: false' 'delete: false'; do grep -Fq "$value" "$src"; done

echo "[8/10] diff and whitespace"
git diff --check

echo "[9/10] no live branch write"
! grep -REn 'git push|git checkout|git switch|git add|git commit|git tag' packages/phase1a4c-push-bridge/src

echo "[10/10] Phase 1A.4C validation passed"
