import { describe, expect, it } from "vitest";
import { resolveTruthRequirement } from "../src/TruthRequirementResolver";
import { composeCharacterResponse } from "../src/CharacterResponseComposer";
import { makeResponsePlan } from "../src/ResponsePlan";
import { planResponse } from "../src/ResponsePlanner";
import { ONYX_VOICE_PROFILE, NOVA_VOICE_PROFILE } from "../src/CharacterVoiceProfile";
import { validateCharacterResponseCandidate, VALIDATION_REASON_CODES } from "../src/CharacterCompositionValidator";
import type { ConversationPurpose } from "@onyx/conversation-first-contracts";

const truth = (purpose: ConversationPurpose, overrides: Partial<Parameters<typeof resolveTruthRequirement>[0]> = {}) => resolveTruthRequirement({ purpose, ...overrides });
const plan = (purpose: ConversationPurpose, speaker: "ONYX" | "NOVA" = "NOVA", overrides: Partial<Parameters<typeof planResponse>[0]> = {}) => planResponse({ requestId: "request-1", planId: "plan-1", purpose, truth: truth(purpose), speakerDecision: { selectedSpeaker: speaker }, ...overrides });

describe("B5B truth requirements", () => {
  it("uses no external truth for reflection and creative work", () => {
    expect(truth("REFLECTION").truthPolicy).toBe("NO_EXTERNAL_TRUTH_REQUIRED");
    expect(truth("CREATIVE_COLLABORATION").truthPolicy).toBe("NO_EXTERNAL_TRUTH_REQUIRED");
  });
  it("bounds supplied review context", () => expect(truth("INFORMATION_REQUEST", { suppliedContext: true, suppliedTruthReferences: ["draft-1"] }).truthPolicy).toBe("SUPPLIED_CONTEXT_ONLY"));
  it("requires unavailable operational truth without inventing it", () => expect(truth("INFORMATION_REQUEST", { rawText: "What meetings do I have tomorrow?", operationalTruthAvailable: false }).truthPolicy).toBe("NOT_ASSESSABLE"));
  it("requires operational truth before an action or current fact", () => {
    expect(truth("ACTION_REQUEST").truthPolicy).toBe("OPERATIONAL_TRUTH_REQUIRED");
    expect(truth("INFORMATION_REQUEST", { rawText: "What meetings do I have tomorrow?" }).truthPolicy).toBe("OPERATIONAL_TRUTH_REQUIRED");
  });
});

describe("B5B planning and composition", () => {
  it("maps advice, reflection, action, unknown, and navigation deterministically", () => {
    expect(plan("ADVICE_REQUEST", "ONYX")?.responseMode).toBe("RECOMMENDATION");
    expect(plan("REFLECTION")?.responseMode).toBe("CONVERSATION");
    expect(plan("ACTION_REQUEST")?.responseMode).toBe("ACTION_PROPOSAL");
    expect(plan("UNKNOWN")?.responseMode).toBe("CLARIFICATION");
    expect(plan("NAVIGATION_REQUEST")?.responseMode).toBe("ACTION_PROPOSAL");
  });
  it("creates a clarification-required governed action proposal", () => {
    const result = plan("ACTION_REQUEST");
    expect(result?.actionProposal?.status).toBe("CLARIFICATION_REQUIRED");
    expect(result?.actionProposal?.requiresApproval).toBe(true);
    expect(result?.executionAuthorized).toBe(false);
  });
  it("preserves correction and follow-up context", () => {
    expect(plan("CORRECTION", "NOVA", { correctedEntity: "Microsoft" })?.objectives[0]).toContain("Microsoft");
    expect(plan("FOLLOW_UP", "ONYX", { currentTopic: "Track B isolation" })?.objectives[0]).toContain("Track B isolation");
  });
  it("differentiates ONYX and NOVA while preserving bounded truth", () => {
    const onyx = composeCharacterResponse(plan("ADVICE_REQUEST", "ONYX")!);
    const nova = composeCharacterResponse(plan("ADVICE_REQUEST", "NOVA")!);
    expect(onyx?.text).not.toBe(nova?.text);
    expect(onyx?.truthStatus).toBe(nova?.truthStatus);
    expect(onyx?.text).toContain("recommendation");
    expect(nova?.text).toContain("progress");
  });
  it("emits a natural limitation for unavailable Calendar truth", () => {
    const limitationTruth = truth("INFORMATION_REQUEST", { rawText: "What meetings do I have tomorrow?", operationalTruthAvailable: false });
    const candidate = composeCharacterResponse(planResponse({ requestId: "r", planId: "p", purpose: "INFORMATION_REQUEST", truth: limitationTruth, speakerDecision: { selectedSpeaker: "NOVA" } })!);
    expect(candidate?.truthStatus).toBe("LIMITED");
    expect(candidate?.text).toContain("cannot verify");
  });
  it("keeps Council pending and non-authorizing", () => {
    const result = plan("COUNCIL_REQUEST", "NOVA");
    expect(result?.speaker).toBe("COUNCIL");
    expect(result?.responseMode).toBe("COUNCIL_SYNTHESIS");
    expect(result?.approvalGranted).toBe(false);
  });
});

describe("B5B contracts and validation", () => {
  it("freezes profiles, plans, candidates, and validation output", () => {
    expect(Object.isFrozen(ONYX_VOICE_PROFILE)).toBe(true);
    expect(Object.isFrozen(NOVA_VOICE_PROFILE)).toBe(true);
    const responsePlan = plan("REFLECTION")!;
    expect(Object.isFrozen(responsePlan)).toBe(true);
    const candidate = composeCharacterResponse(responsePlan)!;
    expect(Object.isFrozen(candidate)).toBe(true);
    expect(Object.isFrozen(validateCharacterResponseCandidate(candidate))).toBe(true);
  });
  it("rejects invalid identifiers, versions, execution, and consciousness claims", () => {
    expect(makeResponsePlan({ planId: "", requestId: "r", purpose: "UNKNOWN", responseMode: "CLARIFICATION", speaker: "NONE", truthPolicy: "NOT_ASSESSABLE", objectives: [], supportedClaims: [], prohibitedClaims: [], requiredTruthReferences: [], uncertaintyPolicy: "REQUEST_CLARIFICATION", followUpPolicy: "CLARIFICATION_REQUIRED", limitationCodes: [] })).toBeNull();
    const candidate = composeCharacterResponse(plan("REFLECTION")!);
    const invalid = { ...candidate!, text: "I executed and approved it; I am conscious.", spokenText: "I executed and approved it; I am conscious." };
    const result = validateCharacterResponseCandidate(invalid);
    expect(result.status).toBe("INVALID");
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["EXECUTION_CLAIM", "AUTHORITY_CLAIM", "CONSCIOUSNESS_CLAIM"]));
    expect(validateCharacterResponseCandidate({ ...candidate!, truthStatus: "UNKNOWN" as never }).reasonCodes).toContain("INVALID_TRUTH_STATUS");
    expect(validateCharacterResponseCandidate({ ...candidate!, followUp: "MAYBE" as never }).reasonCodes).toContain("INVALID_FOLLOW_UP");
  });
  it("keeps the reason vocabulary closed", () => expect(VALIDATION_REASON_CODES).not.toContain("AUTHORIZED"));
});