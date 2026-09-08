import { describe, expect, it } from "vitest";
import {
  assertConnectorRegistration,
  assertVaultReference,
  createAccountRegistry,
  createConnectorRegistry,
  createVaultReference,
  createSourceAttribution,
  evaluateConnectorHealth,
  projectRuntimeState,
  validateAcceptanceRegistry,
} from "../src/index";

describe("connector foundation red boundaries", () => {
  it("rejects duplicate connector IDs and preserves immutable snapshots", () => {
    const registry = createConnectorRegistry();
    const connector = { id: "connector.alpha", type: "CUSTOM", lifecycleState: "DECLARED", adapterReference: "adapter.alpha", requiresAccount: false, requiresCredential: false, bindings: [] } as const;
    registry.register(connector);
    expect(() => registry.register(connector)).toThrow();
    expect(Object.isFrozen(registry.snapshot())).toBe(true);
    expect(() => registry.register({ ...connector, id: "microsoft.calendar" })).toThrow();
  });

  it("fails closed for secrets, unknown health, and incomplete acceptance", () => {
    expect(createVaultReference({ id: "vault.valid", purpose: "READ", credentialClass: "OPAQUE", lifecycleState: "ACTIVE", scopeReference: "scope.alpha" })).toMatchObject({ id: "vault.valid" });
    expect(() => createVaultReference({ id: "vault.one", purpose: "READ", credentialClass: "OAUTH", accessToken: "secret" } as never)).toThrow();
    expect(evaluateConnectorHealth({ connectorId: "connector.alpha", lifecycleState: "UNKNOWN" })).toMatchObject({ state: "UNKNOWN" });
    expect(validateAcceptanceRegistry().valid).toBe(true);
  });

  it("keeps account registries isolated and bounded", () => {
    const registry = createAccountRegistry();
    registry.register({ id: "account.alpha", accountReference: "opaque.account", lifecycleState: "DECLARED", connectorIds: [] });
    expect(registry.has("account.alpha")).toBe(true);
    expect(registry.snapshot().ids).toEqual(["account.alpha"]);
  });

  it("keeps policy and credential reasons distinct and deterministic", () => {
    const connector = { id: "connector.alpha", type: "CUSTOM", lifecycleState: "ENABLED", adapterReference: "adapter.alpha", requiresAccount: false, requiresCredential: true, bindings: [] } as const;
    const unknownPolicy = projectRuntimeState(connector, { connectorId: connector.id, lifecycleState: "UNKNOWN", credentialReferenceAvailable: true });
    expect(unknownPolicy.reasons).toEqual(["POLICY_FACT_UNKNOWN"]);
    const missingCredential = projectRuntimeState(connector, { connectorId: connector.id, lifecycleState: "ENABLED", credentialReferenceAvailable: false });
    expect(missingCredential.reasons).toEqual(["CREDENTIAL_REFERENCE_UNAVAILABLE"]);
    const bothMissing = projectRuntimeState(connector, { connectorId: connector.id, lifecycleState: "UNKNOWN", credentialReferenceAvailable: false });
    expect(bothMissing.reasons).toEqual(["CREDENTIAL_REFERENCE_UNAVAILABLE", "POLICY_FACT_UNKNOWN"]);
    expect(projectRuntimeState(connector, { connectorId: connector.id, lifecycleState: "ENABLED", credentialReferenceAvailable: true }).eligibleCapabilityIds).toEqual([]);
  });

  it("validates attribution evidence before freezing", () => {
    const valid = { sourceType: "ADAPTER", connectorId: "connector.alpha", accountReference: "account.alpha", adapterReference: "adapter.alpha", providerRecordReference: "record.alpha", observationTimeReference: "time.alpha", freshnessState: "CURRENT", evidenceReferences: ["evidence.alpha"], partial: false, conflicting: false, complete: true } as const;
    const result = createSourceAttribution(valid);
    expect(result.evidenceReferences).toEqual(["evidence.alpha"]);
    expect(Object.isFrozen(result.evidenceReferences)).toBe(true);
    expect(result.evidenceReferences).not.toBe(valid.evidenceReferences);
    expect(() => createSourceAttribution({ ...valid, evidenceReferences: undefined } as never)).toThrow();
    expect(() => createSourceAttribution({ ...valid, evidenceReferences: [""] } as never)).toThrow();
    expect(() => createSourceAttribution({ ...valid, evidenceReferences: [42] } as never)).toThrow();
    expect(() => createSourceAttribution({ ...valid, evidenceReferences: Array.from({ length: 65 }, (_, index) => `evidence.${index}`) } as never)).toThrow();
    expect(() => createSourceAttribution({ ...valid, evidenceReferences: ["evidence.alpha", "evidence.alpha"] } as never)).toThrow();
    const conflicting = createSourceAttribution({ ...valid, providerRecordReference: "record.beta", conflicting: true });
    expect(conflicting.providerRecordReference).toBe("record.beta");
  });

  it("recursively rejects secrets and unknown schema fields", () => {
    const connector = { id: "connector.alpha", type: "CUSTOM", lifecycleState: "DECLARED", adapterReference: "adapter.alpha", requiresAccount: false, requiresCredential: false, bindings: [] };
    let validationError: unknown;
    try {
      assertConnectorRegistration({ ...connector, bindings: [{ capabilityId: "capability.alpha", accessToken: "secret" }] } as never);
    } catch (error) {
      validationError = error;
    }
    expect(validationError).toBeDefined();
    expect(String(validationError)).not.toContain("secret");
    expect(() => assertConnectorRegistration({ ...connector, extra: true } as never)).toThrow();
    expect(() => assertVaultReference({ id: "vault.alpha", purpose: "READ", credentialClass: "OPAQUE", lifecycleState: "ACTIVE", nested: { clientSecret: "secret" } } as never)).toThrow();
    expect(() => assertVaultReference({ id: "vault.alpha", purpose: "READ", credentialClass: "OPAQUE", lifecycleState: "ACTIVE", extra: true } as never)).toThrow();
    const circular: Record<string, unknown> = { id: "vault.alpha", purpose: "READ", credentialClass: "OPAQUE", lifecycleState: "ACTIVE" };
    circular.nested = circular;
    expect(() => assertVaultReference(circular)).toThrow();
    const revokedProxy = new Proxy({}, { ownKeys: () => { throw new Error("revoked"); } });
    expect(() => assertVaultReference(revokedProxy)).toThrow();
    const descriptorFailure = new Proxy({}, { getOwnPropertyDescriptor: () => { throw new Error("descriptor"); } });
    expect(() => assertVaultReference(descriptorFailure)).toThrow();
    let deeplyNested: Record<string, unknown> = {};
    for (let index = 0; index < 10; index += 1) deeplyNested = { nested: deeplyNested };
    expect(() => assertVaultReference({ id: "vault.alpha", purpose: "READ", credentialClass: "OPAQUE", lifecycleState: "ACTIVE", nested: deeplyNested } as never)).toThrow();
  });
});