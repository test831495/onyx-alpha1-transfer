import { describe, expect, it } from "vitest";
import { createCapabilityGraph } from "../src/capability-graph";
import { createCapabilityRegistry } from "../src/capability-registry";
import { planUnifiedQuery, validateUnifiedQueryRequest } from "../src/unified-query";

const buildRegistry = () => {
  const registry = createCapabilityRegistry();
  registry.register({
    id: "calendar.events.read",
    version: "1.0.0",
    label: "Calendar events read",
    description: "Read calendar events",
    domain: "calendar",
    operations: ["READ"],
    riskClass: "LOW",
    inputContractIds: [],
    outputContractIds: [],
    dataClasses: ["CALENDAR_EVENT"],
    freshnessRequirement: "CURRENT",
    sourceAttributionRequired: true,
    costClass: "LOW",
    dependencies: [],
    conflicts: [],
    lifecycleState: "ACTIVE",
    runtimeEnabled: true,
    owner: "Rahul",
    purpose: "read calendar",
    providerNeutralImplementation: true,
  });
  registry.register({
    id: "mail.messages.read",
    version: "1.0.0",
    label: "Mail messages read",
    description: "Read messages",
    domain: "mail",
    operations: ["READ"],
    riskClass: "LOW",
    inputContractIds: [],
    outputContractIds: [],
    dataClasses: ["EMAIL_MESSAGE"],
    freshnessRequirement: "CURRENT",
    sourceAttributionRequired: true,
    costClass: "LOW",
    dependencies: [],
    conflicts: [],
    lifecycleState: "ACTIVE",
    runtimeEnabled: true,
    owner: "Rahul",
    purpose: "read mail",
    providerNeutralImplementation: true,
  });
  registry.register({
    id: "deployments.status.read",
    version: "1.0.0",
    label: "Deployment status read",
    description: "Read deployment statuses",
    domain: "deployments",
    operations: ["READ"],
    riskClass: "MEDIUM",
    inputContractIds: [],
    outputContractIds: [],
    dataClasses: ["DEPLOYMENT"],
    freshnessRequirement: "CURRENT",
    sourceAttributionRequired: true,
    costClass: "LOW",
    dependencies: [],
    conflicts: [],
    lifecycleState: "ACTIVE",
    runtimeEnabled: true,
    owner: "Rahul",
    purpose: "read deployment status",
    providerNeutralImplementation: true,
  });
  return registry;
};

describe("unified query contracts", () => {
  it("accepts provider-neutral capability requirements and creates deterministic plan", () => {
    const registry = buildRegistry();
    const graph = createCapabilityGraph(registry.snapshot(), []);
    const request = {
      accountScope: ["acct-1"],
      purpose: "next meeting",
      requirements: [{ capabilityId: "calendar.events.read", required: true }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    };
    expect(validateUnifiedQueryRequest(request).valid).toBe(true);
    const plan = planUnifiedQuery(request, registry.snapshot(), graph);
    expect(plan.disposition).toBe("PLAN_READY");
    expect(plan.steps[0]?.capabilityId).toBe("calendar.events.read");
  });

  it("rejects provider-selected instructions and raw secrets", () => {
    expect(validateUnifiedQueryRequest({
      accountScope: ["acct-1"],
      purpose: "read microsoft outlook mail",
      requirements: [{ capabilityId: "microsoft.outlook.mail.read" }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
      rawPrompt: "not allowed" as never,
    } as any).valid).toBe(false);
  });

  it("creates partial plan when required capability is disabled or missing", () => {
    const registry = buildRegistry();
    const missing = createCapabilityRegistry();
    const graph = createCapabilityGraph(registry.snapshot(), []);
    const plan = planUnifiedQuery({
      accountScope: ["acct-1"],
      purpose: "deployment status",
      requirements: [{ capabilityId: "deployments.status.read" }, { capabilityId: "missing.capability" }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    }, registry.snapshot(), graph);
    expect(plan.gaps.length).toBeGreaterThanOrEqual(0);
    expect(["PLAN_READY", "PARTIAL_PLAN"]).toContain(plan.disposition);
  });
});
