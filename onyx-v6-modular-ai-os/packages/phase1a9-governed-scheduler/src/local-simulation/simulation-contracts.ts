/**
 * Phase 1A.9 Wave 5A: Deterministic Scheduler Simulation Contracts
 *
 * These contracts define the structure and result types for scheduler simulations.
 * Simulations are deterministic projections, not live execution.
 *
 * Every simulated operation produces evidence but does NOT execute:
 * - No tasks are dispatched
 * - No leases are persisted or acquired
 * - No heartbeats run timers
 * - No locks are acquired
 * - No checkpoints are written
 * - No retries are executed
 * - No recovery actions are performed
 * - No memory is mutated
 * - No connectors are invoked
 * - No Git operations are performed
 * - No deployments are executed
 */

import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";
import type { SchedulerConfig } from "../contracts/scheduler-config";

/**
 * Fixed Timestamps for Deterministic Simulation
 */
export interface SimulationFixedTimestamps {
  scenarioStartedAt: string; // ISO 8601
  leaseAcquiredAt: string;
  heartbeatExpectedAt: string;
  lockAcquiredAt: string;
  checkpointCreatedAt: string;
  taskCompletedAt: string;
  simulationEvaluatedAt: string;
}

/**
 * Deterministic ID Fixtures for Reproducible Scenarios
 */
export interface SimulationDeterministicIdFixtures {
  workflowId: string;
  taskId: string;
  workerId: string;
  leaseId: string;
  lockResourceIds: string[];
  checkpointId: string;
  promotionCandidateId: string;
  evidenceArtifactIds: string[];
}

/**
 * Scheduler Simulation Scenario
 *
 * A deterministic simulation scenario contains all inputs and expected outcomes
 * for a single scheduler test case. Scenarios are immutable and versioned.
 */
export interface SchedulerSimulationScenario {
  // Identification
  scenarioId: string;
  scenarioVersion: string;
  title: string;
  description: string;

  // Coverage
  coveredAcceptanceIds: string[]; // P19-* identifiers
  coveredTestIds: string[]; // T01-T40 identifiers

  // Initial State
  initialSchedulerConfig: SchedulerConfig;
  initialWorkflowState: Record<string, unknown>;
  initialRuntimeState: Record<string, unknown>;

  // Task and Dependency Fixtures
  taskReferences: TaskReference[];
  dependencyFixtures: DependencyFixture[];
  laneFixtures: LaneFixture[];

  // Lease and Heartbeat Fixtures
  leaseFixtures: LeaseFixture[];
  heartbeatFixtures: HeartbeatFixture[];

  // Lock and Checkpoint Fixtures
  lockFixtures: LockFixture[];
  checkpointFixtures: CheckpointFixture[];

  // Cancellation and Join Fixtures
  cancellationFixtures: CancellationFixture[];
  joinFixtures: JoinFixture[];

  // Budget, Recovery, and Promotion Fixtures
  budgetFixtures: BudgetFixture[];
  recoveryFixtures: RecoveryFixture[];
  promotionFixtures: PromotionFixture[];

  // Evidence, Memory, Council, Draft, and Connector Fixtures
  evidenceFixtures: EvidenceFixture[];
  memoryFixtures: MemoryFixture[];
  councilFixtures: CouncilFixture[];
  draftFixtures: DraftFixture[];
  connectorFixtures: ConnectorFixture[];

  // Fault Injection
  faultInjections: FaultInjection[];

  // Fixed Deterministic Timestamps
  fixedTimestamps: SimulationFixedTimestamps;

  // Expected Outcomes
  expectedEvents: SchedulerEvent[];
  expectedDecisions: SchedulerDecision[];
  expectedFinalProjection: Record<string, unknown>;
  expectedEvidenceClasses: string[];
  expectedRecoveryDisposition: string;
  expectedSafetyState: Record<string, boolean>;
  expectedResultClassification: SimulationResultClassification;

  // Metadata
  contractVersion: string;
}

/**
 * Fixture Types
 */
export interface TaskReference {
  taskId: string;
  description: string;
  riskClass: string;
  dependencies: string[]; // taskIds
}

export interface DependencyFixture {
  fixtureId: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyClass: "required" | "optional";
}

export interface LaneFixture {
  laneStage: string;
  capacity: number;
  currentOccupancy: number;
}

export interface LeaseFixture {
  leaseId: string;
  taskId: string;
  workerId: string;
  generation: number;
  acquiredAt: string;
  expiresAt: string;
}

export interface HeartbeatFixture {
  leaseId: string;
  expectedAt: string;
  actuallyReceivedAt?: string; // undefined if missing
}

export interface LockFixture {
  lockId: string;
  resourceIds: string[];
  lockMode: "READ" | "WRITE";
  owner: string;
  acquiredAt: string;
}

export interface CheckpointFixture {
  checkpointId: string;
  taskId: string;
  version: number;
  payloadDigest: string;
  createdAt: string;
}

export interface CancellationFixture {
  taskId: string;
  cancellationState: string;
  cancellationContext: Record<string, unknown>;
}

export interface JoinFixture {
  joinId: string;
  policy: string;
  participants: string[]; // taskIds
  threshold?: number;
}

export interface BudgetFixture {
  budgetClass: string;
  currentUsage: number;
  limit: number;
}

export interface RecoveryFixture {
  failureClass: string;
  recoveryDisposition: string;
}

export interface PromotionFixture {
  promotionCandidateId: string;
  sourceTaskId: string;
  targetLane: string;
}

export interface EvidenceFixture {
  artifactId: string;
  evidenceClass: string;
  contentDigest: string;
}

