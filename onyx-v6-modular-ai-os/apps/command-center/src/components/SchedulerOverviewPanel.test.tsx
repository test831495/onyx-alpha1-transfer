/**
 * Phase 1A.9 Scheduler Overview Panel Tests
 * 
 * Focused tests for UI rendering:
 * - All required scheduler fields render
 * - Accessibility labels and live regions render
 * - Loading and error states render
 * - Stale state indicator renders
 * - No execution handlers
 */

import { describe, it, expect } from "vitest";
import { SchedulerOverviewPanel } from "./SchedulerOverviewPanel";
import type { SchedulerProjectionViewModel } from "../schedulerProjectionAdapter";

interface TestElement {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
}

/**
 * Simple test helper to extract text content from a React element.
 * Works with stateless components that return JSX objects.
 */
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

describe("SchedulerOverviewPanel", () => {
  const mockViewModel: SchedulerProjectionViewModel = {
    schedulerProjectionId: "proj-1",
    workflowId: "workflow-1",
    runtimeId: "runtime-1",
    schedulerEnabled: false,
    activeLaneStage: "S0_SINGLE",
    runtimeLaneLimit: 1,
    promotionLaneLimit: 1,
    schedulerHealthStatus: "HEALTHY",
    taskCount: 5,
    readyTaskCount: 2,
    activeLeaseCount: 1,
    warningCount: 0,
    blockingDecisionCount: 0,
    stalenessStatus: "FRESH",
    lastEvaluatedAtMs: 1000,
    pendingApprovalCount: 0,
    reconciliationRequired: false,
    projectionUpdatedAt: "2026-08-21T00:00:01.000Z",
  };

  it("should render with required props", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    expect(element).toBeDefined();
    expect(element.type).toBe("section");
  });

  it("should include section aria-label", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel }) as TestElement;
    expect(element.props["aria-label"]).toBe("Scheduler overview panel");
  });

  it("should render scheduler disabled state", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    const text = renderToText(element);
    expect(text).toContain("No");
  });

  it("should render S0_SINGLE lane stage", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    const text = renderToText(element);
    expect(text).toContain("Single-Task Safety Mode");
  });

  it("should render lane limit as 1", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    const text = renderToText(element);
    expect(text).toContain("1");
  });

  it("should render ready task count", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    const text = renderToText(element);
    expect(text).toContain("2");
  });

  it("should render active lease count", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    const text = renderToText(element);
    expect(text).toContain("Active Leases");
  });

  it("should render warning count", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    const text = renderToText(element);
    expect(text).toContain("Warnings");
  });

  it("should render loading state with aria-busy", () => {
    const element = SchedulerOverviewPanel({
      viewModel: mockViewModel,
      isLoading: true,
    }) as TestElement;

    expect(element.props["aria-busy"]).toBeTruthy();
    const text = renderToText(element);
    expect(text).toContain("Loading");
  });

  it("should render error state with error message", () => {
    const errorMsg = "Failed to load scheduler";
    const element = SchedulerOverviewPanel({
      viewModel: mockViewModel,
      error: errorMsg,
    });
    const text = renderToText(element);
    expect(text).toContain(errorMsg);
    expect(text).toContain("Error");
  });

  it("should render stale indicator when isStale is true", () => {
    const element = SchedulerOverviewPanel({
      viewModel: mockViewModel,
      isStale: true,
    });
    const text = renderToText(element);
    expect(text).toContain("Stale");
  });

  it("should render health status label", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    const text = renderToText(element);
    expect(text).toContain("healthy");
  });

  it("should render reconciliation warning when required", () => {
    const stallingViewModel: SchedulerProjectionViewModel = {
      ...mockViewModel,
      reconciliationRequired: true,
    };
    const element = SchedulerOverviewPanel({ viewModel: stallingViewModel });
    const text = renderToText(element);
    expect(text).toContain("Reconciliation");
  });

  it("should render workflow and runtime IDs in details", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    const text = renderToText(element);
    expect(text).toContain("workflow-1");
    expect(text).toContain("runtime-1");
  });

  it("should render projection timestamp", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    const text = renderToText(element);
    expect(text).toContain("2026-08-21");
  });

  it("should have no execution handlers", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel }) as TestElement;
    const props = element.props || {};
    const keys = Object.keys(props);
    const hasHandler = keys.some(
      (k) =>
        typeof props[k] === "function" &&
        (k.includes("execute") || k.includes("run") || k.includes("dispatch"))
    );
    expect(hasHandler).toBe(false);
  });

  it("should render scheduler status role", () => {
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel }) as TestElement;
    const text = renderToText(element);
    // Verify status text is present
    expect(text).toContain("Scheduler");
  });

  it("should be stateless (no hooks)", () => {
    // This test verifies the component can be called directly without a renderer
    const element = SchedulerOverviewPanel({ viewModel: mockViewModel });
    expect(element).toBeDefined();
    expect(typeof element).toBe("object");
    // If it were using hooks, calling it directly would throw
  });
});
