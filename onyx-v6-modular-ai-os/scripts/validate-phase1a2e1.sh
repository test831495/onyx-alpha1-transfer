#!/usr/bin/env bash
set -euo pipefail
echo "[1/8] plan contracts";grep -Fq AWAITING_SCOPE_APPROVAL packages/automation-plan-builder/src/index.ts;grep -Fq scopeHash packages/automation-plan-builder/src/index.ts
echo "[2/8] governance";grep -Fq 'merge pull request' packages/automation-plan-builder/src/index.ts;grep -Fq 'deploy production' packages/automation-plan-builder/src/index.ts;grep -Fq 'change secrets' packages/automation-plan-builder/src/index.ts
echo "[3/8] typecheck";pnpm --filter @onyx/automation-plan-builder typecheck
echo "[4/8] tests";pnpm --filter @onyx/automation-plan-builder test
echo "[5/8] automation regression";pnpm --filter @onyx/automation-foundation test
echo "[6/8] GitHub regression";pnpm --filter @onyx/github-automation test
echo "[7/8] Command Center";pnpm --filter @onyx/command-center typecheck;pnpm --filter @onyx/command-center build
echo "[8/8] safety";if grep -R -E 'gh pr merge|git push origin main|netlify deploy --prod' packages/automation-plan-builder;then exit 1;fi;git diff --check
echo "[PASS] Phase 1A.2E.1 Issue Intake and Automation Plan Builder validated"