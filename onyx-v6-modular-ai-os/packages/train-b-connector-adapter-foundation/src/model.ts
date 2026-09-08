import type {
  ConnectorAccountId,
  ConnectorId,
  VaultReferenceId,
} from "@onyx/train-b-connector-foundation";

export const ADAPTER_OPERATIONS = [
  "DISCOVER_CAPABILITIES",
  "VALIDATE_CONFIGURATION",
  "VALIDATE_ACCOUNT_BINDING",
  "PROJECT_HEALTH",
  "PROJECT_FRESHNESS",
  "SEARCH",
  "LIST",
  "GET_BY_ID",
  "GET_CHANGES",
  "GET_QUOTA",
  "GET_COST_EVIDENCE",
  "CANCEL",
  "DISCONNECT_PROPOSAL",
  "RECOVERY_PROPOSAL",
] as const;

export type AdapterOperation = (typeof ADAPTER_OPERATIONS)[number];

export const PROHIBITED_INITIAL_OPERATIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "SEND",
  "SHARE",
  "DEPLOY",
  "MERGE",
  "CHANGE_PERMISSION",
  "CHANGE_ROLE",
  "MODIFY_CONFIGURATION",
  "ROTATE_SECRET",
  "RESTORE",
  "EXECUTE_WORKFLOW",
] as const;

export type ProhibitedInitialOperation = (typeof PROHIBITED_INITIAL_OPERATIONS)[number];

export const ADAPTER_ERROR_CODES = [
  "INVALID_REQUEST",
  "INVALID_CONFIGURATION",
  "ACCOUNT_BINDING_INVALID",
  "VAULT_REFERENCE_INVALID",
  "PERMISSION_REDUCED",
  "AUTHENTICATION_REQUIRED",
  "REVOKED",
  "RATE_LIMITED",
  "QUOTA_UNKNOWN",
  "COST_UNKNOWN",
  "SOURCE_UNAVAILABLE",
  "SOURCE_STALE",
  "PARTIAL_RESULT",
  "CANCELLED",
  "DEADLINE_EXCEEDED",
  "PAYLOAD_INVALID",
  "CURSOR_INVALID",
  "RETRYABLE_FAILURE",
  "NON_RETRYABLE_FAILURE",
  "UNSUPPORTED_OPERATION",
] as const;

export type AdapterErrorCode = (typeof ADAPTER_ERROR_CODES)[number];

export type AdapterScalar = string | number | boolean | null;

export const ADAPTER_RUNTIME_HEALTH_STATES = ["HEALTHY", "DEGRADED", "UNAVAILABLE", "UNKNOWN"] as const;
export const ADAPTER_RUNTIME_FRESHNESS_STATES = ["CURRENT", "STALE", "UNKNOWN", "NOT_ASSESSABLE"] as const;
export const ADAPTER_RUNTIME_RATE_LIMIT_STATES = ["AVAILABLE", "LIMITED", "EXHAUSTED", "UNKNOWN"] as const;

export const ADAPTER_BOUNDS = Object.freeze({
  adapterIdMaxLength: 128,
  versionMaxLength: 32,
  providerMetadataReferenceMaxLength: 256,
  capabilityCountMax: 32,
  operationCountMax: 16,
  referenceMaxLength: 256,
  normalizedRecordCountMax: 200,
  fieldCountMax: 64,
  fieldKeyMaxLength: 128,
  stringValueMaxLength: 512,
  evidenceReferenceCountMax: 64,
  pageSizeMax: 200,
  maximumPages: 100,
  visitedCursorCountMax: 100,
  cursorMaxLength: 256,
  errorReasonMaxLength: 256,
  receiptReferenceMaxLength: 256,
  recoveryObligationCountMax: 32,
  collectionCountMax: 64,
  scopeCountMax: 32,
  scopeStringMaxLength: 128,
  reasonCountMax: 32,
  rateLimitValueMax: 1000000000,
  quotaValueMax: 1000000000,
  usageValueMax: 1000000000,
  costValueMax: 1000000000,
} as const);

export interface AdapterMetadata {
  readonly adapterId: string;
  readonly version: string;
  readonly providerMetadataReference: string;
  readonly nonAuthorizing: true;
}

export interface AdapterCapabilityAdvertisement {
  readonly capabilityId: string;
  readonly operations: readonly AdapterOperation[];
  readonly permissionReference: string;
  readonly dataClass: string;
  readonly freshnessRequirement: string;
  readonly costClass: string;
}

