#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
src=packages/phase1a4c-push-bridge/src
for file in "$src/live-push.ts" "$src/git-push-adapter.ts" scripts/run-phase1a4c-live-push.sh scripts/validate-phase1a4c-live-push.sh docs/phase1a4/phase1a4c-live-push-runner.md; do test -f "$file"; done
for value in PHASE1A4C_LIVE_CONFIRMATION APPROVE_PHASE1A4C_SINGLE_BRANCH_PUSH auth coolscorpiorahul test831495/onyx-alpha1-transfer Issue 7 feature/phase1a4c-isolated-branch-push-bridge automation/issue-7-phase1a4b-isolated-branch-smoke 712f3546529f6eff8c37f480c0db61cad56f1b6c origin; do grep -RFiq "$value" "$src" scripts/run-phase1a4c-live-push.sh; done
grep -Fq 'force: false' "$src/index.ts"
grep -Fq 'delete: false' "$src/index.ts"
grep -Fq 'refs/heads' "$src/git-push-adapter.ts"
! grep -REn 'child-process|from "node:child_process"|from "node:child-process"' "$src/live-push.ts" "$src/index.ts"
! grep -REn 'git push|git checkout|git switch|git add|git commit|git tag|gh issue create|gh pr create|gh pr merge|netlify deploy' "$src/live-push.ts" "$src/index.ts"
bash -n scripts/run-phase1a4c-live-push.sh
bash -n scripts/validate-phase1a4c-live-push.sh
pnpm --filter @onyx/phase1a4c-push-bridge typecheck
pnpm --filter @onyx/phase1a4c-push-bridge test
git diff --check
if git ls-remote --exit-code --heads origin automation/issue-7-phase1a4b-isolated-branch-smoke >/dev/null 2>&1; then echo "Remote automation branch must remain absent."; exit 1; fi
echo "[PASS] Phase 1A.4C.1 live push runner validated without live execution"
