#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

required=(
  packages/phase1a6-workflow-runtime/package.json
  packages/phase1a6-workflow-runtime/tsconfig.json
  packages/phase1a6-workflow-runtime/acceptance-manifest.json
  packages/phase1a6-workflow-runtime/src/contracts.ts
  packages/phase1a6-workflow-runtime/src/runtime-host.ts
  packages/phase1a6-workflow-runtime/src/adapter-registry.ts
  packages/phase1a6-workflow-runtime/src/runtime-snapshot.ts
  packages/phase1a6-workflow-runtime/src/status-projector.ts
  packages/phase1a6-workflow-runtime/src/recovery-host.ts
  packages/phase1a6-workflow-runtime/src/reconciliation-handoff.ts
  packages/phase1a6-workflow-runtime/src/e10-runtime-adapter.ts
  packages/phase1a6-workflow-runtime/src/local-runtime-simulation.ts
  packages/phase1a6-workflow-runtime/src/index.ts
  packages/phase1a6-workflow-runtime/tests/runtime-host.test.ts
  packages/phase1a6-workflow-runtime/tests/recovery-host.test.ts
  packages/phase1a6-workflow-runtime/tests/e10-runtime-adapter.test.ts
  packages/phase1a6-workflow-runtime/tests/security-boundaries.test.ts
  packages/phase1a6-workflow-runtime/tests/runtime-simulation.test.ts
  docs/phase1a6/phase1a6-workflow-runtime.md
  docs/phase1a6/phase1a6-runtime-contracts.md
  docs/phase1a6/phase1a6-recovery-and-reconciliation.md
  docs/phase1a6/phase1a6-e10-integration.md
)
for file in "${required[@]}"; do test -f "$file" || { echo "missing: $file"; exit 1; }; done

grep -Eq 'RUNTIME_CONTRACT_VERSION = "1.0.0"' packages/phase1a6-workflow-runtime/src/contracts.ts
grep -Eq 'COMPATIBLE_WORKFLOW_CONTRACT_VERSION = "1.0.0"' packages/phase1a6-workflow-runtime/src/contracts.ts
grep -Eq 'WORKFLOW_CONTRACT_VERSION = "1.0.0"' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'RUNTIME_EXECUTION_LANE_LIMIT' packages/phase1a6-workflow-runtime/src/contracts.ts
grep -Eq 'EXECUTION_LANE_LIMIT = 1' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'mergeAllowed: false' packages/phase1a6-workflow-runtime/src/contracts.ts
grep -Eq 'productionDeployAllowed: false' packages/phase1a6-workflow-runtime/src/contracts.ts
grep -Eq 'forcePushAllowed: false' packages/phase1a6-workflow-runtime/src/contracts.ts
grep -Eq 'branchDeletionAllowed: false' packages/phase1a6-workflow-runtime/src/contracts.ts
grep -Eq 'rejectArbitraryRuntimeCommand' packages/phase1a6-workflow-runtime/src/contracts.ts

grep -Eq 'P16-CONTRACT|P16-RUNTIME|P16-REGISTRY|P16-SNAPSHOT|P16-STATUS|P16-RECOVERY|P16-RECONCILIATION|P16-E10|P16-SECURITY|P16-SIMULATION' packages/phase1a6-workflow-runtime/acceptance-manifest.json

# The Phase 1A.6 package must not fork the frozen Phase 1A.5 state list; it may only re-export it.
if grep -RE 'WORKFLOW_STATES\s*=\s*\[' packages/phase1a6-workflow-runtime/src; then
  echo 'Phase 1A.6 must not redefine WORKFLOW_STATES'
  exit 1
fi

