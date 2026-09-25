function normalizeConversationalText(raw: string): string {
  return raw.toLowerCase().replace(/[\u0027\u2018\u2019\u201B]/g, "").replace(/\bwhats\b/g, "what is").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export const CONVERSATIONAL_PURPOSES = Object.freeze([
  "GENERAL_CONVERSATION", "INFORMATION_REQUEST", "REFLECTION", "ADVICE_REQUEST",
  "CREATIVE_COLLABORATION", "ACTION_REQUEST", "NAVIGATION_REQUEST", "CLARIFICATION_RESPONSE",
  "FOLLOW_UP", "CORRECTION", "INTERRUPTION", "COUNCIL_REQUEST", "UNKNOWN",
] as const);
export type ConversationPurpose = (typeof CONVERSATIONAL_PURPOSES)[number];

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
const CREATIVE_PATTERN = /^(?:imagine|brainstorm|envision|design|create|let'?s imagine|what if)\b/i;
const ADVICE_PATTERN = /^(?:help me decide|what should i|should i|recommend|advise me|how should i|where should i focus)\b/i;
const REFLECTION_PATTERN = /^(?:i feel|today was|it has been|i have had)\b/i;
const GENERAL_CONVERSATION_PATTERN = /^(?:hello|hi|hey|how are you|how is your day|how is the day going|what are you doing|tell me about yourself|what can you do for me|can we talk|thanks|thank you|good morning|good night)\b/i;
const INFORMATION_PATTERN = /^(?:(?:i am\s+)?asking\s+)?(?:what|why|how|when|where|who|which|is|are|can you explain|tell me)\b/i;
const ACTION_PATTERN = /^(?:(?:i am|i just)\s+)?(?:please\s+)?(?:send|sent|delete|create|save|start|stop|run|approve|make|change|set|open|opening|close|launch|show|display|go to|take me to)\b/i;

export class ConversationalPurposeResolver {
  resolve(input: ConversationalPurposeInput): ConversationalPurposeResolution {
    if (/[\u0000-\u001F\u007F]/.test(input.rawText)) return unknown(false);
    const normalized = normalizeConversationalText(input.rawText);
    if (!normalized || normalized.length > MAX_PURPOSE_TEXT_LENGTH) return unknown(false);
    const correction = normalized.match(CORRECTION_WITH_ALTERNATIVE_PATTERN) ?? normalized.match(CORRECTION_SINGLE_ENTITY_PATTERN);
    if (correction) return Object.freeze({ purpose: "CORRECTION", correctedEntity: canonicalEntity(correction[1] ?? ""), clarificationRequired: false, activeTopicUsed: false });
    if (INTERRUPTION_PATTERN.test(normalized)) return resolved("INTERRUPTION");
    if (COUNCIL_PATTERN.test(normalized)) return resolved("COUNCIL_REQUEST");
    if (/^(?:i am\s+(?:open|opening)|(?:please\s+|can you\s+|could you\s+)?(?:open|opening|launch|show|display|bring up|take me to|go to))\b/.test(normalized)) return resolved("NAVIGATION_REQUEST");
    if (FOLLOW_UP_PATTERN.test(normalized)) return input.hasActiveTopic === true ? resolved("FOLLOW_UP", true) : unknown(false);
    if (input.unresolvedClarification === true && CLARIFICATION_RESPONSE_PATTERN.test(normalized)) return resolved("CLARIFICATION_RESPONSE", true);
    if (CREATIVE_PATTERN.test(normalized)) return resolved("CREATIVE_COLLABORATION");
    if (ADVICE_PATTERN.test(normalized)) return resolved("ADVICE_REQUEST");
    if (ACTION_PATTERN.test(normalized)) return resolved("ACTION_REQUEST");
    if (GENERAL_CONVERSATION_PATTERN.test(normalized)) return resolved("GENERAL_CONVERSATION");
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