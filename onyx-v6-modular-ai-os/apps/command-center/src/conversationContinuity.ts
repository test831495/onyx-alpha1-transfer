import type { ConversationIntentEnvelope } from "./conversationIntentGrammar";
import type { ConversationPlan } from "./conversationPlan";

export type ConversationContinuity =
  | "CONTINUE_LISTENING"
  | "REQUEST_CLARIFICATION"
  | "TERMINATE_SESSION"
  | "RUNTIME_FAILURE"
  | "TAP_TO_CONTINUE";

export type PostSpeechRestartResult = "STARTED" | "TAP_TO_CONTINUE" | "CLOSED";

export function shouldAcknowledgeNavigation(plan: ConversationPlan, outcomes: readonly string[]): boolean {
  const [step] = plan.steps;
  return plan.steps.length === 1 &&
    (step?.kind === "NAVIGATE" || step?.kind === "PRESENTATION") &&
    outcomes[0] === "COMPLETED" &&
    Boolean(step.appId);
}

export function resolvePostSpeechDisposition(continuity: ConversationContinuity, restartResult: PostSpeechRestartResult): "LISTENING" | "TAP_TO_CONTINUE" | "IDLE" {
  if (continuity !== "CONTINUE_LISTENING") return "IDLE";
  if (restartResult === "STARTED") return "LISTENING";
  if (restartResult === "TAP_TO_CONTINUE") return "TAP_TO_CONTINUE";
  return "IDLE";
}

export function getConversationContinuity(
  intent: ConversationIntentEnvelope,
): ConversationContinuity {
  if (intent.intentFamily === "SESSION_CLOSE_INTENT" || intent.kind === "CANCEL") return "TERMINATE_SESSION";
  if (intent.clarificationRequired) return "REQUEST_CLARIFICATION";
  return "CONTINUE_LISTENING";
}