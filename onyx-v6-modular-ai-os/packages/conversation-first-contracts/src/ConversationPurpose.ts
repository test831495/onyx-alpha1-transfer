function normalizeConversationalText(raw: string): string {
  return raw.toLowerCase().replace(/[\u0027\u2018\u2019\u201B]/g, "").replace(/\bwhats\b/g, "what is").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export const CONVERSATIONAL_PURPOSES = Object.freeze([
  "GENERAL_CONVERSATION", "INFORMATION_REQUEST", "REFLECTION", "ADVICE_REQUEST",
  "CREATIVE_COLLABORATION", "ACTION_REQUEST", "NAVIGATION_REQUEST", "CLARIFICATION_RESPONSE",
  "FOLLOW_UP", "CORRECTION", "INTERRUPTION", "COUNCIL_REQUEST", "UNKNOWN",
] as const);
export type ConversationPurpose =
  | (typeof CONVERSATIONAL_PURPOSES)[number]
  | "LANGUAGE_PREFERENCE"
  | "CREATIVE_REQUEST"
  | "OPERATIONAL_QUERY"
  | "DETERMINISTIC_COMMAND"
  | "OPINION_REQUEST"
  | "CLARIFICATION";

export interface ConversationalPurposeInput {
  readonly rawText: string;
  readonly hasActiveTopic?: boolean;
  readonly unresolvedClarification?: boolean;
}

export interface ConversationalPurposeResolution {
  readonly purpose: ConversationPurpose;
  readonly correctedEntity?: string;
  readonly clarificationRequired: boolean;
  readonly activeTopicUsed: boolean;
}

const MAX_PURPOSE_TEXT_LENGTH = 300;
const CORRECTION_WITH_ALTERNATIVE_PATTERN = /^no\s+(?:i meant\s+)?(.+?)\s+not\s+(.+)$/i;
const CORRECTION_SINGLE_ENTITY_PATTERN = /^(?:actually|i meant)\s+(.+)$/i;
const INTERRUPTION_PATTERN = /^(?:wait|hold on|stop|one moment|interrupting|let me stop you)/i;
const FOLLOW_UP_PATTERN = /^(?:why|how so|what do you mean|and then what|what next|tell me more|can you explain that|what about that)\??$/i;
const CLARIFICATION_RESPONSE_PATTERN = /^(?:yes|no|that one|the first one|the second one|calendar|mail|workspace|microsoft|google)$/i;
const COUNCIL_PATTERN = /\b(?:both of you|all of you|council|each of you|you two)\b.*\b(?:recommend|think|suggest|say)\b/i;
const LANGUAGE_PREFERENCE_PATTERN = /(?:\b(?:speak|talk|chat|reply|answer)\s+(?:in|to me in)?\s*(?:hindi|hinglish|english)\b|\b(?:can you|could you|would you|please)\s+(?:speak|talk|chat|reply|answer)\s+(?:in\s+)?(?:hindi|hinglish|english)\b|\b(?:hindi|hinglish|english)\s+(?:mein\s+)?(?:baat|bol|karo|batao|chat)\b|\b(?:switch back to|switch to|go back to)\s+(?:english|hindi|hinglish)\b)/i;
const CREATIVE_PATTERN = /^(?:(?:can you|could you|please|would you)?\s*(?:tell me|show me|give me|make me|write|create|compose)\s+(?:a\s+)?(?:story|joke|poem|short story|scene|brainstorm|idea)|imagine|brainstorm|envision|design|create|let'?s imagine|what if|tell me a joke|can you tell me a story|can you tell me a joke)/i;
const ADVICE_PATTERN = /^(?:help me decide|what should i|should i|recommend|advise me|how should i|where should i focus)\b/i;
const REFLECTION_PATTERN = /^(?:i feel|today was|it has been|i have had|how is your day going|how is your day|how are you doing|how are things)\b/i;
const GENERAL_CONVERSATION_PATTERN = /^(?:hello|hi|hey|how are you|how is your day|how is your day going|how is it going|how are things|what are you doing|tell me about yourself|what can you do for me|what can you do for me today|can we talk|thanks|thank you|good morning|good night|good afternoon|nice to meet you|how has your day been)\b/i;
const INFORMATION_PATTERN = /^(?:(?:i am\s+)?asking\s+)?(?:what|why|how|when|where|who|which|is|are|can you explain|tell me)\b/i;
const ACTION_PATTERN = /^(?:(?:i am|i just)\s+)?(?:please\s+)?(?:send|sent|delete|create|save|start|stop|run|approve|make|change|set|open|opening|close|launch|show|display|go to|take me to)\b/i;
const DETERMINISTIC_COMMAND_PATTERN = /^(?:please\s+|can you\s+|could you\s+|would you\s+)?(?:open|close|show|hide|launch|display|minimize|maximize|go home|cancel|exit)\s+(?:the\s+)?(?:workspace|files|notes|calendar|mail|settings|health|app|home|screen)/i;
const OPERATIONAL_QUERY_PATTERN = /\b(?:workspace|files|notes|calendar|mail|settings|health|account|connector|provider|project|team|meeting|task)\b/i;
const OPINION_PATTERN = /^(?:what do you think|what is your opinion|do you agree|what would you prefer|what do you prefer|what is your take on|do you like)\b/i;

export class ConversationalPurposeResolver {
  resolve(input: ConversationalPurposeInput): ConversationalPurposeResolution {
    const normalized = normalizeConversationalText(input.rawText);
    if (!normalized || normalized.length > MAX_PURPOSE_TEXT_LENGTH) return unknown(false);
    const correction = normalized.match(CORRECTION_WITH_ALTERNATIVE_PATTERN) ?? normalized.match(CORRECTION_SINGLE_ENTITY_PATTERN);
    if (correction) return Object.freeze({ purpose: "CORRECTION", correctedEntity: canonicalEntity(correction[1] ?? ""), clarificationRequired: false, activeTopicUsed: false });
    if (INTERRUPTION_PATTERN.test(normalized)) return resolved("INTERRUPTION");
    if (COUNCIL_PATTERN.test(normalized)) return resolved("COUNCIL_REQUEST");
    if (/^(?:i am\s+(?:open|opening)|(?:please\s+|can you\s+|could you\s+)?(?:open|opening|launch|show|display|bring up|take me to|go to))\b/.test(normalized)) return resolved("NAVIGATION_REQUEST");
    if (DETERMINISTIC_COMMAND_PATTERN.test(normalized)) return resolved("DETERMINISTIC_COMMAND");
    if (LANGUAGE_PREFERENCE_PATTERN.test(normalized)) return resolved("LANGUAGE_PREFERENCE");
    if (OPERATIONAL_QUERY_PATTERN.test(normalized) && /(?:what|tell me|show|list|find|summarize|review|status|contents|in my)/i.test(normalized)) return resolved("OPERATIONAL_QUERY");
    if (FOLLOW_UP_PATTERN.test(normalized)) return input.hasActiveTopic === true ? resolved("FOLLOW_UP", true) : unknown(false);
    if (input.unresolvedClarification === true && CLARIFICATION_RESPONSE_PATTERN.test(normalized)) return resolved("CLARIFICATION_RESPONSE", true);
    if (CREATIVE_PATTERN.test(normalized)) return resolved("CREATIVE_COLLABORATION");
    if (ADVICE_PATTERN.test(normalized)) return resolved("ADVICE_REQUEST");
    if (ACTION_PATTERN.test(normalized)) return resolved("ACTION_REQUEST");
    if (GENERAL_CONVERSATION_PATTERN.test(normalized)) return resolved("GENERAL_CONVERSATION");
    if (OPINION_PATTERN.test(normalized)) return resolved("OPINION_REQUEST");
    if (INFORMATION_PATTERN.test(normalized)) return resolved("INFORMATION_REQUEST");
    if (REFLECTION_PATTERN.test(normalized)) return resolved("REFLECTION");
    return unknown(false);
  }
}

function resolved(purpose: ConversationPurpose, activeTopicUsed = false): ConversationalPurposeResolution {
  return Object.freeze({ purpose, clarificationRequired: false, activeTopicUsed });
}

function unknown(activeTopicUsed: boolean): ConversationalPurposeResolution {
  return Object.freeze({ purpose: "UNKNOWN", clarificationRequired: true, activeTopicUsed });
}

function canonicalEntity(value: string): string {
  return value.length === 0 ? value : `${value[0]!.toUpperCase()}${value.slice(1)}`;
}