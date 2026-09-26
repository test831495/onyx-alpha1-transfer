function normalizeConversationalText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\u0027\u2018\u2019\u201B]/g, "")
    .replace(/^(?:uh|um|er|ah|like)\s+/i, "")
    .replace(/\bwhats\b/g, "what is")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
  readonly currentTopic?: string | null;
  readonly recentTurnSummaries?: readonly string[];
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
const CONTEXTUAL_FOLLOW_UP_PATTERN = /^(?:(?:what|how|why|when|where|which|who)\s+(?:else\s+)?(?:can i make|should i do|was the|is the|do i do|should i start|was the second step)|(?:make it simpler)|(?:how should i start)|(?:what was the second step)|(?:what else can i make(?: with .*?)?(?: apart from .+)?))\??$/i;
const CLARIFICATION_RESPONSE_PATTERN = /^(?:yes|no|that one|the first one|the second one|calendar|mail|workspace|microsoft|google)$/i;
const COUNCIL_PATTERN = /\b(?:both of you|all of you|council|each of you|you two)\b.*\b(?:recommend|think|suggest|say)\b/i;
const LANGUAGE_PREFERENCE_PATTERN = /(?:\b(?:speak|talk|chat|reply|answer|explain|say|show|tell|continue)\b(?:[^\n]{0,50})?\b(?:in|to me in)?\s*(?:hindi|hinglish|english)\b|\b(?:can you|could you|would you|please)\b(?:[^\n]{0,80})?\b(?:in\s+)?(?:hindi|hinglish|english)\b|\b(?:hindi|hinglish|english)\s+(?:mein\s+)?(?:baat|bol|karo|batao|chat|samjhao|batao)\b|\b(?:switch back to|switch to|go back to)\s+(?:english|hindi|hinglish)\b)/i;
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
    const hasSessionContext = hasContextualSession(input);
    if (LANGUAGE_PREFERENCE_PATTERN.test(normalized)) return resolved("LANGUAGE_PREFERENCE", hasSessionContext);
    if (OPERATIONAL_QUERY_PATTERN.test(normalized) && /(?:what|tell me|show|list|find|summarize|review|status|contents|in my)/i.test(normalized)) return resolved("OPERATIONAL_QUERY");
    if (FOLLOW_UP_PATTERN.test(normalized)) return hasSessionContext ? resolved("FOLLOW_UP", true) : unknown(false);
    if (/^what else can i make(?: with .*?)?(?: apart from .+)?\??$/i.test(normalized)) return resolved("FOLLOW_UP", true);
    if (CONTEXTUAL_FOLLOW_UP_PATTERN.test(normalized)) return hasSessionContext ? resolved("FOLLOW_UP", true) : unknown(false);
    if (/^why did you stop\b/i.test(normalized)) {
      return resolved("INFORMATION_REQUEST", true);
    }
    if (/continue from where you stopped/i.test(normalized)) {
      return resolved("FOLLOW_UP", true);
    }
    if (input.unresolvedClarification === true && CLARIFICATION_RESPONSE_PATTERN.test(normalized)) return resolved("CLARIFICATION_RESPONSE", true);
    if (CREATIVE_PATTERN.test(normalized)) return resolved("CREATIVE_COLLABORATION");
    if (ADVICE_PATTERN.test(normalized)) return hasSessionContext ? resolved("ADVICE_REQUEST", true) : resolved("ADVICE_REQUEST");
    if (ACTION_PATTERN.test(normalized)) return hasSessionContext && /^(?:make it simpler|what else can i make|how should i start|what was the second step|what next|and then what|tell me more|can you explain that|why|how)$/i.test(normalized) ? resolved("FOLLOW_UP", true) : resolved("ACTION_REQUEST");
    if (GENERAL_CONVERSATION_PATTERN.test(normalized)) return resolved("GENERAL_CONVERSATION");
    if (OPINION_PATTERN.test(normalized)) return resolved("OPINION_REQUEST");
    if (INFORMATION_PATTERN.test(normalized)) return hasSessionContext && /^(?:what was the second step|what else can i make|how should i start|make it simpler|what next|and then what|tell me more|can you explain that|why|how)$/i.test(normalized) ? resolved("FOLLOW_UP", true) : resolved("INFORMATION_REQUEST");
    if (REFLECTION_PATTERN.test(normalized)) return resolved("REFLECTION");

    const semantic = resolveSemanticPurpose(normalized, hasSessionContext);
    if (semantic) return semantic;
    if (/^click on\b|^click\b/i.test(normalized)) return Object.freeze({ purpose: "CLARIFICATION", clarificationRequired: true, activeTopicUsed: hasSessionContext });
    return unknown(false);
  }
}

