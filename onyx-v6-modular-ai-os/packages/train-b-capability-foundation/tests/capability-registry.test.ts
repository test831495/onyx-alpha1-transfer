import { describe, expect, it } from "vitest";
import { createCapabilityRegistry, registerCapability, validateCapabilityDefinition } from "../src/index";

describe("capability registry red tests", () => {
  it("registers a valid provider-neutral read capability", () => {
    const registry = createCapabilityRegistry();
    const result = registerCapability(registry, {
      id: "calendar.events.read",
      version: "1.0.0",
      label: "Calendar events read",
      description: "Read calendar events",
      domain: "calendar",
      operations: ["READ"],
      riskClass: "LOW",
      inputContractIds: ["calendar.events.read.input"],
      outputContractIds: ["calendar.events.read.output"],
      dataClasses: ["CALENDAR_EVENT"],
      freshnessRequirement: "CURRENT",
      sourceAttributionRequired: true,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "ACTIVE",
      runtimeEnabled: true,
      owner: "Rahul",
      purpose: "read-only schedule data",
      providerNeutralImplementation: true,
    });
    expect(result.snapshot().byId["calendar.events.read"]).toBeDefined();
  });

  it("rejects duplicate capability ID with accurate semantics and allows same-version alternate IDs", () => {
    const registry = createCapabilityRegistry();
    registerCapability(registry, {
      id: "mail.messages.read",
      version: "1.0.0",
      label: "Mail read",
      description: "Read mail messages",
      domain: "mail",
      operations: ["READ"],
      riskClass: "LOW",
      inputContractIds: [],
      outputContractIds: ["mail.messages.read.output"],
      dataClasses: ["EMAIL_MESSAGE"],
      freshnessRequirement: "CURRENT",
      sourceAttributionRequired: true,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "ACTIVE",
      runtimeEnabled: true,
      owner: "Rahul",
      purpose: "read mailbox",
      providerNeutralImplementation: true,
    });

    expect(() => registerCapability(registry, {
      id: "mail.messages.read",
      version: "1.0.0",
      label: "Mail read duplicate",
      description: "Duplicate",
      domain: "mail",
      operations: ["READ"],
      riskClass: "LOW",
      inputContractIds: [],
      outputContractIds: ["mail.messages.read.output"],
      dataClasses: ["EMAIL_MESSAGE"],
      freshnessRequirement: "CURRENT",
      sourceAttributionRequired: true,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "ACTIVE",
      runtimeEnabled: true,
      owner: "Rahul",
      purpose: "duplicate",
      providerNeutralImplementation: true,
    })).toThrow(/duplicate capability ID/i);

    expect(() => registerCapability(registry, {
      id: "mail.messages.read",
      version: "1.0.1",
      label: "Mail read v2",
      description: "Different version",
      domain: "mail",
      operations: ["READ"],
      riskClass: "LOW",
      inputContractIds: [],
      outputContractIds: ["mail.messages.read.output"],
      dataClasses: ["EMAIL_MESSAGE"],
      freshnessRequirement: "CURRENT",
      sourceAttributionRequired: true,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "ACTIVE",
      runtimeEnabled: true,
      owner: "Rahul",
      purpose: "different version",
      providerNeutralImplementation: true,
    })).toThrow(/duplicate capability ID/i);

    expect(() => registerCapability(registry, {
      id: "mail.messages.write",
      version: "1.0.0",
      label: "Mail write",
      description: "Different ID same version",
      domain: "mail",
      operations: ["WRITE"],
      riskClass: "LOW",
      inputContractIds: [],
      outputContractIds: ["mail.messages.write.output"],
      dataClasses: ["EMAIL_MESSAGE"],
      freshnessRequirement: "CURRENT",
      sourceAttributionRequired: true,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "ACTIVE",
      runtimeEnabled: true,
      owner: "Rahul",
      purpose: "write mailbox",
      providerNeutralImplementation: true,
    })).not.toThrow();
  });

  it("rejects provider-branded canonical IDs", () => {
    const result = validateCapabilityDefinition({
      id: "microsoft.outlook.mail.read",
      version: "1.0.0",
      label: "Outlook mail read",
      description: "Should fail",
      domain: "mail",
      operations: ["READ"],
      riskClass: "LOW",
      inputContractIds: [],
      outputContractIds: ["mail.output"],
      dataClasses: ["EMAIL_MESSAGE"],
      freshnessRequirement: "CURRENT",
      sourceAttributionRequired: true,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "ACTIVE",
      runtimeEnabled: true,
      owner: "Rahul",
      purpose: "read-only",
      providerNeutralImplementation: true,
    });
    expect(result.valid).toBe(false);
  });

  it("fails closed for malformed definitions instead of throwing", () => {
    const result = validateCapabilityDefinition(null as any);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("accepts the required fixture-only capability IDs without granting authority", () => {
    const registry = createCapabilityRegistry();
    registerCapability(registry, {
      id: "repositories.pull_requests.read",
      version: "1.0.0",
      label: "PRs read",
      description: "Read pull requests",
      domain: "repositories",
      operations: ["READ"],
      riskClass: "MEDIUM",
      inputContractIds: [],
      outputContractIds: ["repositories.pull_requests.read.output"],
      dataClasses: ["REPOSITORY"],
      freshnessRequirement: "CURRENT",
      sourceAttributionRequired: true,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "ACTIVE",
      runtimeEnabled: true,
      owner: "Rahul",
      purpose: "read PR metadata",
      providerNeutralImplementation: true,
    });
    registerCapability(registry, {
      id: "applications.close",
      version: "1.0.0",
      label: "Close application",
      description: "Close an app surface",
      domain: "applications",
      operations: ["EXECUTION"],
      riskClass: "LOW",
      inputContractIds: [],
      outputContractIds: ["applications.close.output"],
      dataClasses: ["APPLICATION"],
      freshnessRequirement: "NOT_ASSESSABLE",
      sourceAttributionRequired: false,
      costClass: "LOW",
      dependencies: [],
      conflicts: [],
      lifecycleState: "ACTIVE",
      runtimeEnabled: true,
      owner: "Rahul",
      purpose: "close app",
      providerNeutralImplementation: true,
    });
    expect(registry.has("repositories.pull_requests.read")).toBe(true);
    expect(registry.has("applications.close")).toBe(true);
    expect(registry.snapshot().byId["applications.close"]?.operations).toContain("EXECUTION");
  });
});
