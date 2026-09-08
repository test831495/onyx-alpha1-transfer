import { describe, expect, it } from "vitest";
import { assertConnectorRegistration, assertVaultReference, createSourceAttribution } from "../src/index";

const connector = { id: "connector.adversarial", type: "CUSTOM", lifecycleState: "DECLARED", adapterReference: "adapter.adversarial", requiresAccount: false, requiresCredential: false, bindings: [] };
const vault = { id: "vault.adversarial", purpose: "READ", credentialClass: "OPAQUE", lifecycleState: "ACTIVE" };
const attribution = { sourceType: "ADAPTER", connectorId: "connector.adversarial", accountReference: "account.adversarial", adapterReference: "adapter.adversarial", providerRecordReference: "record.adversarial", observationTimeReference: "time.adversarial", freshnessState: "CURRENT", evidenceReferences: ["evidence.adversarial"], partial: false, conflicting: false, complete: true };

describe("hostile input and scope assurance", () => {
  it("rejects null and primitive connector inputs", () => { expect(() => assertConnectorRegistration(null)).toThrow(); expect(() => assertConnectorRegistration("connector" as never)).toThrow(); });
  it("rejects null and primitive vault inputs", () => { expect(() => assertVaultReference(null)).toThrow(); expect(() => assertVaultReference(42 as never)).toThrow(); });
  it("rejects ownKeys failures", () => expect(() => assertConnectorRegistration(new Proxy({}, { ownKeys: () => { throw new Error("ownKeys"); } }))).toThrow());
  it("rejects descriptor failures", () => expect(() => assertConnectorRegistration(new Proxy({}, { getOwnPropertyDescriptor: () => { throw new Error("descriptor"); } }))).toThrow());
  it("rejects accessors without invoking them", () => { const value = { ...vault, get credentialReferenceId() { throw new Error("getter invoked"); } }; expect(() => assertVaultReference(value as never)).toThrow(); });
  it("rejects unknown connector fields", () => expect(() => assertConnectorRegistration({ ...connector, unknownField: true } as never)).toThrow());
  it("rejects unknown attribution fields", () => expect(() => createSourceAttribution({ ...attribution, unknownField: true } as never)).toThrow());
  it("rejects oversized inspected arrays", () => expect(() => assertConnectorRegistration({ ...connector, bindings: Array.from({ length: 129 }, () => ({ capabilityId: "capability", operations: ["READ"], permissionReferences: [], attributionRequired: false, freshnessRequirement: "CURRENT", costClass: "LOW" })) } as never)).toThrow());
  it("rejects excessive object key counts", () => expect(() => assertVaultReference({ ...vault, ...Object.fromEntries(Array.from({ length: 513 }, (_, index) => [`field${index}`, index])) } as never)).toThrow());
  it("does not expose hostile values in validation errors", () => { let error: unknown; try { assertVaultReference({ ...vault, nested: { clientSecret: "sensitive-value" } } as never); } catch (caught) { error = caught; } expect(String(error)).not.toContain("sensitive-value"); });
});
