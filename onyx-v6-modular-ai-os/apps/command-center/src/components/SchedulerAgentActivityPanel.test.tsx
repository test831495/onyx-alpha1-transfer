/**
 * Phase 1A.9 Scheduler Agent Activity Panel Tests
 */

import { describe, it, expect } from "vitest";
import { SchedulerAgentActivityPanel } from "./SchedulerAgentActivityPanel";
import { createEmptySchedulerProjection } from "@onyx/phase1a9-governed-scheduler";

interface TestElement {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
}

function renderToText(element: unknown): string {
  if (element === null || element === undefined) return "";
  if (typeof element === "string" || typeof element === "number") return String(element);

  const obj = element as TestElement;
  if (!obj.type) return "";

  let text = "";
  if (obj.props?.children) {
    const children = Array.isArray(obj.props.children)
      ? obj.props.children
      : [obj.props.children];
    for (const child of children) {
      text += renderToText(child);
    }
  }

  return text;
}

describe("SchedulerAgentActivityPanel", () => {
  const mockProjection = createEmptySchedulerProjection("test-proj", 1000);

  it("should render agent activity panel", () => {
    const element = SchedulerAgentActivityPanel({ projection: mockProjection });
    expect(element).toBeDefined();
  });

  it("should include section aria-label", () => {
    const element = SchedulerAgentActivityPanel({ projection: mockProjection }) as TestElement;
    expect(element.props["aria-label"]).toBe("Agent activity panel");
  });

  it("should render loading state", () => {
    const element = SchedulerAgentActivityPanel({
      projection: mockProjection,
      isLoading: true,
    }) as TestElement;
    expect(element.props["aria-busy"]).toBeTruthy();
  });

  it("should display lease counts", () => {
    const element = SchedulerAgentActivityPanel({ projection: mockProjection });
    const text = renderToText(element);
    expect(text).toContain("Active Leases");
  });

  it("should display heartbeat status", () => {
    const element = SchedulerAgentActivityPanel({ projection: mockProjection });
    const text = renderToText(element);
    expect(text).toContain("Healthy Heartbeats");
  });

  it("should display stale indicators", () => {
    const element = SchedulerAgentActivityPanel({ projection: mockProjection });
    const text = renderToText(element);
    expect(text).toContain("Stale Heartbeats");
  });

  it("should note no sensitive content", () => {
    const element = SchedulerAgentActivityPanel({ projection: mockProjection });
    const text = renderToText(element);
    expect(text).toContain("No worker identity");
  });
});
