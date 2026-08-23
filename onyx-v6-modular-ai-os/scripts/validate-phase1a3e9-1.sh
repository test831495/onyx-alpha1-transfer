#!/usr/bin/env bash
set -euo pipefail
echo "[1/9] E.9.1 persistence contracts";grep -Fq 'loadActiveAutomationIssueDraft' apps/command-center/src/automationIntakeService.ts;grep -Fq 'deleteAutomationIssueDraft' apps/command-center/src/automationIntakeService.ts
echo "[2/9] recovery UI";for x in 'Saved Drafts' Resume Delete recoverable;do grep -Fq "$x" apps/command-center/src/components/AutomationNaturalLanguageIntake.tsx;done
echo "[3/9] governance preservation";grep -Fq 'remoteIssueCreated:false' apps/command-center/src/automationIntakeService.ts;grep -Fq 'productionDeployAllowed:false' apps/command-center/src/automationIntakeService.ts
echo "[4/9] Command Center typecheck";pnpm --filter @onyx/command-center typecheck
echo "[5/9] Command Center build";pnpm --filter @onyx/command-center build
echo "[6/9] E.9 regression";bash scripts/validate-phase1a3e9.sh
echo "[7/9] automation regression";pnpm --filter @onyx/automation-plan-builder test
echo "[8/9] prohibited executable scan";if grep -E 'gh issue create|gh pr merge|git push|netlify deploy|child_process|execSync|spawnSync' apps/command-center/src/automationIntakeService.ts apps/command-center/src/components/AutomationNaturalLanguageIntake.tsx;then exit 1;fi
echo "[9/9] whitespace";git diff --check
echo "[PASS] Phase 1A.3 E.9.1 Draft Persistence and Recovery validated"