function resolveSemanticPurpose(normalized: string, hasSessionContext: boolean): ConversationalPurposeResolution | null {
  const short = normalized.trim();
  if (!short) return null;
  if (/^(?:click on|click|tap on|tap)\b/i.test(short)) return Object.freeze({ purpose: "CLARIFICATION", clarificationRequired: true, activeTopicUsed: hasSessionContext });
  if (/^why did you stop\b/i.test(short)) return Object.freeze({ purpose: "INFORMATION_REQUEST", clarificationRequired: false, activeTopicUsed: true });
  if (/(?:why did you pause|why did you stop talking)/i.test(short)) return Object.freeze({ purpose: "INFORMATION_REQUEST", clarificationRequired: false, activeTopicUsed: true });
  if (/(?:continue from where you stopped|continue from where you left off|keep going from where you stopped|carry on from where you stopped)/i.test(short)) return Object.freeze({ purpose: "FOLLOW_UP", clarificationRequired: false, activeTopicUsed: true });
  if (/(?:continue|resume|carry on|keep going|proceed|go on)/i.test(short) && /(?:where|what|when|why|how)/i.test(short)) return Object.freeze({ purpose: "FOLLOW_UP", clarificationRequired: false, activeTopicUsed: hasSessionContext });
  if (/(?:oh my god|wow|this seems broken|it seems you are fully broken|this is broken|im frustrated|i am frustrated|this is frustrating|damn|sucks|this is bad|seriously)/i.test(short)) return Object.freeze({ purpose: "GENERAL_CONVERSATION", clarificationRequired: false, activeTopicUsed: hasSessionContext });
  if (/(?:what|why|how|when|where|who|which)\b/.test(short)) return Object.freeze({ purpose: "INFORMATION_REQUEST", clarificationRequired: false, activeTopicUsed: hasSessionContext });
  if (/(?:create|write|compose|brainstorm|invent|story|joke|poem|scene|idea)/i.test(short)) return Object.freeze({ purpose: "CREATIVE_COLLABORATION", clarificationRequired: false, activeTopicUsed: hasSessionContext });
  if (/(?:help me decide|what should i|should i|recommend|advise|best way|how should i)/i.test(short)) return Object.freeze({ purpose: "ADVICE_REQUEST", clarificationRequired: false, activeTopicUsed: hasSessionContext });
  if (/(?:switch to|switch back to|speak in|talk in|reply in|answer in|explain in|continue in|chat in)\s*(?:hindi|hinglish|english)/i.test(short)) return Object.freeze({ purpose: "LANGUAGE_PREFERENCE", clarificationRequired: false, activeTopicUsed: hasSessionContext });
  if (/(?:i feel|i think|it seems|it feels|i am upset|i am confused|i am tired|i am stressed|i am frustrated|sorry|thanks|thank you|hello|hi|hey)/i.test(short)) return Object.freeze({ purpose: "GENERAL_CONVERSATION", clarificationRequired: false, activeTopicUsed: hasSessionContext });
  if (/(?:what do you think|do you agree|what is your opinion|what would you prefer|how do you feel)/i.test(short)) return Object.freeze({ purpose: "OPINION_REQUEST", clarificationRequired: false, activeTopicUsed: hasSessionContext });
  if (/(?:workspace|calendar|files|notes|mail|task|meeting|account|project|connector|provider|status)/i.test(short) && /(?:what|show|tell|list|review|summarize|status|find)/i.test(short)) return Object.freeze({ purpose: "OPERATIONAL_QUERY", clarificationRequired: false, activeTopicUsed: hasSessionContext });
  if (!/\b[a-z]{3,}\b/i.test(short) || short.split(/\s+/).length < 2) return null;
  return null;
}

function hasContextualSession(input: ConversationalPurposeInput): boolean {
  if (input.hasActiveTopic === true || input.currentTopic !== undefined && input.currentTopic !== null) return true;
  if (Array.isArray(input.recentTurnSummaries) && input.recentTurnSummaries.some((summary) => typeof summary === "string" && summary.trim().length > 0)) return true;
  return false;
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