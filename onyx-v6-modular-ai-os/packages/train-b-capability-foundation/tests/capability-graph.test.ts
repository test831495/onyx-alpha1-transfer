import { describe, expect, it } from "vitest";
import { createCapabilityGraph } from "../src/capability-graph";
import { createCapabilityRegistry } from "../src/capability-registry";

const registerFixture = (registry: ReturnType<typeof createCapabilityRegistry>) => {
  registry.register({
    id: "calendar.events.read",
    version: "1.0.0",
    label: "Calendar events read",
    description: "Read calendar events",
    domain: "calendar",
    operations: ["READ"],
    riskClass: "LOW",
    inputContractIds: ["calendar.input"],
    outputContractIds: ["calendar.output"],
    dataClasses: ["CALENDAR_EVENT"],
    freshnessRequirement: "CURRENT",
    sourceAttributionRequired: true,
    costClass: "LOW",
    dependencies: [],
    conflicts: [],
    lifecycleState: "ACTIVE",
    runtimeEnabled: true,
    owner: "Rahul",
    purpose: "read calendar events",
    providerNeutralImplementation: true,
  });
  registry.register({
    id: "tasks.items.read",
    version: "1.0.0",
    label: "Task items read",
    description: "Read tasks",
    domain: "tasks",
    operations: ["READ"],
    riskClass: "LOW",
    inputContractIds: [],
    outputContractIds: ["tasks.output"],
    dataClasses: ["TASK"],
    freshnessRequirement: "CURRENT",
    sourceAttributionRequired: true,
    costClass: "LOW",
    dependencies: [],
    conflicts: [],
    lifecycleState: "ACTIVE",
    runtimeEnabled: true,
    owner: "Rahul",
    purpose: "read tasks",
    providerNeutralImplementation: true,
  });
  registry.register({
    id: "applications.open",
    version: "1.0.0",
    label: "Open application",
    description: "Open an app surface",
    domain: "applications",
    operations: ["EXECUTION"],
    riskClass: "LOW",
    inputContractIds: [],
    outputContractIds: ["applications.output"],
    dataClasses: ["APPLICATION"],
    freshnessRequirement: "NOT_ASSESSABLE",
    sourceAttributionRequired: false,
    costClass: "LOW",
    dependencies: [],
    conflicts: [],
    lifecycleState: "ACTIVE",
    runtimeEnabled: true,
    owner: "Rahul",
    purpose: "open app",
    providerNeutralImplementation: true,
  });
};

describe("capability graph", () => {
  it("constructs a valid graph and dependency closure", () => {
    const registry = createCapabilityRegistry();
    registerFixture(registry);
    const graph = createCapabilityGraph(registry.snapshot(), [
      { kind: "REQUIRES", from: "applications.open", to: "calendar.events.read", reasonCode: "APP_OPEN_NEEDS_CALENDAR" },
      { kind: "OPTIONAL_REQUIRES", from: "applications.open", to: "tasks.items.read", reasonCode: "APP_OPEN_OPTIONAL_TASKS" },
    ]);
    expect(graph.nodes).toContain("applications.open");
    expect(graph.dependencyClosure["applications.open"]).toContain("calendar.events.read");
    expect(graph.conflicts).toEqual([]);
  });

  it("rejects missing node and self-edge", () => {
    const registry = createCapabilityRegistry();
    registerFixture(registry);
    expect(() => createCapabilityGraph(registry.snapshot(), [{ kind: "REQUIRES", from: "missing", to: "calendar.events.read", reasonCode: "X" }])).toThrow();
    expect(() => createCapabilityGraph(registry.snapshot(), [{ kind: "REQUIRES", from: "calendar.events.read", to: "calendar.events.read", reasonCode: "X" }])).toThrow();
  });

  it("detects cycles and disabled dependencies", () => {
    const registry = createCapabilityRegistry();
    registerFixture(registry);
    expect(() => createCapabilityGraph(registry.snapshot(), [
      { kind: "REQUIRES", from: "calendar.events.read", to: "tasks.items.read", reasonCode: "A" },
      { kind: "REQUIRES", from: "tasks.items.read", to: "calendar.events.read", reasonCode: "B" },
    ])).toThrow();

    const disabled = createCapabilityRegistry();
    disabled.register({
      id: "one",
      version: "1.0.0",
      label: "one",
      description: "one",
      domain: "search",
      operations: ["READ"],
      riskClass: "LOW",
      inputContractIds: [],
      outputContractIds: [],
      dataClasses: ["UNKNOWN"],
      freshnessRequirement: "CURRENT",
      sourceAttributionRequired: true,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "DISABLED",
      runtimeEnabled: false,
      owner: "Rahul",
      purpose: "disabled",
      providerNeutralImplementation: true,
    });
    disabled.register({
      id: "two",
      version: "1.0.0",
      label: "two",
      description: "two",
      domain: "search",
      operations: ["READ"],
      riskClass: "LOW",
      inputContractIds: [],
      outputContractIds: [],
      dataClasses: ["UNKNOWN"],
      freshnessRequirement: "CURRENT",
      sourceAttributionRequired: true,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "ACTIVE",
      runtimeEnabled: true,
      owner: "Rahul",
      purpose: "two",
      providerNeutralImplementation: true,
    });
    expect(() => createCapabilityGraph(disabled.snapshot(), [{ kind: "REQUIRES", from: "two", to: "one", reasonCode: "D" }])).toThrow();
  });
});