node - <<'NODE'
const fs = require('node:fs');
const path = 'packages/phase1a5-workflow-engine/src/contracts.ts';
const requiredStates = [
  'WORKFLOW_CREATED','SCOPE_FROZEN','AWAITING_WORKFLOW_APPROVAL','WORKFLOW_APPROVED',
  'PREFLIGHT_IN_PROGRESS','PREFLIGHT_PASSED','PREFLIGHT_FAILED_SAFE',
  'ISSUE_STEP_PENDING','ISSUE_STEP_IN_PROGRESS','ISSUE_STEP_COMPLETED',
  'BRANCH_STEP_PENDING','BRANCH_STEP_IN_PROGRESS','BRANCH_STEP_COMPLETED',
  'PUSH_STEP_PENDING','PUSH_STEP_IN_PROGRESS','PUSH_STEP_COMPLETED',
  'VALIDATION_PENDING','VALIDATION_IN_PROGRESS','VALIDATION_PASSED','VALIDATION_FAILED_SAFE',
  'EVIDENCE_PENDING','EVIDENCE_READY',
  'DRAFT_PR_STEP_PENDING','DRAFT_PR_STEP_IN_PROGRESS','DRAFT_PR_STEP_COMPLETED',
  'WORKFLOW_COMPLETED','WORKFLOW_PAUSED','WORKFLOW_FAILED_SAFE',
  'WORKFLOW_RECONCILIATION_REQUIRED','WORKFLOW_CANCELLED',
  'WORKFLOW_ROLLBACK_REQUIRED','WORKFLOW_ROLLED_BACK'
];
const src = fs.readFileSync(path, 'utf8');
const match = src.match(/export const WORKFLOW_STATES = \[(.*?)\] as const;/s);
if (!match) { console.error('missing WORKFLOW_STATES export'); process.exit(1); }
const states = [...match[1].matchAll(/"([A-Z0-9_]+)"/g)].map(([, state]) => state);
if (states.length !== 32) { console.error(`WORKFLOW_STATES length mismatch: expected 32, got ${states.length}`); process.exit(1); }
const missing = requiredStates.filter((state) => !states.includes(state));
if (missing.length > 0) { console.error(`missing required workflow states: ${missing.join(', ')}`); process.exit(1); }
NODE

python - <<'PY'
import json
from pathlib import Path
manifest = json.loads(Path('packages/phase1a6-workflow-runtime/acceptance-manifest.json').read_text())
required = ['P16-CONTRACT','P16-RUNTIME','P16-REGISTRY','P16-SNAPSHOT','P16-STATUS','P16-RECOVERY','P16-RECONCILIATION','P16-E10','P16-SECURITY','P16-SIMULATION']
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

# No arbitrary command/shell surface, no child-process, no live GitHub write surface.
if grep -RE 'child_process|execSync|execFileSync|(^|[^[:alnum:]_])eval[[:space:]]*\(' packages/phase1a6-workflow-runtime/src; then
  echo 'prohibited executable surface found'
  exit 1
fi
if grep -RE '(runCommand|executeCommand|shellExec|execShell)\s*\(' packages/phase1a6-workflow-runtime/src; then
  echo 'arbitrary command interface found'
  exit 1
fi
if grep -RE 'octokit|@octokit|https://api\.github\.com' packages/phase1a6-workflow-runtime/src; then
  echo 'live GitHub write surface found'
  exit 1
fi
if grep -RE 'mergeAllowed\s*[:=]\s*true|productionDeployAllowed\s*[:=]\s*true|forcePushAllowed\s*[:=]\s*true|branchDeletionAllowed\s*[:=]\s*true' packages/phase1a6-workflow-runtime/src; then
  echo 'prohibited write flag enabled'
  exit 1
fi

pnpm --filter @onyx/phase1a6-workflow-runtime typecheck
pnpm --filter @onyx/phase1a6-workflow-runtime test
pnpm --filter @onyx/phase1a6-workflow-runtime exec vitest run tests/runtime-simulation.test.ts
pnpm --filter @onyx/phase1a5-workflow-engine test
pnpm --dir apps/command-center exec vitest run src/automationOrchestrationService.e10.test.ts
bash -n scripts/validate-phase1a6.sh
git diff --check
echo "Phase 1A.6 validation passed"
