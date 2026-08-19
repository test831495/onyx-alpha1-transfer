#!/usr/bin/env bash
set -euo pipefail
echo "[1/10] E.3 contracts";grep -Fq 'EVIDENCE_READY' packages/automation-plan-builder/src/validation-contracts.ts;grep -Fq 'maxRepairAttempts' packages/automation-plan-builder/src/validation-orchestrator.ts
echo "[2/10] immediate-stop policy";grep -Fq 'SECRET_EXPOSURE_RISK' packages/automation-plan-builder/src/failure-classifier.ts;grep -Fq 'ENVIRONMENT_FAILURE' packages/automation-plan-builder/src/failure-classifier.ts;grep -Fq 'BOUNDARY_VIOLATION' packages/automation-plan-builder/src/failure-classifier.ts
echo "[3/10] repair boundaries";grep -Fq 'validateRepair' packages/automation-plan-builder/src/repair-policy.ts;grep -Fq 'Unapproved file' packages/automation-plan-builder/src/repair-policy.ts
echo "[4/10] evidence contract";grep -Fq 'schemaVersion:"1.0"' packages/automation-plan-builder/src/evidence-builder.ts;grep -Fq 'repairAttempts' packages/automation-plan-builder/src/evidence-builder.ts
echo "[5/10] package typecheck";pnpm --filter @onyx/automation-plan-builder typecheck
echo "[6/10] package tests";pnpm --filter @onyx/automation-plan-builder test
echo "[7/10] E.1/E.2 regressions";bash scripts/validate-phase1a2e2.sh
echo "[8/10] E.3 dry-run evidence demo";pnpm --filter @onyx/automation-plan-builder exec tsx src/validation-demo.ts >/tmp/onyx-e3-demo.json;grep -Fq EVIDENCE_READY /tmp/onyx-e3-demo.json;grep -Fq '"schemaVersion": "1.0"' /tmp/onyx-e3-demo.json
echo "[9/10] safety contract";grep -Fq 'gh pr merge' packages/automation-plan-builder/src/repair-policy.ts;grep -Fq 'netlify deploy' packages/automation-plan-builder/src/repair-policy.ts;if grep -E 'gh pr merge|netlify deploy --prod|git push origin main' packages/automation-plan-builder/src/validation-orchestrator.ts packages/automation-plan-builder/src/validation-demo.ts;then exit 1;fi
echo "[10/10] whitespace";git diff --check
echo "[PASS] Phase 1A.2E.3 Validation, Bounded Repair, and Evidence Orchestrator validated"