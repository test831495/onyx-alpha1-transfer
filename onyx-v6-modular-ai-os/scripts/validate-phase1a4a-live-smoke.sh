#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
runner="packages/phase1a4a-issue-bridge/src/live-smoke.ts"
tests="packages/phase1a4a-issue-bridge/tests/issue-bridge.test.ts"

echo "[1/13] required runner files"
test -f "$runner"
test -f scripts/run-phase1a4a-live-smoke.sh
test -f "$tests"
test -f docs/phase1a4/phase1a4a-live-smoke-runner.md
grep -Fq '.phase1a4a-live-smoke-evidence.json' .gitignore

echo "[2/13] confirmation, repository, actor, and dry-run guards"
grep -Fq 'APPROVE_PHASE1A4A_SINGLE_ISSUE_SMOKE' "$runner"
grep -Fq 'test831495/onyx-alpha1-transfer' "$runner" packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'coolscorpiorahul' "$runner"
grep -Fq 'DRY_RUN_READY' "$runner"
grep -Fq 'CREATE_GITHUB_ISSUE' "$runner" packages/phase1a4a-issue-bridge/src/index.ts
grep -Fq 'feature/phase1a4a-github-issue-bridge' "$runner"

echo "[3/13] approval and idempotency replay"
grep -Fq 'requestIssueApproval' "$runner"
grep -Fq 'createApprovedIssue' "$runner"
grep -Fq 'InMemoryIdempotencyStore' "$runner"
grep -Fq 'idempotentlyReused' "$runner"
grep -Fq 'newIssueCount: 1' "$runner"

echo "[4/13] evidence redaction"
grep -Fq 'LIVE_EVIDENCE_PATH' "$runner"
grep -Fq 'mode: 0o600' "$runner"
grep -Fq 'replace(/token|secret|password/gi' packages/phase1a4a-issue-bridge/src/index.ts
if grep -Eqi 'process\.env\.|PHASE1A4A_LIVE_CONFIRMATION.*evidence|token.*evidence|secret.*evidence' "$runner"; then echo "Secret-bearing evidence path found"; exit 1; fi

echo "[5/13] no automatic retry or downstream operation"
grep -Fq 'without retry' "$runner"
grep -Fq 'branchCreated: false' "$runner"
grep -Fq 'branchPushed: false' "$runner"
grep -Fq 'draftPrCreated: false' "$runner"
grep -Fq 'mergeAllowed: false' "$runner"
grep -Fq 'productionDeployAllowed: false' "$runner"
if grep -Eiq 'git push|gh pr create|gh pr merge|netlify deploy|git checkout -b|git switch -c|git merge|git reset --hard|git clean -fd' "$runner" scripts/run-phase1a4a-live-smoke.sh; then echo "Prohibited operation found"; exit 1; fi

echo "[6/13] local guards and outcome tests"
grep -Fq 'wrong repository' "$tests"
grep -Fq 'WRONG_CONFIRMATION' "$tests"
grep -Fq 'dirty worktree' "$tests"
grep -Fq 'redacts evidence' "$tests"
grep -Fq 'ISSUE_RECONCILIATION_REQUIRED' "$tests"

echo "[7/13] package typecheck"
pnpm --filter @onyx/phase1a4a-issue-bridge typecheck
echo "[8/13] focused tests"
pnpm --filter @onyx/phase1a4a-issue-bridge test
echo "[9/13] Phase 1A.4A bridge validator"
bash scripts/validate-phase1a4a.sh
echo "[10/13] live runner is not executed"
live_command="pnpm --filter @onyx/phase1a4a-issue-bridge"
live_command+=" live-smoke"
if grep -Fq "$live_command" scripts/validate-phase1a4a-live-smoke.sh; then echo "Validation must not invoke the live runner"; exit 1; fi
echo "[11/13] no staged changes"
test -z "$(git diff --cached --name-only)"
echo "[12/13] whitespace"
git diff --check
echo "[13/13] worktree status"
git status --short
echo "[PASS] Phase 1A.4A live smoke runner validated without a live GitHub write"