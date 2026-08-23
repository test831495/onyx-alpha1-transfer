/**
 * Phase 1A.9 Wave 5A: Simulation Evidence Projections
 *
 * Projects simulation evidence without persisting to storage or final evidence files.
 * Evidence is in-memory only for scenario validation and mapping.
 */

import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";

/**
 * Evidence Artifact Reference (In-Memory Only)
 */
export interface EvidenceArtifactReference {
  artifactId: string;
  evidenceClass: string;
  scenarioId: string;
  contentDigest: string; // Deterministic hash for content identity
  createdAt: string;
  isProjectionOnly: true; // Always true for Wave 5A
}

/**
 * Evidence Manifest Projection
 *
 * In-memory projection of evidence manifest without persistence.
 */
export interface EvidenceManifestProjection {
  manifestId: string;
  simulationRunId: string;
  artifacts: EvidenceArtifactReference[];
  evidenceClasses: string[];
  acceptanceIdsCovered: string[];
  testIdsCovered: string[];
  createdAt: string;
  isProjectionOnly: true;
  contractVersion: string;
}

/**
 * Simulation Evidence Summary
 *
 * Deterministic summary of evidence for a simulation run.
 */
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

/**
 * Create an Evidence Artifact Reference (In-Memory)
 */
export function createEvidenceArtifactReference(
  scenarioId: string,
  evidenceClass: string,
  contentDigest: string,
  createdAt: string
): EvidenceArtifactReference {
  return {
    artifactId: `evidence:${scenarioId}:${evidenceClass}:${contentDigest.substring(0, 8)}`,
    evidenceClass,
    scenarioId,
    contentDigest,
    createdAt,
    isProjectionOnly: true,
  };
}

/**
 * Create Simulation Evidence Summary
 *
 * Produces a deterministic summary of simulation evidence without persisting.
 */
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
  contractVersion: string;
}): SimulationEvidenceSummary {
  const digest = createDeterministicDigest(
    input.simulationRunId,
    input.scenarioIds,
    input.passedScenarioIds,
    input.failedScenarioIds,
    input.blockedScenarioIds,
    input.reconciliationScenarioIds
  );

  return {
    simulationRunId: input.simulationRunId,
    scenarioIds: input.scenarioIds,
    passedScenarioIds: input.passedScenarioIds,
    failedScenarioIds: input.failedScenarioIds,
    blockedScenarioIds: input.blockedScenarioIds,
    reconciliationScenarioIds: input.reconciliationScenarioIds,
    contractGroupsCovered: input.contractGroupsCovered,
    acceptanceIdsCovered: input.acceptanceIdsCovered,
    evidenceReferences: input.evidenceReferences,
    resultDigest: digest,
    createdAt: input.createdAt,
    contractVersion: input.contractVersion,
  };
}

/**
 * Create Evidence Manifest Projection (In-Memory)
 */
export function createEvidenceManifestProjection(
  simulationRunId: string,
  scenarios: Array<{ scenarioId: string; evidenceClasses: string[] }>,
  acceptanceIdsCovered: string[],
  testIdsCovered: string[],
  createdAt: string
): EvidenceManifestProjection {
  const artifacts: EvidenceArtifactReference[] = [];
  const evidenceClasses = new Set<string>();

  for (const scenario of scenarios) {
    for (const evidenceClass of scenario.evidenceClasses) {
      evidenceClasses.add(evidenceClass);
      const digest = createContentDigest(scenario.scenarioId, evidenceClass);
      artifacts.push(
        createEvidenceArtifactReference(scenario.scenarioId, evidenceClass, digest, createdAt)
      );
    }
  }

  return {
    manifestId: `manifest:${simulationRunId}`,
    simulationRunId,
    artifacts,
    evidenceClasses: Array.from(evidenceClasses).sort(),
    acceptanceIdsCovered: acceptanceIdsCovered.sort(),
    testIdsCovered: testIdsCovered.sort(),
    createdAt,
    isProjectionOnly: true,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };
}

/**
 * Deterministic Content Digest
 *
 * Creates a stable, deterministic hash of evidence content.
 */
