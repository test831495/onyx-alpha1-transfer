import type { ConversationIntentEnvelope } from "./conversationIntentGrammar";

export type ConversationContinuity =
  | "CONTINUE_LISTENING"
  | "REQUEST_CLARIFICATION"
  | "TERMINATE_SESSION"
  | "RUNTIME_FAILURE"
  | "TAP_TO_CONTINUE";

export function getConversationContinuity(
  intent: ConversationIntentEnvelope,
): ConversationContinuity {
  if (intent.intentFamily === "SESSION_CLOSE_INTENT" || intent.kind === "CANCEL") return "TERMINATE_SESSION";
  if (intent.clarificationRequired) return "REQUEST_CLARIFICATION";
  return "CONTINUE_LISTENING";
}