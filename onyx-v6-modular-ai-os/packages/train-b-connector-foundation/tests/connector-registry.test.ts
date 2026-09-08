import { describe, expect, it } from "vitest";
import { MAX_CONNECTOR_REGISTRATIONS, createConnectorRegistry } from "../src/index";

const connector = (id: string, lifecycleState: "DECLARED" | "CONFIGURED" | "DISABLED" | "ENABLED" | "DEGRADED" | "EXPIRED" | "REVOKED" | "QUARANTINED" | "REMOVED" | "UNKNOWN" = "ENABLED") => ({ id, type: "CUSTOM", lifecycleState, adapterReference: `adapter.${id}`, requiresAccount: false, requiresCredential: false, bindings: [] });

describe("connector registry assurance", () => {
  it("registers a valid connector", () => expect(createConnectorRegistry().register(connector("connector.valid")).id).toBe("connector.valid"));
  it("rejects duplicate IDs", () => { const registry = createConnectorRegistry(); registry.register(connector("connector.duplicate")); expect(() => registry.register(connector("connector.duplicate"))).toThrow(); });
  it("returns a deterministic immutable snapshot", () => { const registry = createConnectorRegistry(); registry.register(connector("connector.z")); registry.register(connector("connector.a")); const snapshot = registry.snapshot(); expect(snapshot.ids).toEqual(["connector.a", "connector.z"]); expect(Object.isFrozen(snapshot)).toBe(true); expect(Object.isFrozen(snapshot.entries)).toBe(true); });
  it.each(["DISABLED", "REVOKED", "EXPIRED", "QUARANTINED"] as const)("makes %s connectors ineligible", (lifecycleState) => { const result = createConnectorRegistry().evaluate("connector.missing", { connectorId: "connector.missing", lifecycleState }, undefined); expect(result.eligible).toBe(false); });
  it("accepts the registry maximum", () => { const registry = createConnectorRegistry(); for (let index = 0; index < MAX_CONNECTOR_REGISTRATIONS; index += 1) registry.register(connector(`connector.${index}`)); expect(registry.list()).toHaveLength(MAX_CONNECTOR_REGISTRATIONS); });
  it("rejects over the registry maximum", () => { const registry = createConnectorRegistry(); for (let index = 0; index < MAX_CONNECTOR_REGISTRATIONS; index += 1) registry.register(connector(`connector.${index}`)); expect(() => registry.register(connector("connector.over"))).toThrow(); });
  it("does not activate registration", () => expect(createConnectorRegistry().register(connector("connector.declared", "DECLARED")).lifecycleState).toBe("DECLARED"));
  it("does not select a provider", () => expect(createConnectorRegistry().register(connector("connector.neutral")).adapterReference).toBe("adapter.connector.neutral"));
  it("keeps unknown connectors ineligible", () => expect(createConnectorRegistry().evaluate("connector.unknown", { connectorId: "connector.unknown", lifecycleState: "UNKNOWN" }).eligible).toBe(false));
});
