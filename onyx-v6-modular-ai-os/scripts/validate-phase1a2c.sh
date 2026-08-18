#!/usr/bin/env bash
set -euo pipefail
echo "[1/5] package typecheck"; pnpm --filter @onyx/github-automation typecheck
echo "[2/5] package tests"; pnpm --filter @onyx/github-automation test
echo "[3/5] dry preview"; pnpm --filter @onyx/github-automation write-demo > /tmp/phase1a2c-write-preview.json
grep '"execute": false' /tmp/phase1a2c-write-preview.json >/dev/null
grep '"remoteMutationPerformed": false' /tmp/phase1a2c-write-preview.json >/dev/null
echo "[4/5] read-only regression"; bash scripts/validate-phase1a2b.sh
echo "[5/5] prohibited capability scan"; if grep -R -E 'gh pr merge|gh secret set|gh repo edit|gh release create|netlify deploy' packages/github-automation/src --exclude=read-only-policy.ts; then echo "[FAIL] prohibited command detected"; exit 1; fi
echo "[PASS] Phase 1A.2C approval-gated writes validation completed"
