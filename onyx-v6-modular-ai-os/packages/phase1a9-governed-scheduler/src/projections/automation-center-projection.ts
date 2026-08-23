/**
 * Phase 1A.9 Automation Center Scheduler Projection Contract
 * 
 * Read-only, deterministic projection of scheduler state for Automation Center UI.
 * Never mutates scheduler, lanes, leases, heartbeats, locks, checkpoints, memory,
 * Council, drafts, connectors, approval, evidence, or Git state.
 * 
 * All summaries are redacted and reference-only; no sensitive content is included.
 */

import type { LaneStage } from "../contracts";

export const AUTOMATION_CENTER_SCHEDULER_PROJECTION_VERSION = "1.0.0" as const;

export type SchedulerHealthStatus =
  | "HEALTHY"
  | "WARNING"
  | "BLOCKED"
  | "RECONCILIATION_REQUIRED"
  | "FAILED_SAFE"
  | "STALE"
  | "UNKNOWN";

export type StalenessStatus = "FRESH" | "STALE" | "UNKNOWN";

/**
 * Redacted summary of task graph structure and ready-set state.
 * No task content, memory, or connector data is included.
 */
export interface TaskGraphSummary {
  readonly taskNodeCount: number;
  readonly edgeCount: number;
  readonly readyCandidateCount: number;
  readonly capacitySelectedCount: number;
  readonly capacityLimitedCount: number;
  readonly blockedCount: number;
  readonly failedCount: number;
  readonly cancelledCount: number;
  readonly optionalFailureCount: number;
  readonly reconciliationCount: number;
  readonly prohibitedCount: number;
  readonly topologicalOrderingVerified: boolean;
  readonly cycleDetectionPassed: boolean;
}

/**
 * Deterministic ready-set evaluation results.
 * No selected task ID is revealed; only counts are shown.
 */
export interface ReadySetSummary {
  readonly eligibleCount: number;
  readonly candidateEvaluationComplete: boolean;
  readonly capacityLimitApplied: boolean;
  readonly blockedReasonCount: number;
}

/**
 * Lane configuration and capacity summary.
 * Reflects frozen S0_SINGLE state; later stages remain unavailable.
 */
export interface LaneSummary {
  readonly activeLaneCount: number;
  readonly reservedLaneCount: number;
  readonly availableLaneCount: number;
  readonly blockedLaneCount: number;
  readonly serializedLaneCount: number;
  readonly capacityLimitedLaneCount: number;
  readonly reconciliationRequiredLaneCount: number;
  readonly promotionLaneActive: boolean;
  readonly promotionLaneAvailable: boolean;
}

/**
 * Active lease status and generation tracking.
 * No worker identity, task assignment details, or credentials are included.
 */
export interface LeaseSummary {
  readonly activeLeaseCount: number;
  readonly generationCount: number;
  readonly competingLeaseCount: number;
  readonly staleWorkerResultCount: number;
  readonly quarantinedResultCount: number;
}

/**
 * Heartbeat monitor projection.
 * Clock skew, heartbeat loss, and recovery disposition are deterministic references only.
 */
export interface HeartbeatSummary {
  readonly monitoredLeaseCount: number;
  readonly healthyHeartbeatCount: number;
  readonly staleHeartbeatCount: number;
  readonly clockSkewDetectedCount: number;
  readonly recoveryHandoffCount: number;
}

/**
 * Lock acquisition and conflict projection.
 * No lock content or owner identity is included; only compatibility is shown.
 */
export interface LockSummary {
  readonly activeLockCount: number;
  readonly waitingAcquisitionCount: number;
  readonly readCompatibilityCount: number;
  readonly writeConflictCount: number;
  readonly deadlockResolutionCount: number;
  readonly ownerLossCount: number;
}

/**
 * Checkpoint versioning and CAS conflict projection.
 * No checkpoint content, schema, or payload is included.
 */
export interface CheckpointSummary {
  readonly checkpointCount: number;
  readonly currentVersionDigest?: string;
  readonly casConflictCount: number;
  readonly integrityValidationCount: number;
  readonly safeResumeEligibleCount: number;
  readonly corruptCheckpointCount: number;
}

