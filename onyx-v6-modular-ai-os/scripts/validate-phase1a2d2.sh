#!/usr/bin/env bash
set -euo pipefail
echo "[1/5] contract scan"; grep -q "right:278" apps/command-center/src/components/SettingsCenter.tsx; grep -q "minWidth:96" apps/command-center/src/components/AutomationDashboard.tsx; grep -Eq "onyx:(auto-listen-change|voice-supervisor-setting)" apps/command-center/src/components/SettingsCenter.tsx; grep -q "microphoneButton" apps/command-center/src/autoListenController.ts
echo "[2/5] command center typecheck"; pnpm --filter @onyx/command-center typecheck
echo "[3/5] command center build"; pnpm --filter @onyx/command-center build
echo "[4/5] prior regression"; bash scripts/validate-phase1a2d1.sh
echo "[5/5] safety scan"; if grep -R -E 'gh issue create|gh pr merge|netlify deploy' apps/command-center/src/autoListenController.ts apps/command-center/src/components/SettingsCenter.tsx;then exit 1;fi
echo "[PASS] Phase 1A.2D.2 UX and Auto Listen validation completed"
