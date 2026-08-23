/**
 * Phase 1A.9 Wave 5A: Scenario Registry
 *
 * Deterministic scenarios for comprehensive Phase 1A.9 scheduler coverage.
 * Each scenario maps to specific P19 IDs and T test IDs.
 *
 * This registry is independent from Phase 1A.8's 44 scenarios and does not
 * modify or duplicate any Phase 1A.8 scenario IDs.
 */

import {
  SchedulerSimulationScenario,
  SimulationFixedTimestamps,
  SimulationDeterministicIdFixtures,
  validateSimulationScenario,
} from "./simulation-contracts";
import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";
import { defaultSchedulerConfig } from "../contracts/scheduler-config";

/**
 * Helper to create fixed timestamps for a scenario
 */
function createFixedTimestamps(baseTime: string): SimulationFixedTimestamps {
  const base = new Date(baseTime);
  return {
    scenarioStartedAt: base.toISOString(),
    leaseAcquiredAt: new Date(base.getTime() + 1000).toISOString(),
    heartbeatExpectedAt: new Date(base.getTime() + 5000).toISOString(),
    lockAcquiredAt: new Date(base.getTime() + 2000).toISOString(),
    checkpointCreatedAt: new Date(base.getTime() + 3000).toISOString(),
    taskCompletedAt: new Date(base.getTime() + 10000).toISOString(),
    simulationEvaluatedAt: new Date(base.getTime() + 15000).toISOString(),
  };
}

/**
 * Group A: Contracts and Authority
 *
 * Scenarios verifying frozen configuration and authority boundaries.
 */
const SCENARIO_SIM_A1_SCHEDULER_DISABLED: SchedulerSimulationScenario = {
  scenarioId: "SIM_A1_SCHEDULER_DISABLED",
  scenarioVersion: "1.0.0",
  title: "Scheduler remains disabled",
  description: "Verifies scheduler is disabled in all scenarios",
  coveredAcceptanceIds: ["P19-CONTRACT"],
  coveredTestIds: ["T01"],
  initialSchedulerConfig: defaultSchedulerConfig(),
  initialWorkflowState: { workflowId: "workflow-sim-a1" },
  initialRuntimeState: { activeLanes: [] },
  taskReferences: [],
  dependencyFixtures: [],
  laneFixtures: [],
  leaseFixtures: [],
  heartbeatFixtures: [],
  lockFixtures: [],
  checkpointFixtures: [],
  cancellationFixtures: [],
  joinFixtures: [],
  budgetFixtures: [],
  recoveryFixtures: [],
  promotionFixtures: [],
  evidenceFixtures: [{ artifactId: "evidence-a1-001", evidenceClass: "configuration-validation", contentDigest: "config-digest-a1" }],
  memoryFixtures: [],
  councilFixtures: [],
  draftFixtures: [],
  connectorFixtures: [],
  faultInjections: [],
  fixedTimestamps: createFixedTimestamps("2026-08-21T00:00:00.000Z"),
  expectedEvents: [
    {
      eventId: "evt-a1-001",
      eventType: "SCHEDULER_STATE_VALIDATED",
      timestamp: "2026-08-21T00:00:00.000Z",
      referencedEntity: "scheduler",
    },
  ],
  expectedDecisions: [
    {
      decisionId: "dec-a1-001",
      decisionClass: "CONFIGURATION_VALIDATION",
      recommendation: "DENY_EXECUTION_SCHEDULER_DISABLED",
      reasoning: "Scheduler enabled=false per frozen config",
      safetyState: { schedulerEnabled: false },
    },
  ],
  expectedFinalProjection: { schedulerState: "S0_SINGLE", executionAllowed: false },
  expectedEvidenceClasses: ["configuration-validation"],
  expectedRecoveryDisposition: "none",
  expectedSafetyState: { schedulerEnabled: false, multipleRuntimeLanesAllowed: false },
  expectedResultClassification: "PASS",
  contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
};

/**
 * Group B: Dependencies and Ready Sets
 *
 * Scenarios covering dependency cycle rejection, topological ordering, and ready sets.
 */
