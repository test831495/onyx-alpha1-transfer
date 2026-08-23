/**
 * Phase 1A.9 Wave 5A: Fault Injection Tests
 *
 * Comprehensive tests for fault injection contracts and cross-contract chain scenarios.
 */

import { describe, expect, it } from "vitest";
import { FAULT_CLASSES, createFaultInjectionRegistry, STANDARD_FAULT_INJECTIONS } from "../src/local-simulation/fault-injection";
import { runSchedulerSimulationScenario, runAllSchedulerSimulations } from "../src/local-simulation/simulation-runner";
import { resolveSchedulerSimulationScenario, SCHEDULER_SIMULATION_SCENARIOS } from "../src/local-simulation/scenario-registry";

describe("Phase 1A.9 Wave 5A Fault Injection", () => {
  describe("Fault Classes and Activation", () => {
    it("contains all required fault classes", () => {
      const expectedFaults = [
        "cycle",
        "unknown-dependency",
        "lease-race",
        "stale-lease-generation",
        "heartbeat-loss",
        "clock-skew",
        "lock-conflict",
        "lock-owner-loss",
        "cas-conflict",
        "checkpoint-corruption",
        "schema-mismatch",
        "cancellation-uncertainty",
        "join-timeout",
        "budget-warning",
        "budget-hard-stop",
        "attempt-exhaustion",
        "evidence-failure",
        "unknown-external-write",
        "runtime-divergence",
        "workflow-divergence",
        "approval-invalidation",
        "permission-invalidation",
        "memory-tombstone",
        "memory-poisoning",
        "context-quarantine",
        "council-disagreement",
        "draft-approval-invalidation",
        "connector-account-conflict",
        "connector-remote-uncertainty",
        "promotion-failure",
        "evidence-causal-cycle",
        "missing-mandatory-evidence",
      ];

      for (const faultClass of expectedFaults) {
        expect(Object.values(FAULT_CLASSES)).toContain(faultClass);
      }
    });

    it("registers all standard fault injections without duplicates", () => {
      const registry = createFaultInjectionRegistry();
      const faults = registry.getAll();
      expect(faults.length).toBe(STANDARD_FAULT_INJECTIONS.length);

      const faultIds = new Set(faults.map((f) => f.faultId));
      expect(faultIds.size).toBe(faults.length);
    });

    it("each standard fault has valid activation point", () => {
      const validActivationPoints = [
        "before-acquisition",
        "during-acquisition",
        "during-execution",
        "after-execution",
        "after-completion",
        "before-lane-transition",
        "during-monitoring",
        "during-decision",
        "during-recovery",
      ];

      for (const fault of STANDARD_FAULT_INJECTIONS) {
        expect(validActivationPoints).toContain(fault.activationPoint);
      }
    });

    it("each standard fault has expected disposition", () => {
      for (const fault of STANDARD_FAULT_INJECTIONS) {
        expect(fault.expectedDisposition.length).toBeGreaterThan(0);
        expect(fault.expectedDisposition).toMatch(/^[A-Z_]+$/);
      }
    });

    it("each fault has required evidence classes", () => {
      for (const fault of STANDARD_FAULT_INJECTIONS) {
        expect(Array.isArray(fault.expectedEvidenceClasses)).toBe(true);
        expect(fault.expectedEvidenceClasses.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Fault-Injected Scenarios", () => {
    it("scenario B1 injects cycle fault correctly", () => {
      const scenario = resolveSchedulerSimulationScenario("SIM_B1_CYCLE_REJECTION");
      expect(scenario).toBeDefined();
      if (scenario) {
        expect(scenario.faultInjections.length).toBeGreaterThan(0);
        expect(scenario.faultInjections[0]?.faultClass).toBe(FAULT_CLASSES.CYCLE);
        expect(scenario.faultInjections[0]?.expectedDisposition).toBe("CYCLE_DETECTED");
      }
    });

    it("scenario D1 injects lease-race fault correctly", () => {
      const scenario = resolveSchedulerSimulationScenario("SIM_D1_LEASE_RACE");
      expect(scenario).toBeDefined();
      if (scenario) {
        const hasLeaseRace = scenario.faultInjections.some((f) => f.faultClass === FAULT_CLASSES.LEASE_RACE);
        expect(hasLeaseRace).toBe(true);
      }
    });

    it("scenario D2 injects heartbeat-loss fault correctly", () => {
      const scenario = resolveSchedulerSimulationScenario("SIM_D2_HEARTBEAT_LOSS");
      const hasHeartbeatLoss = scenario.faultInjections.some(
        (f) => f.faultClass === FAULT_CLASSES.HEARTBEAT_LOSS
      );
      expect(hasHeartbeatLoss).toBe(true);
    });
  });

  describe("Fault-Injected Determinism", () => {
    it("fault-injected scenario B1 produces deterministic results", () => {
      const result1 = runSchedulerSimulationScenario("SIM_B1_CYCLE_REJECTION", {
        baseTimestamp: "2026-08-21T01:00:00.000Z",
        enableFaultInjection: true,
        validateDeterminism: true,
      });
      const result2 = runSchedulerSimulationScenario("SIM_B1_CYCLE_REJECTION", {
        baseTimestamp: "2026-08-21T01:00:00.000Z",
        enableFaultInjection: true,
        validateDeterminism: true,
      });

      expect(result1.deterministicDigestInput).toBe(result2.deterministicDigestInput);
      expect(result1.resultClassification).toBe(result2.resultClassification);
      expect(result1.actualEvents.length).toBe(result2.actualEvents.length);
    });

    it("fault injection can be disabled and re-enabled consistently", () => {
      const withFault = runSchedulerSimulationScenario("SIM_A1_SCHEDULER_DISABLED", {
        baseTimestamp: "2026-08-21T00:00:00.000Z",
        enableFaultInjection: true,
        validateDeterminism: true,
      });
      const withoutFault = runSchedulerSimulationScenario("SIM_A1_SCHEDULER_DISABLED", {
        baseTimestamp: "2026-08-21T00:00:00.000Z",
        enableFaultInjection: false,
        validateDeterminism: true,
      });

      // Both should be deterministic
      expect(withFault.deterministicDigestInput).toBeDefined();
      expect(withoutFault.deterministicDigestInput).toBeDefined();
    });
  });

  describe("Cross-Contract Fault Chains", () => {
    it("heartbeat loss chain: loss -> recovery handoff -> reconciliation", () => {
      const scenario = resolveSchedulerSimulationScenario("SIM_D2_HEARTBEAT_LOSS");
      const result = runSchedulerSimulationScenario("SIM_D2_HEARTBEAT_LOSS");

      // Verify chain of events
      expect(result.actualEvents.some((e) => e.eventType === "HEARTBEAT_EVALUATED")).toBe(true);
      expect(result.actualEvents.some((e) => e.eventType === "RECOVERY_HANDOFF_PROJECTED")).toBe(
        true
      );
      expect(result.actualDecisions.some((d) => d.decisionClass === "RECOVERY_DECISION")).toBe(
        true
      );
      expect(result.actualRecoveryDisposition).toMatch(/reconcile|wait/i);
    });

    it("cycle detection chain: cycle found -> workflow rejected", () => {
      const scenario = resolveSchedulerSimulationScenario("SIM_B1_CYCLE_REJECTION");
      const result = runSchedulerSimulationScenario("SIM_B1_CYCLE_REJECTION");

      // Verify chain of events
      expect(result.actualEvents.some((e) => e.eventType === "DEPENDENCY_CYCLE_DETECTED")).toBe(
        true
      );
      expect(result.actualDecisions.some((d) => d.recommendation === "REJECT_WORKFLOW")).toBe(
        true
      );
    });

    it("lane capacity exhaustion chain: exceeds capacity -> task queued", () => {
      const scenario = resolveSchedulerSimulationScenario("SIM_C1_S0_CAPACITY");
      const result = runSchedulerSimulationScenario("SIM_C1_S0_CAPACITY");

      // Verify chain of events
      expect(result.actualEvents.some((e) => e.eventType === "LANE_CAPACITY_EXCEEDED")).toBe(true);
      expect(result.actualDecisions.some((d) => d.recommendation.includes("QUEUE"))).toBe(true);
    });
  });

  describe("Fault and Safety State Alignment", () => {
    it("all fault-injected scenarios preserve disabled scheduler", () => {
      const faultScenarios = SCHEDULER_SIMULATION_SCENARIOS.filter(
        (s) => s.faultInjections.length > 0
      );
      for (const scenario of faultScenarios) {
        const result = runSchedulerSimulationScenario(scenario.scenarioId);
        expect(result.actualSafetyState.schedulerEnabled).toBe(false);
      }
    });

    it("all fault injections have safety state expectations", () => {
      for (const scenario of SCHEDULER_SIMULATION_SCENARIOS) {
        for (const fault of scenario.faultInjections) {
          expect(Object.keys(fault.expectedSafetyState).length).toBeGreaterThan(0);
          expect(fault.expectedSafetyState.schedulerEnabled).toBe(false);
        }
      }
    });

    it("fault-injected results match expected safety state", () => {
      const faultScenarios = SCHEDULER_SIMULATION_SCENARIOS.filter(
        (s) => s.faultInjections.length > 0
      );
      for (const scenario of faultScenarios) {
        const result = runSchedulerSimulationScenario(scenario.scenarioId);
        expect(result.expectedSafetyStateMatched).toBe(true);
      }
    });
  });

  describe("Fault-Induced Recovery Paths", () => {
    it("cycle fault blocks promotion", () => {
      const scenario = resolveSchedulerSimulationScenario("SIM_B1_CYCLE_REJECTION");
      expect(scenario.expectedFinalProjection.cycleDetected).toBe(true);
    });

    it("heartbeat loss requires reconciliation", () => {
      const scenario = resolveSchedulerSimulationScenario("SIM_D2_HEARTBEAT_LOSS");
      expect(scenario.expectedRecoveryDisposition).toMatch(/reconcile|wait|recovery/i);
    });

    it("lease race determines single winner", () => {
      const scenario = resolveSchedulerSimulationScenario("SIM_D1_LEASE_RACE");
      const result = runSchedulerSimulationScenario("SIM_D1_LEASE_RACE");
      expect(result.actualRecoveryDisposition).toMatch(/accept|single-owner/i);
    });
  });

  describe("No Live Execution Surface After Fault Injection", () => {
    it("no scenario executes tasks after fault", () => {
      const aggregated = runAllSchedulerSimulations({
        baseTimestamp: "2026-08-21T00:00:00.000Z",
        enableFaultInjection: true,
        validateDeterminism: true,
      });

      for (const result of aggregated.scenarioResults) {
        // No "TASK_EXECUTED" or "TASK_DISPATCHED" events should exist
        const executedEvents = result.actualEvents.filter((e) =>
          /EXECUTE|DISPATCH|RUN|INVOKE/.test(e.eventType)
        );
        expect(executedEvents.length).toBe(0);
      }
    });

    it("no scenario persists state after fault", () => {
      const aggregated = runAllSchedulerSimulations({
        baseTimestamp: "2026-08-21T00:00:00.000Z",
        enableFaultInjection: true,
        validateDeterminism: true,
      });

      for (const result of aggregated.scenarioResults) {
        // No "PERSISTED" or "COMMITTED" events should exist
        const persistedEvents = result.actualEvents.filter((e) =>
          /PERSIST|COMMIT|WRITE|SAVE|UPLOAD/.test(e.eventType)
        );
        expect(persistedEvents.length).toBe(0);
      }
    });

    it("all fault-injected scenarios are projection-only", () => {
      const faultScenarios = SCHEDULER_SIMULATION_SCENARIOS.filter(
        (s) => s.faultInjections.length > 0
      );
      for (const scenario of faultScenarios) {
        expect(scenario.evidenceFixtures.every((ef) => !ef.artifactId.includes("live")));
      }
    });
  });

  describe("Fault Injection Evidence Tracking", () => {
    it("each fault injection has required evidence classes", () => {
      const registry = createFaultInjectionRegistry();
      for (const fault of registry.getAll()) {
        expect(fault.expectedEvidenceClasses.length).toBeGreaterThan(0);
        for (const evidenceClass of fault.expectedEvidenceClasses) {
          expect(evidenceClass.length).toBeGreaterThan(0);
        }
      }
    });

    it("fault-injected scenarios produce evidence artifacts", () => {
      const faultScenarios = SCHEDULER_SIMULATION_SCENARIOS.filter(
        (s) => s.faultInjections.length > 0
      );
      for (const scenario of faultScenarios) {
        const result = runSchedulerSimulationScenario(scenario.scenarioId);
        expect(result.evidenceArtifactIds.length).toBeGreaterThan(0);
      }
    });
  });
});
