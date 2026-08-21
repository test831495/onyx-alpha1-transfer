import { ACTIVE_PHASE1A8_RUNTIME_LIMIT } from "../shared/versions";
import { defaultGovernedSafetyFlags } from "../shared/safety";
import { ALL_SIMULATION_SCENARIOS, resolveScenarioDefinition } from "./scenario-registry";
import { buildSimulationFixtureSet, SIMULATION_FIXTURE_IDS } from "./fixture-factory";
import { createSimulationClock, createSimulationIdentifierSource } from "./simulation-clock";
import { createSimulationEvidenceSummary } from "./simulation-evidence";

export interface DeterministicSimulationResult {
  simulationRunId: string;
  scenarioId: string;
  scenarioIds: string[];
  passedScenarioIds: string[];
  failedScenarioIds: string[];
  blockedScenarioIds: string[];
  reconciliationScenarioIds: string[];
  status: "PASS" | "BLOCKED" | "FAIL_SAFE" | "RECONCILIATION_REQUIRED";
  resultDigest: string;
  evidenceReferences: string[];
  contractVersion: string;
}

export function runDeterministicSimulation(): DeterministicSimulationResult {
  const clock = createSimulationClock("2026-08-21T00:00:00.000Z");
  const scenarioIds = ALL_SIMULATION_SCENARIOS.map((scenario) => scenario.scenarioId);
  const fixtures = buildSimulationFixtureSet();
  const identifierSource = createSimulationIdentifierSource("SIM_PHASE1A8", "simulation-run");
  const simulationRunId = identifierSource.nextId();

  const passedScenarioIds: string[] = [];
  const failedScenarioIds: string[] = [];
  const blockedScenarioIds: string[] = [];
  const reconciliationScenarioIds: string[] = [];
  const evidenceReferences: string[] = [];
  const flags = defaultGovernedSafetyFlags();

  if (ACTIVE_PHASE1A8_RUNTIME_LIMIT !== 1) {
    throw new Error("Simulation invariants require ACTIVE_PHASE1A8_RUNTIME_LIMIT to remain 1.");
  }
  if (flags.mergeAllowed || flags.productionDeployAllowed || flags.forcePushAllowed || flags.branchDeletionAllowed || flags.secretAccessAllowed || flags.permissionChangeAllowed || flags.liveConnectorMutationAllowed || flags.paidActionAllowed) {
    throw new Error("Simulation must preserve all safety flags as false.");
  }

  for (const scenario of ALL_SIMULATION_SCENARIOS) {
    const definition = resolveScenarioDefinition(scenario.scenarioId);
    if (definition.contractVersion !== "1.0.0" || definition.contractGroups.length === 0 || definition.expectedEvidenceClasses.length === 0) {
      throw new Error(`Scenario ${scenario.scenarioId} is missing required contract metadata.`);
    }
    for (const fixtureId of definition.requiredFixtureIds) {
      if (!(Object.values(SIMULATION_FIXTURE_IDS) as string[]).includes(fixtureId)) {
        throw new Error(`Scenario ${scenario.scenarioId} references an unavailable fixture: ${fixtureId}`);
      }
    }
    if (definition.liveActionPermitted) {
      throw new Error(`Scenario ${scenario.scenarioId} attempted a live action, which is prohibited.`);
    }
    if (scenario.riskClass === "R5" && scenario.parallelSafetyClass !== "PROHIBITED") {
      throw new Error(`Scenario ${scenario.scenarioId} violates the R5/prohibited axis split.`);
    }
    if (definition.expectedResult === "PASS") {
      passedScenarioIds.push(definition.scenarioId);
      evidenceReferences.push(`evidence:${definition.scenarioId}:ok`);
    } else if (definition.expectedResult === "BLOCKED") {
      blockedScenarioIds.push(definition.scenarioId);
      evidenceReferences.push(`evidence:${definition.scenarioId}:blocked`);
    } else if (definition.expectedResult === "RECONCILIATION_REQUIRED") {
      reconciliationScenarioIds.push(definition.scenarioId);
      evidenceReferences.push(`evidence:${definition.scenarioId}:reconcile`);
    } else {
      failedScenarioIds.push(definition.scenarioId);
      evidenceReferences.push(`evidence:${definition.scenarioId}:fail-safe`);
    }
  }

  if (new Set(scenarioIds).size !== scenarioIds.length || new Set(evidenceReferences).size !== scenarioIds.length) {
    throw new Error("Simulation scenarios must be unique, executed once, and evidenced.");
  }

  if (failedScenarioIds.length > 0 || blockedScenarioIds.length > 0) {
    if (reconciliationScenarioIds.length === 0) {
      throw new Error("A blocked or failed simulation must include reconciliation evidence.");
    }
  }

  const summary = createSimulationEvidenceSummary({
    simulationRunId,
    scenarioIds,
    passedScenarioIds,
    failedScenarioIds,
    blockedScenarioIds,
    reconciliationScenarioIds,
    contractGroupsCovered: ["Shared Governance", "Track A", "Track B", "UX"],
    acceptanceIdsCovered: ["P18-SIMULATION"],
    evidenceReferences,
    createdAt: clock.currentIso(),
    contractVersion: "1.0.0",
  });

  const status: DeterministicSimulationResult["status"] = reconciliationScenarioIds.length > 0 ? "RECONCILIATION_REQUIRED" : "PASS";

  return {
    simulationRunId,
    scenarioId: scenarioIds.at(0) ?? "SIM_AGENT_REGISTRATION",
    scenarioIds,
    passedScenarioIds,
    failedScenarioIds,
    blockedScenarioIds,
    reconciliationScenarioIds,
    status,
    resultDigest: summary.resultDigest,
    evidenceReferences: summary.evidenceReferences,
    contractVersion: summary.contractVersion,
  };
}

export function maybeResolveSimulationEvidence() {
  return { fixtureSet: buildSimulationFixtureSet() };
}