/**
 * Cancellation state and propagation projection.
 * No cancellation handlers are invoked; state transitions are projection-only.
 */
export interface CancellationSummary {
  readonly activeCancellationCount: number;
  readonly propagationQueueCount: number;
  readonly acknowledgementPendingCount: number;
  readonly uncertainOutcomeCount: number;
  readonly unauthorizedCancellationRejectionCount: number;
}

/**
 * Join policy coordination and threshold projection.
 * No joins are executed; all decisions are recommendations only.
 */
export interface JoinSummary {
  readonly activeJoinCount: number;
  readonly participantCount: number;
  readonly thresholdCalculationCount: number;
  readonly timeoutClassificationCount: number;
  readonly recoveryRoutingCount: number;
  readonly reconciliationEscalationCount: number;
}

/**
 * Budget and model-routing boundary projection.
 * No spending, API calls, or model invocations occur.
 */
export interface BudgetSummary {
  readonly budgetWarningCount: number;
  readonly budgetHardStopCount: number;
  readonly modelRoutingBoundaryViolationCount: number;
  readonly fallbackRecommendationCount: number;
  readonly projectedExhaustionCount: number;
}

/**
 * Recovery and reconciliation disposition projection.
 * No recovery is executed; all dispositions are recommendations.
 */
export interface RecoverySummary {
  readonly failureClassificationCount: number;
  readonly primaryDispositionCount: number;
  readonly secondaryDispositionCount: number;
  readonly retryEligibleCount: number;
  readonly resumeEligibleCount: number;
  readonly reassignmentEligibleCount: number;
  readonly providerTruthRequiredCount: number;
  readonly rahulDecisionRequiredCount: number;
  readonly laneReductionRecommendationCount: number;
}

/**
 * Promotion candidate and evidence projection.
 * No promotion, merge, Git operation, or deployment occurs.
 */
export interface PromotionSummary {
  readonly candidateCount: number;
  readonly serializedCandidateCount: number;
  readonly r4ApprovalRequiredCount: number;
  readonly r5ProhibitedCount: number;
  readonly scopeValidationCount: number;
  readonly s5EligibilityCount: number;
  readonly promotionLockCount: number;
  readonly checkpointDependencyCount: number;
  readonly joinDependencyCount: number;
  readonly budgetDependencyCount: number;
  readonly recoveryBlockCount: number;
}

/**
 * Evidence package and manifest projection.
 * No evidence is read, written, uploaded, persisted, or sealed.
 */
export interface EvidenceSummary {
  readonly evidenceArtifactCount: number;
  readonly mandatoryArtifactCount: number;
  readonly missingArtifactCount: number;
  readonly invalidArtifactCount: number;
  readonly conflictingArtifactCount: number;
  readonly unredactedArtifactCount: number;
  readonly unauthorizedArtifactCount: number;
  readonly provenanceInvalidCount: number;
  readonly retentionInvalidCount: number;
  readonly sequenceVerificationCount: number;
  readonly causalGraphVerificationCount: number;
  readonly sealingEligibleCount: number;
}

/**
 * Memory tier, access profile, and context-boundary projection.
 * No memory is read, written, accessed, or modified.
 * P0 writer path is always absent; memory authority is always false.
 */
export interface MemoryBoundarySummary {
  readonly memoryTierCount: number;
  readonly recordIdCount: number;
  readonly accessProfileCount: number;
  readonly permissionCount: number;
  readonly retentionCount: number;
  readonly provenanceCount: number;
  readonly poisoningCount: number;
  readonly quarantineCount: number;
  readonly tombstoneCount: number;
  readonly canonicalSourceCount: number;
  readonly contextPackageIdCount: number;
  readonly operationalLedgerBoundaryCount: number;
  readonly p0WriterPathAbsent: boolean;
  readonly memoryAuthorityFalse: boolean;
}

/**
 * Council presence mode, identity separation, and disagreement projection.
 * No Council agents are invoked; no decisions are executed.
 */
