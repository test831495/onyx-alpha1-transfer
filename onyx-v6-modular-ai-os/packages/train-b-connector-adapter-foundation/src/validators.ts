import {
  ADAPTER_OPERATIONS,
  ADAPTER_ERROR_CODES,
  ADAPTER_BOUNDS,
  ADAPTER_RUNTIME_FRESHNESS_STATES,
  ADAPTER_RUNTIME_HEALTH_STATES,
  ADAPTER_RUNTIME_RATE_LIMIT_STATES,
  type AdapterOperationRequest,
  type AdapterRegistration,
  type AdapterResult,
  type AdapterCursorBinding,
  type NormalizedAdapterRecord,
} from "./model.js";
import type { OAuthAuthorizationRequestReference, OAuthCallbackRequest, OAuthAuthorizationResult } from "./oauth.js";

const SECRET_KEY_PATTERN = /(secret|token|password|cookie|private.?key|authorization|credential|access.?key)/i;
const MAX_REFERENCE_LENGTH = ADAPTER_BOUNDS.referenceMaxLength;

function boundedReference(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_REFERENCE_LENGTH;
}

function boundedString(value: unknown, maximum: number, required = true): value is string {
  return typeof value === "string" && (!required || value.length > 0) && value.length <= maximum;
}

function boundedNumber(value: unknown, maximum: number, integer = false): value is number {
  return typeof value === "number" && Number.isFinite(value) && (!integer || Number.isInteger(value)) && value >= 0 && value <= maximum;
}

function validateStrictBoolean(record: Readonly<Record<string, unknown>>, fieldName: string, errors: string[]): boolean {
  if (typeof record[fieldName] !== "boolean") {
    errors.push("OAuth status field must be boolean");
    return false;
  }
  return true;
}

function boundedCollection(value: unknown, maximum: number, member: (item: unknown) => boolean): value is readonly unknown[] {
  return Array.isArray(value) && value.length <= maximum && value.every(member);
}

function boundedOptionalReference(value: unknown): boolean {
  return value === undefined || boundedReference(value as string);
}

function validNormalizedRecord(value: unknown): boolean {
  if (!isRecord(value) || !boundedString(value.recordReference, MAX_REFERENCE_LENGTH) || !boundedString(value.dataClass, ADAPTER_BOUNDS.stringValueMaxLength) || !boundedString(value.observedTimeReference, MAX_REFERENCE_LENGTH)) return false;
  if (!boundedCollection(value.fields, ADAPTER_BOUNDS.fieldCountMax, (field) => isRecord(field) && boundedString(field.key, ADAPTER_BOUNDS.fieldKeyMaxLength) && !SECRET_KEY_PATTERN.test(field.key) && isScalar(field.value) && (typeof field.value !== "string" || field.value.length <= ADAPTER_BOUNDS.stringValueMaxLength))) return false;
  return true;
}

export function validateAdapterRegistration(registration: AdapterRegistration): readonly string[] {
  const errors: string[] = [];
  if (!boundedReference(registration.metadata.adapterId) || registration.metadata.adapterId.length > ADAPTER_BOUNDS.adapterIdMaxLength) errors.push("adapter metadata is incomplete");
  if (!boundedReference(registration.metadata.version) || registration.metadata.version.length > ADAPTER_BOUNDS.versionMaxLength) errors.push("adapter version is invalid");
  if (!boundedReference(registration.metadata.providerMetadataReference) || registration.metadata.providerMetadataReference.length > ADAPTER_BOUNDS.providerMetadataReferenceMaxLength) errors.push("provider metadata reference is required");
  if (registration.metadata.nonAuthorizing !== true) errors.push("adapter must be non-authorizing");
  if (registration.enabled) errors.push("adapter registration cannot activate an adapter");
  if (!boundedCollection(registration.capabilities, ADAPTER_BOUNDS.capabilityCountMax, (value) => typeof value === "object" && value !== null)) errors.push("capability count exceeds the bounded range");
  if (!Array.isArray(registration.capabilities)) return Object.freeze(errors);
  for (const capability of registration.capabilities) {
    if (!boundedString(capability.capabilityId, MAX_REFERENCE_LENGTH) || !boundedString(capability.permissionReference, MAX_REFERENCE_LENGTH) || !boundedString(capability.dataClass, ADAPTER_BOUNDS.stringValueMaxLength) || !boundedString(capability.freshnessRequirement, ADAPTER_BOUNDS.stringValueMaxLength) || !boundedString(capability.costClass, ADAPTER_BOUNDS.stringValueMaxLength)) errors.push("capability advertisement is incomplete");
    if (!Array.isArray(capability.operations) || capability.operations.length > ADAPTER_BOUNDS.operationCountMax || capability.operations.some((operation: unknown) => !ADAPTER_OPERATIONS.includes(operation as typeof ADAPTER_OPERATIONS[number]))) errors.push("capability contains an unsupported operation");
  }
  return Object.freeze(errors);
}

