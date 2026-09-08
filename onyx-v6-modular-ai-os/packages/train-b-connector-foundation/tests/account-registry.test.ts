import { describe, expect, it } from "vitest";
import { MAX_ACCOUNT_REGISTRATIONS, createAccountRegistry } from "../src/index";

const account = (id: string, lifecycleState: "DECLARED" | "LINKED" | "DISABLED" | "EXPIRED" | "REVOKED" | "REMOVED" | "UNKNOWN" = "DECLARED", connectorIds: readonly string[] = []) => ({ id, accountReference: `opaque.${id}`, lifecycleState, connectorIds });

describe("account registry assurance", () => {
  it("registers an opaque account", () => expect(createAccountRegistry().register(account("account.valid")).accountReference).toBe("opaque.account.valid"));
  it("rejects duplicate account IDs", () => { const registry = createAccountRegistry(); registry.register(account("account.duplicate")); expect(() => registry.register(account("account.duplicate"))).toThrow(); });
  it.each(["REVOKED", "REMOVED"] as const)("retains %s as an ineligible lifecycle state", (lifecycleState) => expect(createAccountRegistry().register(account(`account.${lifecycleState}`, lifecycleState)).lifecycleState).toBe(lifecycleState));
  it("rejects raw profile payloads", () => expect(() => createAccountRegistry().register({ ...account("account.profile"), email: "private@example.test" } as never)).toThrow());
  it("keeps account connector bindings explicit", () => { const registry = createAccountRegistry(); registry.register(account("account.one", "LINKED", ["connector.one"])); registry.register(account("account.two", "LINKED", ["connector.two"])); expect(registry.get("account.one")?.connectorIds).toEqual(["connector.one"]); expect(registry.get("account.one")?.connectorIds).not.toContain("connector.two"); });
  it("returns deterministic immutable snapshots", () => { const registry = createAccountRegistry(); registry.register(account("account.z")); registry.register(account("account.a")); const snapshot = registry.snapshot(); expect(snapshot.ids).toEqual(["account.a", "account.z"]); expect(Object.isFrozen(snapshot)).toBe(true); expect(Object.isFrozen(snapshot.entries)).toBe(true); });
  it("accepts the account maximum", () => { const registry = createAccountRegistry(); for (let index = 0; index < MAX_ACCOUNT_REGISTRATIONS; index += 1) registry.register(account(`account.${index}`)); expect(registry.list()).toHaveLength(MAX_ACCOUNT_REGISTRATIONS); });
  it("rejects over the account maximum", () => { const registry = createAccountRegistry(); for (let index = 0; index < MAX_ACCOUNT_REGISTRATIONS; index += 1) registry.register(account(`account.${index}`)); expect(() => registry.register(account("account.over"))).toThrow(); });
  it("does not transfer account state between registries", () => { const first = createAccountRegistry(); const second = createAccountRegistry(); first.register(account("account.private")); expect(second.has("account.private")).toBe(false); });
});
