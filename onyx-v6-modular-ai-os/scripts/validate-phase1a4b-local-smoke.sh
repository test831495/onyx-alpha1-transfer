#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

src=packages/phase1a4b-branch-bridge/src/index.ts
smoke=packages/phase1a4b-branch-bridge/src/local-smoke.ts
tests=packages/phase1a4b-branch-bridge/tests/branch-bridge.test.ts

echo "[1/10] required files"
test -f packages/phase1a4b-branch-bridge/package.json
test -f packages/phase1a4b-branch-bridge/tsconfig.json
test -f "$src"
test -f "$smoke"
test -f "$tests"
test -f scripts/run-phase1a4b-local-smoke.sh
test -f scripts/validate-phase1a4b-local-smoke.sh
test -f docs/phase1a4/phase1a4b-local-smoke-runner.md

echo "[2/10] local smoke constants"
for value in 'LOCAL_CONFIRMATION' 'APPROVE_PHASE1A4B_SINGLE_LOCAL_BRANCH_SMOKE' 'LOCAL_BRANCH' 'feature/phase1a4b-isolated-branch-bridge' 'LOCAL_TARGET_BRANCH' 'automation/issue-7-phase1a4b-isolated-branch-smoke' 'LOCAL_EVIDENCE_PATH' '.phase1a4b-local-smoke-evidence.json'; do grep -Fq "$value" "$smoke"; done

echo "[3/10] local smoke interfaces"
for value in 'LocalSmokePreflight' 'LocalSmokeEvidence' 'LocalSmokeOptions' 'runLocalSmoke'; do grep -Fq "$value" "$smoke"; done

echo "[4/10] local smoke validation checks"
for value in 'current branch must be' 'working tree must be clean' 'HEAD must not be detached' 'GitHub CLI authentication' 'Authenticated GitHub login must be coolscorpiorahul' 'Repository must be' 'Issue.*must be OPEN' 'Issue title does not match' 'HEAD must be at the validated predecessor' 'Target branch must not exist remotely' 'Current branch was changed'; do grep -Eiq "$value" "$smoke"; done

echo "[5/10] local smoke evidence structure"
for value in 'repository' 'issueNumber' 'capability' 'scopeHash' 'idempotencyKey' 'approvalIssuedAt' 'approvalExpiry' 'baseBranch' 'baseCommit' 'targetBranch' 'firstResult' 'replayResult' 'newLocalBranchCount' 'idempotentReplayStatus' 'currentBranchUnchanged' 'remoteBranchPushed.*false' 'draftPrCreated.*false' 'mergeAllowed.*false' 'productionDeployAllowed.*false' 'completedAt'; do grep -Eiq "$value" "$smoke"; done

echo "[6/10] local smoke test coverage"
for value in \
  'missing approval' \
  'wrong actor' \
  'wrong repository' \
  'wrong issue number' \
  'closed issue' \
  'wrong issue title' \
  'rejects dirty working tree' \
  'rejects detached HEAD' \
  'rejects base commit mismatch' \
  'rejects remote branch already exists' \
  'creates local branch with first invocation and reuses idempotently' \
  'handles compatible branch reuse with idempotency' \
  'rejects incompatible existing branch' \
  'classifies adapter failure safely' \
  'classifies uncertain adapter response safely' \
  'redacts evidence from tokens and credentials' \
  'preserves remote safety flags: no push, no draft PR, no merge, no production' \
  'remoteBranchPushed' \
  'draftPrCreated' \
  'mergeAllowed' \
  'productionDeployAllowed'; do
  grep -Fq "$value" "$tests" || grep -Fq "$value" "$smoke"
done

echo "[7/10] local smoke shell runner validation"
bash -n scripts/run-phase1a4b-local-smoke.sh
bash -n scripts/validate-phase1a4b-local-smoke.sh

# Verify prohibited operations in local smoke implementation
echo "[8/10] prohibited operations check"
if grep -En 'git push|gh issue create|gh pr create|gh pr merge|netlify deploy|force-push|branch deletion|git reset|git clean|child_process|execSync|spawnSync' "$smoke"; then
  echo "Prohibited operation found in local smoke implementation."
  exit 1
fi

# Verify evidence file is not created during validation
echo "[9/10] evidence file not created"
if [[ -f ".phase1a4b-local-smoke-evidence.json" ]]; then
  echo "ERROR: Evidence file should not exist during validation."
  rm -f .phase1a4b-local-smoke-evidence.json
  exit 1
fi

echo "[10/10] typecheck and focused tests"
pnpm --filter @onyx/phase1a4b-branch-bridge typecheck
pnpm --filter @onyx/phase1a4b-branch-bridge test

echo "SUCCESS: Phase 1A.4B local smoke runner validation complete."