export const validateAdapterConfiguration = validateAdapterRegistration;

export function validateAdapterRequest(request: AdapterOperationRequest): readonly string[] {
  const errors: string[] = [];
  if (!ADAPTER_OPERATIONS.includes(request.operation)) errors.push("operation is unsupported");
  if (!boundedReference(request.context.connectorId) || !boundedReference(request.context.accountScopeReference) || !boundedReference(request.context.purposeReference)) errors.push("connector, account scope, and purpose references are required");
  if (!boundedReference(request.context.trustedTimeReference)) errors.push("trusted time reference is required");
  if (request.pageSize !== undefined && (!Number.isInteger(request.pageSize) || request.pageSize < 1 || request.pageSize > ADAPTER_BOUNDS.pageSizeMax)) errors.push("page size exceeds the bounded range");
  if (request.context.vaultReferenceId !== undefined && !boundedReference(request.context.vaultReferenceId)) errors.push("vault reference is invalid");
  if (request.context.deadlineReference !== undefined && !boundedReference(request.context.deadlineReference)) errors.push("deadline reference is invalid");
  if (request.context.cancellationReference !== undefined && !boundedReference(request.context.cancellationReference)) errors.push("cancellation reference is invalid");
  if (request.context.idempotencyKey !== undefined && !boundedReference(request.context.idempotencyKey)) errors.push("idempotency reference is invalid");
  if (!boundedOptionalReference(request.capabilityId) || !boundedOptionalReference(request.queryReference) || !boundedOptionalReference(request.itemReference) || !boundedOptionalReference(request.cursor)) errors.push("optional request references are invalid");
  if (request.cursor !== undefined && request.cursor.length > ADAPTER_BOUNDS.cursorMaxLength) errors.push("cursor exceeds the bounded range");
  if (request.operation === "SEARCH" && !request.queryReference) errors.push("search requires a query reference");
  if (request.operation === "GET_BY_ID" && !request.itemReference) errors.push("get by id requires an item reference");
  return Object.freeze(errors);
}

export function normalizeAdapterRecord(input: unknown, observedTimeReference: string): NormalizedAdapterRecord {
  if (!isRecord(input) || !boundedReference(input.recordReference) || !boundedString(input.dataClass, ADAPTER_BOUNDS.stringValueMaxLength) || !boundedReference(observedTimeReference)) throw new Error("PAYLOAD_INVALID");
  if (!Array.isArray(input.fields) || input.fields.length > ADAPTER_BOUNDS.fieldCountMax) throw new Error("PAYLOAD_INVALID");
  const fields = input.fields.map((field) => {
    if (!isRecord(field) || typeof field.key !== "string" || field.key.length === 0 || field.key.length > ADAPTER_BOUNDS.fieldKeyMaxLength || SECRET_KEY_PATTERN.test(field.key) || !isScalar(field.value) || typeof field.value === "string" && field.value.length > ADAPTER_BOUNDS.stringValueMaxLength) throw new Error("PAYLOAD_INVALID");
    return Object.freeze({ key: field.key, value: field.value });
  });
  return Object.freeze({ recordReference: input.recordReference, fields: Object.freeze(fields), dataClass: input.dataClass, observedTimeReference });
}

