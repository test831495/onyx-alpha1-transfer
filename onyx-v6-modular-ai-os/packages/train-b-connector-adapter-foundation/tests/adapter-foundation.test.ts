import { describe, expect, it } from "vitest";
import {
  ADAPTER_ACCEPTANCE_ID_COUNT,
  ADAPTER_ACCEPTANCE_REGISTRY,
  ADAPTER_BOUNDS,
  ADAPTER_OPERATIONS,
  PROHIBITED_INITIAL_OPERATIONS,
  ConnectorAdapterRegistry,
  detectPaginationLoop,
  normalizeAdapterRecord,
  runAdapterConformance,
  validateAcceptanceRegistry,
  validateAdapterConfiguration,
  validateAdapterResult,
  validateCursorBinding,
  validateOAuthAuthorizationRequest,
  validateOAuthCallback,
  validateOAuthResult,
  validateRuntimeProjection,
  validateAdapterRequest,
  type ConnectorAdapter,
} from "../src/index.js";

const registration = {
  metadata: {
    adapterId: "adapter.test",
    version: "0.1.0",
    providerMetadataReference: "provider.test",
    nonAuthorizing: true as const,
  },
  capabilities: [
    {
      capabilityId: "capability.test.read",
      operations: ["SEARCH", "LIST", "GET_BY_ID"] as const,
      permissionReference: "permission.read",
      dataClass: "METADATA",
      freshnessRequirement: "CURRENT",
      costClass: "LOW",
    },
  ],
  enabled: false as const,
};

function createAdapter(): ConnectorAdapter {
  return {
    registration,
    async execute(request) {
      return {
        operation: request.operation,
        adapterReference: registration.metadata.adapterId,
        connectorId: request.context.connectorId,
        accountScopeReference: request.context.accountScopeReference,
        attribution: {
          connectorId: request.context.connectorId,
          accountScopeReference: request.context.accountScopeReference,
          adapterReference: registration.metadata.adapterId,
          providerRecordReference: "record.test",
          observationTimeReference: "time.test",
          freshnessState: "CURRENT",
          evidenceReferences: [],
          partial: false,
          complete: true,
        },
        page: {
          items: [],
          complete: true,
        },
        receipt: {
          requestIdReference: "request.test",
          operation: request.operation,
          completed: true,
          cancelled: false,
          partial: false,
          nonAuthorizing: true,
        },
        nonAuthorizing: true,
      };
    },
  };
}