export interface CouncilSummary {
  readonly presenceModeCount: number;
  readonly onyxIdentityPresent: boolean;
  readonly novaIdentityPresent: boolean;
  readonly separatePersonaContextVerified: boolean;
  readonly sharedGovernedFactCount: number;
  readonly agreementCount: number;
  readonly disagreementCount: number;
  readonly rahulDecisionRequiredCount: number;
  readonly selfApprovalDetectionCount: number;
  readonly authorityExpansionDetectionCount: number;
}

/**
 * Saved Draft lifecycle and scheduling eligibility projection.
 * No drafts are persisted, resumed, updated, versioned, or deleted.
 */
export interface DraftSummary {
  readonly draftCount: number;
  readonly lineageIdCount: number;
  readonly currentVersionCount: number;
  readonly lifecycleStageCount: number;
  readonly scopeCount: number;
  readonly materialChangeCount: number;
  readonly versionRequirementCount: number;
  readonly approvalInvalidationCount: number;
  readonly permissionCount: number;
  readonly memoryAndConnectorScopeCount: number;
  readonly dependencyCount: number;
  readonly budgetDependencyCount: number;
  readonly targetEnvironmentCount: number;
  readonly deletedAndSupersededCount: number;
  readonly schedulingEligibleCount: number;
  readonly resumeEligibleCount: number;
}

/**
 * Connector provider, account, and scope projection.
 * No connector content, credentials, or actions are included.
 * All accounts and providers remain isolated.
 */
export interface ConnectorSummary {
  readonly connectorProviderCount: number;
  readonly connectorAccountCount: number;
  readonly accountLabelCount: number;
  readonly accountCategoryCount: number;
  readonly scopeCount: number;
  readonly permissionModeCount: number;
  readonly sourceAttributionCount: number;
  readonly readOnlyEligibleCount: number;
  readonly mutationSerializationCount: number;
  readonly accountExclusivityVerifiedCount: number;
  readonly professionalPersonalBoundaryVerifiedCount: number;
  readonly remoteUncertaintyCount: number;
  readonly providerTruthRequiredCount: number;
  readonly credentialDetectionCount: number;
}

/**
 * Main scheduler projection for Automation Center.
 * Versioned, immutable, reference-only summary of all scheduler decisions.
 * No state is mutable or actionable from this projection.
 */
export interface AutomationCenterSchedulerProjection {
  readonly schedulerProjectionId: string;
  readonly schedulerRunId: string;
  readonly workflowId: string;
  readonly runtimeId: string;
  readonly runtimeSessionId: string;
  readonly schedulerConfigId: string;

  // Scheduler configuration state (frozen, read-only)
  readonly schedulerEnabled: false;
  readonly activeLaneStage: "S0_SINGLE";
  readonly runtimeLaneLimit: 1;
  readonly promotionLaneLimit: 1;

  // Authority boundaries
  readonly workflowStateReference: string;
  readonly runtimeStateReference: string;
  readonly schedulerHealthStatus: SchedulerHealthStatus;

  // Task graph and ready-set
  readonly taskGraphSummary: TaskGraphSummary;
  readonly readySetSummary: ReadySetSummary;

  // Lane and capacity
  readonly laneSummary: LaneSummary;
  readonly leaseSummary: LeaseSummary;
  readonly heartbeatSummary: HeartbeatSummary;

  // Locks and checkpoints
  readonly lockSummary: LockSummary;
  readonly checkpointSummary: CheckpointSummary;

  // Cancellation and joins
  readonly cancellationSummary: CancellationSummary;
  readonly joinSummary: JoinSummary;

  // Budget and routing
  readonly budgetSummary: BudgetSummary;

  // Recovery and reconciliation
  readonly recoverySummary: RecoverySummary;

  // Promotion and evidence
  readonly promotionSummary: PromotionSummary;
  readonly evidenceSummary: EvidenceSummary;

  // Memory and context
  readonly memoryBoundarySummary: MemoryBoundarySummary;

  // Council coordination
  readonly councilSummary: CouncilSummary;

