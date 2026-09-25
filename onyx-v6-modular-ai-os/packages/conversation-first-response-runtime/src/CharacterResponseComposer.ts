import { freezeCandidate, type CharacterResponseCandidate } from "./CharacterResponseCandidate";
import { profileFor } from "./CharacterVoiceProfile";
import type { ResponsePlan } from "./ResponsePlan";
import { MAX_RESPONSE_TEXT } from "./constants";

export function composeCharacterResponse(plan: ResponsePlan): CharacterResponseCandidate | null {
  const profile = profileFor(plan.speaker);
  if (!profile) return null;
  const text = composeText(plan, profile.character);
  if (text.length > MAX_RESPONSE_TEXT) return null;
  return freezeCandidate({
    candidateId: `${plan.planId}-candidate`, planId: plan.planId, speaker: plan.speaker, purpose: plan.purpose, responseMode: plan.responseMode,
    text, spokenText: text, captionText: text, truthStatus: plan.truthPolicy === "SUPPLIED_CONTEXT_ONLY" ? "SUPPLIED_CONTEXT" : plan.truthPolicy === "NO_EXTERNAL_TRUTH_REQUIRED" ? plan.purpose === "CREATIVE_COLLABORATION" ? "CREATIVE" : "GROUNDED" : plan.truthPolicy === "NOT_ASSESSABLE" ? "LIMITED" : "GROUNDED",
    sourceReferences: plan.requiredTruthReferences, uncertainty: plan.uncertaintyPolicy === "NONE" ? "No additional uncertainty stated." : "The required truth is unavailable or needs clarification.",
    proposedActions: plan.actionProposal ? [plan.actionProposal.summary] : [], followUp: plan.followUpPolicy === "CLARIFICATION_REQUIRED" ? "REQUIRED" : plan.followUpPolicy === "NO_FOLLOW_UP" ? "NONE" : "OPTIONAL",
  });
}

function composeText(plan: ResponsePlan, speaker: "ONYX" | "NOVA"): string {
  if (plan.responseMode === "SAFE_LIMITATION") return "I cannot verify that current information from the available evidence. I can help organize details you provide.";
  if (plan.responseMode === "CLARIFICATION") return "I need a little more context before I can answer safely.";
  if (plan.responseMode === "ACTION_PROPOSAL") return plan.actionProposal?.status === "CLARIFICATION_REQUIRED" ? "I can prepare that action, but the target and scope need clarification first. No action has been taken." : `I can propose this action: ${plan.actionProposal?.summary ?? "the requested action"} Approval is still required, and no action has been taken.`;
  if (plan.purpose === "REFLECTION") return speaker === "NOVA" ? "That sounds like a demanding day. One manageable next step is to pause and choose just one thing to finish." : "A demanding day suggests reducing scope. Choose one reversible next step and defer the rest.";
  if (plan.purpose === "ADVICE_REQUEST") return speaker === "ONYX" ? "My recommendation is to choose the option with the clearest evidence and easiest rollback. The main tradeoff is speed versus verification; define the next reversible check." : "I would start with the option that makes progress easiest to see and undo. Pick one small next step, then reassess.";
  if (plan.purpose === "CREATIVE_COLLABORATION") return speaker === "NOVA" ? "A calmer experience could foreground one clear next step, keep status quiet, and make recovery easy to find." : "A calmer experience should reduce competing signals, expose evidence only when useful, and keep consequential changes reversible.";
  if (plan.purpose === "COUNCIL_REQUEST") return "Both perspectives are eligible to be considered, but no Council decision or authority is granted here.";
  return speaker === "ONYX" ? "The available evidence supports a bounded response. The next step is to verify any consequential assumption." : "Here is the clearest bounded answer from what is available. The next step is to confirm anything consequential.";
}