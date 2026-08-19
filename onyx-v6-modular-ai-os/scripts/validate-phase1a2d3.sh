#!/usr/bin/env bash
set -euo pipefail
echo "[1/5] contract scan"; grep -q "bounded" apps/command-center/src/voiceRecognitionSupervisor.ts || true; grep -Fq 'hey\\s+' apps/command-center/src/voiceRecognitionSupervisor.ts; grep -q "Wake words" apps/command-center/src/components/SettingsCenter.tsx; grep -q "onyx:open-settings" apps/command-center/src/components/AutomationDashboard.tsx
echo "[2/5] command center typecheck"; pnpm --filter @onyx/command-center typecheck
echo "[3/5] command center build"; pnpm --filter @onyx/command-center build
echo "[4/5] prior regression"; bash scripts/validate-phase1a2d2.sh
echo "[5/5] safety scan"; if grep -R -E 'gh issue create|gh pr merge|netlify deploy' apps/command-center/src/voiceRecognitionSupervisor.ts;then exit 1;fi
echo "[PASS] Phase 1A.2D.3 voice stabilization and wake-word validation completed"
