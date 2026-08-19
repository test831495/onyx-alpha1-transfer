#!/usr/bin/env bash
set -euo pipefail
echo "[1/9] E.8B contracts";grep -Fq 'remoteMutationPerformed:false' apps/command-center/src/automationApprovalContracts.ts
echo "[2/9] approval policy";grep -Fq 'Approval authority must be Rahul Kumar' apps/command-center/src/automationApprovalService.ts;grep -Fq 'at least 8 characters' apps/command-center/src/automationApprovalService.ts;grep -Fq 'Scope hash mismatch' apps/command-center/src/automationApprovalService.ts
echo "[3/9] UI actions";for x in 'Approve scope' 'Reject scope' 'Approve Draft PR' 'Reject Draft PR';do grep -Fq "$x" apps/command-center/src/components/AutomationDashboard.tsx;done
echo "[4/9] Command Center typecheck";pnpm --filter @onyx/command-center typecheck
echo "[5/9] Command Center build";pnpm --filter @onyx/command-center build
echo "[6/9] E.8C regression";bash scripts/validate-phase1a3e8c.sh
echo "[7/9] automation regression";pnpm --filter @onyx/automation-plan-builder test
echo "[8/9] prohibited executable scan";if grep -E 'gh pr merge|gh pr create|git push|netlify deploy|child_process|execSync|spawnSync' apps/command-center/src/automationApprovalService.ts apps/command-center/src/components/AutomationApprovalDialog.tsx;then exit 1;fi
echo "[9/9] whitespace";git diff --check
echo "[PASS] Phase 1A.3 E.8B Governed Approval Actions UI validated"
