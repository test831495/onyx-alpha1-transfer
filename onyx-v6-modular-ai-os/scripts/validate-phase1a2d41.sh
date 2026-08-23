#!/usr/bin/env bash
set -euo pipefail
echo "[1/7] React-owned navigation contracts"
! grep -Fq 'utilityNavigationCoordinator' apps/command-center/src/App.tsx
test ! -f apps/command-center/src/utilityNavigationCoordinator.ts
grep -Fq 'data-onyx-global-utility' apps/command-center/src/App.tsx
grep -Fq 'onyx:open-automation' apps/command-center/src/App.tsx
grep -Fq 'onyx:open-provider-health' apps/command-center/src/App.tsx
grep -Fq 'onyx:open-settings' apps/command-center/src/App.tsx
echo "[2/7] no legacy duplicate utility entries"
! grep -Fq '? ["Home", "Messages", "Tasks", "News", "Workspace", "Settings"]' apps/command-center/src/App.tsx
! sed -n '610,630p' apps/command-center/src/App.tsx | grep -Fq '"Automation",'
echo "[3/7] explicit panel listeners"
grep -Fq 'onyx:open-automation' apps/command-center/src/components/AutomationDashboard.tsx
grep -Fq 'onyx:open-settings' apps/command-center/src/components/SettingsCenter.tsx
grep -Fq 'onyx:open-provider-health' apps/command-center/src/components/ProviderHealthDashboard.tsx
echo "[4/7] command center typecheck"
pnpm --filter @onyx/command-center typecheck
echo "[5/7] command center build"
pnpm --filter @onyx/command-center build
echo "[6/7] safety and whitespace"
if grep -R -E 'gh issue create|gh pr merge|netlify deploy' apps/command-center/src/App.tsx apps/command-center/src/components/AutomationDashboard.tsx apps/command-center/src/components/SettingsCenter.tsx apps/command-center/src/components/ProviderHealthDashboard.tsx;then exit 1;fi
git diff --check
echo "[7/7] D.3 voice regression"
bash scripts/validate-phase1a2d3.sh
echo "[PASS] Phase 1A.2D.4.1 React-owned global navigation validated"