  // Saved drafts
  readonly draftSummary: DraftSummary;

  // Connectors
  readonly connectorSummary: ConnectorSummary;

  // Operator awareness
  readonly pendingApprovalIds: readonly string[];
  readonly warningIds: readonly string[];
  readonly blockingDecisionIds: readonly string[];
  readonly reconciliationRecordIds: readonly string[];
  readonly evidenceArtifactIds: readonly string[];

  // Staleness and timing
  readonly lastEvaluatedAt: number;
  readonly stalenessStatus: StalenessStatus;

  // Versioning
  readonly projectionVersion: typeof AUTOMATION_CENTER_SCHEDULER_PROJECTION_VERSION;
  readonly contractVersion: "1.0.0";
}

/**
 * Create an empty/zero projection when scheduler state is unavailable.
 * Useful for error states and unknown conditions.
 */
export function createEmptySchedulerProjection(
  schedulerProjectionId: string,
  now: number
): AutomationCenterSchedulerProjection {
  return {
    schedulerProjectionId,
    schedulerRunId: "UNKNOWN",
    workflowId: "UNKNOWN",
    runtimeId: "UNKNOWN",
    runtimeSessionId: "UNKNOWN",
    schedulerConfigId: "UNKNOWN",
    schedulerEnabled: false,
    activeLaneStage: "S0_SINGLE",
    runtimeLaneLimit: 1,
    promotionLaneLimit: 1,
    workflowStateReference: "UNKNOWN",
    runtimeStateReference: "UNKNOWN",
    schedulerHealthStatus: "UNKNOWN",
    taskGraphSummary: {
      taskNodeCount: 0,
      edgeCount: 0,
      readyCandidateCount: 0,
      capacitySelectedCount: 0,
      capacityLimitedCount: 0,
      blockedCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      optionalFailureCount: 0,
      reconciliationCount: 0,
      prohibitedCount: 0,
      topologicalOrderingVerified: false,
      cycleDetectionPassed: false,
    },
    readySetSummary: {
      eligibleCount: 0,
      candidateEvaluationComplete: false,
      capacityLimitApplied: false,
      blockedReasonCount: 0,
    },
    laneSummary: {
      activeLaneCount: 0,
      reservedLaneCount: 0,
      availableLaneCount: 0,
      blockedLaneCount: 0,
      serializedLaneCount: 0,
      capacityLimitedLaneCount: 0,
      reconciliationRequiredLaneCount: 0,
      promotionLaneActive: false,
      promotionLaneAvailable: false,
    },
    leaseSummary: {
      activeLeaseCount: 0,
      generationCount: 0,
      competingLeaseCount: 0,
      staleWorkerResultCount: 0,
      quarantinedResultCount: 0,
    },
    heartbeatSummary: {
      monitoredLeaseCount: 0,
      healthyHeartbeatCount: 0,
      staleHeartbeatCount: 0,
      clockSkewDetectedCount: 0,
      recoveryHandoffCount: 0,
    },
    lockSummary: {
      activeLockCount: 0,
      waitingAcquisitionCount: 0,
      readCompatibilityCount: 0,
      writeConflictCount: 0,
      deadlockResolutionCount: 0,
      ownerLossCount: 0,
    },
    checkpointSummary: {
      checkpointCount: 0,
      casConflictCount: 0,
      integrityValidationCount: 0,
      safeResumeEligibleCount: 0,
      corruptCheckpointCount: 0,
    },
    cancellationSummary: {
      activeCancellationCount: 0,
      propagationQueueCount: 0,
      acknowledgementPendingCount: 0,
      uncertainOutcomeCount: 0,
      unauthorizedCancellationRejectionCount: 0,
    },
    joinSummary: {
      activeJoinCount: 0,
      participantCount: 0,
      thresholdCalculationCount: 0,
      timeoutClassificationCount: 0,
      recoveryRoutingCount: 0,
      reconciliationEscalationCount: 0,
    },
    budgetSummary: {
      budgetWarningCount: 0,
      budgetHardStopCount: 0,
      modelRoutingBoundaryViolationCount: 0,
      fallbackRecommendationCount: 0,
      projectedExhaustionCount: 0,
    },
    recoverySummary: {
      failureClassificationCount: 0,
      primaryDispositionCount: 0,
      secondaryDispositionCount: 0,
      retryEligibleCount: 0,
      resumeEligibleCount: 0,
      reassignmentEligibleCount: 0,
      providerTruthRequiredCount: 0,
      rahulDecisionRequiredCount: 0,
      laneReductionRecommendationCount: 0,
    },
    promotionSummary: {
      candidateCount: 0,
      serializedCandidateCount: 0,
      r4ApprovalRequiredCount: 0,
      r5ProhibitedCount: 0,
      scopeValidationCount: 0,
      s5EligibilityCount: 0,
      promotionLockCount: 0,
      checkpointDependencyCount: 0,
      joinDependencyCount: 0,
      budgetDependencyCount: 0,
      recoveryBlockCount: 0,
    },
    evidenceSummary: {
      evidenceArtifactCount: 0,
      mandatoryArtifactCount: 0,
      missingArtifactCount: 0,
      invalidArtifactCount: 0,
      conflictingArtifactCount: 0,
      unredactedArtifactCount: 0,
      unauthorizedArtifactCount: 0,
      provenanceInvalidCount: 0,
      retentionInvalidCount: 0,
      sequenceVerificationCount: 0,
      causalGraphVerificationCount: 0,
      sealingEligibleCount: 0,
    },
    memoryBoundarySummary: {
      memoryTierCount: 0,
      recordIdCount: 0,
      accessProfileCount: 0,
      permissionCount: 0,
      retentionCount: 0,
      provenanceCount: 0,
      poisoningCount: 0,
      quarantineCount: 0,
      tombstoneCount: 0,
      canonicalSourceCount: 0,
      contextPackageIdCount: 0,
      operationalLedgerBoundaryCount: 0,
      p0WriterPathAbsent: true,
      memoryAuthorityFalse: true,
    },
    councilSummary: {
      presenceModeCount: 0,
      onyxIdentityPresent: false,
      novaIdentityPresent: false,
      separatePersonaContextVerified: false,
      sharedGovernedFactCount: 0,
      agreementCount: 0,
      disagreementCount: 0,
      rahulDecisionRequiredCount: 0,
      selfApprovalDetectionCount: 0,
      authorityExpansionDetectionCount: 0,
    },
    draftSummary: {
      draftCount: 0,
      lineageIdCount: 0,
      currentVersionCount: 0,
      lifecycleStageCount: 0,
      scopeCount: 0,
      materialChangeCount: 0,
      versionRequirementCount: 0,
      approvalInvalidationCount: 0,
      permissionCount: 0,
      memoryAndConnectorScopeCount: 0,
      dependencyCount: 0,
      budgetDependencyCount: 0,
      targetEnvironmentCount: 0,
      deletedAndSupersededCount: 0,
      schedulingEligibleCount: 0,
      resumeEligibleCount: 0,
    },
    connectorSummary: {
      connectorProviderCount: 0,
      connectorAccountCount: 0,
      accountLabelCount: 0,
      accountCategoryCount: 0,
      scopeCount: 0,
      permissionModeCount: 0,
      sourceAttributionCount: 0,
      readOnlyEligibleCount: 0,
      mutationSerializationCount: 0,
      accountExclusivityVerifiedCount: 0,
      professionalPersonalBoundaryVerifiedCount: 0,
      remoteUncertaintyCount: 0,
      providerTruthRequiredCount: 0,
      credentialDetectionCount: 0,
    },
    pendingApprovalIds: [],
    warningIds: [],
    blockingDecisionIds: [],
    reconciliationRecordIds: [],
    evidenceArtifactIds: [],
    lastEvaluatedAt: now,
    stalenessStatus: "UNKNOWN",
    projectionVersion: AUTOMATION_CENTER_SCHEDULER_PROJECTION_VERSION,
    contractVersion: "1.0.0",
  };
}
