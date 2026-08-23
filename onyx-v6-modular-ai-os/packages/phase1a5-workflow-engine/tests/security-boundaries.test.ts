import { describe, expect, it } from "vitest";
import { rejectArbitraryCommand, rejectProhibitedOperation } from "../src/executor-contract";
import { EvidenceTimeline } from "../src/evidence-timeline";
import { EXECUTION_LANE_LIMIT, PROHIBITED_OPERATIONS } from "../src/contracts";

describe("security boundaries", () => {
  it("keeps prohibited operations unavailable and lane limit at one", () => {
    expect(EXECUTION_LANE_LIMIT).toBe(1);
    expect(PROHIBITED_OPERATIONS).toContain("MERGE");
    expect(() => rejectProhibitedOperation("MERGE")).toThrow();
    expect(() => rejectArbitraryCommand("git push")).toThrow();
    expect(() => rejectArbitraryCommand({ command: "rm -rf" })).toThrow();
  });
  it("redacts credential-like evidence and preserves resource references", () => {
    const timeline = new EvidenceTimeline();
    const entry = timeline.add({ workflowId: "wf", stateTransition: "A->B", stepId: "x", actor: "Rahul Kumar", capability: "RUN_VALIDATION", approvalDigest: "a", scopeHash: "s", inputDigest: "i", outputDigest: "o", providerClassification: "DETERMINISTIC_SUCCESS", resourceReferences: ["local://x"], timestamp: new Date().toISOString(), checkpointDigest: "c", detail: "token=abc123 password=hunter2" });
    expect(entry.redactedDetail).not.toContain("abc123");
    expect(entry.redactedDetail).not.toContain("hunter2");
    expect(entry.resourceReferences).toEqual(["local://x"]);
  });
});
