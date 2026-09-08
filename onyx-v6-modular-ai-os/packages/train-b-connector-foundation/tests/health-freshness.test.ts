import { describe, expect, it } from "vitest";
import { evaluateConnectorHealth, evaluateFreshness } from "../src/index";

const facts = (overrides: Record<string, unknown> = {}) => ({ connectorId: "connector.health", lifecycleState: "ENABLED" as const, credentialReferenceAvailable: true, adapterHealthReference: "health.alpha", ...overrides });

describe("health and freshness assurance", () => {
  it("evaluates connected and current facts", () => { expect(evaluateConnectorHealth(facts())).toMatchObject({ state: "CONNECTED", assessable: true }); expect(evaluateFreshness(facts({ freshnessObserved: true }))).toMatchObject({ state: "CURRENT", assessable: true }); });
  it("keeps connected but stale distinct", () => { expect(evaluateConnectorHealth(facts())).toMatchObject({ state: "CONNECTED" }); expect(evaluateFreshness(facts({ freshnessObserved: false }))).toMatchObject({ state: "STALE" }); });
  it("reports rate limiting", () => expect(evaluateConnectorHealth(facts({ rateLimited: true })).state).toBe("RATE_LIMITED"));
  it("reports permission reduction", () => expect(evaluateConnectorHealth(facts({ permissionReduced: true })).state).toBe("PERMISSION_REDUCED"));
  it.each(["REVOKED", "DISABLED", "QUARANTINED", "EXPIRED"] as const)("lifecycle %s overrides health facts", (lifecycleState) => expect(evaluateConnectorHealth(facts({ lifecycleState, freshnessObserved: true })).state).toBe(lifecycleState === "DISABLED" ? "DISABLED" : lifecycleState === "REVOKED" ? "REVOKED" : lifecycleState === "EXPIRED" ? "EXPIRED" : "QUARANTINED"));
  it("returns unknown for missing health facts", () => expect(evaluateConnectorHealth({ connectorId: "connector.unknown", lifecycleState: "UNKNOWN" })).toMatchObject({ state: "UNKNOWN", assessable: false }));
  it("returns not assessable freshness when observation is missing", () => expect(evaluateFreshness(facts())).toMatchObject({ state: "UNKNOWN", assessable: false }));
  it("uses supplied observations rather than ambient time", () => { const first = evaluateFreshness(facts({ freshnessObserved: true })); const second = evaluateFreshness(facts({ freshnessObserved: true })); expect(first).toEqual(second); });
  it("keeps evidence and reason arrays bounded by supplied facts", () => { const result = evaluateConnectorHealth(facts({ evidenceReferences: ["evidence.alpha"], reasonCodes: ["FACT_ALPHA"] })); expect(result.reasonCodes.length).toBeLessThanOrEqual(1); });
  it("returns immutable evaluations", () => { expect(Object.isFrozen(evaluateConnectorHealth(facts()))).toBe(true); expect(Object.isFrozen(evaluateFreshness(facts({ freshnessObserved: true })))).toBe(true); });
});
