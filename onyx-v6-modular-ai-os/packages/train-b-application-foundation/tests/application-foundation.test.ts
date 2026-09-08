import { describe, expect, it } from "vitest";
import { APPROVED_APPLICATION_IDS, CANONICAL_APPLICATION_DEFINITIONS, createApplicationRegistry, evaluateApplicationAvailability, projectTruth } from "../src/index";

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

  it("indexes aliases from initial definitions and protects later collisions", () => {
    const calendarDefinition = CANONICAL_APPLICATION_DEFINITIONS.find((definition) => definition.applicationId === "calendar")!;
    const tasksDefinition = CANONICAL_APPLICATION_DEFINITIONS.find((definition) => definition.applicationId === "tasks")!;
    const registry = createApplicationRegistry([calendarDefinition]);
    const calendar = registry.get("calendar");
    expect(calendar).toBeDefined();
    for (const alias of calendar!.aliases) {
      expect(registry.resolve(alias)).toBe(calendar);
    }
    expect(() => registry.register({ ...tasksDefinition, aliases: ["schedule"] })).toThrow("Alias collision");

    registry.register({ ...tasksDefinition, aliases: ["work items"] });
    expect(registry.resolve("WORK ITEMS")?.applicationId).toBe("tasks");
  });

  it("rejects initial alias collisions before returning a registry", () => {
    const calendar = CANONICAL_APPLICATION_DEFINITIONS.find((definition) => definition.applicationId === "calendar")!;
    const tasks = CANONICAL_APPLICATION_DEFINITIONS.find((definition) => definition.applicationId === "tasks")!;
    expect(() => createApplicationRegistry([{ ...calendar, aliases: ["shared"] }, { ...tasks, aliases: ["SHARED"] }])).toThrow("Alias collision");
    expect(() => createApplicationRegistry([{ ...calendar, aliases: ["tasks"] }]).register(tasks)).toThrow("Alias collision");
    expect(() => createApplicationRegistry([calendar]).register({ ...tasks, aliases: ["calendar"] })).toThrow("Alias collision");
  });
});