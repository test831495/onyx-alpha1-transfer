import { describe, expect, it } from "vitest";
import { APPROVED_APPLICATION_IDS, createApplicationRegistry, evaluateApplicationAvailability, projectTruth } from "../src/index";

describe("application foundation red contract", () => {
  it("registers the approved provider-neutral inventory", () => {
    const registry = createApplicationRegistry();
    expect(registry.snapshot().ids).toEqual([...APPROVED_APPLICATION_IDS].sort());
    expect(registry.resolve("schedule")?.applicationId).toBe("calendar");
  });
  it("keeps incomplete sources visibly partial", () => {
    const definition = createApplicationRegistry().get("calendar");
    expect(definition).toBeDefined();
    const availability = evaluateApplicationAvailability(definition!, { capabilities: [], sources: [], observedAt: "obs-1" });
    expect(availability.state).toBe("NO_SOURCE_CONNECTED");
    expect(projectTruth({ applicationId: "calendar", availability, observedAt: "obs-1" }).truthClass).toBe("UNAVAILABLE");
  });
});