export interface AdapterRegistration {
  readonly metadata: AdapterMetadata;
  readonly capabilities: readonly AdapterCapabilityAdvertisement[];
  readonly enabled: boolean;
}

export interface AdapterRequestContext {
  readonly connectorId: ConnectorId;
  readonly accountScopeReference: ConnectorAccountId;
  readonly vaultReferenceId?: VaultReferenceId;
  readonly purposeReference: string;
  readonly trustedTimeReference: string;
  readonly deadlineReference?: string;
  readonly cancellationReference?: string;
  readonly idempotencyKey?: string;
}

export interface AdapterCursorBinding {
  readonly cursor: string;
  readonly connectorId: ConnectorId;
  readonly accountScopeReference: ConnectorAccountId;
  readonly requestReference: string;
  readonly pageNumber: number;
}

export interface AdapterOperationRequest {
  readonly operation: AdapterOperation;
  readonly context: AdapterRequestContext;
  readonly capabilityId?: string;
  readonly queryReference?: string;
  readonly itemReference?: string;
  readonly cursor?: string;
  readonly pageSize?: number;
}

export interface NormalizedAdapterField {
  readonly key: string;
  readonly value: AdapterScalar;
}

export interface NormalizedAdapterRecord {
  readonly recordReference: string;
  readonly fields: readonly NormalizedAdapterField[];
  readonly dataClass: string;
  readonly observedTimeReference: string;
}

export interface AdapterAttribution {
  readonly connectorId: ConnectorId;
  readonly accountScopeReference: ConnectorAccountId;
  readonly adapterReference: string;
  readonly providerRecordReference: string;
  readonly observationTimeReference: string;
  readonly freshnessState: "CURRENT" | "STALE" | "UNKNOWN" | "NOT_ASSESSABLE";
  readonly evidenceReferences: readonly string[];
  readonly partial: boolean;
  readonly complete: boolean;
}

export interface AdapterPage {
  readonly items: readonly NormalizedAdapterRecord[];
  readonly nextCursor?: string;
  readonly complete: boolean;
  readonly pageNumber?: number;
}

export interface AdapterError {
  readonly code: AdapterErrorCode;
  readonly diagnosticReference?: string;
  readonly retryable: boolean;
  readonly safe: true;
}

export interface AdapterUsageProjection {
  readonly quotaState: "AVAILABLE" | "LIMITED" | "EXHAUSTED" | "UNKNOWN";
  readonly costState: "KNOWN" | "ESTIMATED" | "UNKNOWN" | "EXPIRED";
  readonly requestCountReference?: string;
  readonly amountReference?: string;
  readonly rateLimitValue?: number;
  readonly quotaValue?: number;
  readonly usageValue?: number;
  readonly costValue?: number;
  readonly pricingFreshnessReference?: string;
  readonly budgetCeilingReference?: string;
}

export interface AdapterReceipt {
  readonly requestIdReference: string;
  readonly operation: AdapterOperation;
  readonly completed: boolean;
  readonly cancelled: boolean;
  readonly partial: boolean;
  readonly nonAuthorizing: true;
}

export interface AdapterProposal {
  readonly kind: "DISCONNECT" | "RECOVERY" | "PROVIDER_EXIT";
  readonly obligations: readonly string[];
  readonly nonAuthorizing: true;
}

export interface AdapterResult {
  readonly operation: AdapterOperation;
  readonly adapterReference: string;
  readonly connectorId: string;
  readonly accountScopeReference: string;
  readonly attribution?: AdapterAttribution;
  readonly page?: AdapterPage;
  readonly usage?: AdapterUsageProjection;
  readonly error?: AdapterError;
  readonly proposal?: AdapterProposal;
  readonly unavailableSource?: boolean;
  readonly receipt: AdapterReceipt;
  readonly nonAuthorizing: true;
}

export interface AdapterRuntimeProjection {
  readonly health: (typeof ADAPTER_RUNTIME_HEALTH_STATES)[number];
  readonly freshness: (typeof ADAPTER_RUNTIME_FRESHNESS_STATES)[number];
  readonly rateLimitState: (typeof ADAPTER_RUNTIME_RATE_LIMIT_STATES)[number];
}

export interface ConnectorAdapter {
  readonly registration: AdapterRegistration;
  execute(request: AdapterOperationRequest): Promise<AdapterResult>;
}

export interface AdapterConformanceResult {
  readonly passed: boolean;
  readonly checks: readonly AdapterConformanceCheck[];
}

export interface AdapterConformanceCheck {
  readonly id: string;
  readonly passed: boolean;
  readonly reason?: string;
}
