#!/usr/bin/env bash
set -euo pipefail
echo "[1/9] E.10 contracts";grep -Fq 'DRY_RUN_READY' apps/command-center/src/automationOrchestrationContracts.ts;grep -Fq 'remoteWritesPerformed:false' apps/command-center/src/automationOrchestrationContracts.ts
echo "[2/9] approval and preflight";grep -Fq 'Execution approval authority must be Rahul Kumar' apps/command-center/src/automationOrchestrationService.ts;grep -Fq 'Dry-run approval is required' apps/command-center/src/automationOrchestrationService.ts
echo "[3/9] UI integration";grep -Fq 'AutomationSupervisedOrchestration' apps/command-center/src/components/AutomationDashboard.tsx;grep -Fq 'Execute' apps/command-center/src/components/AutomationDashboard.tsx
echo "[4/9] Command Center typecheck";pnpm --filter @onyx/command-center typecheck
echo "[5/9] Command Center build";pnpm --filter @onyx/command-center build
echo "[6/9] E.9.1 regression";bash scripts/validate-phase1a3e9-1.sh
echo "[7/9] automation regression";pnpm --filter @onyx/automation-plan-builder test
echo "[8/9] prohibited executable scan";if grep -E 'gh issue create|gh pr create|gh pr merge|git push|netlify deploy|child_process|execSync|spawnSync' apps/command-center/src/automationOrchestrationService.ts apps/command-center/src/components/AutomationSupervisedOrchestration.tsx;then exit 1;fi
echo "[9/9] whitespace";git diff --check
echo "[PASS] Phase 1A.3 E.10 Supervised Intake-to-Execution Orchestration validated"
