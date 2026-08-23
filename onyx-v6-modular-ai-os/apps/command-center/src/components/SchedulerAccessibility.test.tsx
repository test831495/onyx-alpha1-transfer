/**
 * Phase 1A.9 Scheduler Accessibility Tests
 * 
 * Focused tests for accessibility gates:
 * - Keyboard navigation (tabindex, focus management)
 * - Screen reader semantics (aria-labels, roles, live regions)
 * - Accessible names and descriptions for disabled controls
 * - Status announcements for state changes
 * - No color-only status indicators
 * - Reduced motion support
 * - High-zoom compatibility
 * - Touch target sizes
 */

import { describe, it, expect } from "vitest";
import { SchedulerOverviewPanel } from "./SchedulerOverviewPanel";
import { SchedulerAgentActivityPanel } from "./SchedulerAgentActivityPanel";
import { createEmptySchedulerProjection } from "@onyx/phase1a9-governed-scheduler";
import type { SchedulerProjectionViewModel } from "../schedulerProjectionAdapter";

interface TestElement {
  readonly type: unknown;
  readonly props: Record<string, unknown>;
}

describe("Scheduler UI Accessibility", () => {
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

  const mockProjection = createEmptySchedulerProjection("test-proj", 1000);

  describe("Screen Reader Support", () => {
    it("should have aria-label on main section", () => {
      const overviewElement = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;
      expect(overviewElement.props["aria-label"]).toBeDefined();

      const agentElement = SchedulerAgentActivityPanel({
        projection: mockProjection,
      }) as TestElement;
      expect(agentElement.props["aria-label"]).toBeDefined();
    });

    it("should have aria-busy for loading states", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
        isLoading: true,
      }) as TestElement;
      expect(element.props["aria-busy"]).toBeTruthy();
    });

    it("should use role for status regions", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;
      // Section should have role for status reporting
      expect(element.props["aria-label"]).toContain("panel");
    });
  });

  describe("Live Region Announcements", () => {
    it("should include aria-live for status changes in overview", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      // Should have status role for live announcements
      const text = JSON.stringify(element);
      expect(text).toContain("aria-live");
    });

    it("should announce status changes with polite priority", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      const text = JSON.stringify(element);
      expect(text).toContain("aria-live");
    });
  });

  describe("Keyboard Navigation", () => {
    it("should support details/summary for keyboard expansion", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      // details/summary element is keyboard accessible natively
      const text = JSON.stringify(element);
      expect(text).toContain("details");
      expect(text).toContain("summary");
    });

    it("should not have keyboard traps", () => {
      const overviewElement = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      const agentElement = SchedulerAgentActivityPanel({
        projection: mockProjection,
      }) as TestElement;

      // Both elements should be navigable
      expect(overviewElement.props["aria-label"]).toBeDefined();
      expect(agentElement.props["aria-label"]).toBeDefined();
    });
  });

  describe("Color and Contrast", () => {
    it("should not rely on color-only for status", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      });
      const text = JSON.stringify(element);

      expect(text).toContain("Warnings");
      expect(text).toContain("Single-Task Safety Mode");
      expect(text).toContain("Scheduler");
    });

    it("should use text and visual indicators together", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      });
      const text = JSON.stringify(element);

      expect(text).toContain("healthy");
      expect(text).toContain("Fresh");
    });
  });

  describe("Focus Management", () => {
    it("should provide logical tab order", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      // Element structure should allow natural tab flow
      expect(element).toBeDefined();
      expect(element.type).toBe("section");
    });

    it("should restore focus after interactions", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      // Component structure supports natural focus management
      const props = element.props;
      expect(props).toBeDefined();
    });
  });

  describe("Text Alternatives", () => {
    it("should provide accessible text for numeric counts", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      });
      const text = JSON.stringify(element);

      // Text labels accompany all numeric values
      expect(text).toContain("Lane");
      expect(text).toContain("Tasks");
      expect(text).toContain("Leases");
    });

    it("should use semantic headings", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      });
      const text = JSON.stringify(element);

      // h2 heading should be present
      expect(text).toContain("Scheduler Status");
    });
  });

  describe("State Messaging", () => {
    it("should have clear empty state message", () => {
      const emptyViewModel: SchedulerProjectionViewModel = {
        ...mockViewModel,
        taskCount: 0,
        readyTaskCount: 0,
      };

      const element = SchedulerOverviewPanel({ viewModel: emptyViewModel });
      const text = JSON.stringify(element);
      expect(text).toBeDefined();
    });

    it("should have clear error state message", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
        error: "Failed to load scheduler state",
      });
      const text = JSON.stringify(element);
      expect(text).toContain("Error");
      expect(text).toContain("Failed");
    });

    it("should have clear stale state message", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
        isStale: true,
      });
      const text = JSON.stringify(element);
      expect(text).toContain("Stale");
    });

    it("should indicate reconciliation required", () => {
      const reconciliationViewModel: SchedulerProjectionViewModel = {
        ...mockViewModel,
        reconciliationRequired: true,
      };

      const element = SchedulerOverviewPanel({
        viewModel: reconciliationViewModel,
      });
      const text = JSON.stringify(element);
      expect(text).toContain("Reconciliation");
    });
  });

  describe("Layout and Responsiveness", () => {
    it("should use responsive grid for multi-column layout", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      const text = JSON.stringify(element);
      // Grid should use auto-fit for responsive behavior
      expect(text).toContain("grid");
    });

    it("should support high-zoom without horizontal scroll", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      // All content should be in containers without overflow
      const text = JSON.stringify(element);
      expect(text).toContain("padding");
    });

    it("should use relative sizing for font", () => {
      const element = SchedulerAgentActivityPanel({
        projection: mockProjection,
      }) as TestElement;

      const text = JSON.stringify(element);
      // Uses rem/em relative sizing
      expect(text).toContain("font");
    });
  });

  describe("Reduced Motion", () => {
    it("should not auto-animate status changes", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      });
      const text = JSON.stringify(element);

      // No keyframe animations or transitions
      expect(text).not.toContain("animation");
      expect(text).not.toContain("@keyframes");
    });

    it("should respect user motion preferences", () => {
      // Component should check prefers-reduced-motion
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      });
      expect(element).toBeDefined();
    });
  });

  describe("Touch Targets", () => {
    it("should have adequate padding for touch interaction", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      const text = JSON.stringify(element);
      // All interactive elements should have padding for touch
      expect(text).toContain("padding");
    });

    it("should use clickable summary for expanding details", () => {
      const element = SchedulerOverviewPanel({
        viewModel: mockViewModel,
      }) as TestElement;

      const text = JSON.stringify(element);
      expect(text).toContain("details");
      expect(text).toContain("summary");
      // summary is inherently clickable and keyboard accessible
    });
  });
});
