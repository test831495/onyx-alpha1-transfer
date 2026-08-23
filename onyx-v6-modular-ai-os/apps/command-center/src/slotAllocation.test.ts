import { describe, expect, it } from "vitest";
import { allocateCardSlots, allocateVisibleAndOverflow } from "./shellState";

describe("Card slot allocation and overflow", () => {
  describe("Six visible slots", () => {
    it("allocates exactly one position per visible app", () => {
      const visible: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation"] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const slots = allocateCardSlots(visible, undefined);

      expect(slots.size).toBe(6);
      expect(Array.from(slots.values()).length).toBe(6);
    });

    it("assigns unique deterministic positions", () => {
      const visible: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation"] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const slots = allocateCardSlots(visible, undefined);

      const positions = Array.from(slots.values());
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(6); // All unique
    });

    it("respects deterministic order: LEFT_TOP, LEFT_MIDDLE, LEFT_BOTTOM, RIGHT_TOP, RIGHT_MIDDLE, RIGHT_BOTTOM", () => {
      const visible: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation"] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const slots = allocateCardSlots(visible, undefined);

      expect(slots.get("messages")).toBe("LEFT_TOP");
      expect(slots.get("tasks")).toBe("LEFT_MIDDLE");
      expect(slots.get("news")).toBe("LEFT_BOTTOM");
      expect(slots.get("workspace")).toBe("RIGHT_TOP");
      expect(slots.get("calendar")).toBe("RIGHT_MIDDLE");
      expect(slots.get("automation")).toBe("RIGHT_BOTTOM");
    });
  });

  describe("Overflow handling", () => {
    it("separates visible and overflow when more than 6 apps are open", () => {
      const allOpen: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings", "health"] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings", "health"];
      const minimized: readonly [] = [];

      const result = allocateVisibleAndOverflow(allOpen, minimized, 0);

      expect(result.visibleAppIds).toHaveLength(6);
      expect(result.overflowAppIds).toHaveLength(2);
      expect(result.overflowCount).toBe(2);
    });

    it("does not place minimized apps in visible or overflow", () => {
      const allOpen: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings"] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings"];
      const minimized: readonly ["tasks", "automation"] = ["tasks", "automation"];

      const result = allocateVisibleAndOverflow(allOpen, minimized, 0);

      expect(result.visibleAppIds).not.toContain("tasks");
      expect(result.visibleAppIds).not.toContain("automation");
      expect(result.overflowAppIds).not.toContain("tasks");
      expect(result.overflowAppIds).not.toContain("automation");
    });

    it("returns all non-minimized apps in visible+overflow", () => {
      const allOpen: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings", "health"] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings", "health"];
      const minimized: readonly ["health"] = ["health"];

      const result = allocateVisibleAndOverflow(allOpen, minimized, 0);

      const total = result.visibleAppIds.length + result.overflowAppIds.length;
      const expectedTotal = allOpen.length - minimized.length;
      expect(total).toBe(expectedTotal);
    });

    it("shows correct +N indicator", () => {
      const allOpen: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings", "health", "provider-health"] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings", "health", "provider-health"];
      const minimized: readonly [] = [];

      const result = allocateVisibleAndOverflow(allOpen, minimized, 0);

      expect(result.visibleAppIds).toHaveLength(6);
      expect(result.overflowCount).toBe(3); // 3 more apps in overflow
    });

    it("preserves order of apps when splitting visible and overflow", () => {
      const allOpen: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings", "health"] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings", "health"];
      const minimized: readonly [] = [];

      const result = allocateVisibleAndOverflow(allOpen, minimized, 0);

      // First 6 should be visible in order
      expect(result.visibleAppIds).toEqual(["messages", "tasks", "news", "workspace", "calendar", "automation"]);
      // Remaining should be overflow in order
      expect(result.overflowAppIds).toEqual(["settings", "health"]);
    });
  });

  describe("Minimize and overflow interaction", () => {
    it("moving app from overflow to minimized", () => {
      // 7 open, 1 minimized = 6 visible, 0 overflow
      const allOpen: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings"] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "settings"];
      const minimized: readonly [] = [];

      let result = allocateVisibleAndOverflow(allOpen, minimized, 0);
      expect(result.visibleAppIds).toHaveLength(6);
      expect(result.overflowAppIds).toHaveLength(1);

      // Now minimize one visible app
      const minimizedAfter: readonly ["messages"] = ["messages"];
      result = allocateVisibleAndOverflow(allOpen, minimizedAfter, 0);

      expect(result.visibleAppIds).toHaveLength(6);
      expect(result.visibleAppIds).not.toContain("messages");
      expect(result.visibleAppIds).toContain("settings"); // settings should now be visible
      expect(result.overflowAppIds).toHaveLength(0);
    });
  });

  describe("Slot allocation with different counts", () => {
    it("handles single app", () => {
      const slots = allocateCardSlots(["messages"], undefined);
      expect(slots.size).toBe(1);
      expect(slots.get("messages")).toBe("LEFT_TOP");
    });

    it("handles two apps", () => {
      const slots = allocateCardSlots(["messages", "tasks"], undefined);
      expect(slots.size).toBe(2);
      expect(slots.get("messages")).toBe("LEFT_TOP");
      expect(slots.get("tasks")).toBe("LEFT_MIDDLE");
    });

    it("handles three apps", () => {
      const slots = allocateCardSlots(["messages", "tasks", "news"], undefined);
      expect(slots.size).toBe(3);
      expect(slots.get("messages")).toBe("LEFT_TOP");
      expect(slots.get("tasks")).toBe("LEFT_MIDDLE");
      expect(slots.get("news")).toBe("LEFT_BOTTOM");
    });
  });

  describe("Slot allocation no duplicates", () => {
    it("handles many apps without allocating duplicates to visible 6", () => {
      const manyApps: readonly ["messages", "tasks", "news", "workspace", "calendar", "automation"] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const slots = allocateCardSlots(manyApps, undefined);

      const positions = Array.from(slots.values());
      const uniquePositions = new Set(positions);
      expect(uniquePositions.size).toBe(6);
    });
  });
});
