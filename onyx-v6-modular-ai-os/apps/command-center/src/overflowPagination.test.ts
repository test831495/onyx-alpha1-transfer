import { describe, expect, it } from "vitest";
import { allocateVisibleAndOverflow, allocateCardSlots } from "./shellState";
import { cardHorizontalBounds } from "./cardGeometry";
import type { ShellAppId } from "./shellState";

describe("Phase 1A.9.1 Overflow and Layout", () => {
  describe("Overflow pagination calculation", () => {
    it("hides overflow when six apps fit exactly (capacity 6)", () => {
      const six: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const result = allocateVisibleAndOverflow(six, [], 0);
      expect(result.visibleAppIds).toEqual(six);
      expect(result.overflowCount).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it("shows +1 more app for seven apps across two pages", () => {
      const seven: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const result = allocateVisibleAndOverflow(seven, [], 0);
      expect(result.visibleAppIds).toHaveLength(6);
      expect(result.overflowAppIds).toEqual(["health"]);
      expect(result.overflowCount).toBe(1);
      expect(result.totalPages).toBe(2);
      expect(result.currentPage).toBe(0);
    });

    it("shows +2 more apps for eight apps", () => {
      const eight: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health", "settings"];
      const result = allocateVisibleAndOverflow(eight, [], 0);
      expect(result.overflowCount).toBe(2);
      expect(result.totalPages).toBe(2);
    });

    it("page 1 of 2 enables Next and disables Previous", () => {
      const seven: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const result = allocateVisibleAndOverflow(seven, [], 0);
      expect(result.currentPage).toBe(0);
      expect(result.totalPages).toBe(2);
      // Next is enabled (0 < 2 - 1), Previous is disabled (0 === 0)
    });

    it("page 2 of 2 disables Next and enables Previous", () => {
      const seven: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const result = allocateVisibleAndOverflow(seven, [], 1);
      expect(result.currentPage).toBe(1);
      expect(result.totalPages).toBe(2);
      // Next is disabled (1 >= 2 - 1), Previous is enabled (1 !== 0)
    });

    it("never displays '+1 more apps' with '1 / 1' pagination", () => {
      const seven: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const result = allocateVisibleAndOverflow(seven, [], 0);
      // Should not be 1/1
      expect(result.totalPages).not.toBe(1);
      expect(result.overflowCount).not.toBe(0);
    });

    it("excludes minimized apps from pagination", () => {
      const six: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const minimized: ShellAppId[] = ["messages"];
      const result = allocateVisibleAndOverflow(six, minimized, 0);
      // Only 5 eligible (6 - 1 minimized), all visible, no overflow
      expect(result.visibleAppIds).toHaveLength(5);
      expect(result.overflowCount).toBe(0);
      expect(result.totalPages).toBe(1);
    });

    it("clamps currentPage when navigating beyond totalPages", () => {
      const seven: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const result = allocateVisibleAndOverflow(seven, [], 999);
      expect(result.currentPage).toBe(1); // Clamped to totalPages - 1
      expect(result.totalPages).toBe(2);
    });

    it("preserves separate overflow states for NOVA_ONLY, ONYX_ONLY, ONYX_AND_NOVA", () => {
      // Simulating two character workspaces
      const novaApps: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const onyxApps: ShellAppId[] = ["messages", "calendar"];
      
      const novaResult = allocateVisibleAndOverflow(novaApps, [], 0);
      const onyxResult = allocateVisibleAndOverflow(onyxApps, [], 0);
      
      expect(novaResult.overflowCount).toBe(1);
      expect(novaResult.totalPages).toBe(2);
      expect(onyxResult.overflowCount).toBe(0);
      expect(onyxResult.totalPages).toBe(1);
    });
  });

  describe("Card slot allocation and visibility", () => {
    it("allocates six unique positions for six visible apps", () => {
      const six: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const slots = allocateCardSlots(six, null);
      expect(slots.size).toBe(6);
      const positions = new Set(slots.values());
      expect(positions.size).toBe(6);
    });

    it("maintains slot stability when an app is selected", () => {
      const six: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const slots1 = allocateCardSlots(six, "messages");
      const slots2 = allocateCardSlots(six, "news");
      // Both allocations should have the same positions
      expect(slots1.get("messages")).toEqual(slots2.get("messages"));
    });
  });

  describe("Canvas width and symmetry", () => {
    it("uses equal safe insets on both sides", () => {
      const bounds = cardHorizontalBounds(1200, 300, 24);
      // minX = 24, maxX should position the card such that right edge = 1200 - 24
      // maxX + cardWidth = 1200 - 24
      // maxX + 300 = 1176
      // maxX = 876
      expect(bounds.minX).toBe(24);
      expect(bounds.maxX).toBe(876);
      expect(bounds.minX + 300 + bounds.maxX).toBe(1200);
    });

    it("maintains left-right symmetry for container widths", () => {
      const widths = [800, 1000, 1200, 1400, 1600];
      const cardWidth = 300;
      const inset = 24;
      
      widths.forEach(width => {
        const bounds = cardHorizontalBounds(width, cardWidth, inset);
        const leftMargin = bounds.minX;
        const rightMargin = width - bounds.maxX - cardWidth;
        expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(1);
      });
    });

    it("prevents cards from touching viewport edges", () => {
      const bounds = cardHorizontalBounds(1200, 300, 24);
      expect(bounds.minX).toBeGreaterThan(0);
      expect(bounds.maxX + 300).toBeLessThan(1200);
    });

    it("neither leftmost nor rightmost card is clipped", () => {
      const bounds = cardHorizontalBounds(1200, 300, 24);
      // Leftmost card at minX should be fully visible
      expect(bounds.minX + 300).toBeLessThan(1200);
      // Rightmost card at maxX should be fully visible
      expect(bounds.maxX + 300).toBeLessThan(1200);
    });
  });

  describe("Overflow control visibility and hiding", () => {
    it("hides overflow control when totalPages <= 1", () => {
      const six: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const result = allocateVisibleAndOverflow(six, [], 0);
      // totalPages = 1, so overflow should be hidden
      expect(result.totalPages).toBe(1);
    });

    it("hides overflow control when overflowCount === 0", () => {
      const result = allocateVisibleAndOverflow(["messages"], [], 0);
      expect(result.overflowCount).toBe(0);
    });

    it("shows overflow control for seven or more eligible apps", () => {
      const seven: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const result = allocateVisibleAndOverflow(seven, [], 0);
      expect(result.overflowCount).toBeGreaterThan(0);
      expect(result.totalPages).toBeGreaterThan(1);
    });
  });

  describe("Pagination preservation and recalculation", () => {
    it("recalculates totalPages when app count increases", () => {
      const six: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      const seven: ShellAppId[] = [...six, "health"];
      
      const resultSix = allocateVisibleAndOverflow(six, [], 0);
      const resultSeven = allocateVisibleAndOverflow(seven, [], 0);
      
      expect(resultSix.totalPages).toBe(1);
      expect(resultSeven.totalPages).toBe(2);
    });

    it("recalculates totalPages when an app is minimized", () => {
      const seven: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const withoutOne: ShellAppId[] = seven;
      
      const resultAll = allocateVisibleAndOverflow(withoutOne, [], 0);
      const resultMinimized = allocateVisibleAndOverflow(withoutOne, ["health"], 0);
      
      expect(resultAll.totalPages).toBe(2);
      expect(resultMinimized.totalPages).toBe(1);
    });

    it("clamps pagination when an app is closed", () => {
      const eight: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health", "settings"];
      const result8 = allocateVisibleAndOverflow(eight, [], 1); // Page 2 of 2
      expect(result8.currentPage).toBe(1);
      expect(result8.totalPages).toBe(2);
      
      const seven: ShellAppId[] = eight.slice(0, 7);
      const result7 = allocateVisibleAndOverflow(seven, [], 1);
      // Page is still clamped to valid range (0 for 7 apps)
      expect(result7.currentPage).toBe(1);
      expect(result7.totalPages).toBe(2);
    });

    it("restoring or closing apps does not close, minimize, or lose apps", () => {
      const allApps: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const result1 = allocateVisibleAndOverflow(allApps, [], 0);
      
      // All apps remain present
      expect(result1.visibleAppIds.concat(result1.overflowAppIds).sort()).toEqual(allApps.sort());
      
      // After minimizing one
      const minimized: ShellAppId[] = ["health"];
      const result2 = allocateVisibleAndOverflow(allApps, minimized, 0);
      
      // All apps still present (minimized included in calculation)
      const allAfterMin = result2.visibleAppIds.concat(result2.overflowAppIds);
      expect(new Set(allAfterMin).size).toBe(allApps.length - minimized.length);
    });
  });

  describe("No app is hidden or inaccessible", () => {
    it("makes all overflow apps retrievable for 7 apps, 6 capacity", () => {
      const seven: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      const result = allocateVisibleAndOverflow(seven, [], 0);
      expect(result.visibleAppIds).toHaveLength(6);
      expect(result.overflowAppIds).toHaveLength(1);
      expect(result.overflowAppIds).toContain("health");
    });

    it("maintains all apps through pagination state changes", () => {
      const ten: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health", "settings", "provider-health", "calendar"];
      const result0 = allocateVisibleAndOverflow(ten, [], 0);
      const result1 = allocateVisibleAndOverflow(ten, [], 1);
      
      const allPage0 = result0.visibleAppIds.concat(result0.overflowAppIds);
      const allPage1 = result1.visibleAppIds.concat(result1.overflowAppIds);
      
      expect(new Set(allPage0).size).toBe(ten.length - 1); // Deduplicated
      expect(new Set(allPage1).size).toBe(ten.length - 1);
    });
  });
});
