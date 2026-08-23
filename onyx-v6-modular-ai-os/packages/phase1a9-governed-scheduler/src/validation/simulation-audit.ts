import { TEST_IDS } from "./test-matrix-audit";

export interface SimulationAuditResult { scenarioCount: number; faultCount: number; mappedTestIds: string[]; blockers: string[]; passed: boolean; }
export function auditSimulations(scenarios: readonly { scenarioId: string; coveredTestIds: readonly string[]; faultInjections: readonly { faultId: string }[]; expectedResultClassification: string; }[]): SimulationAuditResult {
  const blockers: string[] = [];
  const scenarioIds = scenarios.map((scenario) => scenario.scenarioId);
  const faultIds = scenarios.flatMap((scenario) => scenario.faultInjections.map((fault) => fault.faultId));
  if (scenarioIds.length !== 7 || new Set(scenarioIds).size !== 7) blockers.push("Phase 1A.9 requires 7 unique scenarios");
  if (faultIds.length !== 4 || new Set(faultIds).size !== 4) blockers.push("Phase 1A.9 requires 4 unique fault IDs");
  const mappedTestIds = [...new Set(scenarios.flatMap((scenario) => scenario.coveredTestIds))].sort();
  if (TEST_IDS.some((id) => !mappedTestIds.includes(id))) blockers.push("simulation mapping is missing a T ID");
  if (scenarios.some((scenario) => scenario.expectedResultClassification === "UNEXPECTED_FAILURE")) blockers.push("simulation contains an unexpected failure");
  return { scenarioCount: scenarios.length, faultCount: faultIds.length, mappedTestIds, blockers, passed: blockers.length === 0 };
}