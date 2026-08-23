import { describe, expect, it } from "vitest";
import type { RuntimeIdentityProjection } from "../automationRuntimeContracts";
import { AutomationRuntimeIdentityPanel } from "./AutomationRuntimeIdentityPanel";

function renderToText(node: unknown): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderToText).join("");
  if (typeof node === "object" && "type" in (node as Record<string, unknown>)) {
    const element = node as { type: unknown; props?: { children?: unknown } };
    if (typeof element.type === "function") {
      return renderToText((element.type as (props: unknown) => unknown)(element.props));
    }
    return renderToText(element.props?.children);
  }
  return "";
}

describe("AutomationRuntimeIdentityPanel", () => {
  it("displays runtime, session, workflow identity with friendly names (default collapsed view)", () => {
    const identity: RuntimeIdentityProjection = {
      runtimeId: "p16rt-fixture-PAUSED",
      runtimeSessionId: "p16sess-fixture-PAUSED",
      workflowId: "wf-p17-fixture-0000000000000000",
      supervisingUserId: "Rahul Kumar",
      initiatingCharacterId: "onyx",
      initiatingPresenceMode: "ONYX",
      activeAgentId: "onyx-agent-primary",
      assignedAgentIds: ["onyx-agent-primary"],
      activeLaneId: "lane-standard-1",
      laneCount: 1,
      promotionLaneActive: false,
    };
    const text = renderToText(AutomationRuntimeIdentityPanel({ identity }));
    // Default view should show friendly names
    expect(text).toContain("Paused");
    expect(text).toContain("Rahul Kumar");
    expect(text).toContain("ONYX");
    expect(text).toContain("onyx-agent-primary");
    // Technical details section should be available but collapsed
    expect(text).toContain("Show Automation Center technical details");
  });

  it("states that identity fields grant no approval authority", () => {
    const identity: RuntimeIdentityProjection = {
      runtimeId: "p16rt-fixture-PAUSED",
      runtimeSessionId: "p16sess-fixture-PAUSED",
      workflowId: "wf-p17-fixture-0000000000000000",
      supervisingUserId: "Rahul Kumar",
      initiatingPresenceMode: "UNASSIGNED",
      laneCount: 1,
      promotionLaneActive: false,
    };
    const text = renderToText(AutomationRuntimeIdentityPanel({ identity }));
    expect(text).toContain("Grants No Approval Authority");
    expect(text).toContain("only the Phase 1A.5 approval package authorizes any");
  });

  it("renders only permission-checked, redacted shared-task references", () => {
    const identity: RuntimeIdentityProjection = {
      runtimeId: "p16rt-fixture-PAUSED",
      runtimeSessionId: "p16sess-fixture-PAUSED",
      workflowId: "wf-p17-fixture-0000000000000000",
      supervisingUserId: "Rahul Kumar",
      initiatingPresenceMode: "ONYX_NOVA_COUNCIL",
      laneCount: 1,
      promotionLaneActive: false,
      sharedTaskReferences: [{ taskId: "task-a", permissionGranted: true, redactedSummary: "Redacted shared task summary" }],
    };
    const text = renderToText(AutomationRuntimeIdentityPanel({ identity }));
    expect(text).toContain("Redacted shared task summary");
    expect(text).not.toContain("UNREDACTED_PRIVATE_MEMORY_MARKER");
  });

  it("displays 'No Active Agent' when activeAgentId is not set", () => {
    const identity: RuntimeIdentityProjection = {
      runtimeId: "p16rt-fixture-PAUSED",
      runtimeSessionId: "p16sess-fixture-PAUSED",
      workflowId: "wf-p17-fixture-0000000000000000",
      supervisingUserId: "Test User",
      initiatingPresenceMode: "SYSTEM",
      laneCount: 1,
      promotionLaneActive: false,
    };
    const text = renderToText(AutomationRuntimeIdentityPanel({ identity }));
    expect(text).toContain("No Active Agent");
  });

  it("displays 'No Assigned Agents' when assignedAgentIds is empty", () => {
    const identity: RuntimeIdentityProjection = {
      runtimeId: "p16rt-fixture-PAUSED",
      runtimeSessionId: "p16sess-fixture-PAUSED",
      workflowId: "wf-p17-fixture-0000000000000000",
      supervisingUserId: "Test User",
      initiatingPresenceMode: "SYSTEM",
      laneCount: 1,
      promotionLaneActive: false,
      assignedAgentIds: [],
    };
    const text = renderToText(AutomationRuntimeIdentityPanel({ identity }));
    expect(text).toContain("No Assigned Agents");
  });

  it("shows technical details section with raw IDs available", () => {
    const identity: RuntimeIdentityProjection = {
      runtimeId: "p16rt-fixture-PAUSED",
      runtimeSessionId: "p16sess-fixture-PAUSED",
      workflowId: "wf-p17-fixture-0000000000000000",
      supervisingUserId: "Rahul Kumar",
      initiatingCharacterId: "onyx",
      initiatingPresenceMode: "ONYX",
      activeAgentId: "onyx-agent-primary",
      assignedAgentIds: ["onyx-agent-primary"],
      activeLaneId: "lane-standard-1",
      laneCount: 1,
      promotionLaneActive: false,
    };
    const text = renderToText(AutomationRuntimeIdentityPanel({ identity }));
    // Technical details section should be available with labels and raw values
    expect(text).toContain("Show Automation Center technical details");
    expect(text).toContain("Runtime ID");
    expect(text).toContain("Runtime Session ID");
    expect(text).toContain("Workflow ID");
    expect(text).toContain("Presence Mode Code");
    expect(text).toContain("p16rt-fixture-PAUSED");
    expect(text).toContain("p16sess-fixture-PAUSED");
    expect(text).toContain("wf-p17-fixture-0000000000000000");
  });
});
