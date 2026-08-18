#!/usr/bin/env bash
set -euo pipefail
echo "[1/6] read-only package typecheck"; pnpm --filter @onyx/github-automation typecheck
echo "[2/6] read-only package tests"; pnpm --filter @onyx/github-automation test
echo "[3/6] live auth check"; gh auth status >/dev/null
echo "[4/6] live read-only demo"; pnpm --filter @onyx/github-automation read-demo > /tmp/phase1a2b-read-demo.json
grep '"remoteMutationPerformed": false' /tmp/phase1a2b-read-demo.json >/dev/null
grep '"readOnly": true' /tmp/phase1a2b-read-demo.json >/dev/null
echo "[5/6] dry-run architecture regression"; bash scripts/validate-phase1a2a.sh
echo "[6/6] mutation capability scan"; if grep -R -E 'gh (issue create|pr create|pr merge)|--method (POST|PUT|PATCH|DELETE)' packages/github-automation/src; then echo "[FAIL] write command detected"; exit 1; fi
echo "[PASS] Phase 1A.2B live read-only GitHub validation completed"
