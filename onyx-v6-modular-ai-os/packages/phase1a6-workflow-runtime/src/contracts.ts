import {
  CAPABILITIES,
  GOVERNED_ACTOR,
  GOVERNED_REPOSITORY,
  EXECUTION_LANE_LIMIT as WORKFLOW_EXECUTION_LANE_LIMIT,
  DEFAULT_REMOTE_RETRY_BUDGET as WORKFLOW_DEFAULT_REMOTE_RETRY_BUDGET,
  WORKFLOW_CONTRACT_VERSION,
  WORKFLOW_STATES,
  digest,
  type ApprovalPackage,
  type Capability,
  type Workflow,
  type WorkflowState,
} from "@onyx/phase1a5-workflow-engine";

/** Phase 1A.6 runtime contract identity, bound explicitly to the frozen Phase 1A.5 contract. */
export const RUNTIME_CONTRACT_VERSION = "1.0.0" as const;
export const COMPATIBLE_WORKFLOW_CONTRACT_VERSION = "1.0.0" as const;

if (COMPATIBLE_WORKFLOW_CONTRACT_VERSION !== WORKFLOW_CONTRACT_VERSION) {
  throw new Error("Phase 1A.6 runtime is bound to an unsupported Phase 1A.5 contract version.");
}

export { CAPABILITIES, GOVERNED_ACTOR, GOVERNED_REPOSITORY, WORKFLOW_CONTRACT_VERSION, WORKFLOW_STATES };
export type { ApprovalPackage, Capability, Workflow, WorkflowState };

export const RUNTIME_EXECUTION_LANE_LIMIT = WORKFLOW_EXECUTION_LANE_LIMIT;
export const RUNTIME_DEFAULT_REMOTE_RETRY_BUDGET = WORKFLOW_DEFAULT_REMOTE_RETRY_BUDGET;

/** Stable runtime status categories that the status projector maps the 32 Phase 1A.5 states onto. */
export const RUNTIME_STATUSES = [
  "CREATED",
  "WAITING_FOR_APPROVAL",
  "READY",
  "RUNNING",
  "PAUSED",
  "COMPLETED",
  "FAILED_SAFE",
  "RECONCILIATION_REQUIRED",
  "ROLLBACK_REQUIRED",
  "ROLLED_BACK",
  "CANCELLED",
] as const;
export type RuntimeStatus = (typeof RUNTIME_STATUSES)[number];

export const RUNTIME_ACCEPTANCE_IDS = [
  "P16-CONTRACT",
  "P16-RUNTIME",
  "P16-REGISTRY",
  "P16-SNAPSHOT",
  "P16-STATUS",
  "P16-RECOVERY",
  "P16-RECONCILIATION",
  "P16-E10",
  "P16-SECURITY",
  "P16-SIMULATION",
] as const;
export type RuntimeAcceptanceId = (typeof RUNTIME_ACCEPTANCE_IDS)[number];

export interface RuntimeAcceptanceRequirement {
  id: RuntimeAcceptanceId;
  implementationIdentifiers: string[];
  testFiles: string[];
  validationMethod: string;
  acceptanceStatus: "accepted" | "pending";
}

export interface RuntimeFlags {
  mergeAllowed: false;
  productionDeployAllowed: false;
  forcePushAllowed: false;
  branchDeletionAllowed: false;
}

export function defaultRuntimeFlags(): RuntimeFlags {
  return { mergeAllowed: false, productionDeployAllowed: false, forcePushAllowed: false, branchDeletionAllowed: false };
}

/** Deterministic runtime ID bound to the exact workflow identity and contract versions. */
export function makeRuntimeId(workflow: Pick<Workflow, "workflowId" | "repository" | "scopeHash" | "contractVersion">): string {
  return `p16rt-${digest({
    runtimeContractVersion: RUNTIME_CONTRACT_VERSION,
    workflowContractVersion: workflow.contractVersion,
    repository: workflow.repository,
    workflowId: workflow.workflowId,
    scopeHash: workflow.scopeHash,
  }).slice(0, 24)}`;
}

/** Deterministic runtime session ID bound to the runtime ID and the exact bound approval. */
export function makeRuntimeSessionId(runtimeId: string, approvalDigest: string): string {
  return `p16sess-${digest({ runtimeId, approvalDigest }).slice(0, 24)}`;
}

export class RuntimeSecurityError extends Error {}

export function rejectArbitraryRuntimeCommand(input: unknown): never {
  if (typeof input === "string" || (input && typeof input === "object" && ("command" in input || "shell" in input))) {
    throw new RuntimeSecurityError("Arbitrary commands and shell strings are unavailable on the runtime.");
  }
  throw new RuntimeSecurityError("Unsupported runtime adapter input.");
}
