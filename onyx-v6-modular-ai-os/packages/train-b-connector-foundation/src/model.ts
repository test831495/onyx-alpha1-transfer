import type { CapabilityDefinition, CapabilityOperation } from "@onyx/train-b-capability-foundation";

export const CONNECTOR_LIFECYCLE_STATES = ["DECLARED", "CONFIGURED", "DISABLED", "ENABLED", "DEGRADED", "EXPIRED", "REVOKED", "QUARANTINED", "REMOVED", "UNKNOWN"] as const;
export type ConnectorLifecycleState = (typeof CONNECTOR_LIFECYCLE_STATES)[number];
export const CONNECTOR_HEALTH_STATES = ["CONNECTED", "DISCONNECTED", "DEGRADED", "EXPIRED", "RATE_LIMITED", "PERMISSION_REDUCED", "DISABLED", "REVOKED", "QUARANTINED", "UNKNOWN"] as const;
export type ConnectorHealthState = (typeof CONNECTOR_HEALTH_STATES)[number];
export const ACCOUNT_LIFECYCLE_STATES = ["DECLARED", "LINKED", "DISABLED", "EXPIRED", "REVOKED", "REMOVED", "UNKNOWN"] as const;
export type AccountLifecycleState = (typeof ACCOUNT_LIFECYCLE_STATES)[number];
export const COST_DISPOSITIONS = ["WITHIN_BUDGET", "REQUIRES_APPROVAL", "BUDGET_EXCEEDED", "COST_UNKNOWN", "COST_EVIDENCE_EXPIRED", "NOT_APPLICABLE"] as const;
export type CostDisposition = (typeof COST_DISPOSITIONS)[number];
export const ROLLBACK_DISPOSITIONS = ["ROLLBACK_READY", "ROLLBACK_BLOCKED", "REVOCATION_REQUIRED", "REAUTHORIZATION_REQUIRED", "MANUAL_OWNER_DECISION_REQUIRED", "NOT_ASSESSABLE"] as const;
export type RollbackDisposition = (typeof ROLLBACK_DISPOSITIONS)[number];
export type ConnectorId = string;
export type ConnectorAccountId = string;
export type VaultReferenceId = string;
export const MAX_ATTRIBUTION_EVIDENCE_REFERENCES = 64;
export const MAX_EVIDENCE_REFERENCE_LENGTH = 256;
export const MAX_VALIDATION_DEPTH = 8;
export const MAX_VALIDATION_KEYS = 512;
export const MAX_VALIDATION_ARRAY_ELEMENTS = 128;
export interface CapabilityBinding { readonly capabilityId: string; readonly operations: readonly CapabilityOperation[]; readonly permissionReferences: readonly string[]; readonly attributionRequired: boolean; readonly freshnessRequirement: string; readonly costClass: string; }
export interface AccountConnectorBinding { readonly connectorId: ConnectorId; readonly accountId: ConnectorAccountId; readonly capabilityIds: readonly string[]; }
export interface ConnectorRegistration { readonly id: ConnectorId; readonly type: string; readonly lifecycleState: ConnectorLifecycleState; readonly adapterReference: string; readonly requiresAccount: boolean; readonly requiresCredential: boolean; readonly bindings: readonly CapabilityBinding[]; readonly maxAccounts?: number; }
export interface ConnectorRegistrySnapshot { readonly entries: readonly ConnectorRegistration[]; readonly ids: readonly string[]; readonly byId: Readonly<Record<string, ConnectorRegistration>>; }
export interface AccountRegistration { readonly id: ConnectorAccountId; readonly accountReference: string; readonly lifecycleState: AccountLifecycleState; readonly connectorIds: readonly ConnectorId[]; readonly tenantReference?: string; readonly householdReference?: string; readonly membershipReference?: string; readonly vaultReferenceId?: VaultReferenceId; }
export interface AccountRegistrySnapshot { readonly entries: readonly AccountRegistration[]; readonly ids: readonly string[]; readonly byId: Readonly<Record<string, AccountRegistration>>; }
export interface ConnectorHealthFacts { readonly connectorId: ConnectorId; readonly observationTimeReference?: string; readonly lastSuccessfulRetrievalTimeReference?: string; readonly lastFailureTimeReference?: string; readonly consecutiveFailures?: number; readonly rateLimited?: boolean; readonly permissionReduced?: boolean; readonly credentialReferenceAvailable?: boolean; readonly lifecycleState: ConnectorLifecycleState; readonly adapterHealthReference?: string; readonly freshnessRequirement?: string; readonly freshnessObserved?: boolean; readonly evidenceReferences?: readonly string[]; readonly reasonCodes?: readonly string[]; }
export interface ConnectorHealthEvaluation { readonly connectorId: ConnectorId; readonly state: ConnectorHealthState; readonly reasonCodes: readonly string[]; readonly assessable: boolean; }
export interface ConnectorFreshnessEvaluation { readonly connectorId: ConnectorId; readonly state: "CURRENT" | "STALE" | "UNKNOWN" | "NOT_ASSESSABLE"; readonly assessable: boolean; readonly reasonCodes: readonly string[]; }
export interface ConnectorEligibilityEvaluation { readonly eligible: boolean; readonly reasons: readonly string[]; readonly health: ConnectorHealthEvaluation; readonly freshness: ConnectorFreshnessEvaluation; readonly capability?: CapabilityDefinition; }
export interface VaultReferenceMetadata { readonly id: VaultReferenceId; readonly purpose: string; readonly credentialClass: string; readonly accountReference?: string; readonly connectorReference?: string; readonly createdTimeReference?: string; readonly rotatedTimeReference?: string; readonly expiryTimeReference?: string; readonly lifecycleState: string; readonly scopeReference?: string; readonly evidenceReference?: string; }
export interface SourceAttributionRuntime { readonly sourceType: string; readonly connectorId: ConnectorId; readonly accountReference: string; readonly adapterReference: string; readonly providerRecordReference: string; readonly observationTimeReference: string; readonly freshnessState: string; readonly evidenceReferences: readonly string[]; readonly partial: boolean; readonly conflicting: boolean; readonly complete: boolean; }
export interface CostEvidence { readonly connectorId: ConnectorId; readonly unitReference: string; readonly budgetScopeReference: string; readonly freshnessState: "CURRENT" | "EXPIRED" | "UNKNOWN"; readonly disposition: CostDisposition; readonly amountReference?: string; readonly evidenceReference?: string; }
export interface RecoveryPlan { readonly connectorId: ConnectorId; readonly accountId?: ConnectorAccountId; readonly steps: readonly string[]; readonly gaps: readonly string[]; readonly externalEffectsUnknown: boolean; readonly disposition: RollbackDisposition; }
export interface RuntimeState { readonly connectorId: ConnectorId; readonly state: ConnectorLifecycleState; readonly eligibleCapabilityIds: readonly string[]; readonly reasons: readonly string[]; }