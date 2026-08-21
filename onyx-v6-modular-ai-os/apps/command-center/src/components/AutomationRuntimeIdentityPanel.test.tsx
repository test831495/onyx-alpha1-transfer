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
  it("displays runtime, session, workflow identity, presence mode, and lane fields", () => {
    const identity: RuntimeIdentityProjection = {
      runtimeId: "p16rt-test",
      runtimeSessionId: "p16sess-test",
      workflowId: "wf-test",
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
    expect(text).toContain("p16rt-test");
    expect(text).toContain("p16sess-test");
    expect(text).toContain("wf-test");
    expect(text).toContain("Rahul Kumar");
    expect(text).toContain("ONYX");
    expect(text).toContain("onyx-agent-primary");
  });

  it("states that identity fields grant no approval authority", () => {
    const identity: RuntimeIdentityProjection = {
      runtimeId: "p16rt-test",
      runtimeSessionId: "p16sess-test",
      workflowId: "wf-test",
      supervisingUserId: "Rahul Kumar",
      initiatingPresenceMode: "UNASSIGNED",
      laneCount: 1,
      promotionLaneActive: false,
    };
    const text = renderToText(AutomationRuntimeIdentityPanel({ identity }));
    expect(text).toContain("GRANTS NO APPROVAL AUTHORITY");
    expect(text).toContain("only the Phase 1A.5 approval package authorizes any");
    expect(text).toContain("Unassigned");
  });

  it("renders only permission-checked, redacted shared-task references", () => {
    const identity: RuntimeIdentityProjection = {
      runtimeId: "p16rt-test",
      runtimeSessionId: "p16sess-test",
      workflowId: "wf-test",
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
});
