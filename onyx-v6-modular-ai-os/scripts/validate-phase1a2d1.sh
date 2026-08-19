#!/usr/bin/env bash
set -euo pipefail
echo "[1/5] UI contract scan"; grep -q "meaningful reason" apps/command-center/src/components/AutomationDashboard.tsx; grep -q "Approval expiry" apps/command-center/src/components/AutomationDashboard.tsx; grep -q "Execute unavailable" apps/command-center/src/components/AutomationDashboard.tsx; grep -q "VoiceSettingsPanel" apps/command-center/src/components/SettingsCenter.tsx
echo "[2/5] command center typecheck"; pnpm --filter @onyx/command-center typecheck
echo "[3/5] command center build"; pnpm --filter @onyx/command-center build
echo "[4/5] Phase 1A.2D regression"; bash scripts/validate-phase1a2d.sh
echo "[5/5] remote command scan"; if grep -R -E 'gh issue create|gh pr create|gh pr merge|netlify deploy' apps/command-center/src/components/AutomationDashboard.tsx apps/command-center/src/components/SettingsCenter.tsx;then echo "[FAIL] remote command found";exit 1;fi
echo "[PASS] Phase 1A.2D.1 approval and voice settings validation completed"
