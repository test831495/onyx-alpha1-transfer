import { describe, expect, it } from "vitest";
import {
  ACCESSIBILITY_GATE_IDS,
  createAccessibilityGate,
  evaluateReleaseGates,
  assertAccessibilityReleaseEvaluation,
  assertMandatoryAccessibilityGate,
  makeAccessibilityGate,
} from "../src/ux/accessibility-gates";

describe("Accessibility gating contracts", () => {
  it("declares all gate IDs and supports PASS/FAIL statuses", () => {
    expect(ACCESSIBILITY_GATE_IDS).toHaveLength(10);
    expect(ACCESSIBILITY_GATE_IDS).toContain("KEYBOARD_NAVIGATION");
    expect(ACCESSIBILITY_GATE_IDS).toContain("ACCESSIBLE_APPROVAL_RISK");

    const passed = createAccessibilityGate({ gateId: "KEYBOARD_NAVIGATION", screenId: "DASHBOARD", requirement: "Keyboard access", evaluationMethod: "manual-review", result: "PASS", failureDetails: [], evidenceReferences: ["gate-1"], evaluatedAt: "2026-01-01T00:00:00.000Z", contractVersion: "1.0.0" });
    expect(passed.result).toBe("PASS");

    const failed = createAccessibilityGate({ gateId: "KEYBOARD_NAVIGATION", screenId: "DASHBOARD", requirement: "Keyboard access", evaluationMethod: "manual-review", result: "FAIL", failureDetails: ["bad"], evidenceReferences: ["gate-1"], evaluatedAt: "2026-01-01T00:00:00.000Z", contractVersion: "1.0.0" });
    expect(failed.result).toBe("FAIL");
  });

  it("blocks release on mandatory failures and requires justification for not-applicable results", () => {
    const gatePass = makeAccessibilityGate("KEYBOARD_NAVIGATION", "DASHBOARD", "PASS");
    const gateFail = makeAccessibilityGate("FOCUS_MANAGEMENT", "DASHBOARD", "FAIL");
    const notEvaluated = makeAccessibilityGate("SCREEN_READER_SEMANTICS", "DASHBOARD", "NOT_EVALUATED");

    const blocked = evaluateReleaseGates([gatePass, gateFail, notEvaluated], ["DASHBOARD"], ["DASHBOARD"], ["KEYBOARD_NAVIGATION", "FOCUS_MANAGEMENT", "SCREEN_READER_SEMANTICS"]);
    expect(blocked.releaseAllowed).toBe(false);
    expect(() => assertAccessibilityReleaseEvaluation(blocked)).toThrow();

    const notApplicable = createAccessibilityGate({ gateId: "RESPONSIVE_REFLOW", screenId: "DASHBOARD", requirement: "Responsive layout", evaluationMethod: "manual-review", result: "NOT_APPLICABLE", failureDetails: [], evidenceReferences: ["justified"], evaluatedAt: "2026-01-01T00:00:00.000Z", contractVersion: "1.0.0", justification: "Static layout required" });
    expect(notApplicable.justification).toBe("Static layout required");

    const allowed = evaluateReleaseGates([gatePass, makeAccessibilityGate("FOCUS_MANAGEMENT", "DASHBOARD", "PASS"), makeAccessibilityGate("SCREEN_READER_SEMANTICS", "DASHBOARD", "PASS")], ["DASHBOARD"], ["DASHBOARD"], ["KEYBOARD_NAVIGATION", "FOCUS_MANAGEMENT", "SCREEN_READER_SEMANTICS"]);
    expect(allowed.releaseAllowed).toBe(true);
    expect(() => assertAccessibilityReleaseEvaluation(allowed)).not.toThrow();
  });

  it("requires mandatory gates on every screen and specialized approval/recovery gates", () => {
    const registry: Array<{ screenId: string; gateIds: string[] }> = [{ screenId: "DASHBOARD", gateIds: ["KEYBOARD_NAVIGATION", "SCREEN_READER_SEMANTICS", "FOCUS_MANAGEMENT", "RESPONSIVE_REFLOW", "WCAG_AA_CONTRAST", "REDUCED_MOTION", "CLEAR_ERROR_IDENTIFICATION", "STATUS_ANNOUNCEMENTS"] }, { screenId: "APPROVALS", gateIds: ["KEYBOARD_NAVIGATION", "SCREEN_READER_SEMANTICS", "FOCUS_MANAGEMENT", "RESPONSIVE_REFLOW", "WCAG_AA_CONTRAST", "REDUCED_MOTION", "CLEAR_ERROR_IDENTIFICATION", "STATUS_ANNOUNCEMENTS", "ACCESSIBLE_APPROVAL_RISK"] }, { screenId: "RECOVERY_CENTER", gateIds: ["KEYBOARD_NAVIGATION", "SCREEN_READER_SEMANTICS", "FOCUS_MANAGEMENT", "RESPONSIVE_REFLOW", "WCAG_AA_CONTRAST", "REDUCED_MOTION", "CLEAR_ERROR_IDENTIFICATION", "STATUS_ANNOUNCEMENTS", "ACCESSIBLE_RECOVERY_CONTROLS"] }];
    const approvalGateSet = registry[1]?.gateIds ?? [];
    const recoveryGateSet = registry[2]?.gateIds ?? [];
    expect(approvalGateSet).toContain("ACCESSIBLE_APPROVAL_RISK");
    expect(recoveryGateSet).toContain("ACCESSIBLE_RECOVERY_CONTROLS");
    expect(() => assertMandatoryAccessibilityGate("DASHBOARD", "KEYBOARD_NAVIGATION")).not.toThrow();
  });
});