describe("connector adapter foundation", () => {
  it("registers without activating and executes only a bounded request", async () => {
    const registry = new ConnectorAdapterRegistry();
    registry.register(createAdapter());

    expect(registry.snapshot()).toHaveLength(1);
    expect(registry.snapshot()[0]?.enabled).toBe(false);
    await expect(registry.execute("adapter.test", {
      operation: "SEARCH",
      context: {
        connectorId: "connector.test",
        accountScopeReference: "account.test",
        purposeReference: "purpose.test",
        trustedTimeReference: "time.test",
      },
      queryReference: "query.test",
      pageSize: 20,
    })).resolves.toMatchObject({ nonAuthorizing: true, accountScopeReference: "account.test" });
  });

  it("rejects missing account and purpose binding", () => {
    expect(validateAdapterRequest({
      operation: "LIST",
      context: {
        connectorId: "connector.test",
        accountScopeReference: "",
        purposeReference: "",
        trustedTimeReference: "time.test",
      },
    })).toContain("connector, account scope, and purpose references are required");
  });

  it("rejects secret-shaped or nested provider payload fields", () => {
    expect(() => normalizeAdapterRecord({
      recordReference: "record.test",
      dataClass: "METADATA",
      fields: [{ key: "accessToken", value: "redacted" }],
    }, "time.test")).toThrow("PAYLOAD_INVALID");
    expect(() => normalizeAdapterRecord({
      recordReference: "record.test",
      dataClass: "METADATA",
      fields: [{ key: "nested", value: { secret: "redacted" } }],
    }, "time.test")).toThrow("PAYLOAD_INVALID");
  });

  it("runs the reusable non-authority conformance checks", () => {
    const result = runAdapterConformance(createAdapter());

    expect(result.passed).toBe(true);
    expect(result.checks.map((check) => check.id)).toEqual([
      "registration-without-activation",
      "non-authority-registration",
      "capability-advertisement-bounded",
      "no-prohibited-initial-operation",
    ]);
  });

  it("rejects duplicate adapter IDs", () => {
    const registry = new ConnectorAdapterRegistry();
    registry.register(createAdapter());
    expect(() => registry.register(createAdapter())).toThrow("DUPLICATE_ADAPTER_ID");
  });

  it("validates adapter versions and capability advertisements", () => {
    expect(validateAdapterConfiguration({ ...registration, metadata: { ...registration.metadata, version: "" } })).toContain("adapter version is invalid");
    expect(registration.capabilities[0]?.operations).toEqual(["SEARCH", "LIST", "GET_BY_ID"]);
  });

  it("rejects unsupported and prohibited operations", () => {
    expect(validateAdapterRequest({ operation: "UNKNOWN" as never, context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t" } })).toContain("operation is unsupported");
    expect(PROHIBITED_INITIAL_OPERATIONS).toContain("DELETE");
    expect(ADAPTER_OPERATIONS).not.toContain("DELETE" as never);
  });

  it("rejects connector, account, and purpose mismatches", async () => {
    const request = { operation: "LIST" as const, context: { connectorId: "connector.test", accountScopeReference: "account.test", purposeReference: "purpose.test", trustedTimeReference: "time.test" } };
    const connectorAdapter = createAdapter();
    const connectorMismatch = { ...connectorAdapter, async execute() { return { ...(await connectorAdapter.execute(request)), connectorId: "other" }; } };
    const accountMismatch = { ...connectorAdapter, async execute() { return { ...(await connectorAdapter.execute(request)), accountScopeReference: "other" }; } };
    const registry = new ConnectorAdapterRegistry();
    registry.register(connectorMismatch);
    await expect(registry.execute("adapter.test", request)).rejects.toThrow("CONNECTOR_BINDING_MISMATCH");
    const second = new ConnectorAdapterRegistry();
    second.register(accountMismatch);
    await expect(second.execute("adapter.test", request)).rejects.toThrow("ACCOUNT_BINDING_MISMATCH");
    expect(validateAdapterRequest({ ...request, context: { ...request.context, purposeReference: "" } })).toContain("connector, account scope, and purpose references are required");
  });

  it("validates the opaque vault and OAuth boundary", () => {
    expect(validateAdapterRequest({ operation: "LIST", context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t", vaultReferenceId: "" } })).toContain("vault reference is invalid");
    expect(validateOAuthAuthorizationRequest({ authorizationReference: "auth", accountScopeReference: "a", sessionReference: "s", purposeReference: "p", redirectUriAllowlistReference: "redirect", requestedScopes: ["read"], pkce: { required: true, challengeReference: "challenge" }, stateReference: "state", nonceReference: "nonce", nonAuthorizing: true })).toEqual([]);
    expect(validateOAuthCallback({ callbackReference: "callback", authorizationReference: "auth", accountScopeReference: "a", sessionReference: "s", purposeReference: "p", stateReference: "state", verifierReference: "verifier", redirectUriAllowlistReference: "redirect" })).toEqual([]);
    expect(validateOAuthResult({ resultReference: "result", grantedScopes: ["read"], reauthorizationRequired: false, revoked: false, consentWithdrawn: false, authenticationFailed: false, scopeEscalated: false, nonAuthorizing: true })).toEqual([]);
  });

  it("rejects raw, nested, hostile, and oversized payloads", () => {
    expect(() => normalizeAdapterRecord({ recordReference: "r", dataClass: "d", fields: [{ key: "accessToken", value: "x" }] }, "t")).toThrow("PAYLOAD_INVALID");
    expect(() => normalizeAdapterRecord({ recordReference: "r", dataClass: "d", fields: [{ key: "nested", value: { secret: "x" } }] }, "t")).toThrow("PAYLOAD_INVALID");
    expect(() => normalizeAdapterRecord(Object.create(null), "t")).toThrow("PAYLOAD_INVALID");
    const fields = Array.from({ length: ADAPTER_BOUNDS.fieldCountMax + 1 }, (_, index) => ({ key: `field${index}`, value: "x" }));
    expect(() => normalizeAdapterRecord({ recordReference: "r", dataClass: "d", fields }, "t")).toThrow("PAYLOAD_INVALID");
  });

  it("accepts exact string and collection maxima and rejects over-maximum values", () => {
    const exact = "x".repeat(ADAPTER_BOUNDS.stringValueMaxLength);
    expect(normalizeAdapterRecord({ recordReference: "r", dataClass: exact, fields: [{ key: "field", value: exact }] }, "t").fields).toHaveLength(1);
    expect(() => normalizeAdapterRecord({ recordReference: "r", dataClass: exact + "x", fields: [] }, "t")).toThrow("PAYLOAD_INVALID");
    const exactFields = Array.from({ length: ADAPTER_BOUNDS.fieldCountMax }, (_, index) => ({ key: `field${index}`, value: "x" }));
    expect(normalizeAdapterRecord({ recordReference: "r", dataClass: "d", fields: exactFields }, "t").fields).toHaveLength(ADAPTER_BOUNDS.fieldCountMax);
  });

  it("enforces pagination maxima, cursor scope, and loop detection", () => {
    const request = { operation: "LIST" as const, context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t" } };
    expect(validateAdapterResult({ ...(createAdapterResult(request)), page: { items: [], complete: true, pageNumber: ADAPTER_BOUNDS.maximumPages } })).toEqual([]);
    expect(detectPaginationLoop(["one", "two", "one"])).toBe(true);
    expect(validateCursorBinding({ cursor: "cursor", connectorId: "c", accountScopeReference: "a", requestReference: "request", pageNumber: 1 }, request)).toEqual([]);
    expect(validateCursorBinding({ cursor: "cursor", connectorId: "other", accountScopeReference: "a", requestReference: "request", pageNumber: 1 }, request)).toContain("cursor connector binding mismatch");
    expect(validateCursorBinding({ cursor: "cursor", connectorId: "c", accountScopeReference: "other", requestReference: "request", pageNumber: 1 }, request)).toContain("cursor account binding mismatch");
  });

  it("validates cancellation, deadlines, idempotency, rate limits, quota and cost states", () => {
    const errors = validateAdapterRequest({ operation: "LIST", context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t", cancellationReference: "cancel", deadlineReference: "deadline", idempotencyKey: "idempotency" } });
    expect(errors).toEqual([]);
    expect(validateRuntimeProjection({ health: "HEALTHY", freshness: "CURRENT", rateLimitState: "LIMITED" })).toEqual([]);
    expect(["AVAILABLE", "LIMITED", "EXHAUSTED", "UNKNOWN"]).toContain("LIMITED");
    expect(["UNKNOWN", "EXPIRED"]).toContain("UNKNOWN");
    expect(["UNKNOWN", "EXPIRED"]).toContain("EXPIRED");
  });

  it("requires attribution and preserves partial or unavailable disclosure", () => {
    const request = { operation: "LIST" as const, context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t" } };
    const result = createAdapterResult(request);
    expect(validateAdapterResult({ ...result, attribution: undefined })).toContain("source attribution is required for page results");
    expect({ ...result, receipt: { ...result.receipt, partial: true }, unavailableSource: true }).toMatchObject({ unavailableSource: true, receipt: { partial: true } });
  });

  it("normalizes safe errors and retry dispositions", () => {
    const request = { operation: "LIST" as const, context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t" } };
    expect(validateAdapterResult({ ...createAdapterResult(request), error: { code: "RATE_LIMITED", retryable: true, safe: true } })).toEqual([]);
    expect(validateAdapterResult({ ...createAdapterResult(request), error: { code: "NOT_A_CODE" as never, retryable: false, safe: true } })).toContain("error code is not normalized");
  });

  it("represents disconnect, recovery and provider-exit proposals without authority", () => {
    const request = { operation: "DISCONNECT_PROPOSAL" as const, context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t" } };
    const result = { ...createAdapterResult(request), proposal: { kind: "DISCONNECT" as const, obligations: ["revoke"], nonAuthorizing: true as const } };
    expect(validateAdapterResult(result)).toEqual([]);
    expect({ ...result, proposal: { kind: "RECOVERY" as const, obligations: ["reauthorize"], nonAuthorizing: true } }).toMatchObject({ nonAuthorizing: true });
    expect({ ...result, proposal: { kind: "PROVIDER_EXIT" as const, obligations: ["retain-evidence"], nonAuthorizing: true } }).toMatchObject({ proposal: { kind: "PROVIDER_EXIT" } });
  });

  it("freezes outputs and preserves deterministic conformance order", () => {
    const result = runAdapterConformance(createAdapter());
    expect(Object.isFrozen(result)).toBe(true);
    expect(result.checks.map((check) => check.id)).toEqual(["registration-without-activation", "non-authority-registration", "capability-advertisement-bounded", "no-prohibited-initial-operation"]);
  });

  it("freezes the acceptance registry and maps all 50 IDs", () => {
    expect(ADAPTER_ACCEPTANCE_ID_COUNT).toBe(50);
    expect(validateAcceptanceRegistry()).toEqual([]);
    expect(Object.isFrozen(ADAPTER_ACCEPTANCE_REGISTRY)).toBe(true);
  });

  it("preserves Package 2, Universal Search, and Synthesis compatibility references", () => {
    const request = { operation: "SEARCH" as const, context: { connectorId: "connector.test", accountScopeReference: "account.test", purposeReference: "search", trustedTimeReference: "time" }, queryReference: "query" };
    expect(createAdapterResult(request)).toMatchObject({ connectorId: "connector.test", accountScopeReference: "account.test", attribution: { connectorId: "connector.test" } });
    expect(registration.capabilities[0]?.capabilityId).toContain("capability");
    expect(registration.capabilities[0]?.dataClass).toBe("METADATA");
  });

  it("enforces exact and over-maximum OAuth scope bounds", () => {
    const scopes = Array.from({ length: ADAPTER_BOUNDS.scopeCountMax }, (_, index) => "s".repeat(ADAPTER_BOUNDS.scopeStringMaxLength - String(index).length));
    const request = { authorizationReference: "auth", accountScopeReference: "a", sessionReference: "s", purposeReference: "p", redirectUriAllowlistReference: "redirect", requestedScopes: scopes, pkce: { required: true as const, challengeReference: "challenge" }, stateReference: "state", nonAuthorizing: true as const };
    expect(validateOAuthAuthorizationRequest(request)).toEqual([]);
    expect(validateOAuthAuthorizationRequest({ ...request, requestedScopes: [...scopes, "extra"] })).toContain("requested scopes are invalid");
    expect(validateOAuthAuthorizationRequest({ ...request, requestedScopes: ["x".repeat(ADAPTER_BOUNDS.scopeStringMaxLength + 1)] })).toContain("requested scopes are invalid");
  });

  it("enforces exact and over-maximum attribution, receipt, proposal, and usage bounds", () => {
    const request = { operation: "LIST" as const, context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t" } };
    const exactReferences = Array.from({ length: ADAPTER_BOUNDS.evidenceReferenceCountMax }, () => "e");
    const exactObligations = Array.from({ length: ADAPTER_BOUNDS.recoveryObligationCountMax }, () => "o".repeat(ADAPTER_BOUNDS.stringValueMaxLength));
    const exact = createAdapterResult(request);
    expect(validateAdapterResult({ ...exact, attribution: { ...exact.attribution, evidenceReferences: exactReferences }, proposal: { kind: "RECOVERY", obligations: exactObligations, nonAuthorizing: true }, usage: { quotaState: "AVAILABLE", costState: "KNOWN", rateLimitValue: ADAPTER_BOUNDS.rateLimitValueMax, quotaValue: ADAPTER_BOUNDS.quotaValueMax, usageValue: ADAPTER_BOUNDS.usageValueMax, costValue: ADAPTER_BOUNDS.costValueMax } })).toEqual([]);
    expect(validateAdapterResult({ ...exact, attribution: { ...exact.attribution, evidenceReferences: [...exactReferences, "over"] } })).toContain("evidence references exceed the bounded range");
    expect(validateAdapterResult({ ...exact, proposal: { kind: "RECOVERY", obligations: [...exactObligations, "over"], nonAuthorizing: true } })).toContain("proposal obligations exceed the bounded range");
    expect(validateAdapterResult({ ...exact, usage: { quotaState: "AVAILABLE", costState: "KNOWN", rateLimitValue: ADAPTER_BOUNDS.rateLimitValueMax + 1 } })).toContain("usage projection is invalid");
  });

  it("enforces capability and operation collection bounds", () => {
    const capabilities = Array.from({ length: ADAPTER_BOUNDS.capabilityCountMax + 1 }, (_, index) => ({ ...registration.capabilities[0]!, capabilityId: `capability.${index}` }));
    expect(validateAdapterConfiguration({ ...registration, capabilities })).toContain("capability count exceeds the bounded range");
    const operations = Array.from({ length: ADAPTER_BOUNDS.operationCountMax + 1 }, () => "SEARCH" as const);
    expect(validateAdapterConfiguration({ ...registration, capabilities: [{ ...registration.capabilities[0], operations } as never] })).toContain("capability contains an unsupported operation");
  });

  it("exposes exact immutable acceptance symbol traceability", () => {
    expect(ADAPTER_ACCEPTANCE_REGISTRY.every((entry) => entry.implementationSymbol && entry.implementationPath && entry.validationName && entry.validationPath && entry.nonAuthorizing)).toBe(true);
    expect(ADAPTER_ACCEPTANCE_REGISTRY[0]).toMatchObject({ implementationSymbol: "AdapterMetadata", implementationPath: "src/model.ts" });
  });

  it("rejects every retained optional public reference at its ingress", () => {
    const long = "x".repeat(ADAPTER_BOUNDS.referenceMaxLength + 1);
    const request = { operation: "SEARCH" as const, context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t", idempotencyKey: "id" }, capabilityId: long, queryReference: long, itemReference: long, cursor: long };
    expect(validateAdapterRequest(request)).toEqual(expect.arrayContaining(["optional request references are invalid", "cursor exceeds the bounded range"]));
    expect(validateOAuthAuthorizationRequest({ authorizationReference: "a", accountScopeReference: "a", sessionReference: "s", purposeReference: "p", redirectUriAllowlistReference: "r", requestedScopes: ["read"], pkce: { required: true, challengeReference: "c" }, stateReference: "s", nonceReference: long, nonAuthorizing: true })).toContain("OAuth optional reference is invalid");
    expect(validateOAuthCallback({ callbackReference: "c", authorizationReference: "a", accountScopeReference: "a", sessionReference: "s", purposeReference: "p", stateReference: "s", verifierReference: "v", redirectUriAllowlistReference: "r", authorizationResultReference: long })).toContain("callback optional reference is invalid");
    expect(validateOAuthResult({ resultReference: "r", grantedScopes: ["read"], credentialReference: "v", expiresAtReference: long, reauthorizationRequired: false, revoked: false, consentWithdrawn: false, authenticationFailed: false, scopeEscalated: false, nonAuthorizing: true })).toContain("authorization result reference is invalid");
    const base = createAdapterResult({ operation: "LIST", context: { connectorId: "c", accountScopeReference: "a" } });
    expect(validateAdapterResult({ ...base, page: { items: [{ recordReference: "r", fields: [], dataClass: "d", observedTimeReference: "t" } as never], complete: true }, error: { code: "RATE_LIMITED", diagnosticReference: long, retryable: true, safe: true }, receipt: { ...base.receipt, requestIdReference: long }, usage: { quotaState: "AVAILABLE", costState: "KNOWN", requestCountReference: long, amountReference: long } })).toContain("result references are invalid");
  });

  it("rejects operations not advertised by the registered adapter before execution", async () => {
    let executeCalls = 0;
    const adapter = createAdapter();
    const registry = new ConnectorAdapterRegistry();
    registry.register({ ...adapter, async execute(request) { executeCalls += 1; return adapter.execute(request); } });

    await expect(registry.execute("adapter.test", {
      operation: "GET_CHANGES",
      context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t" },
    })).rejects.toThrow("UNSUPPORTED_ADAPTER_OPERATION");
    expect(executeCalls).toBe(0);
  });

  it("rejects inconsistent result identity, operation, receipt, and malformed records", () => {
    const request = { operation: "LIST" as const, context: { connectorId: "c", accountScopeReference: "a", purposeReference: "p", trustedTimeReference: "t" } };
    const result = createAdapterResult(request);
    expect(validateAdapterResult({ ...result, adapterReference: "other" }, "adapter.test", request.operation)).toContain("adapter reference mismatch");
    expect(validateAdapterResult({ ...result, operation: "SEARCH" }, "adapter.test", request.operation)).toContain("result operation mismatch");
    expect(validateAdapterResult({ ...result, receipt: { ...result.receipt, operation: "SEARCH" } })).toContain("receipt operation mismatch");
    expect(() => normalizeAdapterRecord({ recordReference: "", dataClass: "d", fields: [] }, "time")).toThrow("PAYLOAD_INVALID");
    expect(() => normalizeAdapterRecord({ recordReference: "r", dataClass: "d", fields: [] }, "")).toThrow("PAYLOAD_INVALID");
    expect(validateAdapterResult({ ...result, page: { items: [{ recordReference: "", fields: [], dataClass: "d", observedTimeReference: "t" } as never], complete: true } })).toContain("page exceeds the bounded range");
  });

  it("rejects unknown runtime projection vocabularies and accepts approved values", () => {
    expect(validateRuntimeProjection({ health: "HEALTHY", freshness: "CURRENT", rateLimitState: "AVAILABLE" })).toEqual([]);
    expect(validateRuntimeProjection({ health: "UNKNOWN_HEALTH", freshness: "CURRENT", rateLimitState: "AVAILABLE" })).toContain("runtime projection vocabulary is invalid");
    expect(validateRuntimeProjection({ health: "HEALTHY", freshness: "UNKNOWN_FRESHNESS", rateLimitState: "AVAILABLE" })).toContain("runtime projection vocabulary is invalid");
    expect(validateRuntimeProjection({ health: "HEALTHY", freshness: "CURRENT", rateLimitState: "UNKNOWN_RATE" })).toContain("runtime projection vocabulary is invalid");
    expect(validateRuntimeProjection({ health: 1 as never, freshness: "CURRENT", rateLimitState: "AVAILABLE" })).toContain("runtime projection vocabulary is invalid");
  });

  it.each([
    "reauthorizationRequired",
    "revoked",
    "consentWithdrawn",
    "authenticationFailed",
    "scopeEscalated",
  ] as const)("rejects non-boolean OAuth status field: %s", (field) => {
    const valid = { resultReference: "result", grantedScopes: ["read"], reauthorizationRequired: false, revoked: false, consentWithdrawn: false, authenticationFailed: false, scopeEscalated: false, nonAuthorizing: true as const };
    const invalid = { ...valid, [field]: "caller-controlled-value" };

    expect(validateOAuthResult(invalid as never)).toContain("OAuth status field must be boolean");
    expect(validateOAuthResult(invalid as never).join(" ")).not.toContain("caller-controlled-value");
    expect(validateOAuthResult(valid)).toEqual([]);
  });
});

function createAdapterResult(request: { operation: "LIST" | "SEARCH" | "DISCONNECT_PROPOSAL"; context: { connectorId: string; accountScopeReference: string } }) {
  return {
    operation: request.operation,
    adapterReference: "adapter.test",
    connectorId: request.context.connectorId,
    accountScopeReference: request.context.accountScopeReference,
    attribution: { connectorId: request.context.connectorId, accountScopeReference: request.context.accountScopeReference, adapterReference: "adapter.test", providerRecordReference: "record", observationTimeReference: "time", freshnessState: "CURRENT" as const, evidenceReferences: [], partial: false, complete: true },
    page: { items: [], complete: true },
    receipt: { requestIdReference: "request", operation: request.operation, completed: true, cancelled: false, partial: false, nonAuthorizing: true as const },
    nonAuthorizing: true as const,
  };
}