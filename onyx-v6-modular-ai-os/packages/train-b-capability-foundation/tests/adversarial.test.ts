import { describe, expect, it } from "vitest";
import { createCapabilityRegistry } from "../src/capability-registry";
import { validateCapabilityDefinition } from "../src/validators";

const valid = {
  id: "files.search",
  version: "1.0.0",
  label: "Files search",
  description: "Search files",
  domain: "files",
  operations: ["READ"],
  riskClass: "LOW",
  inputContractIds: [],
  outputContractIds: [],
  dataClasses: ["FILE"],
  freshnessRequirement: "CURRENT",
  sourceAttributionRequired: true,
  costClass: "LOW",
  dependencies: [],
  conflicts: [],
  lifecycleState: "ACTIVE",
  runtimeEnabled: true,
  owner: "Rahul",
  purpose: "search files",
  providerNeutralImplementation: true,
} as const;

describe("adversarial validation", () => {
  it("fails closed on hostile input", () => {
    const bad = {
      ...valid,
      id: "microsoft.graph.mail.read",
      operations: ["WRITE", "READ"],
      dataClasses: Array.from({ length: 40 }, (_, index) => `TYPE_${index}`),
    };
    expect(validateCapabilityDefinition(bad as any).valid).toBe(false);
  });

  it("rejects a disguised write semantics capability", () => {
    expect(validateCapabilityDefinition({ ...valid, id: "calendar.events.read", operations: ["WRITE"], providerNeutralImplementation: true }).valid).toBe(false);
  });

  it("rejects invalid lifecycle and risk vocabulary", () => {
    expect(validateCapabilityDefinition({ ...valid, lifecycleState: "UNKNOWN" as any, riskClass: "INVALID" as any }).valid).toBe(false);
  });

  it("rejects null-like malicious objects via fail-closed validation", () => {
    expect(() => createCapabilityRegistry().register((null as any))).toThrow();
  });
});
