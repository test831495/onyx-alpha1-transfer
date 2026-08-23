#!/usr/bin/env bash
set -euo pipefail
echo "[1/11] automation typecheck"; pnpm --filter @onyx/automation-foundation typecheck
echo "[2/11] automation tests"; pnpm --filter @onyx/automation-foundation test
echo "[3/11] github automation typecheck"; pnpm --filter @onyx/github-automation typecheck
echo "[4/11] github automation tests"; pnpm --filter @onyx/github-automation test
echo "[5/11] configuration tests"; pnpm --filter @onyx/configuration-runtime test
echo "[6/11] voice tests"; pnpm --filter @onyx/voice-runtime test
echo "[7/11] identity tests"; pnpm --filter @onyx/identity-runtime test
echo "[8/11] workspace tests"; pnpm --filter @onyx/workspace-connectors test
echo "[9/11] calendar tests"; pnpm --filter @onyx/calendar-intelligence test
echo "[10/11] provider security"; node scripts/provider-health-smoke.mjs
echo "[11/11] command center"; pnpm --filter @onyx/command-center typecheck; pnpm --filter @onyx/command-center build
echo "[PASS] Phase 1A.2A consolidated validation completed"
