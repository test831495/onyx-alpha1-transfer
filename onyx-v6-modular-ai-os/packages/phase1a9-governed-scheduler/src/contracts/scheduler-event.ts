import { PHASE1A9_EVENT_CONTRACT_VERSION } from "../shared/versions";
export const SCHEDULER_EVENT_TYPES = [
  "CONFIG_CREATED",
  "AUTHORITY_BOUNDARY_VALIDATED",
  "COMPATIBILITY_VALIDATED",
  "LANE_STAGE_EVALUATED",
  "TASK_REFERENCE_REGISTERED",
  "TASK_REFERENCE_REJECTED",
  "ACCEPTANCE_RECORD_CREATED",
  "TEST_RECORD_CREATED",
  "EVIDENCE_ARTIFACT_REGISTERED",
  "PROMOTION_CANDIDATE_REGISTERED",
  "PROMOTION_CANDIDATE_REJECTED",
  "PROMOTION_ELIGIBILITY_EVALUATED",
  "PROMOTION_SERIALIZATION_EVALUATED",
  "PROMOTION_CANCELLATION_EVALUATED",
  "PROMOTION_FAILURE_EVALUATED",
  "PROMOTION_RECONCILIATION_REQUIRED",
  "FRESH_PROMOTION_APPROVAL_REQUIRED",
  "EVIDENCE_EVENT_REGISTERED",
  "EVIDENCE_EVENT_REJECTED",
  "EVIDENCE_SEQUENCE_VALIDATED",
  "EVIDENCE_SEQUENCE_REJECTED",
  "EVIDENCE_ARTIFACT_REJECTED",
  "EVIDENCE_PACKAGE_EVALUATED",
  "EVIDENCE_PACKAGE_INCOMPLETE",
  "EVIDENCE_MANIFEST_EVALUATED",
  "EVIDENCE_SEALING_ELIGIBILITY_EVALUATED",
] as const;
export type SchedulerEventType = (typeof SCHEDULER_EVENT_TYPES)[number];
export interface SchedulerEvent { schedulerEventId: string; schedulerRunId: string; eventType: SchedulerEventType; workflowId: string; runtimeId: string; runtimeSessionId: string; taskId?: string; agentId?: string; laneStage: string; logicalSequence: number; causalParentEventIds: readonly string[]; checkpointDigest?: string; approvalId?: string; permissionDecisionId?: string; memoryDecisionId?: string; connectorDecisionId?: string; budgetDecisionId?: string; evidenceArtifactIds: readonly string[]; resultClassification: string; redactedDetail: string; occurredAt: string; contractVersion: string; }
export function assertSchedulerEvent(event: SchedulerEvent): void {
  if (event.contractVersion !== PHASE1A9_EVENT_CONTRACT_VERSION || !(SCHEDULER_EVENT_TYPES as readonly string[]).includes(event.eventType) || event.logicalSequence < 0) throw new Error("Invalid or unsupported scheduler event.");
  if (/(TASK_DISPATCHED|TASK_EXECUTING|LEASE_ACQUIRED|LOCK_ACQUIRED|CHECKPOINT_WRITTEN|REMOTE_ACTION_STARTED|PROMOTION_EXECUTING|MERGE_EXECUTED|DEPLOYMENT_EXECUTED)/.test(event.eventType)) throw new Error("Runtime execution events are prohibited in Wave 1.");
}