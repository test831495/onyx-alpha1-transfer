import { describe, expect, it } from "vitest";
import { MODE_CAPABILITY_MATRIX, MODE_NAMES, validateModeBudget, validateModeName } from "../src/mode-policy";
import { evaluateModeTransition, validateModeTransitionRequest } from "../src/mode-transition";
import { evaluateCapabilityRestoration, STALE_AUTHORITY_STATES } from "../src/authority-revalidation";
import { modeAcceptanceRegistry } from "../src/fixtures";

describe("Wave B3 operational modes", () => {
  it("accepts only the four canonical provider-neutral modes and blocks unsupported ones", () => {
    expect(MODE_NAMES).toEqual(["ACTIVE", "LIGHT", "VACATION", "HIBERNATION"]);
    expect(validateModeName("ACTIVE")).toBe(true);
    expect(validateModeName("LIGHT")).toBe(true);
    expect(validateModeName("VACATION")).toBe(true);
    expect(validateModeName("HIBERNATION")).toBe(true);
    expect(validateModeName("UNKNOWN")).toBe(false);
  });

  it("defines deterministic capability matrix and valid budgets", () => {
    expect(MODE_CAPABILITY_MATRIX.ACTIVE.ownerLogin).toBe("enabled");
    expect(MODE_CAPABILITY_MATRIX.VACATION.ownerLogin).toBe("owner-only");
    expect(MODE_CAPABILITY_MATRIX.HIBERNATION.backupVerification).toBe("enabled");
    expect(validateModeBudget({
      interactions: { min: 0, max: 10, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      modelRequests: { min: 0, max: 10, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      modelPlanningUnits: { min: 0, max: 12, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      agentTurns: { min: 0, max: 8, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      councilRuns: { min: 0, max: 2, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      specialistRuns: { min: 0, max: 2, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      connectorPolling: { min: 0, max: 4, unit: "count", period: "hour", policyVersion: "budget-policy-1" },
      voiceMinutes: { min: 0, max: 10, unit: "minutes", period: "day", policyVersion: "budget-policy-1" },
      cameraAnalysis: { min: 0, max: 4, unit: "count", period: "hour", policyVersion: "budget-policy-1" },
      indexing: { min: 0, max: 8, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      telemetry: { min: 0, max: 10, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      reports: { min: 0, max: 2, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      backgroundTasks: { min: 0, max: 2, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      localEdgeTasks: { min: 0, max: 4, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      backupVerification: { min: 0, max: 4, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      recoveryVerification: { min: 0, max: 4, unit: "count", period: "day", policyVersion: "budget-policy-1" },
      futureGatewayContributions: { min: 0, max: 1, unit: "count", period: "day", policyVersion: "budget-policy-1" }
    })).toBe(true);
    expect(validateModeBudget({ interactions: { min: -1, max: 2, unit: "count", period: "day", policyVersion: "budget-policy-1" } })).toBe(false);
    expect(validateModeBudget({ interactions: { min: 0, max: 2, period: "day", policyVersion: "budget-policy-1" } })).toBe(false);
  });

  it("accepts reversible mode transitions and blocks audit-unavailable transitions", () => {
    const request = {
      requestId: "mode-request-001",
      currentMode: "ACTIVE",
      requestedMode: "LIGHT",
      account: "acct_rahul",
      session: "session_001",
      assurance: "strong",
      purpose: "mode-policy-transition",
      reason: "reduce scheduled load",
      effectiveTime: "2026-08-23T12:00:00.000Z",
      expiry: "2026-08-24T12:00:00.000Z",
      modePolicyVersion: "mode-policy-1",
      capabilityPolicyVersion: "capability-policy-1",
      budgetPolicyVersion: "budget-policy-1",
      auditRequirement: true,
      rollbackMode: "ACTIVE",
      evidenceReference: "evidence-mode-transition-001"
    };
    expect(validateModeTransitionRequest(request).valid).toBe(true);
    const result = evaluateModeTransition(request, true);
    expect(result.allowed).toBe(true);
    expect(result.previousMode).toBe("ACTIVE");
    expect(result.effectiveMode).toBe("LIGHT");
    expect(result.status).toBe("effective");
    expect(evaluateModeTransition(request, false).allowed).toBe(false);
  });

  it("keeps critical capabilities in vacation and preserves canonical state in hibernation", () => {
    expect(MODE_CAPABILITY_MATRIX.VACATION.securityAlerts).toBe("critical-only");
    expect(MODE_CAPABILITY_MATRIX.VACATION.backupVerification).toBe("enabled");
    expect(MODE_CAPABILITY_MATRIX.HIBERNATION.recoveryVerification).toBe("enabled");
    expect(MODE_CAPABILITY_MATRIX.HIBERNATION.modelRouting).toBe("suspended");
    expect(MODE_CAPABILITY_MATRIX.HIBERNATION.conciseSummaries).toBe("suspended");
  });

  it("denies every incomplete or stale transition request field", () => {
    const request = { requestId: "mode-request-001", currentMode: "ACTIVE", requestedMode: "LIGHT", account: "acct_rahul", session: "session_001", assurance: "strong", purpose: "mode-policy-transition", reason: "reduce scheduled load", effectiveTime: "2026-08-23T12:00:00.000Z", expiry: "2026-08-24T12:00:00.000Z", modePolicyVersion: "mode-policy-1", capabilityPolicyVersion: "capability-policy-1", budgetPolicyVersion: "budget-policy-1", auditRequirement: true, rollbackMode: "ACTIVE", evidenceReference: "evidence-mode-transition-001" };
    const cases = [["requestId", "MODE_REQUEST_INCOMPLETE"], ["account", "REQUESTING_ACCOUNT_MISSING"], ["session", "SESSION_REFERENCE_MISSING"], ["assurance", "ASSURANCE_UNSUPPORTED"], ["purpose", "PURPOSE_MISSING"], ["reason", "REASON_MISSING"], ["effectiveTime", "INVALID_EFFECTIVE_TIME"], ["expiry", "INVALID_EXPIRY"], ["modePolicyVersion", "MODE_POLICY_VERSION_MISMATCH"], ["capabilityPolicyVersion", "CAPABILITY_POLICY_VERSION_MISMATCH"], ["budgetPolicyVersion", "BUDGET_POLICY_VERSION_MISMATCH"], ["auditRequirement", "AUDIT_REQUIREMENT_INVALID"], ["rollbackMode", "ROLLBACK_MODE_INVALID"], ["evidenceReference", "EVIDENCE_REFERENCE_MISSING"]] as const;
    for (const [field, expected] of cases) expect(validateModeTransitionRequest({ ...request, [field]: field === "auditRequirement" ? undefined : "" }).reason, field).toBe(expected);
    expect(validateModeTransitionRequest({ ...request, assurance: "unsupported" }).reason).toBe("ASSURANCE_UNSUPPORTED");
    expect(validateModeTransitionRequest({ ...request, expiry: "2026-08-23T11:00:00.000Z" }).reason).toBe("EXPIRY_NOT_AFTER_EFFECTIVE_TIME");
    expect(evaluateModeTransition({ ...request, reason: "" }, true).allowed).toBe(false);
  });

  it("rejects unsupported budget catalogs and preserves critical controls", () => {
    const complete = { interactions: { min: 0, max: 1, unit: "count", period: "day", policyVersion: "budget-policy-1" } };
    expect(validateModeBudget(complete)).toBe(false);
    expect(validateModeBudget({ ...complete, interactions: { min: 0, max: 1, unit: "unknown", period: "day", policyVersion: "budget-policy-1" } })).toBe(false);
    expect(validateModeBudget({ ...complete, interactions: { min: 0, max: 1, unit: "count", period: "month", policyVersion: "budget-policy-1" } })).toBe(false);
    expect(validateModeBudget({ ...complete, interactions: { min: 0, max: 1, unit: "count", period: "day", policyVersion: "budget-policy-0" } })).toBe(false);
    expect(validateModeBudget({ ...complete, interactions: { min: 0, max: "unlimited", unit: "count", period: "day", policyVersion: "budget-policy-1" } })).toBe(false);
    expect(MODE_CAPABILITY_MATRIX.VACATION.criticalAudit).toBe("critical-only");
    expect(MODE_CAPABILITY_MATRIX.HIBERNATION.backupVerification).toBe("enabled");
  });

  it("denies every stale authority state and never restores authority", () => {
    for (const authorityState of STALE_AUTHORITY_STATES) {
      const result = evaluateCapabilityRestoration({ requestedMode: "ACTIVE", authorityState, auditAvailable: true });
      expect(result.allowed, authorityState).toBe(false);
      expect(result.authorityRestored, authorityState).toBe(false);
    }
    expect(evaluateCapabilityRestoration({ requestedMode: "ACTIVE", authorityState: "active", auditAvailable: false }).technicalReason).toBe("AUDIT_UNAVAILABLE");
    expect(evaluateCapabilityRestoration({ requestedMode: "ACTIVE", authorityState: "active", auditAvailable: true }).allowed).toBe(true);
    expect(evaluateCapabilityRestoration({ requestedMode: "VACATION", authorityState: "active", auditAvailable: true }).allowed).toBe(false);
  });

  it("keeps the exact sixteen acceptance IDs represented", () => {
    const ids = Object.keys(modeAcceptanceRegistry);
    expect(ids).toEqual(Array.from({ length: 16 }, (_, index) => `MODE_${String(index + 1).padStart(3, "0")}`));
  });
});