const SCENARIO_SIM_B1_CYCLE_REJECTION: SchedulerSimulationScenario = {
  scenarioId: "SIM_B1_CYCLE_REJECTION",
  scenarioVersion: "1.0.0",
  title: "Dependency cycle detection and rejection",
  description: "Verifies deterministic cycle detection in dependency graphs",
  coveredAcceptanceIds: ["P19-DEPS"],
  coveredTestIds: ["T04"],
  initialSchedulerConfig: defaultSchedulerConfig(),
  initialWorkflowState: { workflowId: "workflow-sim-b1" },
  initialRuntimeState: { activeLanes: [] },
  taskReferences: [
    { taskId: "task-b1-1", description: "Task 1", riskClass: "R1", dependencies: ["task-b1-2"] },
    { taskId: "task-b1-2", description: "Task 2", riskClass: "R1", dependencies: ["task-b1-1"] },
  ],
  dependencyFixtures: [
    { fixtureId: "dep-b1-1", taskId: "task-b1-1", dependsOnTaskId: "task-b1-2", dependencyClass: "required" },
    { fixtureId: "dep-b1-2", taskId: "task-b1-2", dependsOnTaskId: "task-b1-1", dependencyClass: "required" },
  ],
  laneFixtures: [{ laneStage: "S0_SINGLE", capacity: 1, currentOccupancy: 0 }],
  leaseFixtures: [],
  heartbeatFixtures: [],
  lockFixtures: [],
  checkpointFixtures: [],
  cancellationFixtures: [],
  joinFixtures: [],
  budgetFixtures: [],
  recoveryFixtures: [],
  promotionFixtures: [],
  evidenceFixtures: [{ artifactId: "evidence-b1-001", evidenceClass: "cycle-detection", contentDigest: "cycle-digest-b1" }],
  memoryFixtures: [],
  councilFixtures: [],
  draftFixtures: [],
  connectorFixtures: [],
  faultInjections: [
    {
      faultId: "fault-b1-cycle",
      faultClass: "cycle",
      targetReference: "task-b1-1",
      activationPoint: "before-acquisition",
      expectedDisposition: "CYCLE_DETECTED",
      expectedEvidenceClasses: ["cycle-detection"],
      expectedSafetyState: { schedulerEnabled: false },
    },
  ],
  fixedTimestamps: createFixedTimestamps("2026-08-21T01:00:00.000Z"),
  expectedEvents: [
    {
      eventId: "evt-b1-001",
      eventType: "DEPENDENCY_CYCLE_DETECTED",
      timestamp: "2026-08-21T01:00:00.000Z",
      referencedEntity: "task-b1-1",
    },
  ],
  expectedDecisions: [
    {
      decisionId: "dec-b1-001",
      decisionClass: "READY_SET_EVALUATION",
      recommendation: "REJECT_WORKFLOW",
      reasoning: "Dependency cycle detected: task-b1-1 → task-b1-2 → task-b1-1",
      safetyState: { schedulerEnabled: false },
    },
  ],
  expectedFinalProjection: { workflowState: "REJECTED", cycleDetected: true },
  expectedEvidenceClasses: ["cycle-detection"],
  expectedRecoveryDisposition: "safe-rejection",
  expectedSafetyState: { schedulerEnabled: false },
  expectedResultClassification: "PASS",
  contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
};

