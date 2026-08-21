import type { RuntimeSnapshot } from "@onyx/phase1a6-workflow-runtime";
import {
  AUTOMATION_RUNTIME_UI_CONTRACT_VERSION,
  CONNECTOR_PROVIDERS,
  PRESENCE_MODES,
  defaultRuntimePermissionSummary,
  type Capability,
  type ConnectorProvider,
  type ConnectorScopeProjection,
  type RuntimeBudgetProjection,
  type RuntimeIdentityProjection,
  type RuntimePermissionSummary,
  type RuntimeStatus,
  type SharedTaskReference,
  type WorkflowState,
} from "./automationRuntimeContracts";

/**
 * Read-only Automation Center runtime projection. This is the single UI-facing
 * combination of the reused Phase 1A.6 `RuntimeSnapshot` with additive identity,
 * connector, permission, and budget metadata. It never re-derives workflow state
 * or runtime status; both are reused verbatim from the Phase 1A.6 snapshot.
 */
export interface AutomationRuntimeProjection {
  readonly uiContractVersion: typeof AUTOMATION_RUNTIME_UI_CONTRACT_VERSION;
  readonly runtimeContractVersion: string;
  readonly repository: string;
  readonly scopeHash: string;
  readonly currentState: WorkflowState;
  readonly runtimeStatus: RuntimeStatus;
  readonly currentCapability: Capability | null;
  readonly completedCapabilities: readonly Capability[];
  readonly pendingCapabilities: readonly Capability[];
  readonly checkpointCount: number;
  readonly latestCheckpointDigest: string | null;
  readonly evidenceCount: number;
  readonly latestEvidenceSequence: number | null;
  readonly recoveryAvailable: boolean;
  readonly reconciliationRequired: boolean;
  readonly pauseAvailable: boolean;
  readonly resumeAvailable: boolean;
  readonly cancelAvailable: boolean;
  readonly executionLaneLimit: number;
  readonly identity: RuntimeIdentityProjection;
  readonly connectors: readonly ConnectorScopeProjection[];
  readonly permissions: RuntimePermissionSummary;
  readonly budget: RuntimeBudgetProjection;
  readonly modelRoutingClass: string;
  readonly voiceMetadataProviderNeutralReady: boolean;
  readonly mergeAllowed: false;
  readonly productionDeployAllowed: false;
  readonly forcePushAllowed: false;
  readonly branchDeletionAllowed: false;
  readonly updatedAt: string;
  readonly noLiveWorkflowExecuting: true;
}

export interface AutomationRuntimeProjectionInput {
  snapshot: RuntimeSnapshot;
  identity: RuntimeIdentityProjection;
  connectors?: readonly ConnectorScopeProjection[];
  permissions?: RuntimePermissionSummary;
  budget?: RuntimeBudgetProjection;
  modelRoutingClass?: string;
  voiceMetadataProviderNeutralReady?: boolean;
}

/** Redacts every shared-task reference that lacks an explicit, checked permission grant. */
export function redactSharedTaskReferences(references: readonly SharedTaskReference[] | undefined): readonly SharedTaskReference[] {
  if (!references) return [];
  return references
    .filter((reference) => reference.permissionGranted)
    .map((reference) => Object.freeze({ ...reference }));
}

function assertValidPresenceMode(identity: RuntimeIdentityProjection): void {
  if (!PRESENCE_MODES.includes(identity.initiatingPresenceMode)) {
    throw new Error(`Unsupported presence mode: ${identity.initiatingPresenceMode}`);
  }
}

function assertValidConnectorProvider(provider: ConnectorProvider): void {
  if (!CONNECTOR_PROVIDERS.includes(provider)) {
    throw new Error(`Unsupported connector provider: ${provider}`);
  }
}

/**
 * Builds the immutable Automation Center runtime projection. Never reads
 * connector content, never executes a connector action, never stores connector
 * credentials, and never merges multiple connector-account identities.
 */
export function buildAutomationRuntimeProjection(input: AutomationRuntimeProjectionInput): AutomationRuntimeProjection {
  assertValidPresenceMode(input.identity);
  const connectors = input.connectors ?? [];
  for (const connector of connectors) assertValidConnectorProvider(connector.connectorProvider);

  const accountKeys = connectors.map((connector) => `${connector.connectorProvider}:${connector.connectorAccountId}`);
  if (new Set(accountKeys).size !== accountKeys.length) {
    throw new Error("Connector account identities must remain isolated and must not be merged.");
  }

  const identity: RuntimeIdentityProjection = Object.freeze({
    ...input.identity,
    assignedAgentIds: input.identity.assignedAgentIds ? [...input.identity.assignedAgentIds] : undefined,
    sharedTaskReferences: redactSharedTaskReferences(input.identity.sharedTaskReferences),
  });

  const projection: AutomationRuntimeProjection = {
    uiContractVersion: AUTOMATION_RUNTIME_UI_CONTRACT_VERSION,
    runtimeContractVersion: input.snapshot.contractVersion,
    repository: input.snapshot.repository,
    scopeHash: input.snapshot.scopeHash,
    currentState: input.snapshot.currentWorkflowState,
    runtimeStatus: input.snapshot.currentStatus,
    currentCapability: input.snapshot.currentStep,
    completedCapabilities: [...input.snapshot.completedCapabilities],
    pendingCapabilities: [...input.snapshot.pendingCapabilities],
    checkpointCount: input.snapshot.checkpointCount,
    latestCheckpointDigest: input.snapshot.latestCheckpointDigest,
    evidenceCount: input.snapshot.evidenceCount,
    latestEvidenceSequence: input.snapshot.latestEvidenceSequence,
    recoveryAvailable: input.snapshot.recoveryAvailable,
    reconciliationRequired: input.snapshot.reconciliationRequired,
    pauseAvailable: input.snapshot.pauseAvailable,
    resumeAvailable: input.snapshot.currentStatus === "PAUSED",
    cancelAvailable: input.snapshot.cancelAvailable,
    executionLaneLimit: input.snapshot.laneLimit,
    identity,
    connectors: connectors.map((connector) => Object.freeze({ ...connector })),
    permissions: Object.freeze(input.permissions ?? defaultRuntimePermissionSummary()),
    budget: Object.freeze({ ...(input.budget ?? {}) }),
    modelRoutingClass: input.modelRoutingClass ?? input.budget?.modelRoutingClass ?? "provider-neutral-standard",
    voiceMetadataProviderNeutralReady: input.voiceMetadataProviderNeutralReady ?? true,
    mergeAllowed: false,
    productionDeployAllowed: false,
    forcePushAllowed: false,
    branchDeletionAllowed: false,
    updatedAt: input.snapshot.updatedAt,
    noLiveWorkflowExecuting: true,
  };

  return Object.freeze(projection);
}
