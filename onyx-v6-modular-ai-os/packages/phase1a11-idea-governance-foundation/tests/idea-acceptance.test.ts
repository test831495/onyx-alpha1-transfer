/**
 * Idea Acceptance Registry Tests
 *
 * Tests for the 65-entry acceptance registry
 */

import { describe, it, expect } from "vitest";
import {
  getAllAcceptanceIds,
  getAcceptanceIdsByCategory,
  getAcceptanceEntry,
  verifyAcceptanceRegistryCompleteness,
  IDEA_ACCEPTANCE_REGISTRY,
} from "../src/index.js";

describe("Idea Acceptance Registry", () => {
  describe("Registry completeness", () => {
    it("should have exactly 65 acceptance IDs", () => {
      const allIds = getAllAcceptanceIds();
      expect(allIds.length).toBe(65);
    });

    it("should verify registry completeness", () => {
      const verification = verifyAcceptanceRegistryCompleteness();
      expect(verification.totalCount).toBe(65);
      expect(verification.ideaCount).toBe(20);
      expect(verification.uxCount).toBe(20);
      expect(verification.lifecycleCount).toBe(10);
      expect(verification.preflightCount).toBe(15);
      expect(verification.allUnique).toBe(true);
      expect(verification.allDefined).toBe(true);
    });
  });

  describe("IDEA- category (20 core governance IDs)", () => {
    it("should have IDEA-001 through IDEA-020", () => {
      const ideaIds = getAcceptanceIdsByCategory("IDEA-");
      expect(ideaIds.length).toBe(20);
      for (let i = 1; i <= 20; i++) {
        const id = `IDEA-${String(i).padStart(3, "0")}`;
        expect(ideaIds).toContain(id);
      }
    });

    it("should have all IDEA entries defined", () => {
      for (let i = 1; i <= 20; i++) {
        const id = `IDEA-${String(i).padStart(3, "0")}`;
        const entry = getAcceptanceEntry(id);
        expect(entry).toBeDefined();
        expect(entry?.title).toBeDefined();
        expect(entry?.description).toBeDefined();
      }
    });

    it("should have honest implementation statuses for IDEA entries", () => {
      const idealStatuses = ["CONTRACT_DEFINED", "POLICY_VALIDATED", "DETERMINISTICALLY_TESTED", "RUNTIME_DEFERRED", "UI_DEFERRED"];
      for (let i = 1; i <= 20; i++) {
        const id = `IDEA-${String(i).padStart(3, "0")}`;
        const entry = getAcceptanceEntry(id);
        expect(idealStatuses).toContain(entry?.implementationStatus);
      }
    });

    it("should have test mapping or evidence", () => {
      for (let i = 1; i <= 20; i++) {
        const id = `IDEA-${String(i).padStart(3, "0")}`;
        const entry = getAcceptanceEntry(id);
        const hasMapping = entry?.testMapping || entry?.evidenceMapping;
        expect(hasMapping).toBeTruthy();
      }
    });
  });

  describe("IDEA-UX- category (20 UX IDs)", () => {
    it("should have IDEA-UX-001 through IDEA-UX-020", () => {
      const uxIds = getAcceptanceIdsByCategory("IDEA-UX-");
      expect(uxIds.length).toBe(20);
      for (let i = 1; i <= 20; i++) {
        const id = `IDEA-UX-${String(i).padStart(3, "0")}`;
        expect(uxIds).toContain(id);
      }
    });

    it("should have UI deferral for visual components", () => {
      const reviewCenterEntry = getAcceptanceEntry("IDEA-UX-017");
      expect(reviewCenterEntry?.title).toContain("No Idea Review Center UI");
      expect(reviewCenterEntry?.runtimeStatus ?? reviewCenterEntry?.uiStatus).toBe("deferred");
      expect(reviewCenterEntry?.implementationStatus).toBe("NOT_IMPLEMENTED");
    });

    it("should mark attachment processing as deferred", () => {
      const entry = getAcceptanceEntry("IDEA-UX-018");
      expect(entry?.runtimeStatus).toBe("deferred");
    });
  });

  describe("IDEA-LIFE- category (10 lifecycle IDs)", () => {
    it("should have IDEA-LIFE-001 through IDEA-LIFE-010", () => {
      const lifeIds = getAcceptanceIdsByCategory("IDEA-LIFE-");
      expect(lifeIds.length).toBe(10);
      for (let i = 1; i <= 10; i++) {
        const id = `IDEA-LIFE-${String(i).padStart(3, "0")}`;
        expect(lifeIds).toContain(id);
      }
    });

    it("should test lifecycle states and transitions", () => {
      const entry = getAcceptanceEntry("IDEA-LIFE-001");
      expect(entry?.title).toContain("Lifecycle");
      expect(entry?.testMapping).toBeDefined();
    });
  });

  describe("IDEA-PRE- category (15 preflight/readiness IDs)", () => {
    it("should have IDEA-PRE-001 through IDEA-PRE-015", () => {
      const preIds = getAcceptanceIdsByCategory("IDEA-PRE-");
      expect(preIds.length).toBe(15);
      for (let i = 1; i <= 15; i++) {
        const id = `IDEA-PRE-${String(i).padStart(3, "0")}`;
        expect(preIds).toContain(id);
      }
    });

    it("should test preflight and readiness contracts", () => {
      const entry = getAcceptanceEntry("IDEA-PRE-001");
      expect(entry?.title).toContain("Preflight");
      expect(entry?.implementationStatus).toBe("POLICY_VALIDATED");
    });

    it("should mark mode restoration as policy", () => {
      const entry = getAcceptanceEntry("IDEA-PRE-009");
      expect(entry?.title).toContain("Mode");
      expect(entry?.implementationStatus).toBe("POLICY_VALIDATED");
    });
  });

  describe("Implementation status values", () => {
    it("should use only valid status values", () => {
      const validStatuses = [
        "CONTRACT_DEFINED",
        "POLICY_VALIDATED",
        "DETERMINISTICALLY_TESTED",
        "RUNTIME_DEFERRED",
        "UI_DEFERRED",
        "NOT_IMPLEMENTED",
      ];

      getAllAcceptanceIds().forEach((id) => {
        const entry = getAcceptanceEntry(id);
        expect(validStatuses).toContain(entry?.implementationStatus);
      });
    });

    it("should not mark deferred items as actively implemented", () => {
      getAllAcceptanceIds().forEach((id) => {
        const entry = getAcceptanceEntry(id);
        if (entry?.runtimeStatus === "deferred" || entry?.uiStatus === "deferred") {
          expect(entry?.implementationStatus).not.toBe("DETERMINISTICALLY_TESTED");
          expect(entry?.implementationStatus).not.toBe("POLICY_VALIDATED");
        }
      });
    });
  });

  describe("Specific acceptance entries", () => {
    it("IDEA-010 should have UI deferral", () => {
      const entry = getAcceptanceEntry("IDEA-010");
      expect(entry?.title).toContain("Technical Details");
      if (entry?.uiStatus) {
        expect(entry.uiStatus).toBe("deferred");
      }
    });

    it("IDEA-011 should prohibit prompt injection", () => {
      const entry = getAcceptanceEntry("IDEA-011");
      expect(entry?.title).toContain("Prompt Injection");
      expect(entry?.implementationStatus).toBe("POLICY_VALIDATED");
    });

    it("IDEA-017 should require audit for UI", () => {
      const entry = getAcceptanceEntry("IDEA-UX-017");
      expect(entry?.title).toContain("Idea Review Center");
      expect(entry?.implementationStatus).toBe("NOT_IMPLEMENTED");
    });

    it("IDEA-PRE-009 should validate mode behavior", () => {
      const entry = getAcceptanceEntry("IDEA-PRE-009");
      expect(entry?.title).toContain("Mode");
    });
  });

  describe("Registry integrity", () => {
    it("should have no duplicate IDs", () => {
      const allIds = getAllAcceptanceIds();
      const uniqueIds = new Set(allIds);
      expect(uniqueIds.size).toBe(allIds.length);
    });

    it("should have no missing entries", () => {
      getAllAcceptanceIds().forEach((id) => {
        const entry = getAcceptanceEntry(id);
        expect(entry).toBeDefined();
      });
    });

    it("should have all fields populated", () => {
      getAllAcceptanceIds().forEach((id) => {
        const entry = getAcceptanceEntry(id);
        expect(entry?.acceptanceId).toBe(id);
        expect(entry?.title).toBeDefined();
        expect(entry?.title).toBeTruthy();
        expect(entry?.description).toBeDefined();
        expect(entry?.description).toBeTruthy();
        expect(entry?.implementationStatus).toBeDefined();
      });
    });
  });

  describe("Test evidence mapping", () => {
    it("should link contract definitions to test files", () => {
      const contractEntries = getAllAcceptanceIds().filter((id) => {
        const entry = getAcceptanceEntry(id);
        return entry?.implementationStatus === "CONTRACT_DEFINED";
      });

      contractEntries.forEach((id) => {
        const entry = getAcceptanceEntry(id);
        if (entry?.testMapping) {
          expect(entry.testMapping).toContain(".test.ts");
        }
      });
    });

    it("should link tested entries to test assertions", () => {
      const testedEntries = getAllAcceptanceIds().filter((id) => {
        const entry = getAcceptanceEntry(id);
        return entry?.implementationStatus === "DETERMINISTICALLY_TESTED";
      });

      testedEntries.forEach((id) => {
        const entry = getAcceptanceEntry(id);
        expect(entry?.testMapping).toBeDefined();
      });
    });
  });
});
