#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

required=(
  apps/command-center/package.json
  apps/command-center/src/automationRuntimeContracts.ts
  apps/command-center/src/automationRuntimeProjection.ts
  apps/command-center/src/automationRuntimeController.ts
  apps/command-center/src/automationRuntimeFixtures.ts
  apps/command-center/src/automationRuntimeProjection.test.ts
  apps/command-center/src/automationRuntimeController.test.ts
  apps/command-center/src/phase1a7-acceptance-manifest.json
  apps/command-center/src/components/AutomationRuntimeDashboard.tsx
  apps/command-center/src/components/AutomationRecoveryPanel.tsx
  apps/command-center/src/components/AutomationReconciliationPanel.tsx
  apps/command-center/src/components/AutomationRuntimeEvidenceTimeline.tsx
  apps/command-center/src/components/AutomationRuntimeIdentityPanel.tsx
  apps/command-center/src/components/AutomationConnectorScopePanel.tsx
  apps/command-center/src/components/AutomationRuntimeBudgetPanel.tsx
  apps/command-center/src/components/AutomationRuntimeDashboard.test.tsx
  apps/command-center/src/components/AutomationRecoveryPanel.test.tsx
  apps/command-center/src/components/AutomationReconciliationPanel.test.tsx
  apps/command-center/src/components/AutomationRuntimeIdentityPanel.test.tsx
  apps/command-center/src/components/AutomationConnectorScopePanel.test.tsx
  apps/command-center/src/components/AutomationRuntimeBudgetPanel.test.tsx
  docs/phase1a7/phase1a7-automation-center-agent-ready-dashboard.md
  docs/phase1a7/phase1a7-runtime-ui-contracts.md
  docs/phase1a7/phase1a7-identity-and-persona-boundaries.md
  docs/phase1a7/phase1a7-recovery-reconciliation-ux.md
  docs/phase1a7/phase1a7-connector-permission-projection.md
  docs/phase1a7/phase1a7-multi-agent-readiness.md
  apps/command-center/src/components/AutomationDashboard.tsx
  apps/command-center/src/components/AutomationApprovalDialog.tsx
  apps/command-center/src/components/AutomationEvidenceViewer.tsx
  apps/command-center/src/components/AutomationDraftPrReview.tsx
)
for file in "${required[@]}"; do test -f "$file" || { echo "missing: $file"; exit 1; }; done

grep -Eq 'AUTOMATION_RUNTIME_UI_CONTRACT_VERSION = "1.0.0"' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'AUTOMATION_RUNTIME_UI_COMPATIBLE_RUNTIME_CONTRACT_VERSION = "1.0.0"' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'RUNTIME_CONTRACT_VERSION = "1.0.0"' packages/phase1a6-workflow-runtime/src/contracts.ts

# The Phase 1A.7 dashboard must not fork the frozen Phase 1A.5/1A.6 state or status authority.
if grep -RE 'WORKFLOW_STATES\s*=\s*\[|RUNTIME_STATUSES\s*=\s*\[' apps/command-center/src/automationRuntime*.ts apps/command-center/src/components/Automation*.tsx; then
  echo 'Phase 1A.7 must not redefine WORKFLOW_STATES or RUNTIME_STATUSES'
  exit 1
fi

# Every P17 acceptance ID must be present.
for id in P17-CONTRACT P17-PROJECTION P17-DASHBOARD P17-CONTROLLER P17-IDENTITY P17-APPROVAL P17-RECOVERY P17-RECONCILIATION P17-EVIDENCE P17-CONNECTOR P17-BUDGET P17-MULTIAGENT P17-SECURITY; do
  grep -Eq "\"$id\"" apps/command-center/src/automationRuntimeContracts.ts
  grep -Eq "\"$id\"" apps/command-center/src/phase1a7-acceptance-manifest.json
done

# UI reachability: the governed runtime tab must exist as a stable identifier wired into
# the existing AutomationDashboard, and the previously orphaned launcher/event must be gone.
grep -Eq 'GOVERNED_RUNTIME_TAB_ID="governed-runtime"' apps/command-center/src/components/AutomationDashboard.tsx
grep -Eq 'GovernedRuntimeTab' apps/command-center/src/components/AutomationDashboard.tsx
grep -Eq 'GOVERNED_RUNTIME_TAB_ID' apps/command-center/src/phase1a7-acceptance-manifest.json
if grep -RE 'AutomationGovernedRuntimeLauncher|onyx:open-automation-runtime' apps/command-center/src; then
  echo 'orphaned governed-runtime launcher or event must not remain'
  exit 1
fi

# 32-state preservation, reused from Phase 1A.5.
node - <<'NODE'
const fs = require('node:fs');
const path = 'packages/phase1a5-workflow-engine/src/contracts.ts';
const src = fs.readFileSync(path, 'utf8');
const match = src.match(/export const WORKFLOW_STATES = \[(.*?)\] as const;/s);
if (!match) { console.error('missing WORKFLOW_STATES export'); process.exit(1); }
const states = [...match[1].matchAll(/"([A-Z0-9_]+)"/g)].map(([, state]) => state);
if (states.length !== 32) { console.error(`WORKFLOW_STATES length mismatch: expected 32, got ${states.length}`); process.exit(1); }
NODE

