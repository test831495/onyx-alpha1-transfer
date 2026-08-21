#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

src="packages/phase1a4d-draft-pr-bridge/src"

for file in "$src/live-draft-pr.ts" "$src/github-draft-pr-adapter.ts" scripts/run-phase1a4d-live-draft-pr.sh scripts/validate-phase1a4d-live-draft-pr.sh docs/phase1a4/phase1a4d-live-draft-pr-runner.md; do test -f "$file"; done

for value in PHASE1A4D_LIVE_CONFIRMATION APPROVE_PHASE1A4D_SINGLE_DRAFT_PR coolscorpiorahul test831495/onyx-alpha1-transfer Issue 7 Phase 1A.4A Live Smoke Test feature/phase1a4d-draft-pr-bridge automation/issue-7-phase1a4b-isolated-branch-smoke 712f3546529f6eff8c37f480c0db61cad56f1b6c; do grep -RFiq "$value" "$src" scripts/run-phase1a4d-live-draft-pr.sh; done

grep -Fq 'missing confirmation' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'wrong confirmation' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'wrong actor' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'wrong repository' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'wrong issue' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'closed issue' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'wrong issue title' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'wrong implementation branch' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'dirty worktree' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'detached HEAD' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'missing remote head' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'wrong remote head commit' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'wrong base branch' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'wrong head branch' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'identical base and head' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'existing incompatible pull request' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'existing non-Draft pull request' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'successful first mock Draft PR creation' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'compatible replay' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'scope mismatch' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'evidence-digest mismatch' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'idempotency mismatch' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'expired approval' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'non-Draft request denial' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'merge denial' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'production denial' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'secret denial' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'permission denial' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'branch-protection denial' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'adapter failure' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'uncertain result' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'no duplicate pull request' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'redacts evidence and preserves the required safety flags' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'redacts evidence and preserves the required safety flags' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'redacts evidence and preserves the required safety flags' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'redacts evidence and preserves the required safety flags' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'redacts evidence and preserves the required safety flags' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts
grep -Fq 'redacts evidence and preserves the required safety flags' packages/phase1a4d-draft-pr-bridge/tests/live-draft-pr.test.ts

! grep -REn 'node:child_process|child_process' "$src/live-draft-pr.ts"
! grep -REn 'gh pr merge|gh pr ready|gh pr ready-for-review|git push|force push|git add|git commit|git tag|netlify deploy|gh pr edit|gh pr close|gh pr reopen|git branch -D|git push --force' "$src" scripts/run-phase1a4d-live-draft-pr.sh

bash -n scripts/run-phase1a4d-live-draft-pr.sh
bash -n scripts/validate-phase1a4d-live-draft-pr.sh
pnpm --filter @onyx/phase1a4d-draft-pr-bridge typecheck
pnpm --filter @onyx/phase1a4d-draft-pr-bridge test
git diff --check

echo "[PASS] Phase 1A.4D live Draft PR runner validated without live execution"
