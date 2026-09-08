import { describe, expect, it } from "vitest";
import {
  createAccountRegistry,
  createConnectorRegistry,
  createVaultReference,
  evaluateConnectorHealth,
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
});