import { describe, expect, it } from "vitest";
import { AdapterRegistry, type CapabilityAdapter } from "../src/adapter-registry";
import { CAPABILITIES, RUNTIME_EXECUTION_LANE_LIMIT, defaultRuntimeFlags, rejectArbitraryRuntimeCommand, type Capability } from "../src/contracts";
import type { ExecutorResult } from "@onyx/phase1a5-workflow-engine";
import { EvidenceTimeline } from "@onyx/phase1a5-workflow-engine";

class StubAdapter implements CapabilityAdapter {
  constructor(readonly capability: Capability) {}
  async invoke(): Promise<ExecutorResult> {
    return { classification: "DETERMINISTIC_SUCCESS" };
  }
}

describe("Phase 1A.6 security boundaries", () => {
  it("registers capability-specific adapters", () => {
    const registry = new AdapterRegistry();
    for (const capability of CAPABILITIES) registry.register(new StubAdapter(capability));
    expect(registry.registeredCapabilities().sort()).toEqual([...CAPABILITIES].sort());
  });

  it("rejects a missing adapter", () => {
    const registry = new AdapterRegistry();
    expect(() => registry.resolve("CREATE_GITHUB_ISSUE")).toThrow();
  });

  it("rejects duplicate capability registration", () => {
    const registry = new AdapterRegistry();
    registry.register(new StubAdapter("CREATE_GITHUB_ISSUE"));
    expect(() => registry.register(new StubAdapter("CREATE_GITHUB_ISSUE"))).toThrow();
  });

  it("rejects an unsupported capability", () => {
    const registry = new AdapterRegistry();
    expect(() => registry.register(new StubAdapter("DELETE_BRANCH" as Capability))).toThrow();
    expect(() => registry.resolve("DELETE_BRANCH" as Capability)).toThrow();
  });

  it("exposes no arbitrary command or shell execution method on the registry", () => {
    const registry = new AdapterRegistry();
    expect((registry as unknown as { execute?: unknown }).execute).toBeUndefined();
    expect((registry as unknown as { runCommand?: unknown }).runCommand).toBeUndefined();
    expect((registry as unknown as { shell?: unknown }).shell).toBeUndefined();
  });

  it("rejects arbitrary command and shell string input", () => {
    expect(() => rejectArbitraryRuntimeCommand("git push")).toThrow();
    expect(() => rejectArbitraryRuntimeCommand({ command: "rm -rf" })).toThrow();
    expect(() => rejectArbitraryRuntimeCommand({ shell: "echo hi" })).toThrow();
  });

  it("keeps the execution lane limit at one", () => {
    expect(RUNTIME_EXECUTION_LANE_LIMIT).toBe(1);
  });

  it("keeps merge, production, force push, and branch deletion permanently false", () => {
    const flags = defaultRuntimeFlags();
    expect(flags.mergeAllowed).toBe(false);
    expect(flags.productionDeployAllowed).toBe(false);
    expect(flags.forcePushAllowed).toBe(false);
    expect(flags.branchDeletionAllowed).toBe(false);
  });

  it("redacts credential-like evidence detail while preserving resource references", () => {
    const timeline = new EvidenceTimeline();
    const entry = timeline.add({
      workflowId: "wf-1",
      stateTransition: "A->B",
      stepId: "CREATE_GITHUB_ISSUE",
      actor: "Rahul Kumar",
      capability: "CREATE_GITHUB_ISSUE",
      approvalDigest: "approval-digest",
      scopeHash: "scope-hash",
      inputDigest: "input-digest",
      outputDigest: "output-digest",
      providerClassification: "DETERMINISTIC_SUCCESS",
      resourceReferences: ["local://issue"],
      timestamp: "2026-01-01T00:00:00.000Z",
      checkpointDigest: "checkpoint-digest",
      detail: "token=abc123 password=hunter2 authorization: Bearer xyz",
    });
    expect(entry.redactedDetail).not.toContain("abc123");
    expect(entry.redactedDetail).not.toContain("hunter2");
    expect(entry.redactedDetail).not.toContain("Bearer xyz");
    expect(entry.resourceReferences).toEqual(["local://issue"]);
  });
});
