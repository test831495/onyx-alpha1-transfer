import { describe, expect, it } from "vitest";
import {
  buildContextEnvelope,
  classifyConflict,
  consumeGovernanceDecision,
  directConversation,
  INTEL_FRESHNESS_DEPENDENCIES,
  INTEL_INVALIDATION_TRIGGERS,
  INTELLIGENCE_FLAGS,
  mapIntelEventToAvatarCompatibility,
  proposeMemoryAdmission,
  projectTokenBudget,
  resolveEvidence,
  routeReasoning,
  validateSemanticEventType,
} from "../src/index";

describe("PA-INTEL character and reasoning contracts", () => {
  it("routes required modes deterministically", () => {
    expect(routeReasoning("SIMPLE_STATUS")).toBe("ONYX_ONLY");
    expect(routeReasoning("CREATIVE_EXPLORATION")).toBe("NOVA_ONLY");
    expect(routeReasoning("ARCHITECTURE_CHOICE")).toBe("NOVA_THEN_ONYX");
    expect(routeReasoning("GOVERNANCE_READINESS")).toBe("ONYX_THEN_NOVA_REVIEW");
    expect(routeReasoning("HIGH_IMPACT_AMBIGUOUS")).toBe("PARALLEL_INDEPENDENT_ANALYSIS");
    expect(routeReasoning("PROTECTED_DECISION")).toBe("OWNER_DECISION_REQUIRED");
  });

  it("preserves evidence precedence, conflict, missingness, and references", () => {
    expect(resolveEvidence([]).status).toBe("NOT_ASSESSABLE");
    expect(resolveEvidence([{ id: "old", status: "STALE", candidateBound: true, hashVerified: true, claim: "x" }]).status).toBe("STALE");
    const resolved = resolveEvidence([{ id: "verified", status: "CURRENT", candidateBound: true, hashVerified: true, claim: "fact" }, { id: "interpretation", status: "CURRENT", candidateBound: false, hashVerified: false, claim: "opinion" }]);
    expect(resolved.claim).toBe("fact");
    expect(resolved.evidenceReferences).toEqual(["verified"]);
    expect(resolveEvidence([{ id: "a", status: "CURRENT", candidateBound: true, hashVerified: true, claim: "yes" }, { id: "b", status: "CURRENT", candidateBound: true, hashVerified: true, claim: "no" }]).status).toBe("CONFLICTING");
  });

  it("classifies semantic agreement and material conflicts", () => {
    expect(classifyConflict({ onyx: "Use current evidence.", nova: "use current evidence" }, "WORDING")).toBe("EQUIVALENT");
    expect(classifyConflict({ onyx: "secure architecture", nova: "accessible experience" }, "COMPLEMENTARY")).toBe("COMPLEMENTARY");
    expect(classifyConflict({ onyx: "approve", nova: "reject" }, "AUTHORITY")).toBe("OWNER_DECISION_REQUIRED");
  });

  it("bounds character cycles and keeps tools and memory proposal-only", () => {
    const directed = directConversation({ mode: "PARALLEL_INDEPENDENT_ANALYSIS", onyx: ["initial", "rebuttal", "extra"], nova: ["initial", "rebuttal", "extra"] });
    expect(directed.onyx).toHaveLength(2);
    expect(directed.nova).toHaveLength(2);
    expect(directed.synthesisCycles).toBe(1);
    expect(proposeMemoryAdmission({ tier: "M3", content: "fact", ownerDecision: false }).admitted).toBe(false);
    expect(buildContextEnvelope({ evidenceReferences: ["e1"], tokenBudget: 1000, tools: ["EVIDENCE_READ"] }).tools).toEqual([{ id: "EVIDENCE_READ", access: "READ_ONLY" }]);
  });

  it("rejects invalid token budgets fail-closed without model or tool calls", () => {
    const valid = { budgetClass: "STANDARD", total: 1000, input: 300, output: 300, toolCalls: 100, mandatoryReserve: 100 } as const;
    expect(projectTokenBudget(valid)).toMatchObject({ status: "ACCEPTED", remaining: 200, modelCallPermitted: true, toolCallPermitted: true });
    for (const invalid of [
      { ...valid, total: -1 },
      { ...valid, input: -1 },
      { ...valid, output: -1 },
      { ...valid, toolCalls: -1 },
      { ...valid, mandatoryReserve: 0 },
      { ...valid, total: 500 },
      { ...valid, input: Number.MAX_SAFE_INTEGER },
      { ...valid, budgetClass: "UNKNOWN" as never },
      { ...valid, output: undefined as never },
      { ...valid, toolCalls: Number.NaN },
      { ...valid, mandatoryReserve: Number.POSITIVE_INFINITY },
    ]) {
      const rejected = projectTokenBudget(invalid);
      expect(rejected.status).toBe("REJECTED");
      expect(rejected.modelCallPermitted).toBe(false);
      expect(rejected.toolCallPermitted).toBe(false);
      expect(() => (rejected as { status: string }).status = "ACCEPTED").toThrow();
    }
  });

  it("keeps interruption, cancellation, provider neutrality, and Owner authority explicit", () => {
    expect(validateSemanticEventType("INTERRUPTED")).toBe("INTERRUPTED");
    expect(validateSemanticEventType("CANCELLATION_REQUESTED")).toBe("CANCELLATION_REQUESTED");
    expect(buildContextEnvelope({ evidenceReferences: ["e1"], tokenBudget: 1, tools: [] }).providerNeutral).toBe(true);
    expect(routeReasoning("PROTECTED_DECISION")).toBe("OWNER_DECISION_REQUIRED");
  });

  it("owns provider-neutral proposed flags and leaves all OFF", () => {
    expect(Object.values(INTELLIGENCE_FLAGS).every((state) => state === "OFF")).toBe(true);
    expect(Object.keys(INTELLIGENCE_FLAGS)).toHaveLength(7);
  });

  it("rejects unknown semantic event types fail-closed and preserves closed vocabulary (CORR-INTEL-002)", () => {
    expect(validateSemanticEventType("THINKING")).toBe("THINKING");
    expect(validateSemanticEventType("EVIDENCE_ATTACHED")).toBe("EVIDENCE_ATTACHED");
    expect(() => validateSemanticEventType("UNKNOWN_EVENT")).toThrow();
  });

  it("maps semantic events to PA-AVATAR states deterministically regardless of renderer choice", () => {
    expect(mapIntelEventToAvatarCompatibility("SPEAKING", "AVATAR_2D")).toEqual({ avatarState: "SPEAKING", rendererIndependent: true });
    expect(mapIntelEventToAvatarCompatibility("SPEAKING", "TEXT")).toEqual({ avatarState: "SPEAKING", rendererIndependent: true });
    expect(mapIntelEventToAvatarCompatibility("SPEAKING", "AUDIO")).toEqual({ avatarState: "SPEAKING", rendererIndependent: true });
    expect(mapIntelEventToAvatarCompatibility("EVIDENCE_ATTACHED").avatarState).toBeNull();
    expect(() => mapIntelEventToAvatarCompatibility("UNKNOWN_EVENT")).toThrow();
  });

  it("consumes closed PA-GOV governance vocabularies without creating authority (CORR-INTEL-003)", () => {
    expect(consumeGovernanceDecision({ verificationOutcome: "PASS", blockerStatus: "CLEAR", ownerDisposition: "APPROVED", effectiveAuthorization: "BOUNDED_ONLY" })).toBe("ADVISORY_ONLY");
    expect(consumeGovernanceDecision({ verificationOutcome: "PASS", blockerStatus: "CLEAR", ownerDisposition: "NOT_RECORDED", effectiveAuthorization: "DENIED" })).toBe("OWNER_DECISION_REQUIRED");
    expect(consumeGovernanceDecision({ verificationOutcome: "FAIL", blockerStatus: "BLOCKED", ownerDisposition: "NOT_RECORDED", effectiveAuthorization: "DENIED" })).toBe("OWNER_DECISION_REQUIRED");
    expect(() => consumeGovernanceDecision({ verificationOutcome: "MAYBE" as never, blockerStatus: "CLEAR", ownerDisposition: "APPROVED", effectiveAuthorization: "BOUNDED_ONLY" })).toThrow();
  });

  it("binds full freshness dependencies and invalidation triggers (CORR-INTEL-001)", () => {
    expect(INTEL_FRESHNESS_DEPENDENCIES).toHaveLength(11);
    expect(INTEL_INVALIDATION_TRIGGERS).toHaveLength(12);
  });
});