const SCENARIO_SIM_B2_STABLE_ORDERING: SchedulerSimulationScenario = {
  scenarioId: "SIM_B2_STABLE_ORDERING",
  scenarioVersion: "1.0.0",
  title: "Stable topological and ready-set ordering",
  description: "Verifies deterministic stable ordering of dependency graph",
  coveredAcceptanceIds: ["P19-DEPS"],
  coveredTestIds: ["T05"],
  initialSchedulerConfig: defaultSchedulerConfig(),
  initialWorkflowState: { workflowId: "workflow-sim-b2" },
  initialRuntimeState: { activeLanes: [] },
  taskReferences: [
    { taskId: "task-b2-a", description: "Task A", riskClass: "R1", dependencies: [] },
    { taskId: "task-b2-b", description: "Task B", riskClass: "R1", dependencies: ["task-b2-a"] },
    { taskId: "task-b2-c", description: "Task C", riskClass: "R1", dependencies: ["task-b2-a"] },
  ],
  dependencyFixtures: [
    { fixtureId: "dep-b2-1", taskId: "task-b2-b", dependsOnTaskId: "task-b2-a", dependencyClass: "required" },
    { fixtureId: "dep-b2-2", taskId: "task-b2-c", dependsOnTaskId: "task-b2-a", dependencyClass: "required" },
  ],
  laneFixtures: [{ laneStage: "S0_SINGLE", capacity: 1, currentOccupancy: 0 }],
  leaseFixtures: [],
  heartbeatFixtures: [],
  lockFixtures: [],
  checkpointFixtures: [],
  cancellationFixtures: [],
  joinFixtures: [],
  budgetFixtures: [],
  recoveryFixtures: [],
  promotionFixtures: [],
  evidenceFixtures: [],
  memoryFixtures: [],
  councilFixtures: [],
  draftFixtures: [],
  connectorFixtures: [],
  faultInjections: [],
  fixedTimestamps: createFixedTimestamps("2026-08-21T02:00:00.000Z"),
  expectedEvents: [
    {
      eventId: "evt-b2-001",
      eventType: "TOPOLOGICAL_ORDER_COMPUTED",
      timestamp: "2026-08-21T02:00:00.000Z",
      referencedEntity: "workflow-sim-b2",
    },
  ],
  expectedDecisions: [
    {
      decisionId: "dec-b2-001",
      decisionClass: "READY_SET_EVALUATION",
      recommendation: "ACCEPT_WORKFLOW_READY_SET_STABLE",
      reasoning: "Topological order: [task-b2-a, task-b2-b, task-b2-c]",
      safetyState: { schedulerEnabled: false },
    },
  ],
  expectedFinalProjection: {
    workflowState: "ACCEPTED",
    readySet: ["task-b2-a"],
    topologicalOrder: ["task-b2-a", "task-b2-b", "task-b2-c"],
  },
  expectedEvidenceClasses: ["ready-set-ordering"],
  expectedRecoveryDisposition: "deterministic",
  expectedSafetyState: { schedulerEnabled: false },
  expectedResultClassification: "PASS",
  contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
};

/**
 * Group C: Lanes
 *
 * Scenarios covering S0 capacity, lane activation, and stage transitions.
 */
const SCENARIO_SIM_C1_S0_CAPACITY: SchedulerSimulationScenario = {
  scenarioId: "SIM_C1_S0_CAPACITY",
  scenarioVersion: "1.0.0",
  title: "S0 lane capacity one enforcement",
  description: "Verifies S0_SINGLE lane capacity limit of 1",
  coveredAcceptanceIds: ["P19-LANES"],
  coveredTestIds: ["T02"],
  initialSchedulerConfig: defaultSchedulerConfig(),
  initialWorkflowState: { workflowId: "workflow-sim-c1" },
  initialRuntimeState: { activeLanes: [] },
  taskReferences: [
    { taskId: "task-c1-1", description: "Task 1", riskClass: "R1", dependencies: [] },
    { taskId: "task-c1-2", description: "Task 2", riskClass: "R1", dependencies: [] },
  ],
  dependencyFixtures: [],
  laneFixtures: [
    { laneStage: "S0_SINGLE", capacity: 1, currentOccupancy: 1 },
    { laneStage: "S1_FOUR", capacity: 4, currentOccupancy: 0 },
  ],
  leaseFixtures: [],
  heartbeatFixtures: [],
  lockFixtures: [],
  checkpointFixtures: [],
  cancellationFixtures: [],
  joinFixtures: [],
  budgetFixtures: [],
  recoveryFixtures: [],
  promotionFixtures: [],
  evidenceFixtures: [],
  memoryFixtures: [],
  councilFixtures: [],
  draftFixtures: [],
  connectorFixtures: [],
  faultInjections: [],
  fixedTimestamps: createFixedTimestamps("2026-08-21T03:00:00.000Z"),
  expectedEvents: [
    {
      eventId: "evt-c1-001",
      eventType: "LANE_CAPACITY_EXCEEDED",
      timestamp: "2026-08-21T03:00:00.000Z",
      referencedEntity: "task-c1-2",
    },
  ],
  expectedDecisions: [
    {
      decisionId: "dec-c1-001",
      decisionClass: "LANE_CAPACITY_DECISION",
      recommendation: "QUEUE_TASK_S0_CAPACITY_FULL",
      reasoning: "S0_SINGLE capacity 1, current occupancy 1, task-c1-2 must queue",
      safetyState: { schedulerEnabled: false },
    },
  ],
  expectedFinalProjection: { s0LaneOccupancy: 1, queuedTasks: ["task-c1-2"] },
  expectedEvidenceClasses: ["lane-contract"],
  expectedRecoveryDisposition: "queue",
  expectedSafetyState: { schedulerEnabled: false },
  expectedResultClassification: "PASS",
  contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
};

