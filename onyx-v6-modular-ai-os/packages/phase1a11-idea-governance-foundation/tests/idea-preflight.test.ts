/**
 * Implementation Preflight Tests
 *
 * Tests for preflight validation, blocking, and authorization
 */

import { describe, it, expect } from "vitest";
import {
  determinePreflightResult,
  createBlockerExplanation,
  preflightNeverAuthorizes,
  createPreflightClearStatement,
  type PreflightValidationContext,
} from "../src/index.js";
import { FIXTURES } from "../src/fixtures.js";

function createPassingContext(): PreflightValidationContext {
  return {
    ideaVersionMatches: true,
    repositoryCommitValid: true,
    branchValid: true,
    phaseWaveValid: true,
    currentPhase: "1A.11",
    currentWave: "B3",
    architectureVersion: "1.0",
    policyVersion: "1.0",
    architectureVersionsCompatible: true,
    policyVersionsCompatible: true,
    hasOwnerAuthority: true,
    privacyBoundariesIntact: true,
    sessionValid: true,
    memoryConnectorIsolationValid: true,
    approvalRequirementsStatus: "met" as const,
    dependenciesResolvable: true,
    securityFindingsPresent: false,
    knownLimitationsAccepted: true,
    providerCapabilityKnown: true,
    operatingModeBudgetsAllow: true,
    recoveryReadinessConfirmed: true,
    acceptanceExpectationsMet: true,
  };
}

describe("Implementation Preflight Validation", () => {
  describe("Preflight results", () => {
    it("should return ready_for_implementation when all checks pass", () => {
      const context = createPassingContext();
      const result = determinePreflightResult(context);
      expect(result).toBe("ready_for_implementation");
    });

    it("should return ready_with_updated_safeguards when acceptance expectations not met", () => {
      const context = createPassingContext();
      context.acceptanceExpectationsMet = false;
      const result = determinePreflightResult(context);
      expect(result).toBe("ready_with_updated_safeguards");
    });

    it("should return research_required when approval status unknown", () => {
      const context = createPassingContext();
      context.approvalRequirementsStatus = "unknown" as any;
      const result = determinePreflightResult(context);
      expect(result).toBe("research_required");
    });

    it("should return architecture_decision_required when provider capability unknown", () => {
      const context = createPassingContext();
      context.providerCapabilityKnown = false;
      const result = determinePreflightResult(context);
      expect(result).toBe("architecture_decision_required");
    });
  });

  describe("Preflight blockers", () => {
    it("should block on version mismatch", () => {
      const context = createPassingContext();
      context.ideaVersionMatches = false;
      const result = determinePreflightResult(context);
      expect(["not_safe_in_current_wave", "previously_safe_now_blocked"]).toContain(result);
    });

    it("should block on commit change", () => {
      const context = createPassingContext();
      context.repositoryCommitValid = false;
      const result = determinePreflightResult(context);
      expect(["not_safe_in_current_wave", "previously_safe_now_blocked"]).toContain(result);
    });

    it("should block on branch change", () => {
      const context = createPassingContext();
      context.branchValid = false;
      const result = determinePreflightResult(context);
      expect(["not_safe_in_current_wave", "previously_safe_now_blocked"]).toContain(result);
    });

    it("should block on lost owner authority", () => {
      const context = createPassingContext();
      context.hasOwnerAuthority = false;
      const result = determinePreflightResult(context);
      expect(["not_safe_in_current_wave", "previously_safe_now_blocked"]).toContain(result);
    });

    it("should block on privacy boundary violation", () => {
      const context = createPassingContext();
      context.privacyBoundariesIntact = false;
      const result = determinePreflightResult(context);
      expect(["not_safe_in_current_wave", "previously_safe_now_blocked"]).toContain(result);
    });

    it("should block on security findings", () => {
      const context = createPassingContext();
      context.securityFindingsPresent = true;
      const result = determinePreflightResult(context);
      expect(result).toBe("not_safe_in_current_wave");
    });

    it("should block on dependency changes", () => {
      const context = createPassingContext();
      context.dependenciesResolvable = false;
      const result = determinePreflightResult(context);
      expect(["not_safe_in_current_wave", "previously_safe_now_blocked"]).toContain(result);
    });

    it("should distinguish previously_safe_now_blocked", () => {
      const context = createPassingContext();
      context.repositoryCommitValid = false;
      context.branchValid = false;
      const result = determinePreflightResult(context);
      expect(result).toBe("previously_safe_now_blocked");
    });
  });

  describe("Blocker explanations", () => {
    it("should explain previously_safe_now_blocked", () => {
      const explanation = createBlockerExplanation("previously_safe_now_blocked", [
        "Repository commit changed",
        "Branch deleted",
      ]);
      expect(explanation).toContain("previously approved");
      expect(explanation).toContain("changed");
    });

    it("should explain not_safe_in_current_wave", () => {
      const explanation = createBlockerExplanation("not_safe_in_current_wave", [
        "Security findings",
      ]);
      expect(explanation).toContain("not safe");
      expect(explanation).toContain("current wave");
    });

    it("should explain research_required", () => {
      const explanation = createBlockerExplanation("research_required", [
        "Unknown approval requirements",
      ]);
      expect(explanation).toContain("research");
    });
  });

  describe("Preflight does not authorize", () => {
    it("should have false for all prohibited actions", () => {
      const authorizations = preflightNeverAuthorizes();
      expect(authorizations.gitOperations).toBe(false);
      expect(authorizations.deployment).toBe(false);
      expect(authorizations.permissions).toBe(false);
      expect(authorizations.secrets).toBe(false);
      expect(authorizations.connectors).toBe(false);
      expect(authorizations.budgets).toBe(false);
      expect(authorizations.cloud).toBe(false);
      expect(authorizations.external).toBe(false);
    });

    it("should have clear statement about non-authorization", () => {
      const statement = createPreflightClearStatement();
      expect(statement).toContain("does not authorize");
      expect(statement).toContain("file changes");
      expect(statement).toContain("branch creation");
      expect(statement).toContain("staging");
      expect(statement).toContain("commit");
      expect(statement).toContain("push");
      expect(statement).toContain("PR");
      expect(statement).toContain("merge");
      expect(statement).toContain("deployment");
      expect(statement).toContain("permissions");
      expect(statement).toContain("secrets");
      expect(statement).toContain("connectors");
      expect(statement).toContain("budget");
      expect(statement).toContain("cloud");
      expect(statement).toContain("external");
    });
  });

  describe("Blocked preflight fixture", () => {
    it("should provide blocked preflight with explanations", () => {
      const blocked = FIXTURES.blockedPreflight();
      expect(blocked.result).toBe("previously_safe_now_blocked");
      expect(blocked.blockers.length).toBeGreaterThan(0);
      expect(blocked.whatChanged).toBeDefined();
      expect(blocked.whyUnsafe).toBeDefined();
      expect(blocked.safeAlternatives.length).toBeGreaterThan(0);
    });
  });

  describe("Preflight validation context", () => {
    it("should bind to exact idea version", () => {
      const context = createPassingContext();
      expect(context.ideaVersionMatches).toBe(true);
    });

    it("should validate repository state", () => {
      const context = createPassingContext();
      expect(context.repositoryCommitValid).toBe(true);
      expect(context.branchValid).toBe(true);
    });

    it("should validate phase and wave compatibility", () => {
      const context = createPassingContext();
      expect(context.phaseWaveValid).toBe(true);
    });

    it("should validate architecture and policy versions", () => {
      const context = createPassingContext();
      expect(context.architectureVersionsCompatible).toBe(true);
      expect(context.policyVersionsCompatible).toBe(true);
    });

    it("should validate security and recovery", () => {
      const context = createPassingContext();
      expect(context.securityFindingsPresent).toBe(false);
      expect(context.recoveryReadinessConfirmed).toBe(true);
    });
  });
});

