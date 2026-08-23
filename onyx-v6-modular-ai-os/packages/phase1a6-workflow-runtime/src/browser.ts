import {
  CAPABILITIES,
  GOVERNED_ACTOR,
  GOVERNED_REPOSITORY,
  EXECUTION_LANE_LIMIT as WORKFLOW_EXECUTION_LANE_LIMIT,
  DEFAULT_REMOTE_RETRY_BUDGET as WORKFLOW_DEFAULT_REMOTE_RETRY_BUDGET,
  WORKFLOW_CONTRACT_VERSION,
  WORKFLOW_STATES,
  type ApprovalPackage,
  type Capability,
  type Workflow,
  type WorkflowState,
} from "@onyx/phase1a5-workflow-engine/browser";

export const RUNTIME_CONTRACT_VERSION = "1.0.0" as const;
export const COMPATIBLE_WORKFLOW_CONTRACT_VERSION = "1.0.0" as const;

if (COMPATIBLE_WORKFLOW_CONTRACT_VERSION !== WORKFLOW_CONTRACT_VERSION) {
  throw new Error("Phase 1A.6 runtime is bound to an unsupported Phase 1A.5 contract version.");
}

export { CAPABILITIES, GOVERNED_ACTOR, GOVERNED_REPOSITORY, WORKFLOW_CONTRACT_VERSION, WORKFLOW_STATES };
export type { ApprovalPackage, Capability, Workflow, WorkflowState };

export const RUNTIME_EXECUTION_LANE_LIMIT = WORKFLOW_EXECUTION_LANE_LIMIT;
export const RUNTIME_DEFAULT_REMOTE_RETRY_BUDGET = WORKFLOW_DEFAULT_REMOTE_RETRY_BUDGET;
export const RUNTIME_STATUSES = ["CREATED", "WAITING_FOR_APPROVAL", "READY", "RUNNING", "PAUSED", "COMPLETED", "FAILED_SAFE", "RECONCILIATION_REQUIRED", "ROLLBACK_REQUIRED", "ROLLED_BACK", "CANCELLED"] as const;
export type RuntimeStatus = (typeof RUNTIME_STATUSES)[number];
export const RUNTIME_ACCEPTANCE_IDS = ["P16-CONTRACT", "P16-RUNTIME", "P16-REGISTRY", "P16-SNAPSHOT", "P16-STATUS", "P16-RECOVERY", "P16-RECONCILIATION", "P16-E10", "P16-SECURITY", "P16-SIMULATION"] as const;
export type RuntimeAcceptanceId = (typeof RUNTIME_ACCEPTANCE_IDS)[number];
export interface RuntimeAcceptanceRequirement { id: RuntimeAcceptanceId; implementationIdentifiers: string[]; testFiles: string[]; validationMethod: string; acceptanceStatus: "accepted" | "pending"; }
export interface RuntimeFlags { mergeAllowed: false; productionDeployAllowed: false; forcePushAllowed: false; branchDeletionAllowed: false; }
export function defaultRuntimeFlags(): RuntimeFlags { return { mergeAllowed: false, productionDeployAllowed: false, forcePushAllowed: false, branchDeletionAllowed: false }; }

export * from "./runtime-snapshot";
export * from "./status-projector";
export type { ReconciliationHandoff } from "./reconciliation-handoff";