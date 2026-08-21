#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"
required=(
  packages/phase1a5-workflow-engine/package.json
  packages/phase1a5-workflow-engine/tsconfig.json
  packages/phase1a5-workflow-engine/acceptance-manifest.json
  packages/phase1a5-workflow-engine/src/contracts.ts
  packages/phase1a5-workflow-engine/src/state-machine.ts
  packages/phase1a5-workflow-engine/src/checkpoint-store.ts
  packages/phase1a5-workflow-engine/src/approval-package.ts
  packages/phase1a5-workflow-engine/src/workflow-engine.ts
  packages/phase1a5-workflow-engine/src/recovery-engine.ts
  packages/phase1a5-workflow-engine/src/evidence-timeline.ts
  packages/phase1a5-workflow-engine/src/executor-contract.ts
  packages/phase1a5-workflow-engine/src/local-simulation.ts
  packages/phase1a5-workflow-engine/src/index.ts
  packages/phase1a5-workflow-engine/src/rollback-policy.ts
  packages/phase1a5-workflow-engine/tests/workflow-engine.test.ts
  packages/phase1a5-workflow-engine/tests/recovery-engine.test.ts
  packages/phase1a5-workflow-engine/tests/security-boundaries.test.ts
  packages/phase1a5-workflow-engine/tests/acceptance-coverage.test.ts
)
for file in "${required[@]}"; do test -f "$file" || { echo "missing: $file"; exit 1; }; done
grep -Eq 'WORKFLOW_CONTRACT_VERSION = "1.0.0"' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'EXECUTION_LANE_LIMIT = 1' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'ROLLBACK_CLASSIFICATIONS = \[' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'PROHIBITED_OPERATIONS = \[' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'mergeAllowed: false' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'productionDeployAllowed: false' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'P15-CONTRACT-001|P15-APPROVAL-001|P15-STATE-001|P15-CHECKPOINT-001|P15-RECOVERY-001|P15-EXECUTOR-001|P15-EVIDENCE-001|P15-ROLLBACK-001|P15-SECURITY-001|P15-SIMULATION-001' packages/phase1a5-workflow-engine/acceptance-manifest.json
node - <<'NODE'
const fs = require('node:fs');
const path = 'packages/phase1a5-workflow-engine/src/contracts.ts';
const requiredStates = [
  'WORKFLOW_CREATED',
  'SCOPE_FROZEN',
  'AWAITING_WORKFLOW_APPROVAL',
  'WORKFLOW_APPROVED',
  'PREFLIGHT_IN_PROGRESS',
  'PREFLIGHT_PASSED',
  'PREFLIGHT_FAILED_SAFE',
  'ISSUE_STEP_PENDING',
  'ISSUE_STEP_IN_PROGRESS',
  'ISSUE_STEP_COMPLETED',
  'BRANCH_STEP_PENDING',
  'BRANCH_STEP_IN_PROGRESS',
  'BRANCH_STEP_COMPLETED',
  'PUSH_STEP_PENDING',
  'PUSH_STEP_IN_PROGRESS',
  'PUSH_STEP_COMPLETED',
  'VALIDATION_PENDING',
  'VALIDATION_IN_PROGRESS',
  'VALIDATION_PASSED',
  'VALIDATION_FAILED_SAFE',
  'EVIDENCE_PENDING',
  'EVIDENCE_READY',
  'DRAFT_PR_STEP_PENDING',
  'DRAFT_PR_STEP_IN_PROGRESS',
  'DRAFT_PR_STEP_COMPLETED',
  'WORKFLOW_COMPLETED',
  'WORKFLOW_PAUSED',
  'WORKFLOW_FAILED_SAFE',
  'WORKFLOW_RECONCILIATION_REQUIRED',
  'WORKFLOW_CANCELLED',
  'WORKFLOW_ROLLBACK_REQUIRED',
  'WORKFLOW_ROLLED_BACK'
];

let src;
try {
  src = fs.readFileSync(path, 'utf8');
} catch (error) {
  console.error(`unable to load workflow contract: ${path}`);
  process.exit(1);
}

const match = src.match(/export const WORKFLOW_STATES = \[(.*?)\] as const;/s);
if (!match) {
  console.error('missing WORKFLOW_STATES export');
  process.exit(1);
}

const states = [...match[1].matchAll(/"([A-Z0-9_]+)"/g)].map(([, state]) => state);
if (states.length !== 32) {
  console.error(`WORKFLOW_STATES length mismatch: expected 32, got ${states.length}`);
  process.exit(1);
}

const missing = requiredStates.filter((state) => !states.includes(state));
if (missing.length > 0) {
  console.error(`missing required workflow states: ${missing.join(', ')}`);
  process.exit(1);
}
NODE
if grep -REn 'child_process|execSync|execFileSync|(^|[^[:alnum:]_])eval[[:space:]]*\(' packages/phase1a5-workflow-engine/src; then
  echo 'prohibited executable surface found'
  exit 1
fi
python - <<'PY'
import json
from pathlib import Path
manifest = json.loads(Path('packages/phase1a5-workflow-engine/acceptance-manifest.json').read_text())
ids = sorted(manifest)
required = ['P15-CONTRACT-001','P15-APPROVAL-001','P15-STATE-001','P15-CHECKPOINT-001','P15-RECOVERY-001','P15-EXECUTOR-001','P15-EVIDENCE-001','P15-ROLLBACK-001','P15-SECURITY-001','P15-SIMULATION-001']
missing = [id for id in required if id not in ids]
if missing:
    raise SystemExit(f'missing requirement IDs: {missing}')
PY
pnpm --filter @onyx/phase1a5-workflow-engine typecheck
pnpm --filter @onyx/phase1a5-workflow-engine test
pnpm --filter @onyx/phase1a4a-issue-bridge test
pnpm --filter @onyx/phase1a4b-branch-bridge test
pnpm --filter @onyx/phase1a4c-push-bridge test
pnpm --filter @onyx/phase1a4d-draft-pr-bridge test
pnpm --dir apps/command-center exec vitest run src/automationOrchestrationService.e10.test.ts
bash -n scripts/validate-phase1a5.sh
git diff --check
echo "Phase 1A.5 validation passed"
