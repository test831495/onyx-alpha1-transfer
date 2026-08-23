#!/usr/bin/env bash
set -euo pipefail
echo "[1/9] E.9 contracts";grep -Fq 'DRAFT_AWAITING_REVIEW' apps/command-center/src/automationIntakeContracts.ts;grep -Fq 'remoteIssueCreated:false' apps/command-center/src/automationIntakeContracts.ts
echo "[2/9] intake policy";grep -Fq 'at least 12 characters' apps/command-center/src/automationIntakeService.ts;grep -Fq 'owner/name format' apps/command-center/src/automationIntakeService.ts
echo "[3/9] UI integration";grep -Fq 'AutomationNaturalLanguageIntake' apps/command-center/src/components/AutomationDashboard.tsx;grep -Fq 'Create' apps/command-center/src/components/AutomationDashboard.tsx
echo "[4/9] Command Center typecheck";pnpm --filter @onyx/command-center typecheck
echo "[5/9] Command Center build";pnpm --filter @onyx/command-center build
echo "[6/9] E.8D regression";bash scripts/validate-phase1a3e8d.sh
echo "[7/9] automation regression";pnpm --filter @onyx/automation-plan-builder test
echo "[8/9] prohibited executable scan";if grep -E 'gh issue create|gh pr merge|git push|netlify deploy|child_process|execSync|spawnSync' apps/command-center/src/automationIntakeService.ts apps/command-center/src/components/AutomationNaturalLanguageIntake.tsx;then exit 1;fi
echo "[9/9] whitespace";git diff --check
echo "[PASS] Phase 1A.3 E.9 Natural Language Automation Intake validated"
