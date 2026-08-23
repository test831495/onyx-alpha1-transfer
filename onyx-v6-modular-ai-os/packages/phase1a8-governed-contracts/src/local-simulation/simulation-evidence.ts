import { createHash } from "node:crypto";
import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";

export interface SimulationEvidenceSummary {
  simulationRunId: string;
  scenarioIds: string[];
  passedScenarioIds: string[];
  failedScenarioIds: string[];
  blockedScenarioIds: string[];
  reconciliationScenarioIds: string[];
  contractGroupsCovered: string[];
  acceptanceIdsCovered: string[];
  evidenceReferences: string[];
  resultDigest: string;
  createdAt: string;
  contractVersion: string;
}

export function stableSimulationSummaryPayload(summary: Omit<SimulationEvidenceSummary, "resultDigest">): string {
  return JSON.stringify(summary, Object.keys(summary).sort());
}

export function deriveSimulationEvidenceDigest(summary: Omit<SimulationEvidenceSummary, "resultDigest">): string {
  return createHash("sha256").update(stableSimulationSummaryPayload(summary)).digest("hex");
}

export function createSimulationEvidenceSummary(input: {
  simulationRunId: string;
  scenarioIds: string[];
  passedScenarioIds: string[];
  failedScenarioIds: string[];
  blockedScenarioIds: string[];
  reconciliationScenarioIds: string[];
  contractGroupsCovered: string[];
  acceptanceIdsCovered: string[];
  evidenceReferences: string[];
  createdAt: string;
  contractVersion?: string;
}): SimulationEvidenceSummary {
  const summary: Omit<SimulationEvidenceSummary, "resultDigest"> = {
    simulationRunId: input.simulationRunId,
    scenarioIds: [...input.scenarioIds],
    passedScenarioIds: [...input.passedScenarioIds],
    failedScenarioIds: [...input.failedScenarioIds],
    blockedScenarioIds: [...input.blockedScenarioIds],
    reconciliationScenarioIds: [...input.reconciliationScenarioIds],
    contractGroupsCovered: [...input.contractGroupsCovered],
    acceptanceIdsCovered: [...input.acceptanceIdsCovered],
    evidenceReferences: [...input.evidenceReferences].filter((reference) => !reference.includes("secret") && !reference.includes("token") && !reference.includes("ghp_")),
    createdAt: input.createdAt,
    contractVersion: input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
  };

  return {
    ...summary,
    resultDigest: deriveSimulationEvidenceDigest(summary),
  };
}
