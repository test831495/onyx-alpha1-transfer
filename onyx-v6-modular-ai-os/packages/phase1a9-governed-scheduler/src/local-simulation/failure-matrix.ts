/**
 * Phase 1A.9 Wave 5A: Failure Matrix
 *
 * Deterministic failure matrix projection containing failure classes,
 * triggers, expected dispositions, and recovery rules.
 *
 * This matrix preserves all existing fail-safe rules and does not weaken
 * prior recovery prohibitions.
 */

import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";

/**
 * Failure Matrix Entry
 */
export interface FailureMatrixEntry {
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
 * Complete Failure Matrix for Phase 1A.9
 *
 * This matrix covers all identified failure classes, preserves safety rules,
 * and prohibits unsafe automatic recovery actions.
 */
export const PHASE1A9_FAILURE_MATRIX: FailureMatrixEntry[] = [
  // Dependency Failures
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
    failureClass: "unknown-dependency",
    affectedComponent: "dependency-resolver",
    trigger: "reference to unknown task",
    expectedPrimaryDisposition: "REJECT_WORKFLOW",
    allowedSecondaryDispositions: [],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["reference-validation"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-DEPS"],
    coveredTestIds: ["T05"],
  },

  // Lease Failures
  {
    failureClass: "lease-race",
    affectedComponent: "lease-manager",
    trigger: "competing lease acquisition",
    expectedPrimaryDisposition: "SINGLE_WINNER_DETERMINED",
    allowedSecondaryDispositions: ["SAFE_DENY_AND_RECONCILE"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["lease-generation", "single-owner-validation"],
    coveredScenarios: ["SIM_D1_LEASE_RACE"],
    coveredAcceptanceIds: ["P19-LEASE"],
    coveredTestIds: ["T06"],
  },
  {
    failureClass: "stale-lease-generation",
    affectedComponent: "lease-manager",
    trigger: "lease with older generation attempted",
    expectedPrimaryDisposition: "STALE_GENERATION_REJECTED",
    allowedSecondaryDispositions: ["QUARANTINE_RESULT"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["lease-generation", "stale-result"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-LEASE"],
    coveredTestIds: ["T08"],
  },

  // Heartbeat Failures
  {
    failureClass: "heartbeat-loss",
    affectedComponent: "lease-manager",
    trigger: "heartbeat missed by deadline",
    expectedPrimaryDisposition: "WAIT_FOR_OWNER_AND_RECONCILE",
    allowedSecondaryDispositions: ["LEASE_EXPIRY_RECOMMENDATION"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["heartbeat-loss", "recovery-projection"],
    coveredScenarios: ["SIM_D2_HEARTBEAT_LOSS"],
    coveredAcceptanceIds: ["P19-HEARTBEAT"],
    coveredTestIds: ["T07"],
  },
  {
    failureClass: "clock-skew",
    affectedComponent: "heartbeat-monitor",
    trigger: "timestamp ordering anomaly",
    expectedPrimaryDisposition: "CLOCK_SKEW_DETECTED",
    allowedSecondaryDispositions: ["RECONCILIATION_REQUIRED"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["clock-skew"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-HEARTBEAT"],
    coveredTestIds: ["T07"],
  },

  // Lock Failures
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
    failureClass: "lock-owner-loss",
    affectedComponent: "lock-manager",
    trigger: "lock owner disconnected or lost",
    expectedPrimaryDisposition: "LOCK_OWNER_LOSS_DETECTED",
    allowedSecondaryDispositions: ["RECONCILIATION_REQUIRED"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["lock-owner-loss"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-LOCK"],
    coveredTestIds: ["T11"],
  },
  {
    failureClass: "cas-conflict",
    affectedComponent: "checkpoint-store",
    trigger: "compare-and-swap version mismatch",
    expectedPrimaryDisposition: "CAS_CONFLICT_DETECTED",
    allowedSecondaryDispositions: ["SAFE_DENY"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["checkpoint-cas"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-LOCK"],
    coveredTestIds: ["T10"],
  },

  // Checkpoint Failures
  {
    failureClass: "checkpoint-corruption",
    affectedComponent: "checkpoint-store",
    trigger: "checkpoint integrity validation failure",
    expectedPrimaryDisposition: "CHECKPOINT_CORRUPTED",
    allowedSecondaryDispositions: ["RECONCILIATION_REQUIRED"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: true,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["checkpoint-integrity"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-CHECKPOINT"],
    coveredTestIds: ["T13"],
  },
  {
    failureClass: "schema-mismatch",
    affectedComponent: "checkpoint-store",
    trigger: "checkpoint schema incompatibility",
    expectedPrimaryDisposition: "SCHEMA_INCOMPATIBLE",
    allowedSecondaryDispositions: ["RECONCILIATION_REQUIRED"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["schema-compatibility"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-CHECKPOINT"],
    coveredTestIds: ["T12"],
  },

  // Cancellation Failures
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

  // Join Failures
  {
    failureClass: "join-timeout",
    affectedComponent: "join-coordinator",
    trigger: "join deadline exceeded",
    expectedPrimaryDisposition: "JOIN_TIMEOUT_EXCEEDED",
    allowedSecondaryDispositions: ["ROUTE_TO_RECOVERY_OR_RECONCILIATION"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["join-timeout"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-JOIN"],
    coveredTestIds: ["T17"],
  },

  // Budget Failures
  {
    failureClass: "budget-warning",
    affectedComponent: "budget-governor",
    trigger: "budget consumption approaching limit",
    expectedPrimaryDisposition: "BUDGET_WARNING",
    allowedSecondaryDispositions: ["CONTINUE_WITH_CAUTION"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: false,
    laneReduction: "none",
    requiredEvidence: ["budget-decision"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-BUDGET"],
    coveredTestIds: ["T19"],
  },
  {
    failureClass: "budget-hard-stop",
    affectedComponent: "budget-governor",
    trigger: "budget hard limit exceeded",
    expectedPrimaryDisposition: "BUDGET_HARD_LIMIT_EXCEEDED",
    allowedSecondaryDispositions: ["STOP_AND_CHECKPOINT"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["budget-decision"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-BUDGET"],
    coveredTestIds: ["T19"],
  },
  {
    failureClass: "attempt-exhaustion",
    affectedComponent: "budget-governor",
    trigger: "retry attempt count exhausted",
    expectedPrimaryDisposition: "ATTEMPTS_EXHAUSTED",
    allowedSecondaryDispositions: ["STOP_AND_RECONCILE"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["budget-exhaustion"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-BUDGET"],
    coveredTestIds: ["T20"],
  },

  // Evidence Failures
  {
    failureClass: "evidence-failure",
    affectedComponent: "evidence-store",
    trigger: "evidence gating failure or storage unavailable",
    expectedPrimaryDisposition: "EVIDENCE_GATING_FAILED",
    allowedSecondaryDispositions: ["STOP_AND_RECONCILE"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: true,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["evidence-gating"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-EVIDENCE", "P19-RECOVERY"],
    coveredTestIds: ["T21"],
  },

  // Recovery Failures
  {
    failureClass: "unknown-external-write",
    affectedComponent: "recovery-coordinator",
    trigger: "unknown external effect on state",
    expectedPrimaryDisposition: "UNKNOWN_EXTERNAL_EFFECT",
    allowedSecondaryDispositions: ["REQUIRE_PROVIDER_TRUTH", "RECONCILIATION_REQUIRED"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: true,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["state-divergence"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-RECOVERY"],
    coveredTestIds: ["T23"],
  },
  {
    failureClass: "runtime-divergence",
    affectedComponent: "recovery-coordinator",
    trigger: "runtime state divergence detected",
    expectedPrimaryDisposition: "RUNTIME_DIVERGENCE_DETECTED",
    allowedSecondaryDispositions: ["SAFE_REDUCTION", "RECONCILIATION_REQUIRED"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: true,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["divergence-classification"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-RECOVERY"],
    coveredTestIds: ["T23"],
  },
  {
    failureClass: "workflow-divergence",
    affectedComponent: "recovery-coordinator",
    trigger: "workflow state divergence detected",
    expectedPrimaryDisposition: "WORKFLOW_DIVERGENCE_DETECTED",
    allowedSecondaryDispositions: ["SAFE_REDUCTION", "RECONCILIATION_REQUIRED"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: true,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["divergence-classification"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-RECOVERY"],
    coveredTestIds: ["T23"],
  },

  // Approval and Permission Failures
  {
    failureClass: "approval-invalidation",
    affectedComponent: "approval-manager",
    trigger: "approval cache invalidated or expired",
    expectedPrimaryDisposition: "APPROVAL_INVALIDATED",
    allowedSecondaryDispositions: ["REQUIRE_FRESH_APPROVAL"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["approval-validation"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-RECOVERY"],
    coveredTestIds: ["T22"],
  },
  {
    failureClass: "permission-invalidation",
    affectedComponent: "permission-manager",
    trigger: "permission cache invalidated or revoked",
    expectedPrimaryDisposition: "PERMISSION_INVALIDATED",
    allowedSecondaryDispositions: ["RECHECK_PERMISSIONS"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["permission-validation"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-RECOVERY"],
    coveredTestIds: ["T23"],
  },

  // Memory Failures
  {
    failureClass: "memory-tombstone",
    affectedComponent: "memory-store",
    trigger: "memory accessed after tombstoning",
    expectedPrimaryDisposition: "TOMBSTONED_MEMORY_BLOCKED",
    allowedSecondaryDispositions: ["DENIAL"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["memory-revalidation"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-MEMORY"],
    coveredTestIds: ["T33"],
  },
  {
    failureClass: "memory-poisoning",
    affectedComponent: "memory-store",
    trigger: "poisoned memory accessed",
    expectedPrimaryDisposition: "POISONED_MEMORY_BLOCKED",
    allowedSecondaryDispositions: ["QUARANTINE"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["memory-boundary"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-MEMORY"],
    coveredTestIds: ["T31"],
  },
  {
    failureClass: "context-quarantine",
    affectedComponent: "context-store",
    trigger: "quarantined context accessed",
    expectedPrimaryDisposition: "CONTEXT_QUARANTINED",
    allowedSecondaryDispositions: ["DENIAL"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["context-protection"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-MEMORY"],
    coveredTestIds: ["T32"],
  },

  // Council Failures
  {
    failureClass: "council-disagreement",
    affectedComponent: "council-binding",
    trigger: "ONYX and NOVA disagree",
    expectedPrimaryDisposition: "COUNCIL_DISAGREEMENT",
    allowedSecondaryDispositions: ["RAHUL_ESCALATION"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["council-binding"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-COUNCIL"],
    coveredTestIds: ["T34"],
  },

  // Draft Failures
  {
    failureClass: "draft-approval-invalidation",
    affectedComponent: "draft-store",
    trigger: "draft approval invalidated by material change",
    expectedPrimaryDisposition: "DRAFT_APPROVAL_INVALIDATED",
    allowedSecondaryDispositions: ["REQUIRE_FRESH_APPROVAL"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["draft-versioning"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-DRAFT"],
    coveredTestIds: ["T37"],
  },

  // Connector Failures
  {
    failureClass: "connector-account-conflict",
    affectedComponent: "connector-binding",
    trigger: "account isolation boundary violated",
    expectedPrimaryDisposition: "CONNECTOR_ACCOUNT_CONFLICT",
    allowedSecondaryDispositions: ["DENIAL"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["connector-isolation"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-CONNECTOR"],
    coveredTestIds: ["T38"],
  },
  {
    failureClass: "connector-remote-uncertainty",
    affectedComponent: "connector-binding",
    trigger: "unknown remote connector operation result",
    expectedPrimaryDisposition: "CONNECTOR_REMOTE_UNCERTAINTY",
    allowedSecondaryDispositions: ["RECONCILE_PROVIDER_TRUTH"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: true,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["connector-uncertainty"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-CONNECTOR"],
    coveredTestIds: ["T40"],
  },

  // Promotion Failures
  {
    failureClass: "promotion-failure",
    affectedComponent: "promotion-lane",
    trigger: "promotion candidate fails validation",
    expectedPrimaryDisposition: "PROMOTION_FAILED",
    allowedSecondaryDispositions: ["PRESERVE_EVIDENCE", "QUEUE_NEXT_CANDIDATE"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: true,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["promotion-failure"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-PROMOTION"],
    coveredTestIds: ["T25"],
  },
  {
    failureClass: "evidence-causal-cycle",
    affectedComponent: "evidence-store",
    trigger: "evidence has circular parent references",
    expectedPrimaryDisposition: "EVIDENCE_CAUSAL_CYCLE",
    allowedSecondaryDispositions: ["BLOCK_PROMOTION"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["evidence-gating"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-EVIDENCE", "P19-PROMOTION"],
    coveredTestIds: ["T24"],
  },
  {
    failureClass: "missing-mandatory-evidence",
    affectedComponent: "evidence-store",
    trigger: "mandatory evidence class not provided",
    expectedPrimaryDisposition: "MANDATORY_EVIDENCE_MISSING",
    allowedSecondaryDispositions: ["BLOCK_PROMOTION"],
    automaticRetryAllowed: false,
    automaticResumeAllowed: false,
    automaticReassignmentAllowed: false,
    providerTruthRequired: false,
    rahulDecisionRequired: false,
    promotionBlocked: true,
    laneReduction: "S0",
    requiredEvidence: ["evidence-gating"],
    coveredScenarios: [],
    coveredAcceptanceIds: ["P19-EVIDENCE", "P19-PROMOTION"],
    coveredTestIds: ["T24"],
  },
];

/**
 * Get failure matrix entry by failure class
 */
export function getFailureMatrixEntry(failureClass: string): FailureMatrixEntry | undefined {
  return PHASE1A9_FAILURE_MATRIX.find((entry) => entry.failureClass === failureClass);
}

/**
 * Get all failure matrix entries for a component
 */
export function getFailuresByComponent(component: string): FailureMatrixEntry[] {
  return PHASE1A9_FAILURE_MATRIX.filter((entry) => entry.affectedComponent === component);
}

/**
 * Get all failure matrix entries covered by acceptance ID
 */
export function getFailuresByAcceptanceId(acceptanceId: string): FailureMatrixEntry[] {
  return PHASE1A9_FAILURE_MATRIX.filter((entry) =>
    entry.coveredAcceptanceIds.includes(acceptanceId)
  );
}

/**
 * Validate failure matrix safety rules
 */
export function validateFailureMatrixSafety(): boolean {
  for (const entry of PHASE1A9_FAILURE_MATRIX) {
    // No automatic retry allowed under uncertainty
    if (entry.automaticRetryAllowed === true) {
      throw new Error(
        `Failure class ${entry.failureClass} allows automatic retry, violating safety rules`
      );
    }
    // No automatic resume allowed under uncertainty
    if (entry.automaticResumeAllowed === true) {
      throw new Error(
        `Failure class ${entry.failureClass} allows automatic resume, violating safety rules`
      );
    }
    // No automatic reassignment allowed under uncertainty
    if (entry.automaticReassignmentAllowed === true) {
      throw new Error(
        `Failure class ${entry.failureClass} allows automatic reassignment, violating safety rules`
      );
    }
  }
  return true;
}

/**
 * Failure Matrix Projection (In-Memory)
 */
export interface FailureMatrixProjection {
  matrixId: string;
  totalEntries: number;
  allComponents: string[];
  allFailureClasses: string[];
  safetyValidated: boolean;
  contractVersion: string;
}

export function getFailureMatrixProjection(): FailureMatrixProjection {
  validateFailureMatrixSafety();
  const components = new Set(PHASE1A9_FAILURE_MATRIX.map((e) => e.affectedComponent));
  const failureClasses = new Set(PHASE1A9_FAILURE_MATRIX.map((e) => e.failureClass));

  return {
    matrixId: "failure-matrix:phase1a9",
    totalEntries: PHASE1A9_FAILURE_MATRIX.length,
    allComponents: Array.from(components).sort(),
    allFailureClasses: Array.from(failureClasses).sort(),
    safetyValidated: true,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };
}