export function validateAdapterResult(result: AdapterResult, expectedAdapterReference?: string, expectedOperation?: AdapterOperationRequest["operation"]): readonly string[] {
  const errors: string[] = [];
  if (result.nonAuthorizing !== true || result.receipt.nonAuthorizing !== true) errors.push("result must be non-authorizing");
  if (!boundedString(result.adapterReference, MAX_REFERENCE_LENGTH) || !boundedString(result.connectorId, MAX_REFERENCE_LENGTH) || !boundedString(result.accountScopeReference, MAX_REFERENCE_LENGTH)) errors.push("result attribution boundary is incomplete");
  if (expectedAdapterReference !== undefined && result.adapterReference !== expectedAdapterReference) errors.push("adapter reference mismatch");
  if (expectedOperation !== undefined && result.operation !== expectedOperation) errors.push("result operation mismatch");
  if (result.receipt.operation !== result.operation) errors.push("receipt operation mismatch");
  if (result.page && !result.attribution) errors.push("source attribution is required for page results");
  if (result.error && !ADAPTER_ERROR_CODES.includes(result.error.code)) errors.push("error code is not normalized");
  if (result.error && result.error.safe !== true) errors.push("error is not marked safe");
  if (result.error && result.error.diagnosticReference !== undefined && !boundedReference(result.error.diagnosticReference)) errors.push("result references are invalid");
  if (result.page?.nextCursor !== undefined && !boundedReference(result.page.nextCursor)) errors.push("cursor is invalid");
  if (result.page && (!boundedCollection(result.page.items, ADAPTER_BOUNDS.normalizedRecordCountMax, validNormalizedRecord) || result.page.pageNumber !== undefined && (!Number.isInteger(result.page.pageNumber) || result.page.pageNumber < 1 || result.page.pageNumber > ADAPTER_BOUNDS.maximumPages))) errors.push("page exceeds the bounded range");
  if (result.attribution && result.attribution.evidenceReferences.length > ADAPTER_BOUNDS.evidenceReferenceCountMax) errors.push("evidence references exceed the bounded range");
  if (result.attribution && (!boundedString(result.attribution.connectorId, MAX_REFERENCE_LENGTH) || !boundedString(result.attribution.accountScopeReference, MAX_REFERENCE_LENGTH) || !boundedString(result.attribution.adapterReference, MAX_REFERENCE_LENGTH) || !boundedString(result.attribution.providerRecordReference, MAX_REFERENCE_LENGTH) || !boundedString(result.attribution.observationTimeReference, MAX_REFERENCE_LENGTH) || !boundedCollection(result.attribution.evidenceReferences, ADAPTER_BOUNDS.evidenceReferenceCountMax, (value) => boundedString(value, MAX_REFERENCE_LENGTH)))) errors.push("attribution references are invalid");
  if (result.proposal && result.proposal.obligations.length > ADAPTER_BOUNDS.recoveryObligationCountMax) errors.push("proposal obligations exceed the bounded range");
  if (result.proposal && (!boundedCollection(result.proposal.obligations, ADAPTER_BOUNDS.recoveryObligationCountMax, (value) => boundedString(value, ADAPTER_BOUNDS.stringValueMaxLength)))) errors.push("proposal obligations are invalid");
  if (!boundedReference(result.receipt.requestIdReference) || result.receipt.requestIdReference.length > ADAPTER_BOUNDS.receiptReferenceMaxLength) errors.push("receipt reference is invalid");
  if (result.usage && (!boundedOptionalReference(result.usage.requestCountReference) || !boundedOptionalReference(result.usage.amountReference) || !boundedNumber(result.usage.rateLimitValue, ADAPTER_BOUNDS.rateLimitValueMax) && result.usage.rateLimitValue !== undefined || !boundedNumber(result.usage.quotaValue, ADAPTER_BOUNDS.quotaValueMax) && result.usage.quotaValue !== undefined || !boundedNumber(result.usage.usageValue, ADAPTER_BOUNDS.usageValueMax) && result.usage.usageValue !== undefined || !boundedNumber(result.usage.costValue, ADAPTER_BOUNDS.costValueMax) && result.usage.costValue !== undefined || result.usage.pricingFreshnessReference !== undefined && !boundedReference(result.usage.pricingFreshnessReference) || result.usage.budgetCeilingReference !== undefined && !boundedReference(result.usage.budgetCeilingReference))) errors.push("usage projection is invalid");
  return Object.freeze(errors);
}

export function validateCursorBinding(binding: AdapterCursorBinding, request: AdapterOperationRequest): readonly string[] {
  const errors: string[] = [];
  if (!boundedReference(binding.cursor) || binding.cursor.length > ADAPTER_BOUNDS.cursorMaxLength) errors.push("cursor is invalid");
  if (binding.connectorId !== request.context.connectorId) errors.push("cursor connector binding mismatch");
  if (binding.accountScopeReference !== request.context.accountScopeReference) errors.push("cursor account binding mismatch");
  if (!boundedReference(binding.requestReference)) errors.push("cursor request binding is invalid");
  if (!Number.isInteger(binding.pageNumber) || binding.pageNumber < 1 || binding.pageNumber > ADAPTER_BOUNDS.maximumPages) errors.push("cursor page is invalid");
  return Object.freeze(errors);
}

