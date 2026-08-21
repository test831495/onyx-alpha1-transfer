import { type RuntimeStatus, type WorkflowState, WORKFLOW_STATES } from "./contracts";

/**
 * Read-only projection from the frozen 32 Phase 1A.5 workflow states onto stable
 * runtime status categories. This never mutates or renames the underlying state.
 */
const STATUS_BY_STATE: Record<WorkflowState, RuntimeStatus> = {
  WORKFLOW_CREATED: "CREATED",
  SCOPE_FROZEN: "CREATED",
  AWAITING_WORKFLOW_APPROVAL: "WAITING_FOR_APPROVAL",
  WORKFLOW_APPROVED: "READY",
  PREFLIGHT_IN_PROGRESS: "RUNNING",
  PREFLIGHT_PASSED: "RUNNING",
  PREFLIGHT_FAILED_SAFE: "FAILED_SAFE",
  ISSUE_STEP_PENDING: "RUNNING",
  ISSUE_STEP_IN_PROGRESS: "RUNNING",
  ISSUE_STEP_COMPLETED: "RUNNING",
  BRANCH_STEP_PENDING: "RUNNING",
  BRANCH_STEP_IN_PROGRESS: "RUNNING",
  BRANCH_STEP_COMPLETED: "RUNNING",
  PUSH_STEP_PENDING: "RUNNING",
  PUSH_STEP_IN_PROGRESS: "RUNNING",
  PUSH_STEP_COMPLETED: "RUNNING",
  VALIDATION_PENDING: "RUNNING",
  VALIDATION_IN_PROGRESS: "RUNNING",
  VALIDATION_PASSED: "RUNNING",
  VALIDATION_FAILED_SAFE: "FAILED_SAFE",
  EVIDENCE_PENDING: "RUNNING",
  EVIDENCE_READY: "RUNNING",
  DRAFT_PR_STEP_PENDING: "RUNNING",
  DRAFT_PR_STEP_IN_PROGRESS: "RUNNING",
  DRAFT_PR_STEP_COMPLETED: "RUNNING",
  WORKFLOW_COMPLETED: "COMPLETED",
  WORKFLOW_PAUSED: "PAUSED",
  WORKFLOW_FAILED_SAFE: "FAILED_SAFE",
  WORKFLOW_RECONCILIATION_REQUIRED: "RECONCILIATION_REQUIRED",
  WORKFLOW_CANCELLED: "CANCELLED",
  WORKFLOW_ROLLBACK_REQUIRED: "ROLLBACK_REQUIRED",
  WORKFLOW_ROLLED_BACK: "ROLLED_BACK",
};

export function projectRuntimeStatus(state: WorkflowState): RuntimeStatus {
  const status = STATUS_BY_STATE[state];
  if (!status) throw new Error(`Unmapped workflow state: ${state}`);
  return status;
}

export function assertCompleteStatusProjection(): void {
  const missing = WORKFLOW_STATES.filter((state) => !(state in STATUS_BY_STATE));
  if (missing.length > 0) throw new Error(`Missing status projection for states: ${missing.join(", ")}`);
}
