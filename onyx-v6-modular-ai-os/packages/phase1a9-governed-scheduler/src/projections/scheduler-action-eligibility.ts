/**
 * Phase 1A.9 Operator Action Eligibility Projection
 * 
 * Deterministic, read-only projection of which operator actions are eligible.
 * 
 * Safe actions: INSPECT, OPEN_EVIDENCE, OPEN_CONTEXT, OPEN_RECOVERY, 
 * OPEN_APPROVAL, OPEN_COST, COPY_REFERENCE, REQUEST_FUTURE_GOVERNED_ACTION
 * 
 * Prohibited actions: scheduler activation, task execution, Git, connector,
 * memory write, promotion, deployment, approval bypass, policy override.
 */

export type OperatorActionClass =
  | "INSPECT"
  | "OPEN_EVIDENCE"
  | "OPEN_CONTEXT_REFERENCE"
  | "OPEN_RECOVERY_DETAILS"
  | "OPEN_APPROVAL_DETAILS"
  | "OPEN_COST_DETAILS"
  | "COPY_REFERENCE"
  | "REQUEST_FUTURE_GOVERNED_ACTION";

export type OperatorActionRiskClass =
  | "READ_ONLY"
  | "INFORMATIONAL"
  | "REFERENCE_NAVIGATION"
  | "APPROVAL_REQUIRED"
  | "FUTURE_GOVERNANCE"
  | "PROHIBITED";

/**
 * Reason why an operator action is denied.
 * Used for screen-reader and accessible UI presentation.
 */
export interface ActionDenialReason {
  readonly code: string;
  readonly category: "POLICY" | "STATE" | "GOVERNANCE" | "CAPABILITY";
  readonly accessibleMessage: string;
  readonly humanReadableMessage: string;
}

/**
 * Eligibility decision for a single operator action.
 * Versions are pinned to contract version for compatibility checking.
 */
export interface OperatorActionEligibilityDecision {
  readonly actionId: string;
  readonly actionClass: OperatorActionClass;
  readonly enabled: boolean;
  readonly readOnly: true;
  readonly governanceDecisionId?: string;
  readonly approvalRequired: boolean;
  readonly freshApprovalRequired: boolean;
  readonly riskClass: OperatorActionRiskClass;
  readonly denialReasons: readonly ActionDenialReason[];
  readonly accessibleLabel: string;
  readonly accessibleDescription: string;
  readonly focusTargetId?: string;
  readonly evidenceArtifactIds: readonly string[];
  readonly contractVersion: "1.0.0";
}

/**
 * Aggregate result of action eligibility evaluation for a set of operators.
 * Used to provide a status summary and barrier-to-action explanation.
 */
export interface SchedulerOperatorActionEligibilityProjection {
  readonly projectionId: string;
  readonly schedulerProjectionId: string;
  readonly evaluatedAt: number;
  readonly actionDecisions: readonly OperatorActionEligibilityDecision[];
  readonly enabledActionCount: number;
  readonly deniedActionCount: number;
  readonly globalBlockingReasons: readonly ActionDenialReason[];
  readonly contractVersion: "1.0.0";
}

/**
 * Verify that an action is safe to display based on its class.
 * Returns true only for read-only action classes that cannot mutate state.
 */
export function isSafeOperatorActionClass(actionClass: string): boolean {
  const SAFE_ACTIONS: readonly OperatorActionClass[] = [
    "INSPECT",
    "OPEN_EVIDENCE",
    "OPEN_CONTEXT_REFERENCE",
    "OPEN_RECOVERY_DETAILS",
    "OPEN_APPROVAL_DETAILS",
    "OPEN_COST_DETAILS",
    "COPY_REFERENCE",
    "REQUEST_FUTURE_GOVERNED_ACTION",
  ];
  return SAFE_ACTIONS.some((safeAction) => safeAction === actionClass);
}

/**
 * Create an eligibility decision for a safe read-only action.
 */
export function createReadOnlyActionEligibility(
  actionId: string,
  actionClass: OperatorActionClass,
  enabled: boolean,
  accessibleLabel: string,
  accessibleDescription: string,
  denialReasons: readonly ActionDenialReason[] = []
): OperatorActionEligibilityDecision {
  if (!isSafeOperatorActionClass(actionClass)) {
    throw new Error(
      `Action class "${actionClass}" is not a safe read-only action. ` +
      `Only INSPECT, OPEN_*, COPY_REFERENCE, and REQUEST_FUTURE_GOVERNED_ACTION are permitted.`
    );
  }

  return {
    actionId,
    actionClass,
    enabled,
    readOnly: true,
    approvalRequired: false,
    freshApprovalRequired: false,
    riskClass: "READ_ONLY",
    denialReasons,
    accessibleLabel,
    accessibleDescription,
    evidenceArtifactIds: [],
    contractVersion: "1.0.0",
  };
}

/**
 * Create a default eligibility projection when no actions are enabled.
 */
export function createEmptyOperatorActionEligibilityProjection(
  projectionId: string,
  schedulerProjectionId: string,
  now: number
): SchedulerOperatorActionEligibilityProjection {
  return {
    projectionId,
    schedulerProjectionId,
    evaluatedAt: now,
    actionDecisions: [],
    enabledActionCount: 0,
    deniedActionCount: 0,
    globalBlockingReasons: [
      {
        code: "SCHEDULER_DISABLED",
        category: "POLICY",
        accessibleMessage: "Scheduler is disabled. Read-only inspection is available.",
        humanReadableMessage: "Scheduler is disabled. Read-only inspection is available.",
      },
      {
        code: "S0_SINGLE_ONLY",
        category: "STATE",
        accessibleMessage: "Scheduler is in single-lane mode. Execution actions are unavailable.",
        humanReadableMessage: "Scheduler is in single-lane mode. Execution actions are unavailable.",
      },
    ],
    contractVersion: "1.0.0",
  };
}