const SCENARIO_SIM_C2_S1_DENIED: SchedulerSimulationScenario = {
  scenarioId: "SIM_C2_S1_DENIED",
  scenarioVersion: "1.0.0",
  title: "S1 activation denied before gate",
  description: "Verifies S1+ activation is denied when gate not satisfied",
  coveredAcceptanceIds: ["P19-LANES"],
  coveredTestIds: ["T03"],
  initialSchedulerConfig: defaultSchedulerConfig(),
  initialWorkflowState: { workflowId: "workflow-sim-c2" },
  initialRuntimeState: { activeLanes: [] },
  taskReferences: [{ taskId: "task-c2-1", description: "Task 1", riskClass: "R3", dependencies: [] }],
  dependencyFixtures: [],
  laneFixtures: [{ laneStage: "S1_FOUR", capacity: 4, currentOccupancy: 0 }],
  leaseFixtures: [],
  heartbeatFixtures: [],
  lockFixtures: [],
  checkpointFixtures: [],
  cancellationFixtures: [],
  joinFixtures: [],
  budgetFixtures: [],
  recoveryFixtures: [],
  promotionFixtures: [],
  evidenceFixtures: [],
  memoryFixtures: [],
  councilFixtures: [],
  draftFixtures: [],
  connectorFixtures: [],
  faultInjections: [
    {
      faultId: "fault-c2-gate",
      faultClass: "missing-gate",
      targetReference: "task-c2-1",
      activationPoint: "before-lane-transition",
      expectedDisposition: "S1_ACTIVATION_DENIED",
      expectedEvidenceClasses: ["safe-denial"],
      expectedSafetyState: { schedulerEnabled: false },
    },
  ],
  fixedTimestamps: createFixedTimestamps("2026-08-21T04:00:00.000Z"),
  expectedEvents: [
    {
      eventId: "evt-c2-001",
      eventType: "LANE_STAGE_ACTIVATION_DENIED",
      timestamp: "2026-08-21T04:00:00.000Z",
      referencedEntity: "task-c2-1",
    },
  ],
  expectedDecisions: [
    {
      decisionId: "dec-c2-001",
      decisionClass: "LANE_STAGE_DECISION",
      recommendation: "DENY_S1_ACTIVATION_GATE_NOT_MET",
      reasoning: "Wave 1 scheduler activation gate not satisfied",
      safetyState: { schedulerEnabled: false },
    },
  ],
  expectedFinalProjection: { laneStage: "S0_SINGLE", taskState: "DENIED" },
  expectedEvidenceClasses: ["safe-denial"],
  expectedRecoveryDisposition: "fallback S0_SINGLE",
  expectedSafetyState: { schedulerEnabled: false },
  expectedResultClassification: "PASS",
  contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
};

/**
 * Group D: Leases and Heartbeats
 *
 * Scenarios covering lease competition, heartbeat loss, and stale result quarantine.
 */