export function detectPaginationLoop(cursors: readonly string[]): boolean {
  return cursors.length > ADAPTER_BOUNDS.visitedCursorCountMax || new Set(cursors).size !== cursors.length;
}

export function validateRuntimeProjection(projection: { readonly health: string; readonly freshness: string; readonly rateLimitState: string }): readonly string[] {
  const errors: string[] = [];
  if (!ADAPTER_RUNTIME_HEALTH_STATES.includes(projection.health as typeof ADAPTER_RUNTIME_HEALTH_STATES[number]) || !ADAPTER_RUNTIME_FRESHNESS_STATES.includes(projection.freshness as typeof ADAPTER_RUNTIME_FRESHNESS_STATES[number]) || !ADAPTER_RUNTIME_RATE_LIMIT_STATES.includes(projection.rateLimitState as typeof ADAPTER_RUNTIME_RATE_LIMIT_STATES[number])) errors.push("runtime projection vocabulary is invalid");
  return Object.freeze(errors);
}

export function validateOAuthAuthorizationRequest(request: OAuthAuthorizationRequestReference): readonly string[] {
  const errors: string[] = [];
  if (!boundedReference(request.authorizationReference) || !boundedReference(request.accountScopeReference) || !boundedReference(request.sessionReference) || !boundedReference(request.purposeReference)) errors.push("OAuth binding references are incomplete");
  if (request.pkce.required !== true || !boundedReference(request.pkce.challengeReference)) errors.push("PKCE contract is invalid");
  if (!boundedReference(request.stateReference) || !boundedReference(request.redirectUriAllowlistReference)) errors.push("OAuth state or redirect allowlist is invalid");
  if (!boundedOptionalReference(request.nonceReference)) errors.push("OAuth optional reference is invalid");
  if (!boundedCollection(request.requestedScopes, ADAPTER_BOUNDS.scopeCountMax, (value) => boundedString(value, ADAPTER_BOUNDS.scopeStringMaxLength))) errors.push("requested scopes are invalid");
  if (request.nonAuthorizing !== true) errors.push("OAuth request must be non-authorizing");
  return Object.freeze(errors);
}

export function validateOAuthCallback(request: OAuthCallbackRequest): readonly string[] {
  const errors: string[] = [];
  if (!boundedReference(request.callbackReference) || !boundedReference(request.authorizationReference)) errors.push("callback references are incomplete");
  if (!boundedReference(request.accountScopeReference) || !boundedReference(request.sessionReference) || !boundedReference(request.purposeReference)) errors.push("callback binding is incomplete");
  if (!boundedReference(request.stateReference) || !boundedReference(request.verifierReference) || !boundedReference(request.redirectUriAllowlistReference)) errors.push("callback validation references are incomplete");
  if (!boundedOptionalReference(request.authorizationResultReference)) errors.push("callback optional reference is invalid");
  return Object.freeze(errors);
}

export function validateOAuthResult(result: OAuthAuthorizationResult): readonly string[] {
  const errors: string[] = [];
  const resultRecord = result as unknown as Readonly<Record<string, unknown>>;
  const statusesValid = [
    "reauthorizationRequired",
    "revoked",
    "consentWithdrawn",
    "authenticationFailed",
    "scopeEscalated",
  ].every((fieldName) => validateStrictBoolean(resultRecord, fieldName, errors));
  if (!boundedReference(result.resultReference)) errors.push("authorization result reference is invalid");
  if (!boundedCollection(result.grantedScopes, ADAPTER_BOUNDS.scopeCountMax, (value) => boundedString(value, ADAPTER_BOUNDS.scopeStringMaxLength))) errors.push("granted scopes are invalid");
  if (statusesValid && result.scopeEscalated === true && result.grantedScopes.length > 0) errors.push("scope escalation must fail closed");
  if (result.credentialReference !== undefined && !boundedReference(result.credentialReference)) errors.push("credential reference is invalid");
  if (!boundedOptionalReference(result.expiresAtReference)) errors.push("authorization result reference is invalid");
  if (result.nonAuthorizing !== true) errors.push("OAuth result must be non-authorizing");
  return Object.freeze(errors);
}

function isScalar(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
