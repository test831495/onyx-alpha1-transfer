import { describe, expect, it } from "vitest";
import {
  ALL_SIMULATION_SCENARIOS,
  buildSimulationFixtureSet,
  createSimulationClock,
  createSimulationIdentifierSource,
  resolveScenarioDefinition,
  runDeterministicSimulation,
  SIMULATION_SCENARIO_IDS,
  validateScenarioDefinition,
} from "../src/local-simulation";

describe("Phase 1A.8 local deterministic simulation", () => {
  it("registers the expected scenario IDs and rejects unknown or duplicate entries", () => {
    expect(SIMULATION_SCENARIO_IDS).toHaveLength(44);
    expect(new Set(SIMULATION_SCENARIO_IDS).size).toBe(44);
    expect(SIMULATION_SCENARIO_IDS).toContain("SIM_AGENT_REGISTRATION");
    expect(SIMULATION_SCENARIO_IDS).toContain("SIM_COMPLETE_FAIL_SAFE");
    expect(() => resolveScenarioDefinition("SIM_DOES_NOT_EXIST")).toThrow();
    expect(() => validateScenarioDefinition({
      scenarioId: "SIM_AGENT_REGISTRATION",
      description: "dup",
      contractGroups: ["Track A"],
      requiredFixtureIds: ["fixture-1"],
      expectedResult: "PASS",
      expectedEvidenceClasses: ["agent"],
      riskClass: "R1",
      parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE",
      liveActionPermitted: true as any,
      contractVersion: "1.0.0",
    })).toThrow();
  });

  it("builds deterministic fixtures and identifiers without secret or live-action content", () => {
    const fixtures = buildSimulationFixtureSet();
    expect(fixtures.supervisingUser.userId).toBe("user-supervising");
    expect(fixtures.ONYX.agentId).toBe("agent-onyx");
    expect(fixtures.workflow.workflowId).toBe("workflow-phase1a8");
    expect(fixtures.contextPackage.packageId).toBe("context-package-default");
    const clock = createSimulationClock("2026-08-21T00:00:00.000Z");
    const source = createSimulationIdentifierSource("SIM_AGENT_REGISTRATION", "task");
    expect(source.nextId()).toContain("SIM_AGENT_REGISTRATION");
    expect(clock.currentIso()).toBe("2026-08-21T00:00:00.000Z");
    expect(JSON.stringify(fixtures)).not.toContain("sk_live");
    expect(JSON.stringify(fixtures)).not.toContain("ghp_");
  });

  it("runs a deterministic simulation across all scenarios without violating the runtime or safety invariants", () => {
    const first = runDeterministicSimulation();
    const second = runDeterministicSimulation();
    expect(first.scenarioIds).toHaveLength(44);
    expect(first.passedScenarioIds).toHaveLength(43);
    expect(first.failedScenarioIds).toHaveLength(0);
    expect(first.blockedScenarioIds).toHaveLength(0);
    expect(first.reconciliationScenarioIds).toEqual(["SIM_COMPLETE_FAIL_SAFE"]);
    expect(first.evidenceReferences).toHaveLength(44);
    expect(first.simulationRunId).toBe(second.simulationRunId);
    expect(first.resultDigest).toBe(second.resultDigest);
    expect(first.scenarioIds).toEqual(second.scenarioIds);
    expect(first.passedScenarioIds).toEqual(second.passedScenarioIds);
    expect(first.failedScenarioIds).toEqual(second.failedScenarioIds);
    expect(first.blockedScenarioIds).toEqual(second.blockedScenarioIds);
    expect(first.reconciliationScenarioIds).toEqual(second.reconciliationScenarioIds);
    expect(first.evidenceReferences).toEqual(second.evidenceReferences);
    expect(first.passedScenarioIds.length + first.failedScenarioIds.length + first.blockedScenarioIds.length + first.reconciliationScenarioIds.length).toBe(ALL_SIMULATION_SCENARIOS.length);
    expect(first.status).toBe("RECONCILIATION_REQUIRED");
    expect(first.contractVersion).toBe("1.0.0");
    expect(first.evidenceReferences.every((ref) => !ref.includes("secret") && !ref.includes("token"))).toBe(true);
  });
});
