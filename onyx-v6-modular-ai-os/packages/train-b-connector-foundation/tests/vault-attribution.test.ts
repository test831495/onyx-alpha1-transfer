import { describe, expect, it } from "vitest";
import { MAX_ATTRIBUTION_EVIDENCE_REFERENCES, MAX_EVIDENCE_REFERENCE_LENGTH, assertVaultReference, createSourceAttribution, createVaultReference } from "../src/index";

const attribution = (overrides: Record<string, unknown> = {}) => ({ sourceType: "ADAPTER", connectorId: "connector.source", accountReference: "account.source", adapterReference: "adapter.source", providerRecordReference: "record.source", observationTimeReference: "time.source", freshnessState: "CURRENT", evidenceReferences: ["evidence.source"], partial: false, conflicting: false, complete: true, ...overrides });
const vault = (overrides: Record<string, unknown> = {}) => ({ id: "vault.source", purpose: "READ", credentialClass: "OPAQUE", lifecycleState: "ACTIVE", scopeReference: "scope.source", ...overrides });

describe("vault and attribution assurance", () => {
  it("accepts valid opaque vault metadata", () => expect(createVaultReference(vault()).id).toBe("vault.source"));
  it.each(["accessToken", "refreshToken", "apiKey", "password", "privateKey", "clientSecret", "authorizationCode", "cookie", "credential", "secret"])("rejects prohibited key %s", (key) => expect(() => assertVaultReference({ ...vault(), [key]: "never-store" } as never)).toThrow());
  it("rejects nested secrets", () => expect(() => assertVaultReference({ ...vault(), nested: { accessToken: "never-store" } } as never)).toThrow());
  it("rejects circular input", () => { const value: Record<string, unknown> = vault(); value.loop = value; expect(() => assertVaultReference(value)).toThrow(); });
  it("rejects revoked proxy inspection", () => expect(() => assertVaultReference(new Proxy({}, { ownKeys: () => { throw new Error("revoked"); } }))).toThrow());
  it("rejects excessive nesting", () => { let nested: Record<string, unknown> = {}; for (let index = 0; index < 10; index += 1) nested = { nested }; expect(() => assertVaultReference({ ...vault(), nested } as never)).toThrow(); });
  it("accepts valid attribution and copies evidence", () => { const evidence = ["evidence.one"]; const result = createSourceAttribution(attribution({ evidenceReferences: evidence })); expect(result.evidenceReferences).toEqual(evidence); expect(result.evidenceReferences).not.toBe(evidence); expect(Object.isFrozen(result.evidenceReferences)).toBe(true); });
  it("rejects missing required attribution", () => expect(() => createSourceAttribution(attribution({ connectorId: undefined }) as never)).toThrow());
  it("accepts the evidence maximum and rejects over maximum", () => { const maximum = Array.from({ length: MAX_ATTRIBUTION_EVIDENCE_REFERENCES }, (_, index) => `evidence.${index}`); expect(createSourceAttribution(attribution({ evidenceReferences: maximum })).evidenceReferences).toHaveLength(MAX_ATTRIBUTION_EVIDENCE_REFERENCES); expect(() => createSourceAttribution(attribution({ evidenceReferences: [...maximum, "evidence.over"] }))).toThrow(); });
  it("rejects oversized evidence references and preserves conflicting sources", () => { expect(() => createSourceAttribution(attribution({ evidenceReferences: ["x".repeat(MAX_EVIDENCE_REFERENCE_LENGTH + 1)] }))).toThrow(); const result = createSourceAttribution(attribution({ providerRecordReference: "record.other", conflicting: true })); expect(result.conflicting).toBe(true); expect(result.providerRecordReference).toBe("record.other"); });
});
