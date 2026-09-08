import { describe, expect, it } from "vitest";
import { projectRuntimeState, requestDisablement, requestEnablement } from "../src/index";

const connector = (lifecycleState: "DECLARED" | "CONFIGURED" | "DISABLED" | "ENABLED" | "DEGRADED" | "EXPIRED" | "REVOKED" | "QUARANTINED" | "REMOVED" | "UNKNOWN" = "ENABLED") => ({ id: "connector.runtime", type: "CUSTOM", lifecycleState, adapterReference: "adapter.runtime", requiresAccount: false, requiresCredential: false, bindings: [{ capabilityId: "capability.read", operations: ["READ"] as const, permissionReferences: [], attributionRequired: true, freshnessRequirement: "CURRENT", costClass: "LOW" }] });

describe("runtime state assurance", () => {
  it("projects a healthy enabled connector", () => expect(projectRuntimeState(connector(), { connectorId: "connector.runtime", lifecycleState: "ENABLED", credentialReferenceAvailable: true }).eligibleCapabilityIds).toEqual(["capability.read"]));
  it("projects disabled state", () => expect(projectRuntimeState(connector("DISABLED"), { connectorId: "connector.runtime", lifecycleState: "DISABLED", credentialReferenceAvailable: true }).eligibleCapabilityIds).toEqual([]));
  it.each(["REVOKED", "REMOVED"] as const)("cannot enable %s", (lifecycleState) => expect(requestEnablement(connector(lifecycleState)).eligible).toBe(false));
  it("requires reauthorization for expired state", () => expect(projectRuntimeState(connector("EXPIRED"), { connectorId: "connector.runtime", lifecycleState: "EXPIRED", credentialReferenceAvailable: true }).reasons).toContain("REAUTHORIZATION_REQUIRED"));
  it("limits capabilities when permission is reduced", () => expect(projectRuntimeState(connector(), { connectorId: "connector.runtime", lifecycleState: "ENABLED", credentialReferenceAvailable: false }).eligibleCapabilityIds).toEqual([]));
  it("requires a policy decision for quarantine", () => expect(requestEnablement(connector("QUARANTINED")).reason).toBe("EXTERNAL_POLICY_REQUIRED"));
  it("fails closed on unknown policy facts", () => expect(projectRuntimeState(connector(), { connectorId: "connector.runtime", lifecycleState: "UNKNOWN", credentialReferenceAvailable: true }).eligibleCapabilityIds).toEqual([]));
  it("retains distinct missing policy and credential reasons", () => expect(projectRuntimeState(connector(), { connectorId: "connector.runtime", lifecycleState: "UNKNOWN" }).reasons).toEqual(["CREDENTIAL_REFERENCE_UNAVAILABLE", "POLICY_FACT_UNKNOWN"]));
  it("returns non-authorizing enablement proposals", () => expect(requestEnablement(connector())).toMatchObject({ proposal: "ENABLE", authorizing: false }));
  it("returns non-authorizing disablement proposals", () => expect(requestDisablement(connector(), "OWNER_REQUEST")).toMatchObject({ proposal: "DISABLE", authorizing: false }));
  it("keeps runtime projections immutable", () => expect(Object.isFrozen(projectRuntimeState(connector(), { connectorId: "connector.runtime", lifecycleState: "ENABLED", credentialReferenceAvailable: true }))).toBe(true));
});
