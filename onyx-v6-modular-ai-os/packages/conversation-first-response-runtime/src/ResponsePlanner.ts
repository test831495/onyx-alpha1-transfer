import type { ConversationPurpose } from "@onyx/conversation-first-contracts";
import type { TruthRequirement } from "./TruthRequirementResolver";
import { makeResponsePlan, type PlanSpeaker, type ResponsePlan } from "./ResponsePlan";
import type { FollowUpPolicy, ResponseMode } from "./constants";

export type SpeakerDecisionInput = Readonly<{ selectedSpeaker?: "ONYX" | "NOVA"; selectionDisposition?: string; currentTopic?: string; previousSpeaker?: "ONYX" | "NOVA" }>;
export type ResponsePlanningInput = Readonly<{
  requestId: string;
  planId: string;
  purpose: ConversationPurpose;
  truth: TruthRequirement;
  speakerDecision?: SpeakerDecisionInput;
  currentTopic?: string;
  correctedEntity?: string;
  actionTarget?: string;
}>;

export function planResponse(input: ResponsePlanningInput): ResponsePlan | null {
  const speaker: PlanSpeaker = input.purpose === "COUNCIL_REQUEST" ? "COUNCIL" : input.speakerDecision?.selectedSpeaker ?? "NONE";
  const responseMode = modeFor(input.purpose, input.truth.truthPolicy);
  const followUpPolicy: FollowUpPolicy = input.purpose === "UNKNOWN" ? "CLARIFICATION_REQUIRED" : input.purpose === "FOLLOW_UP" ? "BOUNDED_CONTINUATION" : input.purpose === "INTERRUPTION" ? "NO_FOLLOW_UP" : "OPTIONAL_FOLLOW_UP";
  const actionProposal = input.purpose === "ACTION_REQUEST" ? {
    proposalId: `${input.planId}-proposal`, kind: "BOUNDED_ACTION", targetRef: input.actionTarget ?? null,
    summary: input.actionTarget ? `Propose action for ${input.actionTarget}.` : "The action target and scope require clarification.",
    requiresApproval: true, riskClass: "HIGH" as const, sourcePurpose: "ACTION_REQUEST" as const,
    status: input.actionTarget ? "PROPOSED" as const : "CLARIFICATION_REQUIRED" as const,
  } : undefined;
  const requiresGroundedOperationalClaims = input.purpose === "ACTION_REQUEST" || input.purpose === "NAVIGATION_REQUEST" || input.purpose === "OPERATIONAL_QUERY" || (input.purpose === "INFORMATION_REQUEST" && input.truth.requiredTruthReferences.length > 0);
  return makeResponsePlan({
    planId: input.planId, requestId: input.requestId, purpose: input.purpose, responseMode, speaker,
    truthPolicy: input.truth.truthPolicy, objectives: Object.freeze(objectivesFor(input)),
    supportedClaims: Object.freeze(requiresGroundedOperationalClaims ? (input.truth.requiredTruthReferences.length ? ["Only supplied truth references may support claims."] : ["No operational claim is required."]) : []),
    prohibitedClaims: Object.freeze(requiresGroundedOperationalClaims ? ["invented operational state", "execution or approval claims", "authority claims"] : []),
    requiredTruthReferences: input.truth.requiredTruthReferences, uncertaintyPolicy: input.truth.uncertaintyPolicy,
    followUpPolicy, actionProposal, limitationCodes: input.truth.limitationCodes,
  });
}

function modeFor(purpose: ConversationPurpose, truthPolicy: string): ResponseMode {
  if (purpose === "UNKNOWN") return "CLARIFICATION";
  if (purpose === "ACTION_REQUEST") return "ACTION_PROPOSAL";
  if (purpose === "ADVICE_REQUEST") return "RECOMMENDATION";
  if (purpose === "INFORMATION_REQUEST") return truthPolicy === "NOT_ASSESSABLE" ? "SAFE_LIMITATION" : "EXPLANATION";
  if (purpose === "CORRECTION" || purpose === "FOLLOW_UP" || purpose === "CLARIFICATION_RESPONSE") return "CONVERSATION";
  if (purpose === "COUNCIL_REQUEST") return "COUNCIL_SYNTHESIS";
  if (purpose === "NAVIGATION_REQUEST") return "ACTION_PROPOSAL";
  return purpose === "INTERRUPTION" ? "CLARIFICATION" : "CONVERSATION";
}

function objectivesFor(input: ResponsePlanningInput): string[] {
  if (input.purpose === "CORRECTION" && input.correctedEntity) return [`Use corrected conversational frame: ${input.correctedEntity}.`];
  if (input.purpose === "FOLLOW_UP" && input.currentTopic) return [`Continue the topic: ${input.currentTopic}.`];
  if (input.purpose === "GENERAL_CONVERSATION") return ["respond naturally and directly to the user’s conversational message while preserving the selected character’s style and avoiding unsupported factual claims."];
  if (input.purpose === "COUNCIL_REQUEST") return ["Prepare a non-authorizing Council-eligible plan."];
  return ["Answer the communicative purpose without inventing unsupported facts."];
}