export interface MemoryFixture {
  memoryId: string;
  accessProfile: string;
  state: "active" | "tombstoned" | "poisoned" | "quarantined";
}

export interface CouncilFixture {
  councilMode: string;
  agreement?: boolean;
}

export interface DraftFixture {
  draftId: string;
  scope: string;
  version: number;
  approvalStatus: string;
}

export interface ConnectorFixture {
  connectorId: string;
  provider: string;
  accountId: string;
}

/**
 * Fault Injection Contract
 *
 * Deterministically injects faults to test recovery and resilience.
 */
export interface FaultInjection {
  faultId: string;
  faultClass: string; // cycle, heartbeat-loss, lock-conflict, etc.
  targetReference: string; // task, lease, lock, etc.
  activationPoint: string; // before-acquisition, during-execution, after-completion
  expectedDisposition: string;
  expectedEvidenceClasses: string[];
  expectedSafetyState: Record<string, boolean>;
}

/**
 * Scheduler Event (Deterministic)
 *
 * Events represent scheduler decisions and state changes.
 */
export interface SchedulerEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  referencedEntity: string; // task, lease, lock, etc.
  evidence?: string;
}

/**
 * Scheduler Decision (Deterministic)
 *
 * Decisions represent deterministic scheduler choices and recommendations.
 */
export interface SchedulerDecision {
  decisionId: string;
  decisionClass: string;
  recommendation: string;
  reasoning: string;
  safetyState: Record<string, boolean>;
}

/**
 * Simulation Result Classifications
 *
 * Every simulation must return exactly one classification.
 */
export type SimulationResultClassification =
  | "PASS" // All expected outcomes achieved
  | "EXPECTED_BLOCK" // Scenario expected to block, did block
  | "EXPECTED_RECONCILIATION" // Scenario expected reconciliation, got reconciliation
  | "EXPECTED_FAILED_SAFE" // Scenario expected fail-safe, did fail-safe
  | "EXPECTED_PROHIBITED" // Scenario expected prohibition, was prohibited
  | "UNEXPECTED_FAILURE" // Scenario expected PASS, got failure
  | "UNEXPECTED_SUCCESS" // Scenario expected block, got success
  | "NONDETERMINISTIC_RESULT" // Replay produced different outcome
  | "INVALID_SCENARIO"; // Scenario definition invalid

/**
 * Scheduler Simulation Result
 *
 * The result of running a deterministic simulation scenario.
 * Results are deterministic and reproducible.
 */
export interface SchedulerSimulationResult {
  // Identification
  scenarioId: string;
  scenarioVersion: string;

  // Result Classification
  resultClassification: SimulationResultClassification;

  // Actual Outcomes
  actualEvents: SchedulerEvent[];
  actualDecisions: SchedulerDecision[];
  actualFinalProjection: Record<string, unknown>;
  actualEvidenceClasses: string[];
  actualRecoveryDisposition: string;

  // Determinism Verification
  deterministicDigestInput: string; // Hash input for reproducibility
  replayMatched: boolean; // Second run matched this run
  unexpectedDifferences: string[]; // Deviations from expected

  // Safety Validation
  expectedSafetyStateMatched: boolean;
  actualSafetyState: Record<string, boolean>;

  // Prohibited Operation Detection
  prohibitedOperationDetected: boolean;
  prohibitedOperations: string[];

  // Evidence Tracking
  evidenceArtifactIds: string[];

  // Timing
  evaluatedAt: string;

  // Metadata
  contractVersion: string;
}

/**
 * Simulation Contract Validation
 */
export function validateSimulationScenario(scenario: SchedulerSimulationScenario): void {
  if (!scenario.scenarioId || !scenario.scenarioVersion) {
    throw new Error("Scenario must have scenarioId and scenarioVersion");
  }
  if (scenario.coveredAcceptanceIds.length === 0) {
    throw new Error(`Scenario ${scenario.scenarioId} must cover at least one P19 ID`);
  }
  if (scenario.coveredTestIds.length === 0) {
    throw new Error(`Scenario ${scenario.scenarioId} must cover at least one T ID`);
  }
  if (scenario.expectedEvents.length === 0) {
    throw new Error(`Scenario ${scenario.scenarioId} must define expected events`);
  }
  if (scenario.expectedEvidenceClasses.length === 0) {
    throw new Error(`Scenario ${scenario.scenarioId} must define expected evidence classes`);
  }
  if (scenario.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    throw new Error(
      `Scenario ${scenario.scenarioId} version ${scenario.contractVersion} does not match scheduler contract version ${PHASE1A9_SCHEDULER_CONTRACT_VERSION}`
    );
  }
}

export function validateSimulationResult(result: SchedulerSimulationResult): void {
  if (!result.scenarioId) {
    throw new Error("Result must have scenarioId");
  }
  if (!result.resultClassification) {
    throw new Error(`Result for ${result.scenarioId} must have resultClassification`);
  }
  if (result.actualEvents.length === 0) {
    throw new Error(`Result for ${result.scenarioId} must contain actual events`);
  }
}

/**
 * Deterministic Digest for Replay Verification
 *
 * Creates a deterministic input for hash-based reproducibility verification.
 */
export function createDeterministicDigest(
  scenarioId: string,
  events: SchedulerEvent[],
  decisions: SchedulerDecision[],
  timestamps: SimulationFixedTimestamps
): string {
  const parts = [
    scenarioId,
    events.map((e) => e.eventId).join("|"),
    decisions.map((d) => d.decisionId).join("|"),
    timestamps.scenarioStartedAt,
  ];
  return `digest:${parts.join(":")}`; // Deterministic, reproducible
}
