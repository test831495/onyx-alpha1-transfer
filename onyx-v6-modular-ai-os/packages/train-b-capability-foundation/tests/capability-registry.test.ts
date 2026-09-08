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

  it("rejects duplicate capability version", () => {
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
    })).toThrow();
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
});