const SCENARIO_SIM_D1_LEASE_RACE: SchedulerSimulationScenario = {
  scenarioId: "SIM_D1_LEASE_RACE",
  scenarioVersion: "1.0.0",
  title: "Competing lease acquisition",
  description: "Verifies deterministic single winner in competing lease race",
  coveredAcceptanceIds: ["P19-LEASE"],
  coveredTestIds: ["T06"],
  initialSchedulerConfig: defaultSchedulerConfig(),
  initialWorkflowState: { workflowId: "workflow-sim-d1" },
  initialRuntimeState: { activeLanes: [] },
  taskReferences: [{ taskId: "task-d1-1", description: "Task 1", riskClass: "R1", dependencies: [] }],
  dependencyFixtures: [],
  laneFixtures: [{ laneStage: "S0_SINGLE", capacity: 1, currentOccupancy: 0 }],
  leaseFixtures: [
    {
      leaseId: "lease-d1-a",
      taskId: "task-d1-1",
      workerId: "worker-d1-a",
      generation: 1,
      acquiredAt: "2026-08-21T01:00:00.000Z",
      expiresAt: "2026-08-21T02:00:00.000Z",
    },
  ],
  heartbeatFixtures: [],
  lockFixtures: [],
  checkpointFixtures: [],
  cancellationFixtures: [],
  joinFixtures: [],
  budgetFixtures: [],
  recoveryFixtures: [],
  promotionFixtures: [],
  evidenceFixtures: [{ artifactId: "evidence-d1-001", evidenceClass: "lease-generation", contentDigest: "lease-digest-d1" }],
  memoryFixtures: [],
  councilFixtures: [],
  draftFixtures: [],
  connectorFixtures: [],
  faultInjections: [
    {
      faultId: "fault-d1-race",
      faultClass: "lease-race",
      targetReference: "task-d1-1",
      activationPoint: "during-acquisition",
      expectedDisposition: "SINGLE_WINNER_DETERMINED",
      expectedEvidenceClasses: ["lease-generation", "single-owner-validation"],
      expectedSafetyState: { schedulerEnabled: false },
    },
  ],
  fixedTimestamps: createFixedTimestamps("2026-08-21T05:00:00.000Z"),
  expectedEvents: [
    {
      eventId: "evt-d1-001",
      eventType: "LEASE_ACQUISITION_EVALUATED",
      timestamp: "2026-08-21T05:00:00.000Z",
      referencedEntity: "task-d1-1",
    },
    {
      eventId: "evt-d1-002",
      eventType: "COMPETING_ACQUISITION_DETERMINED",
      timestamp: "2026-08-21T05:00:01.000Z",
      referencedEntity: "lease-d1-a",
    },
  ],
  expectedDecisions: [
    {
      decisionId: "dec-d1-001",
      decisionClass: "LEASE_DECISION",
      recommendation: "ACCEPT_LEASE_DETERMINISTIC_WINNER",
      reasoning: "Deterministic single-owner validation: worker-d1-a generation 1",
      safetyState: { schedulerEnabled: false },
    },
  ],
  expectedFinalProjection: { leaseHolder: "worker-d1-a", leaseGeneration: 1 },
  expectedEvidenceClasses: ["lease-generation", "lease-acquisition"],
  expectedRecoveryDisposition: "single-owner-determined",
  expectedSafetyState: { schedulerEnabled: false },
  expectedResultClassification: "PASS",
  contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
};

