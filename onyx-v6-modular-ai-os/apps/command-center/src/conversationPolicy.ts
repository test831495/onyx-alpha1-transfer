export interface ConversationPolicy {
  readonly maxAcceptedTurns: number;
  readonly followUpSilenceTimeoutMs: number;
  readonly foregroundSessionMaxMs: number;
  readonly recognitionRestartLimit: number;
}

const validateInteger = (value: number, minimum: number, maximum: number, name: string): number => {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
};

export function createConversationPolicy(policy: ConversationPolicy): ConversationPolicy {
  return Object.freeze({
    maxAcceptedTurns: validateInteger(policy.maxAcceptedTurns, 1, 20, "maxAcceptedTurns"),
    followUpSilenceTimeoutMs: validateInteger(policy.followUpSilenceTimeoutMs, 5000, 30000, "followUpSilenceTimeoutMs"),
    foregroundSessionMaxMs: validateInteger(policy.foregroundSessionMaxMs, 60000, 600000, "foregroundSessionMaxMs"),
    recognitionRestartLimit: validateInteger(policy.recognitionRestartLimit, 0, 2, "recognitionRestartLimit"),
  });
}

export const DEFAULT_CONVERSATION_POLICY = createConversationPolicy({
  maxAcceptedTurns: 10,
  followUpSilenceTimeoutMs: 15000,
  foregroundSessionMaxMs: 300000,
  recognitionRestartLimit: 1,
});