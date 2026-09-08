import { describe, expect, it } from "vitest";
import { createDeviceProjection, evaluateApplicationAvailability, normalizeAlias, projectPrivacy, projectTruth, summarizeApplicationHealth, validateAcceptanceRegistry, createSourcePresentation } from "../src/index";

describe("truthful projections", () => {
  it("preserves stale and conflicting truth", () => {
    const availability = evaluateApplicationAvailability({ requiredCapabilities: ["calendar.read"] }, { capabilities: [{ capabilityId: "calendar.read", eligible: true, freshness: "STALE" }], sources: ["source-a"], observedAt: "obs", conflicts: ["conflict-a"] });
    expect(projectTruth({ applicationId: "calendar", availability, observedAt: "obs" }).truthClass).toBe("LIVE_CONFLICTING");
  });
  it("fails closed for unknown shared-room policy and retains source health", () => {
    expect(projectPrivacy({ authenticated: true, sharedRoom: true, policyKnown: false, privacyClass: "OWNER_ONLY" })).toMatchObject({ level: "HIDDEN", sourceHealthVisible: true });
  });
  it("reduces TV detail without changing semantic identity", () => {
    expect(createDeviceProjection("TV", true)).toMatchObject({ device: "TV", detailLevel: "COMPACT", privacyRedaction: "STRICT" });
  });
  it("retains mandatory health failures and counts", () => {
    expect(summarizeApplicationHealth([{ connectorReference: "a", mandatory: true, state: "HEALTHY", stale: true }, { connectorReference: "b", mandatory: true, state: "UNAVAILABLE" }])).toMatchObject({ state: "UNAVAILABLE", healthyCount: 1, unavailableCount: 1, staleCount: 1 });
  });
  it("rejects compact hiding when coverage is material and maps 120 IDs", () => {
    expect(() => createSourcePresentation({ level: "COMPACT", disclosure: "HIDDEN_WHEN_SAFE", freshness: "STALE", sourceCount: 1, missingSourceCount: 1, staleSourceCount: 1, conflictCount: 0, fallbackUsed: true, originalSourceUnavailable: true })).toThrow();
    expect(validateAcceptanceRegistry()).toMatchObject({ valid: true, count: 120 });
  });

  it("rejects aliases that normalize to an empty key", () => {
    for (const alias of ["", "   ", "\t\t", "\n", "---", "___", "..."] as const) {
      expect(() => normalizeAlias(alias)).toThrow("INVALID_ALIAS");
    }
    expect(normalizeAlias("  Calendar  ")).toBe("calendar");
    expect(normalizeAlias("CALENDAR")).toBe("calendar");
  });
});