const SCENARIO_SIM_D2_HEARTBEAT_LOSS: SchedulerSimulationScenario = {
  scenarioId: "SIM_D2_HEARTBEAT_LOSS",
  scenarioVersion: "1.0.0",
  title: "Heartbeat loss detection and recovery",
  description: "Verifies heartbeat loss leads to recovery handoff projection",
  coveredAcceptanceIds: ["P19-HEARTBEAT"],
  coveredTestIds: ["T07"],
  initialSchedulerConfig: defaultSchedulerConfig(),
  initialWorkflowState: { workflowId: "workflow-sim-d2" },
  initialRuntimeState: { activeLanes: [] },
  taskReferences: [{ taskId: "task-d2-1", description: "Task 1", riskClass: "R1", dependencies: [] }],
  dependencyFixtures: [],
  laneFixtures: [{ laneStage: "S0_SINGLE", capacity: 1, currentOccupancy: 0 }],
  leaseFixtures: [
    {
      leaseId: "lease-d2-1",
      taskId: "task-d2-1",
      workerId: "worker-d2-1",
      generation: 1,
      acquiredAt: "2026-08-21T05:00:00.000Z",
      expiresAt: "2026-08-21T05:10:00.000Z",
    },
  ],
  heartbeatFixtures: [
    {
      leaseId: "lease-d2-1",
      expectedAt: "2026-08-21T05:02:00.000Z",
      // actuallyReceivedAt is undefined to simulate loss
    },
  ],
  lockFixtures: [],
  checkpointFixtures: [],
  cancellationFixtures: [],
  joinFixtures: [],
  budgetFixtures: [],
  recoveryFixtures: [],
  promotionFixtures: [],
  evidenceFixtures: [],
  memoryFixtures: [],
  councilFixtures: [],
  draftFixtures: [],
  connectorFixtures: [],
  faultInjections: [
    {
      faultId: "fault-d2-hb-loss",
      faultClass: "heartbeat-loss",
      targetReference: "lease-d2-1",
      activationPoint: "during-monitoring",
      expectedDisposition: "HEARTBEAT_LOSS_DETECTED",
      expectedEvidenceClasses: ["heartbeat-loss", "recovery-projection"],
      expectedSafetyState: { schedulerEnabled: false },
    },
  ],
  fixedTimestamps: createFixedTimestamps("2026-08-21T06:00:00.000Z"),
  expectedEvents: [
    {
      eventId: "evt-d2-001",
      eventType: "HEARTBEAT_EVALUATED",
      timestamp: "2026-08-21T06:00:00.000Z",
      referencedEntity: "lease-d2-1",
    },
    {
      eventId: "evt-d2-002",
      eventType: "RECOVERY_HANDOFF_PROJECTED",
      timestamp: "2026-08-21T06:00:01.000Z",
      referencedEntity: "task-d2-1",
    },
  ],
  expectedDecisions: [
    {
      decisionId: "dec-d2-001",
      decisionClass: "RECOVERY_DECISION",
      recommendation: "WAIT_FOR_OWNER_AND_RECONCILE",
      reasoning: "Heartbeat loss detected; automatic reassignment prohibited; reconciliation required",
      safetyState: { schedulerEnabled: false },
    },
  ],
  expectedFinalProjection: { leaseState: "EXPIRED_HEARTBEAT_LOSS", recoveryRequired: true },
  expectedEvidenceClasses: ["heartbeat-loss", "recovery-projection"],
  expectedRecoveryDisposition: "wait-for-owner-and-reconcile",
  expectedSafetyState: { schedulerEnabled: false },
  expectedResultClassification: "PASS",
  contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
};

/**
 * Scenario count at this checkpoint: 9 scenarios covering groups A, B, C, D
 */
export const SCHEDULER_SIMULATION_SCENARIOS: SchedulerSimulationScenario[] = [
  // Group A: Contracts and Authority
  SCENARIO_SIM_A1_SCHEDULER_DISABLED,

  // Group B: Dependencies and Ready Sets
  SCENARIO_SIM_B1_CYCLE_REJECTION,
  SCENARIO_SIM_B2_STABLE_ORDERING,

  // Group C: Lanes
  SCENARIO_SIM_C1_S0_CAPACITY,
  SCENARIO_SIM_C2_S1_DENIED,

  // Group D: Leases and Heartbeats
  SCENARIO_SIM_D1_LEASE_RACE,
  SCENARIO_SIM_D2_HEARTBEAT_LOSS,

  // Group E-N: Additional scenarios to be implemented...
  // E: Locks and Checkpoints
  // F: Cancellation and Joins
  // G: Budgets and Routing
  // H: Recovery
  // I: Promotion and Evidence
  // J: Memory
  // K: Council
  // L: Saved Draft
  // M: Connectors
  // N: Automation Center Projection
];

// Validate all scenarios
for (const scenario of SCHEDULER_SIMULATION_SCENARIOS) {
  validateSimulationScenario(scenario);
}

// Export scenario registry metadata
export const SCHEDULER_SIMULATION_SCENARIO_IDS = SCHEDULER_SIMULATION_SCENARIOS.map((s) => s.scenarioId);

export function resolveSchedulerSimulationScenario(scenarioId: string): SchedulerSimulationScenario {
  const scenario = SCHEDULER_SIMULATION_SCENARIOS.find((s) => s.scenarioId === scenarioId);
  if (!scenario) {
    throw new Error(`Unknown scheduler simulation scenario: ${scenarioId}`);
  }
  return scenario;
}

export function getSchedulerSimulationScenariosByCoverage(
  acceptanceId?: string,
  testId?: string
): SchedulerSimulationScenario[] {
  return SCHEDULER_SIMULATION_SCENARIOS.filter((scenario) => {
    if (acceptanceId && !scenario.coveredAcceptanceIds.includes(acceptanceId)) return false;
    if (testId && !scenario.coveredTestIds.includes(testId)) return false;
    return true;
  });
}
