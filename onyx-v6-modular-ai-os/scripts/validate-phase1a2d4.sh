#!/usr/bin/env bash
set -euo pipefail
echo "[1/6] D.4 contract scan"
grep -Fq 'data-onyx-bottom-utility' apps/command-center/src/utilityNavigationCoordinator.ts
grep -Fq 'onyx:voice-supervisor-setting' apps/command-center/src/voiceSessionCoordinator.ts
grep -Fq 'transitionUntil' apps/command-center/src/voiceSessionCoordinator.ts
grep -Fq 'import "./utilityNavigationCoordinator";' apps/command-center/src/App.tsx
grep -Fq 'import "./voiceSessionCoordinator";' apps/command-center/src/App.tsx
echo "[2/6] command center typecheck"
pnpm --filter @onyx/command-center typecheck
echo "[3/6] command center build"
pnpm --filter @onyx/command-center build
echo "[4/6] D.3 regression"
bash scripts/validate-phase1a2d3.sh
echo "[5/6] safety scan"
if grep -R -E 'gh issue create|gh pr merge|netlify deploy|process\.env\..*(KEY|TOKEN|SECRET)' apps/command-center/src/utilityNavigationCoordinator.ts apps/command-center/src/voiceSessionCoordinator.ts; then exit 1; fi
echo "[6/6] whitespace check"
git diff --check
echo "[PASS] Phase 1A.2D.4 voice session coordination and navigation consolidation validated"
