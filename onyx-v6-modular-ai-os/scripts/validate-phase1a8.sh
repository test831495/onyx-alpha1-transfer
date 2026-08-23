#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

required=(
  packages/phase1a8-governed-contracts/package.json
  packages/phase1a8-governed-contracts/acceptance-manifest.json
  packages/phase1a8-governed-contracts/src/index.ts
  packages/phase1a8-governed-contracts/src/shared/versions.ts
  packages/phase1a8-governed-contracts/src/shared/safety.ts
  packages/phase1a8-governed-contracts/src/shared/risk-classes.ts
  packages/phase1a8-governed-contracts/src/shared/parallel-safety.ts
  packages/phase1a8-governed-contracts/src/local-simulation/scenario-registry.ts
  packages/phase1a8-governed-contracts/src/local-simulation/simulation-runner.ts
  packages/phase1a8-governed-contracts/src/local-simulation/simulation-evidence.ts
  packages/phase1a8-governed-contracts/tests/local-simulation.test.ts
  docs/phase1a8/phase1a8-acceptance-and-simulation.md
)
for file in "${required[@]}"; do test -f "$file" || { echo "missing: $file"; exit 1; }; done

grep -Eq 'ACTIVE_PHASE1A8_RUNTIME_LIMIT = RUNTIME_EXECUTION_LANE_LIMIT' packages/phase1a8-governed-contracts/src/shared/versions.ts
grep -Eq 'RUNTIME_EXECUTION_LANE_LIMIT' packages/phase1a6-workflow-runtime/src/contracts.ts
grep -Eq 'EXECUTION_LANE_LIMIT = 1' packages/phase1a5-workflow-engine/src/contracts.ts
grep -Eq 'PROMOTION_LANE_LIMIT = 1' packages/phase1a8-governed-contracts/src/shared/lane-roadmap.ts
grep -Eq 'COMPATIBLE_UI_CONTRACT_VERSION = "1.0.0"' packages/phase1a8-governed-contracts/src/shared/versions.ts
grep -Eq 'AUTOMATION_RUNTIME_UI_CONTRACT_VERSION = "1.0.0"' apps/command-center/src/automationRuntimeContracts.ts
grep -Eq 'export const RISK_CLASSES = \["R0", "R1", "R2", "R3", "R4", "R5"\]' packages/phase1a8-governed-contracts/src/shared/risk-classes.ts
grep -Eq 'export const MEMORY_TIERS = \["M0", "M1", "M2", "M3", "M4", "M5", "P0"\]' packages/phase1a8-governed-contracts/src/track-b/memory-tiers.ts
grep -Eq 'export const AUTOMATION_CENTER_SCREEN_IDS = \[' packages/phase1a8-governed-contracts/src/ux/automation-center-v2-contracts.ts
grep -Eq 'export const ACCESSIBILITY_GATE_IDS = \[' packages/phase1a8-governed-contracts/src/ux/accessibility-gates.ts

node - <<'NODE'
const fs = require('node:fs');
const manifest = JSON.parse(fs.readFileSync('packages/phase1a8-governed-contracts/acceptance-manifest.json', 'utf8'));
const ids = ['P18-CONTRACT','P18-AGENT','P18-CAPABILITY','P18-TASK','P18-LEASE','P18-HEARTBEAT','P18-RECOVERY','P18-DEPENDENCY','P18-LOCK','P18-CAS','P18-EVIDENCE','P18-CANCELLATION','P18-JOIN','P18-AGGREGATION','P18-APPROVAL','P18-PERMISSION','P18-CONNECTOR','P18-BUDGET','P18-MEMORY','P18-PERSONA','P18-CONTEXT','P18-POISONING','P18-COUNCIL','P18-DRAFT','P18-PROMOTION','P18-UX-CONTRACT','P18-ACCESSIBILITY','P18-SECURITY','P18-SIMULATION'];
if (Object.keys(manifest).length !== ids.length || ids.some((id) => !manifest[id])) throw new Error('acceptance IDs are incomplete or duplicated');
for (const id of ids) {
  const entry = manifest[id];
  for (const field of ['implementationIdentifiers','testFiles','validationMethod','acceptanceEvidence','acceptanceStatus','documentationReference']) {
    if (!entry[field] || (Array.isArray(entry[field]) && entry[field].length === 0)) throw new Error(`${id} missing ${field}`);
  }
  for (const file of entry.testFiles) if (!fs.existsSync(file)) throw new Error(`${id} missing test file ${file}`);
  if (!fs.existsSync(entry.documentationReference)) throw new Error(`${id} missing documentation ${entry.documentationReference}`);
  if (entry.acceptanceStatus !== 'accepted') throw new Error(`${id} is not accepted`);
  if (entry.acceptanceStatus === 'accepted' && id === 'P18-SIMULATION' && !entry.simulationMethod) throw new Error('P18-SIMULATION missing simulationMethod');
}
NODE

node - <<'NODE'
const fs = require('node:fs');
const source = fs.readFileSync('packages/phase1a8-governed-contracts/src/local-simulation/scenario-registry.ts', 'utf8');
const ids = [...source.matchAll(/scenarioId: "([A-Z0-9_]+)"/g)].map((match) => match[1]);
if (ids.length !== 44 || new Set(ids).size !== 44) throw new Error(`scenario registry must contain 44 unique IDs, got ${ids.length}`);
if (ids.filter((id) => id === 'SIM_COMPLETE_FAIL_SAFE').length !== 1) throw new Error('missing reconciliation scenario');
for (const field of ['description:', 'contractGroups:', 'requiredFixtureIds:', 'expectedResult:', 'expectedEvidenceClasses:', 'riskClass:', 'parallelSafetyClass:', 'liveActionPermitted: false', 'contractVersion: "1.0.0"']) {
  if (!source.includes(field)) throw new Error(`scenario metadata missing ${field}`);
}
NODE

if grep -REn --include='*.ts' --exclude='safety.ts' 'child_process|execSync|execFile|spawnSync|fork\(|(^|[^[:alnum:]_])eval[[:space:]]*\(|new Function|@octokit|api\.github\.com|fetch\(|axios|shellExec|execShell|runCommand\(|executeCommand\(' packages/phase1a8-governed-contracts/src; then
  echo 'prohibited executable or remote surface found'; exit 1
fi
if grep -REn --include='*.ts' --exclude='safety.ts' 'Promise\.all|worker_threads|Worker\(|child_process|new Worker' packages/phase1a8-governed-contracts/src; then
  echo 'actual concurrency or child-process surface found'; exit 1
fi
if grep -REn --include='*.ts' 'mergeAllowed\s*[:=]\s*true|productionDeployAllowed\s*[:=]\s*true|forcePushAllowed\s*[:=]\s*true|branchDeletionAllowed\s*[:=]\s*true|secretAccessAllowed\s*[:=]\s*true|permissionChangeAllowed\s*[:=]\s*true|liveConnectorMutationAllowed\s*[:=]\s*true|paidActionAllowed\s*[:=]\s*true' packages/phase1a8-governed-contracts/src; then
  echo 'safety flag enabled'; exit 1
fi

pnpm --filter @onyx/phase1a8-governed-contracts typecheck
pnpm --dir packages/phase1a8-governed-contracts exec vitest run tests/local-simulation.test.ts
pnpm --filter @onyx/phase1a8-governed-contracts test
pnpm --dir apps/command-center exec vitest run src/automationOrchestrationService.e10.test.ts
echo "Phase 1A.8 validator passed"