# Lane limit one, presence modes, connector providers, permission fields, budget fields, optional agent fields.
grep -Eq 'RUNTIME_EXECUTION_LANE_LIMIT' packages/phase1a6-workflow-runtime/src/contracts.ts
grep -Eq 'EXECUTION_LANE_LIMIT = 1' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'PRESENCE_MODES = \["ONYX", "NOVA", "ONYX_NOVA_COUNCIL", "SYSTEM", "UNASSIGNED"\]' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'CONNECTOR_PROVIDERS = \["Outlook", "Gmail", "Yahoo", "OneDrive", "SharePoint", "Google Drive", "UNKNOWN"\]' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'mergeAllowed: false' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'productionDeployAllowed: false' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'forcePushAllowed: false' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'branchDeletionAllowed: false' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'connectorContentReadable: false' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'connectorActionExecutable: false' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'connectorCredentialsStored: false' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'tokenBudget\?:' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'activeAgentId\?:' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'assignedAgentIds\?:' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'activeLaneId\?:' apps/command-center/src/automationRuntimeContracts.ts

python - <<'PY'
import json
from pathlib import Path
manifest = json.loads(Path('apps/command-center/src/phase1a7-acceptance-manifest.json').read_text())
required = ['P17-CONTRACT','P17-PROJECTION','P17-DASHBOARD','P17-CONTROLLER','P17-IDENTITY','P17-APPROVAL','P17-RECOVERY','P17-RECONCILIATION','P17-EVIDENCE','P17-CONNECTOR','P17-BUDGET','P17-MULTIAGENT','P17-SECURITY']
missing = [rid for rid in required if rid not in manifest]
if missing:
    raise SystemExit(f'missing acceptance IDs: {missing}')
for rid, entry in manifest.items():
    for field in ('implementationIdentifiers', 'testFiles', 'validationMethod', 'acceptanceStatus'):
        if field not in entry:
            raise SystemExit(f'{rid} missing field: {field}')
    if entry['acceptanceStatus'] != 'accepted':
        raise SystemExit(f'{rid} is not accepted')
PY

# No arbitrary command/shell surface, no child-process, no live GitHub/connector/paid write surface.
if grep -RE 'child_process|execSync|execFileSync|(^|[^[:alnum:]_])eval[[:space:]]*\(' apps/command-center/src/automationRuntime*.ts apps/command-center/src/components/AutomationRuntime*.tsx apps/command-center/src/components/AutomationRecoveryPanel.tsx apps/command-center/src/components/AutomationReconciliationPanel.tsx apps/command-center/src/components/AutomationConnectorScopePanel.tsx; then
  echo 'prohibited executable surface found'
  exit 1
fi
if grep -RE '(runCommand|executeCommand|shellExec|execShell)\s*\(' apps/command-center/src/automationRuntime*.ts; then
  echo 'arbitrary command interface found'
  exit 1
fi
if grep -RE 'octokit|@octokit|https://api\.github\.com|simple-git|isomorphic-git' apps/command-center/src/automationRuntime*.ts; then
  echo 'live GitHub or Git write surface found'
  exit 1
fi
if grep -RE 'mergeAllowed\s*[:=]\s*true|productionDeployAllowed\s*[:=]\s*true|forcePushAllowed\s*[:=]\s*true|branchDeletionAllowed\s*[:=]\s*true' apps/command-center/src/automationRuntime*.ts; then
  echo 'prohibited write flag enabled'
  exit 1
fi
if grep -RE 'scheduler|taskLease|heartbeat|compareAndSwap' apps/command-center/src/automationRuntime*.ts; then
  echo 'prohibited multi-agent scheduler surface found'
  exit 1
fi

pnpm --dir apps/command-center typecheck
pnpm --dir apps/command-center exec vitest run \
  src/automationRuntimeProjection.test.ts \
  src/automationRuntimeController.test.ts \
  src/components/AutomationRuntimeDashboard.test.tsx \
  src/components/AutomationRecoveryPanel.test.tsx \
  src/components/AutomationReconciliationPanel.test.tsx \
  src/components/AutomationRuntimeIdentityPanel.test.tsx \
  src/components/AutomationConnectorScopePanel.test.tsx \
  src/components/AutomationRuntimeBudgetPanel.test.tsx \
  src/components/AutomationDashboard.test.tsx \
  src/components/AutomationDashboard.e8a.test.ts
pnpm --dir apps/command-center exec vitest run src/automationOrchestrationService.e10.test.ts
pnpm --filter @onyx/phase1a6-workflow-runtime test
bash -n scripts/validate-phase1a7.sh
git diff --check
echo "Phase 1A.7 validation passed"
