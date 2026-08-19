#!/usr/bin/env bash
set -euo pipefail
echo "[1/9] E.8D contracts";grep -Fq 'DraftPrReviewModel' apps/command-center/src/automationDraftPrReviewContracts.ts;grep -Fq 'mergeAllowed:false' apps/command-center/src/automationDraftPrReviewModel.ts
echo "[2/9] review sections";for x in 'Pull request summary' 'Validation digest' 'Changed files' 'Approval history' 'Reviewer checklist' 'Known issues' Rollback 'Hard governance stop';do grep -Fq "$x" apps/command-center/src/components/AutomationDraftPrReview.tsx;done
echo "[3/9] dashboard integration";grep -Fq 'AutomationDraftPrReview' apps/command-center/src/components/AutomationDashboard.tsx
echo "[4/9] Command Center typecheck";pnpm --filter @onyx/command-center typecheck
echo "[5/9] Command Center build";pnpm --filter @onyx/command-center build
echo "[6/9] E.8B regression";bash scripts/validate-phase1a3e8b.sh
echo "[7/9] automation regression";pnpm --filter @onyx/automation-plan-builder test
echo "[8/9] prohibited executable scan";if grep -E 'gh pr merge|gh pr create|git push|netlify deploy|child_process|execSync|spawnSync' apps/command-center/src/automationDraftPrReviewModel.ts apps/command-center/src/components/AutomationDraftPrReview.tsx;then exit 1;fi
echo "[9/9] whitespace";git diff --check
echo "[PASS] Phase 1A.3 E.8D Draft PR Review Experience validated"
