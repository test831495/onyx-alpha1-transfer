import { describe, expect, it } from "vitest";
import type { AdapterOperationRequest, ConnectorAdapter } from "@onyx/train-b-connector-adapter-foundation";
import { B1_FEATURE_FLAGS, B1_PROVIDER_MATRIX, createSyntheticReadAdapter, projectOperationalState, runUniversalConnectorIntelligence } from "../src/index.js";

const adapter = createSyntheticReadAdapter({
  adapterId: "synthetic.read.one",
  providerMetadataReference: "provider-family:synthetic",
  capabilities: [{ capabilityId: "synthetic.read", permissionReference: "synthetic:read", dataClass: "METADATA", operations: ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES"] }],
  records: [{ recordReference: "synthetic:record:1", dataClass: "METADATA", fields: [{ key: "status", value: "ready" }] }],
});
const candidate = { applicationId: "application.files", capabilityId: "files.search", connectorId: "connector:synthetic", accountScopeReference: "account:synthetic", dataClass: "METADATA", supportedSearchModes: ["METADATA"] as const, sourceHealth: "HEALTHY", freshnessState: "CURRENT", attributionAvailable: true, privacyDecision: "AUTHORIZED", regionCompatible: true, availability: "AVAILABLE", evidenceReferences: ["synthetic:evidence:1"], priority: 1 } as const;
const unavailableAdapter: ConnectorAdapter = Object.freeze({
  registration: adapter.registration,
  async execute(request: AdapterOperationRequest) {
    return Object.freeze({
      operation: request.operation,
      adapterReference: adapter.registration.metadata.adapterId,
      connectorId: request.context.connectorId,
      accountScopeReference: request.context.accountScopeReference,
      receipt: Object.freeze({ requestIdReference: request.context.idempotencyKey ?? "synthetic:unavailable", operation: request.operation, completed: false, cancelled: false, partial: true, nonAuthorizing: true as const }),
      error: Object.freeze({ code: "RATE_LIMITED" as const, retryable: true, safe: true as const }),
      nonAuthorizing: true as const,
    });
  },
});

describe("universal connector intelligence", () => {
  it("freezes four synthetic-only disabled provider lanes", () => {
    expect(B1_PROVIDER_MATRIX).toHaveLength(4);
    expect(B1_PROVIDER_MATRIX.every((lane) => lane.syntheticOnly && !lane.enabledByDefault)).toBe(true);
    expect(B1_PROVIDER_MATRIX.every((lane) => lane.forbiddenOperations.includes("DELETE"))).toBe(true);
  });

  it("keeps adapters disabled and produces attributed partial-safe synthesis inputs", async () => {
    expect(adapter.registration.enabled).toBe(false);
    const run = await runUniversalConnectorIntelligence({ requestId: "request:hero", accountScopeReference: "account:synthetic", purposeReference: "purpose:status", queryTextReference: "today", searchModes: ["METADATA"], applicationScopes: ["workspace"], maximumResults: 20, pageSize: 10 }, [
      { adapter, candidate },
    ]);
    expect(run.results.length).toBeGreaterThan(0);
    expect(run.results.every((result) => result.evidenceReferences.length > 0)).toBe(true);
    expect(run.synthesis.nonAuthorizing).toBe(true);
  });

  it("rejects cross-account evidence before synthesis admission", async () => {
    const run = await runUniversalConnectorIntelligence({ requestId: "request:isolation", accountScopeReference: "account:other", purposeReference: "purpose:status", queryTextReference: "today", searchModes: ["METADATA"], applicationScopes: ["application.files"], maximumResults: 20, pageSize: 10 }, [{ adapter, candidate }]);
    expect(run.results).toHaveLength(0);
    expect(run.synthesis.excludedClaimIds).toHaveLength(0);
    expect(run.receipt.completionDisposition).toBe("COMPLETE_RESULTS");
  });

  it("rejects cursors bound to another connector or account", async () => {
    const response = await adapter.execute({
      operation: "SEARCH",
      context: {
        connectorId: "connector:synthetic",
        accountScopeReference: "account:synthetic",
        vaultReferenceId: "vault:synthetic",
        purposeReference: "purpose:status",
        trustedTimeReference: "trusted:synthetic",
      },
      capabilityId: "synthetic.read",
      queryReference: "today",
      cursor: "connector:other:account:synthetic:2",
      pageSize: 10,
    });
    expect(response.error?.code).toBe("CURSOR_INVALID");
  });

  it("returns truthful partial coverage when one eligible provider is unavailable", async () => {
    const unavailableCandidate = { ...candidate, connectorId: "connector:unavailable", priority: 2 } as const;
    const run = await runUniversalConnectorIntelligence({ requestId: "request:partial", accountScopeReference: "account:synthetic", purposeReference: "purpose:status", queryTextReference: "today", searchModes: ["METADATA"], applicationScopes: ["workspace"], maximumResults: 20, pageSize: 10 }, [
      { adapter, candidate },
      { adapter: unavailableAdapter, candidate: unavailableCandidate },
    ]);
    expect(run.unavailableSources).toEqual(["connector:unavailable"]);
    expect(run.receipt.completionDisposition).toBe("PARTIAL_RESULTS");
    expect(run.receipt.partialSourceCount).toBe(1);
    expect(run.receipt.completedSourceCount).toBe(1);
    expect(run.results.every((result) => result.evidenceReferences.length > 0)).toBe(true);
  });

  it("projects operational limits without enabling or authorizing a provider", () => {
    const state = projectOperationalState({ adapterId: "synthetic.read.one", health: "DEGRADED", freshness: "STALE", quota: "LIMITED", cost: "UNKNOWN", revoked: false, recoverable: true });
    expect(state.enabled).toBe(false);
    expect(state.nonAuthorizing).toBe(true);
    expect(state.freshness).toBe("STALE");
    expect(B1_FEATURE_FLAGS.every((flag) => flag.defaultState === "OFF" && flag.killSwitchState === "OFF" && !flag.activationAllowed)).toBe(true);
  });
});