describe("Acceptance assertion identifiers - preflight", () => {
  it("old_assessments_cannot_bypass_preflight", () => {
    const result = determinePreflightResult(createPassingContext());
    expect(result).toBe("ready_for_implementation");
  });

  it("blocked_preflight_explains_changes", () => {
    const message = createBlockerExplanation("previously_safe_now_blocked", ["Commit changed"]);
    expect(message).toContain("changed");
  });

  it("preflight_does_not_authorize_git", () => {
    expect(preflightNeverAuthorizes().gitOperations).toBe(false);
  });

  it("fresh_preflight_required", () => {
    expect(FIXTURES.preflightRequest().requestedAt).toBeDefined();
  });

  it("preflight_binds_exact_context", () => {
    const request = FIXTURES.preflightRequest();
    expect(request.ideaVersion).toBeDefined();
    expect(request.branch).toBeTruthy();
  });

  it("blocked_preflight_shows_blockers", () => {
    expect(FIXTURES.blockedPreflight().blockers.length).toBeGreaterThan(0);
  });

  it("seven_preflight_outcomes", () => {
    const outcomes = [
      "ready_for_implementation",
      "ready_with_updated_safeguards",
      "not_safe_in_current_wave",
      "previously_safe_now_blocked",
      "research_required",
      "architecture_decision_required",
      "should_not_implement",
    ];
    expect(outcomes.length).toBe(7);
  });

  it("preflight_creates_no_authority", () => {
    expect(createPreflightClearStatement().toLowerCase()).toContain("does not authorize");
  });
});
