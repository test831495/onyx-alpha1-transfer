#!/usr/bin/env bash
set -euo pipefail
echo "[1/10] E.8C contracts";grep -Fq 'EvidenceReviewModel' apps/command-center/src/automationEvidenceContracts.ts;grep -Fq 'completeness' apps/command-center/src/automationEvidenceModel.ts
echo "[2/10] evidence sections";for x in Provenance Governance 'Changed files' 'Repair history' 'Validation results' 'Known issues and limitations' 'Rollback plan' 'Audit timeline';do grep -Fq "$x" apps/command-center/src/components/AutomationEvidenceViewer.tsx;done
echo "[3/10] governance boundaries";grep -Fq 'mergeAllowed:false' apps/command-center/src/automationEvidenceModel.ts;grep -Fq 'productionDeployAllowed:false' apps/command-center/src/automationEvidenceModel.ts
echo "[4/10] dashboard integration";grep -Fq 'AutomationEvidenceViewer' apps/command-center/src/components/AutomationDashboard.tsx
echo "[5/10] Command Center typecheck";pnpm --filter @onyx/command-center typecheck
echo "[6/10] Command Center build";pnpm --filter @onyx/command-center build
echo "[7/10] E.8A regression";bash scripts/validate-phase1a3e8a.sh
echo "[8/10] automation regression";pnpm --filter @onyx/automation-plan-builder test
echo "[9/10] prohibited executable scan";if grep -E 'gh pr merge|gh pr create|git push|netlify deploy|child_process|execSync|spawnSync' apps/command-center/src/automationEvidenceModel.ts apps/command-center/src/components/AutomationEvidenceViewer.tsx;then exit 1;fi
echo "[10/10] whitespace";git diff --check
echo "[PASS] Phase 1A.3 E.8C Evidence Viewer validated"