export function createContentDigest(scenarioId: string, evidenceClass: string): string {
  const parts = [scenarioId, evidenceClass].join("|");
  // Simple deterministic hash: compute character sum
  let hash = 0;
  for (let i = 0; i < parts.length; i++) {
    const char = parts.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `digest:${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

/**
 * Deterministic Digest for Simulation Run
 *
 * Creates a reproducible hash of the entire simulation run.
 */
export function createDeterministicDigest(
  simulationRunId: string,
  scenarioIds: string[],
  passedScenarioIds: string[],
  failedScenarioIds: string[],
  blockedScenarioIds: string[],
  reconciliationScenarioIds: string[]
): string {
  const parts = [
    simulationRunId,
    scenarioIds.join("|"),
    passedScenarioIds.join("|"),
    failedScenarioIds.join("|"),
    blockedScenarioIds.join("|"),
    reconciliationScenarioIds.join("|"),
  ];

  const combined = parts.join(":");
  let hash = 0;

  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `run-digest:${Math.abs(hash).toString(16).padStart(16, "0")}`;
}

/**
 * Evidence Coverage Mapper
 *
 * Maps scenarios to acceptance IDs, test IDs, and evidence classes.
 */
export class EvidenceCoverageMapper {
  private scenarioToAcceptanceIds: Map<string, Set<string>> = new Map();
  private scenarioToTestIds: Map<string, Set<string>> = new Map();
  private scenarioToEvidenceClasses: Map<string, Set<string>> = new Map();
  private acceptanceIdToScenarios: Map<string, Set<string>> = new Map();
  private testIdToScenarios: Map<string, Set<string>> = new Map();

  addScenarioCoverage(
    scenarioId: string,
    acceptanceIds: string[],
    testIds: string[],
    evidenceClasses: string[]
  ): void {
    if (!this.scenarioToAcceptanceIds.has(scenarioId)) {
      this.scenarioToAcceptanceIds.set(scenarioId, new Set());
    }
    if (!this.scenarioToTestIds.has(scenarioId)) {
      this.scenarioToTestIds.set(scenarioId, new Set());
    }
    if (!this.scenarioToEvidenceClasses.has(scenarioId)) {
      this.scenarioToEvidenceClasses.set(scenarioId, new Set());
    }

    for (const acceptanceId of acceptanceIds) {
      this.scenarioToAcceptanceIds.get(scenarioId)!.add(acceptanceId);
      if (!this.acceptanceIdToScenarios.has(acceptanceId)) {
        this.acceptanceIdToScenarios.set(acceptanceId, new Set());
      }
      this.acceptanceIdToScenarios.get(acceptanceId)!.add(scenarioId);
    }

    for (const testId of testIds) {
      this.scenarioToTestIds.get(scenarioId)!.add(testId);
      if (!this.testIdToScenarios.has(testId)) {
        this.testIdToScenarios.set(testId, new Set());
      }
      this.testIdToScenarios.get(testId)!.add(scenarioId);
    }

    for (const evidenceClass of evidenceClasses) {
      this.scenarioToEvidenceClasses.get(scenarioId)!.add(evidenceClass);
    }
  }

  getScenariosForAcceptanceId(acceptanceId: string): string[] {
    const scenarios = this.acceptanceIdToScenarios.get(acceptanceId);
    return scenarios ? Array.from(scenarios).sort() : [];
  }

  getScenariosForTestId(testId: string): string[] {
    const scenarios = this.testIdToScenarios.get(testId);
    return scenarios ? Array.from(scenarios).sort() : [];
  }

  getAcceptanceIdsCoveredByScenario(scenarioId: string): string[] {
    const acceptanceIds = this.scenarioToAcceptanceIds.get(scenarioId);
    return acceptanceIds ? Array.from(acceptanceIds).sort() : [];
  }

  getTestIdsCoveredByScenario(scenarioId: string): string[] {
    const testIds = this.scenarioToTestIds.get(scenarioId);
    return testIds ? Array.from(testIds).sort() : [];
  }

  getEvidenceClassesByScenario(scenarioId: string): string[] {
    const evidenceClasses = this.scenarioToEvidenceClasses.get(scenarioId);
    return evidenceClasses ? Array.from(evidenceClasses).sort() : [];
  }

  getAllAcceptanceIdsCovered(): string[] {
    return Array.from(this.acceptanceIdToScenarios.keys()).sort();
  }

  getAllTestIdsCovered(): string[] {
    return Array.from(this.testIdToScenarios.keys()).sort();
  }

  getCoverageReport(): {
    totalScenarios: number;
    totalAcceptanceIds: number;
    totalTestIds: number;
    scenariosByAcceptance: Record<string, string[]>;
    scenariosByTest: Record<string, string[]>;
  } {
    const report: any = {
      totalScenarios: this.scenarioToAcceptanceIds.size,
      totalAcceptanceIds: this.acceptanceIdToScenarios.size,
      totalTestIds: this.testIdToScenarios.size,
      scenariosByAcceptance: {},
      scenariosByTest: {},
    };

    for (const [acceptanceId, scenarios] of this.acceptanceIdToScenarios) {
      report.scenariosByAcceptance[acceptanceId] = Array.from(scenarios).sort();
    }

    for (const [testId, scenarios] of this.testIdToScenarios) {
      report.scenariosByTest[testId] = Array.from(scenarios).sort();
    }

    return report;
  }
}

/**
 * Failure Matrix Projection (In-Memory)
 */
export interface FailureMatrixProjection {
  matrixId: string;
  failureClasses: FailureClassMapping[];
  totalClasses: number;
  safetyPreservation: boolean;
  contractVersion: string;
}

export interface FailureClassMapping {
  failureClass: string;
  affectedComponent: string;
  trigger: string;
  expectedPrimaryDisposition: string;
  allowedSecondaryDispositions: string[];
  automaticRetryAllowed: boolean;
  automaticResumeAllowed: boolean;
  automaticReassignmentAllowed: boolean;
  providerTruthRequired: boolean;
  rahulDecisionRequired: boolean;
  promotionBlocked: boolean;
  laneReduction: string;
  requiredEvidence: string[];
  coveredScenarios: string[];
  coveredAcceptanceIds: string[];
  coveredTestIds: string[];
}

/**
 * Create Failure Matrix Projection (In-Memory)
 */
export function createFailureMatrixProjection(): FailureMatrixProjection {
  const failureClasses: FailureClassMapping[] = [
    {
      failureClass: "cycle-detection",
      affectedComponent: "dependency-resolver",
      trigger: "circular dependency in workflow",
      expectedPrimaryDisposition: "REJECT_WORKFLOW",
      allowedSecondaryDispositions: ["RETRY_WITH_INSTRUMENTATION"],
      automaticRetryAllowed: false,
      automaticResumeAllowed: false,
      automaticReassignmentAllowed: false,
      providerTruthRequired: false,
      rahulDecisionRequired: false,
      promotionBlocked: true,
      laneReduction: "S0",
      requiredEvidence: ["cycle-detection"],
      coveredScenarios: ["SIM_B1_CYCLE_REJECTION"],
      coveredAcceptanceIds: ["P19-DEPS"],
      coveredTestIds: ["T04"],
    },
    {
      failureClass: "heartbeat-loss",
      affectedComponent: "lease-manager",
      trigger: "heartbeat missed by deadline",
      expectedPrimaryDisposition: "WAIT_FOR_OWNER",
      allowedSecondaryDispositions: ["RECONCILIATION_REQUIRED"],
      automaticRetryAllowed: false,
      automaticResumeAllowed: false,
      automaticReassignmentAllowed: false,
      providerTruthRequired: false,
      rahulDecisionRequired: false,
      promotionBlocked: true,
      laneReduction: "S0",
      requiredEvidence: ["heartbeat-loss"],
      coveredScenarios: ["SIM_D2_HEARTBEAT_LOSS"],
      coveredAcceptanceIds: ["P19-HEARTBEAT"],
      coveredTestIds: ["T07"],
    },
    {
      failureClass: "lock-conflict",
      affectedComponent: "lock-manager",
      trigger: "conflicting lock request on same resource",
      expectedPrimaryDisposition: "SAFE_DENY_OR_WAIT",
      allowedSecondaryDispositions: ["QUEUE"],
      automaticRetryAllowed: false,
      automaticResumeAllowed: false,
      automaticReassignmentAllowed: false,
      providerTruthRequired: false,
      rahulDecisionRequired: false,
      promotionBlocked: true,
      laneReduction: "S0",
      requiredEvidence: ["lock-conflict"],
      coveredScenarios: [],
      coveredAcceptanceIds: ["P19-LOCK"],
      coveredTestIds: ["T10"],
    },
    {
      failureClass: "checkpoint-cas-conflict",
      affectedComponent: "checkpoint-store",
      trigger: "stale version in compare-and-swap",
      expectedPrimaryDisposition: "SAFE_DENY",
      allowedSecondaryDispositions: ["RECONCILIATION_REQUIRED"],
      automaticRetryAllowed: false,
      automaticResumeAllowed: false,
      automaticReassignmentAllowed: false,
      providerTruthRequired: false,
      rahulDecisionRequired: false,
      promotionBlocked: true,
      laneReduction: "S0",
      requiredEvidence: ["checkpoint-cas"],
      coveredScenarios: [],
      coveredAcceptanceIds: ["P19-CHECKPOINT"],
      coveredTestIds: ["T12"],
    },
    {
      failureClass: "cancellation-uncertainty",
      affectedComponent: "cancellation-controller",
      trigger: "uncertain remote cancellation state",
      expectedPrimaryDisposition: "REQUIRE_RECONCILIATION",
      allowedSecondaryDispositions: [],
      automaticRetryAllowed: false,
      automaticResumeAllowed: false,
      automaticReassignmentAllowed: false,
      providerTruthRequired: true,
      rahulDecisionRequired: false,
      promotionBlocked: true,
      laneReduction: "S0",
      requiredEvidence: ["cancellation-uncertainty"],
      coveredScenarios: [],
      coveredAcceptanceIds: ["P19-CANCEL"],
      coveredTestIds: ["T14"],
    },
  ];

  return {
    matrixId: "failure-matrix:wave5a",
    failureClasses,
    totalClasses: failureClasses.length,
    safetyPreservation: true,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };
}
