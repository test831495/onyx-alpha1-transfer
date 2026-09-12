export const CONVERSATION_FEATURE_STATES = ["OFF", "TEST_HARNESS", "SHADOW", "OWNER_CANARY", "ACTIVE"] as const;
export type ConversationFeatureState = (typeof CONVERSATION_FEATURE_STATES)[number];

export function getConversationFeatureState(value: string | undefined): ConversationFeatureState {
  if (value === "TEST_HARNESS" || value === "SHADOW") return value;
  return "OFF";
}

export function isConversationExecutionEnabled(state: ConversationFeatureState): boolean {
  return state === "TEST_HARNESS";
}