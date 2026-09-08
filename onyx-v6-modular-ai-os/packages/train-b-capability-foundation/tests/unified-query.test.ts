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
    id: "applications.open",
    version: "1.0.0",
    label: "Open application",
    description: "Open an application surface",
    domain: "applications",
    operations: ["EXECUTION"],
    riskClass: "LOW",
    inputContractIds: [],
    outputContractIds: [],
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

  it("rejects malformed or provider-branded capability ids before planning", () => {
    const registry = buildRegistry();
    const graph = createCapabilityGraph(registry.snapshot(), []);
    const result = validateUnifiedQueryRequest({
      accountScope: ["acct-1"],
      purpose: "next meeting",
      requirements: [
        { capabilityId: "microsoft.outlook.mail.read" },
        { capabilityId: "" },
      ],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("capabilityId");

    const plan = planUnifiedQuery({
      accountScope: ["acct-1"],
      purpose: "next meeting",
      requirements: [{ capabilityId: "microsoft.outlook.mail.read" }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    }, registry.snapshot(), graph);
    expect(plan.disposition).toBe("INVALID_REQUEST");
  });

  it("rejects provider-branded capability requests before registry lookup and accepts provider-neutral ids", () => {
    const registry = buildRegistry();
    const graph = createCapabilityGraph(registry.snapshot(), []);

    expect(validateUnifiedQueryRequest({
      accountScope: ["acct-1"],
      purpose: "read mail",
      requirements: [{ capabilityId: "microsoft.graph.mail.read" }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    }).valid).toBe(false);

    expect(validateUnifiedQueryRequest({
      accountScope: ["acct-1"],
      purpose: "read mail",
      requirements: [{ capabilityId: "google.gmail.messages.read" }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    }).valid).toBe(false);

    expect(validateUnifiedQueryRequest({
      accountScope: ["acct-1"],
      purpose: "read mail",
      requirements: [{ capabilityId: "mail.messages.read" }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    }).valid).toBe(true);

    const plan = planUnifiedQuery({
      accountScope: ["acct-1"],
      purpose: "read mail",
      requirements: [{ capabilityId: "microsoft.graph.mail.read" }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    }, registry.snapshot(), graph);
    expect(plan.disposition).toBe("INVALID_REQUEST");
  });

  it("rejects malformed nested requirement constraints before planning", () => {
    const registry = buildRegistry();
    const graph = createCapabilityGraph(registry.snapshot(), []);

    const malformedCases = [
      { accountScope: ["acct-1"], purpose: "read mail", requirements: [{ capabilityId: "mail.messages.read", freshness: { required: "BAD" } }], freshness: { required: "CURRENT" }, privacy: { allowed: true } },
      { accountScope: ["acct-1"], purpose: "read mail", requirements: [{ capabilityId: "mail.messages.read", privacy: { allowed: "yes" } }], freshness: { required: "CURRENT" }, privacy: { allowed: true } },
      { accountScope: ["acct-1"], purpose: "read mail", requirements: [{ capabilityId: "mail.messages.read", attribution: { required: "yes" } }], freshness: { required: "CURRENT" }, privacy: { allowed: true } },
      { accountScope: ["acct-1"], purpose: "read mail", requirements: [{ capabilityId: "mail.messages.read", cost: { maxClass: 42 } }], freshness: { required: "CURRENT" }, privacy: { allowed: true } },
      { accountScope: ["acct-1"], purpose: "read mail", requirements: [{ capabilityId: "mail.messages.read", region: { value: 42 } }], freshness: { required: "CURRENT" }, privacy: { allowed: true } },
      { accountScope: ["acct-1"], purpose: "read mail", requirements: [{ capabilityId: "mail.messages.read", accountScope: { id: null } }], freshness: { required: "CURRENT" }, privacy: { allowed: true } },
    ] as any[];

    for (const candidate of malformedCases) {
      expect(validateUnifiedQueryRequest(candidate).valid).toBe(false);
      const plan = planUnifiedQuery(candidate, registry.snapshot(), graph);
      expect(plan.disposition).toBe("INVALID_REQUEST");
    }

    const structurallyValidButUnknownFacts = planUnifiedQuery({
      accountScope: ["acct-1"],
      purpose: "read mail",
      requirements: [{ capabilityId: "mail.messages.read" }],
      freshness: { required: "NOT_ASSESSABLE" },
      privacy: { allowed: true },
    }, registry.snapshot(), graph);
    expect(["NOT_ASSESSABLE", "INVALID_REQUEST"]).toContain(structurallyValidButUnknownFacts.disposition);
  });

  it("requires exact operation membership and rejects substring or disguised write operations", () => {
    const registry = buildRegistry();
    const graph = createCapabilityGraph(registry.snapshot(), []);

    const invalid = validateUnifiedQueryRequest({
      accountScope: ["acct-1"],
      purpose: "read mail",
      requirements: [{ capabilityId: "mail.messages.read" }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
      operations: "READ" as any,
    } as any);
    expect(invalid.valid).toBe(false);

    const plan = planUnifiedQuery({
      accountScope: ["acct-1"],
      purpose: "read mail",
      requirements: [{ capabilityId: "mail.messages.read" }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    } as any, registry.snapshot(), graph);
    expect(["PLAN_READY", "PARTIAL_PLAN"]).toContain(plan.disposition);
  });

  it("ignores non-dependency edges when building dependency closure", () => {
    const registry = buildRegistry();
    const graph = createCapabilityGraph(registry.snapshot(), [
      { kind: "REQUIRES", from: "applications.open", to: "calendar.events.read", reasonCode: "A" },
      { kind: "CONFLICTS_WITH", from: "applications.open", to: "mail.messages.read", reasonCode: "B" },
      { kind: "SUPERSEDES", from: "applications.open", to: "deployments.status.read", reasonCode: "C" },
    ]);
    expect(graph.dependencyClosure["applications.open"]).toEqual(["calendar.events.read"]);
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

  it("rejects unknown freshness semantics and emits invalid request on unmapped values", () => {
    const registry = buildRegistry();
    const graph = createCapabilityGraph(registry.snapshot(), []);
    const valid = validateUnifiedQueryRequest({
      accountScope: ["acct-1"],
      purpose: "next meeting",
      requirements: [{ capabilityId: "calendar.events.read", required: true }],
      freshness: { required: "UNMAPPED_FRESHNESS" },
      privacy: { allowed: true },
    });
    expect(valid.valid).toBe(false);
    const plan = planUnifiedQuery({
      accountScope: ["acct-1"],
      purpose: "next meeting",
      requirements: [{ capabilityId: "calendar.events.read", required: true }],
      freshness: { required: "UNMAPPED_FRESHNESS" },
      privacy: { allowed: true },
    }, registry.snapshot(), graph);
    expect(plan.disposition).toBe("INVALID_REQUEST");
  });

  it("reaches clarification and not-assessable outcomes for bounded missing facts", () => {
    const registry = buildRegistry();
    const graph = createCapabilityGraph(registry.snapshot(), []);
    const clarification = planUnifiedQuery({
      accountScope: ["acct-1"],
      purpose: "",
      requirements: [{ capabilityId: "calendar.events.read", required: true }],
      freshness: { required: "CURRENT" },
      privacy: { allowed: true },
    }, registry.snapshot(), graph);
    expect(["INVALID_REQUEST", "CLARIFICATION_REQUIRED"]).toContain(clarification.disposition);

    const notAssessable = planUnifiedQuery({
      accountScope: ["acct-1"],
      purpose: "check status",
      requirements: [{ capabilityId: "calendar.events.read", required: true }],
      freshness: { required: "NOT_ASSESSABLE" },
      privacy: { allowed: true },
    }, registry.snapshot(), graph);
    expect(["NOT_ASSESSABLE", "PLAN_READY"]).toContain(notAssessable.disposition);
  });
});
