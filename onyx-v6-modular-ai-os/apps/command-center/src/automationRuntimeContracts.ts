import { RUNTIME_CONTRACT_VERSION, type Capability, type RuntimeStatus, type WorkflowState } from "@onyx/phase1a6-workflow-runtime/browser";

/**
 * Phase 1A.7 UI integration contract, bound explicitly to the frozen Phase 1A.6
 * runtime contract version. This file never forks or copies the Phase 1A.5
 * workflow-state authority or the Phase 1A.6 runtime-status projector; it only
 * binds a version number to them and defines UI-only projection shapes.
 */
export const AUTOMATION_RUNTIME_UI_CONTRACT_VERSION = "1.0.0" as const;
export const AUTOMATION_RUNTIME_UI_COMPATIBLE_RUNTIME_CONTRACT_VERSION = "1.0.0" as const;

if (AUTOMATION_RUNTIME_UI_COMPATIBLE_RUNTIME_CONTRACT_VERSION !== RUNTIME_CONTRACT_VERSION) {
  throw new Error("Phase 1A.7 dashboard is bound to an unsupported Phase 1A.6 runtime contract version.");
}

export const P17_ACCEPTANCE_IDS = [
  "P17-CONTRACT",
  "P17-PROJECTION",
  "P17-DASHBOARD",
  "P17-CONTROLLER",
  "P17-IDENTITY",
  "P17-APPROVAL",
  "P17-RECOVERY",
  "P17-RECONCILIATION",
  "P17-EVIDENCE",
  "P17-CONNECTOR",
  "P17-BUDGET",
  "P17-MULTIAGENT",
  "P17-SECURITY",
] as const;
export type P17AcceptanceId = (typeof P17_ACCEPTANCE_IDS)[number];

export interface P17AcceptanceRequirement {
  id: P17AcceptanceId;
  implementationIdentifiers: string[];
  testFiles: string[];
  validationMethod: string;
  acceptanceStatus: "accepted" | "pending";
}

/** Allowed presence modes for runtime identity projection. Grants no approval authority. */
export const PRESENCE_MODES = ["ONYX", "NOVA", "ONYX_NOVA_COUNCIL", "SYSTEM", "UNASSIGNED"] as const;
export type PresenceMode = (typeof PRESENCE_MODES)[number];

/** Metadata-only connector providers. Content, credentials, and actions are never read or executed. */
export const CONNECTOR_PROVIDERS = ["Outlook", "Gmail", "Yahoo", "OneDrive", "SharePoint", "Google Drive", "UNKNOWN"] as const;
export type ConnectorProvider = (typeof CONNECTOR_PROVIDERS)[number];

export const PERMISSION_MODES = ["READ_ONLY", "ACTION_APPROVAL_REQUIRED"] as const;
export type PermissionMode = (typeof PERMISSION_MODES)[number];

export const BUDGET_STATUSES = ["UNDER_BUDGET", "AT_BUDGET", "OVER_BUDGET", "NOT_APPLICABLE"] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

/**
 * A shared-task memory reference must be permission-checked before any display,
 * and only a redacted summary may ever be shown. No character-private or
 * personality-memory content is represented by this type.
 */
export interface SharedTaskReference {
  readonly taskId: string;
  readonly permissionGranted: boolean;
  readonly redactedSummary: string;
}

/**
 * Runtime identity projection. Character, agent, and lane fields are additive,
 * optional where appropriate, and must never be treated as a source of
 * approval authority; only the Phase 1A.5 approval package is authoritative.
 */
export interface RuntimeIdentityProjection {
  readonly runtimeId: string;
  readonly runtimeSessionId: string;
  readonly workflowId: string;
  readonly supervisingUserId: string;
  readonly initiatingCharacterId?: string;
  readonly initiatingPresenceMode: PresenceMode;
  readonly activeAgentId?: string;
  readonly assignedAgentIds?: readonly string[];
  readonly activeLaneId?: string;
  readonly laneCount: number;
  readonly promotionLaneActive: boolean;
  readonly sharedTaskReferences?: readonly SharedTaskReference[];
}

/** Connector scope metadata only. No connector content, credentials, or actions are represented. */
export interface ConnectorScopeProjection {
  readonly connectorProvider: ConnectorProvider;
  readonly connectorAccountId: string;
  readonly connectorAccountLabel: string;
  readonly connectorScope: string;
  readonly permissionMode: PermissionMode;
  readonly readOnly: boolean;
  readonly actionApprovalRequired: boolean;
}

/** Deterministic mock-only budget and model-routing projection. Never invokes a paid service. */
export interface RuntimeBudgetProjection {
  readonly tokenBudget?: number;
  readonly tokensUsed?: number;
  readonly estimatedCost?: number;
  readonly currency?: string;
  readonly modelRoutingClass?: string;
  readonly cacheHitRate?: number;
  readonly contextTier?: string;
  readonly budgetStatus?: BudgetStatus;
}

export interface RuntimePermissionSummary {
  readonly mergeAllowed: false;
  readonly productionDeployAllowed: false;
  readonly forcePushAllowed: false;
  readonly branchDeletionAllowed: false;
  readonly connectorContentReadable: false;
  readonly connectorActionExecutable: false;
  readonly connectorCredentialsStored: false;
}

export function defaultRuntimePermissionSummary(): RuntimePermissionSummary {
  return {
    mergeAllowed: false,
    productionDeployAllowed: false,
    forcePushAllowed: false,
    branchDeletionAllowed: false,
    connectorContentReadable: false,
    connectorActionExecutable: false,
    connectorCredentialsStored: false,
  };
}

/** Operations that are safe to run in parallel across future agent lanes. Documentation only. */
export const PARALLEL_SAFE_OPERATIONS = [
  "dashboard reads",
  "snapshot reads",
  "evidence reads",
  "read-only reconciliation checks",
  "documentation generation",
  "test generation",
  "security analysis",
] as const;

/** Operations that must remain sequential-only on the single protected lane. Documentation only. */
export const SEQUENTIAL_ONLY_OPERATIONS = [
  "runtime mutation",
  "checkpoint writes",
  "approval consumption",
  "capability invocation",
  "connector action",
  "reconciliation resolution",
  "GitHub mutation",
  "merge",
  "deployment",
  "secret or permission changes",
] as const;

export type { Capability, RuntimeStatus, WorkflowState };
