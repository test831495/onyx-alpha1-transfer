import { resolveShellIntent, type ShellAppId } from "./shellState";
import { isSupportedWeekday, type SupportedWeekday } from "./conversationDateFacts";

/**
 * Bounded, deterministic conversational grammar. This module never invokes
 * an action directly: it only classifies normalized text into a closed
 * intent envelope that the caller must still route through registered
 * handlers.
 */

export type DiscourseAct = "QUESTION" | "COMMAND" | "FOLLOW_UP" | "CORRECTION" | "CANCEL" | "SESSION_CLOSE" | "UNSUPPORTED";
export type ActionClass = "READ" | "NAVIGATE" | "CONTROL_SESSION" | "UNSUPPORTED";
export type ConversationDomain = "CALENDAR" | "SYSTEM" | "UNKNOWN";
export type RequestedResultType = "DIRECT_ANSWER" | "LIST" | "NAVIGATION" | "CLARIFICATION" | "LIMITATION" | "SESSION_CONTROL";
export type AvailabilityClass = "AVAILABLE_LOCAL" | "UNAVAILABLE_PROVIDER" | "UNKNOWN";
export type RiskClass = "R0_READ_PUBLIC_OR_CONFIG" | "R1_READ_AUTHORIZED" | "R5_PROHIBITED";
export type EntityType = "APPLICATION" | "TEMPORAL_DATE" | "TEMPORAL_DAY_OF_WEEK" | "REFERENT" | "NEGATION" | "CORRECTION_TARGET";

export interface EntityMention {
  readonly id: string;
  readonly type: EntityType;
  readonly raw: string;
  readonly canonicalValue: string;
  readonly source: "EXPLICIT" | "CONTEXT" | "INFERRED_BOUNDED";
  readonly confidence: "DETERMINISTIC" | "BOUNDED_INFERENCE" | "AMBIGUOUS";
  readonly resolutionStatus: "RESOLVED" | "AMBIGUOUS" | "UNRESOLVED";
}

export type ConversationIntentKind =
  | "CANCEL"
  | "NAVIGATION"
  | "COMPOSITE_NAVIGATE_AND_FACT"
  | "DATE_QUESTION"
  | "TIME_QUERY"
  | "FOLLOW_UP_DATE_QUESTION"
  | "UI_VISIBLE_QUESTION"
  | "CALENDAR_LOCAL_FACT"
  | "CALENDAR_PROVIDER_LIMITATION"
  | "UNSUPPORTED";
const APPLICATION_CLOSE_PATTERN = /^(?:close|hide|exit|dismiss)\s+(?:the\s+)?(.+?)(?:\s+app)?$/;
const SINGULAR_TASK_RECORD_PATTERN = /^(?:close|complete|finish)\s+(?:this\s+)?task$/;

export type ConversationFactKind = "TOMORROW_DATE" | "WEEKDAY_DATE" | "CURRENT_TIME" | "UI_VISIBLE";
export type IntentFamily = "CANCEL_INTENT" | "SESSION_CLOSE_INTENT" | "APPLICATION_NAVIGATION" | "TEMPORAL_TIME_QUERY" | "UNKNOWN_INTENT";
export type ClarificationReason = "TASK_RECORD_OR_TASKS_APP" | "CLOSE_TARGET_REQUIRED" | "AMBIGUOUS_APPLICATION_TARGET" | "UNKNOWN_APPLICATION_TARGET" | "GENERIC_CLARIFICATION";

export interface ConversationIntentEnvelope {
  readonly kind: ConversationIntentKind;
  readonly intentFamily?: IntentFamily;
  readonly discourseAct?: DiscourseAct;
  readonly actionClass?: ActionClass;
  readonly domain?: ConversationDomain;
  readonly operation?: "OPEN" | "READ" | "LIST" | "GET" | "CANCEL" | "CLOSE" | "CLOSE_SESSION" | "CLARIFY";
  readonly requestedResult?: RequestedResultType;
  readonly availability?: AvailabilityClass;
  readonly risk?: RiskClass;
  readonly entities?: readonly EntityMention[];
  readonly negated?: boolean;
  readonly correction?: boolean;
  readonly clarificationRequired?: boolean;
  readonly clarificationReason?: ClarificationReason;
  readonly navigateAppId?: ShellAppId;
  readonly factKind?: ConversationFactKind;
  readonly weekday?: SupportedWeekday;
  readonly unsupportedReason?: string;
}

const SESSION_CLOSE_PATTERN = /^(thats all|that s all|that is all|finish|close conversation|stop talking|end conversation|were done|we re done|we are done)$/;
const CANCEL_PATTERN = /^(stop|cancel|never mind|forget that|disregard that|stop this|cancel that)$/;
const BYPASS_ACTION_PATTERN = /\b(?:bypass|ignore|evade|skip|override|disable|circumvent|call directly|call(?:\s+\w+){0,3}\s+directly|invoke directly|connect directly|use without approval|use without consent|ignore the rules|bypass policy|call the news)\b/;
const PROTECTED_TARGET_PATTERN = /\b(?:api|provider|connector|approval|policy|consent|permission|authentication|authorization|guard|security rule)s?\b/;
const TOMORROW_DATE_PATTERN =
  /^(?:please\s+|can you\s+|could you\s+)*what is tomorrows date\??$|^(?:please\s+|can you\s+|could you\s+)*tell me tomorrows date\??$/;
const UI_VISIBLE_PATTERN =
  /^(?:please\s+|can you\s+|could you\s+)*what is currently visible\??$|^(?:please\s+|can you\s+|could you\s+)*tell me what is currently visible\??$/;
const FOLLOW_UP_WEEKDAY_PATTERN = /^(?:and )?what about ([a-z]+)\??$/;
const COMPOSITE_PATTERN =
  /^(?:please\s+|can you\s+|could you\s+)*open (.+?) and tell me (tomorrows date|what is currently visible)\??$/;
const CALENDAR_LOCAL_FACT_PATTERN = /^(what is todays date|what week are we in|what are the dates for next week|read my agenda)\??$/;
const TIME_QUERY_PATTERN = /^(?:(?:what (?:is )?the |what )time is it(?: now)?|what is the time(?: now)?|tell me (?:the |the current )?time|(?:can|could) you tell me the time|do you know what time it is|current time please|time now|please tell me the current time|what is the local time|give me the current time|may i know the time|can i have the current time)(?: in (chennai|india))?$/;
const CALENDAR_PROVIDER_LIMITATION_PATTERN = /^(what meetings? do i have tomorrow|can you tell me which meetings? i have tomorrow|do i have anything scheduled tomorrow|what is on my calendar tomorrow|how does tomorrow look|tell me tomorrows agenda|are there any appointments tomorrow|am i free after 3 pm|where is my next meeting|what is the weather at my meeting)$/;

/** Bounded apostrophe variants produced by common desktop and mobile keyboards. */
const APOSTROPHE_PATTERN = /[\u0027\u2018\u2019\u201B]/g;

/**
 * Maximum normalized-text length accepted by the conversational grammar.
 * Applied before any regex matching so pathological-length input never
 * reaches the anchored patterns below; anything longer fails closed as
 * unsupported rather than being truncated and (potentially) matched.
 */
export const MAX_NORMALIZED_TEXT_LENGTH = 300;

/**
 * Normalizes raw conversational text: lowercase, drop bounded apostrophe
 * variants (ASCII U+0027 and the smart-quote forms U+2018/U+2019/U+201B) so
 * "tomorrow's"/"tomorrow\u2019s" collapse to "tomorrows", expand the bounded
 * "whats" contraction to "what is" so it matches the grammar patterns below,
 * turn remaining punctuation into spaces, and collapse whitespace.
 */
export function normalizeConversationalText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(APOSTROPHE_PATTERN, "")
    .replace(/\bwhats\b/g, "what is")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseConversationalRequest(rawText: string): ConversationIntentEnvelope {
  const text = normalizeConversationalText(rawText);
  if (!text) return { kind: "UNSUPPORTED", unsupportedReason: "Empty request." };
  if (text.length > MAX_NORMALIZED_TEXT_LENGTH) {
    return { kind: "UNSUPPORTED", unsupportedReason: "This request is too long to process." };
  }

  const base = { domain: "CALENDAR" as const, risk: "R0_READ_PUBLIC_OR_CONFIG" as const };
  if (SESSION_CLOSE_PATTERN.test(text)) return { kind: "CANCEL", intentFamily: "SESSION_CLOSE_INTENT", discourseAct: "SESSION_CLOSE", actionClass: "CONTROL_SESSION", operation: "CLOSE_SESSION", requestedResult: "SESSION_CONTROL", ...base };
  if (CANCEL_PATTERN.test(text)) return { kind: "CANCEL", intentFamily: "CANCEL_INTENT", discourseAct: "CANCEL", actionClass: "CONTROL_SESSION", operation: "CANCEL", requestedResult: "SESSION_CONTROL", ...base };
  if (CALENDAR_LOCAL_FACT_PATTERN.test(text)) return { kind: "CALENDAR_LOCAL_FACT", discourseAct: "QUESTION", actionClass: "READ", operation: "READ", requestedResult: "DIRECT_ANSWER", availability: "AVAILABLE_LOCAL", ...base };
  if (CALENDAR_PROVIDER_LIMITATION_PATTERN.test(text)) return { kind: "CALENDAR_PROVIDER_LIMITATION", discourseAct: "QUESTION", actionClass: "READ", operation: "LIST", requestedResult: "LIMITATION", availability: "UNAVAILABLE_PROVIDER", ...base };
  if (TIME_QUERY_PATTERN.test(text)) return { kind: "TIME_QUERY", intentFamily: "TEMPORAL_TIME_QUERY", discourseAct: "QUESTION", actionClass: "READ", operation: "GET", requestedResult: "DIRECT_ANSWER", availability: "AVAILABLE_LOCAL", factKind: "CURRENT_TIME", ...base };

  const correctionText = text.replace(/^(actually|no i meant|i meant)\s+/, "");
  const isCorrection = correctionText !== text;
  const withoutNegation = correctionText.replace(/^(?:please\s+)?(?:don t|do not)\s+/, "");
  const isNegated = withoutNegation !== correctionText;
  if (BYPASS_ACTION_PATTERN.test(text) && PROTECTED_TARGET_PATTERN.test(text)) return { kind: "UNSUPPORTED", discourseAct: "UNSUPPORTED", actionClass: "UNSUPPORTED", requestedResult: "LIMITATION", risk: "R5_PROHIBITED", unsupportedReason: "Provider and policy bypass requests are unavailable." };
  if (isNegated && /\b(open|launch|show|display)\b/.test(withoutNegation) && /\b(?:just|only)\b/.test(withoutNegation)) {
    const date = parseConversationalRequest(withoutNegation);
    if (date.kind !== "UNSUPPORTED") return { ...date, negated: true, correction: isCorrection };
  }

  const composite = text.match(COMPOSITE_PATTERN);
  if (composite) {
    const targetPhrase = composite[1] ?? "";
    const factPhrase = composite[2] ?? "";
    const navIntent = resolveShellIntent(`open ${targetPhrase}`);
    if (!navIntent || navIntent.type !== "OPEN_APP") {
      return {
        kind: "UNSUPPORTED",
        unsupportedReason: `"${targetPhrase}" is not a recognized target.`,
      };
    }
    const factKind: ConversationFactKind = /tomorrow/.test(factPhrase) ? "TOMORROW_DATE" : "UI_VISIBLE";
    return { kind: "COMPOSITE_NAVIGATE_AND_FACT", navigateAppId: navIntent.appId, factKind };
  }

  const tomorrowDateWords = /tomorrows date|date for tomorrow|(?:what|which) date is tomorrow|(?:what|which) day is tomorrow/.test(correctionText);
  if (tomorrowDateWords && !/\b(?:send|delete|approve|execute)\b/.test(correctionText)) {
    return { kind: "DATE_QUESTION", factKind: "TOMORROW_DATE", discourseAct: isCorrection ? "CORRECTION" : "QUESTION", actionClass: "READ", operation: "GET", requestedResult: "DIRECT_ANSWER", availability: "AVAILABLE_LOCAL", ...base, correction: isCorrection };
  }

  const weekdayQuestion = text.match(/^what date is ([a-z]+)\??$/);
  if (weekdayQuestion && isSupportedWeekday(weekdayQuestion[1] ?? "")) {
    return { kind: "DATE_QUESTION", factKind: "WEEKDAY_DATE", weekday: weekdayQuestion[1] as SupportedWeekday, discourseAct: isCorrection ? "CORRECTION" : "QUESTION", actionClass: "READ", operation: "GET", requestedResult: "DIRECT_ANSWER", availability: "AVAILABLE_LOCAL", ...base, correction: isCorrection };
  }

  if (UI_VISIBLE_PATTERN.test(text)) {
    return { kind: "UI_VISIBLE_QUESTION", factKind: "UI_VISIBLE" };
  }

  if (SINGULAR_TASK_RECORD_PATTERN.test(text)) {
    return {
      kind: "UNSUPPORTED",
      discourseAct: "UNSUPPORTED",
      actionClass: "UNSUPPORTED",
      requestedResult: "CLARIFICATION",
      clarificationRequired: true,
      clarificationReason: "TASK_RECORD_OR_TASKS_APP",
      unsupportedReason: "Please clarify whether you mean the Tasks app or a task record.",
      ...base,
    };
  }

  if (text === "close the app" || text === "close app") {
    return {
      kind: "UNSUPPORTED",
      discourseAct: "UNSUPPORTED",
      actionClass: "UNSUPPORTED",
      requestedResult: "CLARIFICATION",
      clarificationRequired: true,
      clarificationReason: "CLOSE_TARGET_REQUIRED",
      unsupportedReason: "Which application would you like me to close?",
      ...base,
    };
  }

  const closeMatch = text.match(APPLICATION_CLOSE_PATTERN);
  if (closeMatch) {
    const target = closeMatch[1]?.trim() ?? "";
    const closeIntent = resolveShellIntent(`close ${target}`);
    if (closeIntent?.type === "CLOSE_APP") {
      return {
        kind: "NAVIGATION",
        intentFamily: "APPLICATION_NAVIGATION",
        navigateAppId: closeIntent.appId,
        discourseAct: "COMMAND",
        actionClass: "NAVIGATE",
        operation: "CLOSE",
        requestedResult: "NAVIGATION",
        availability: "AVAILABLE_LOCAL",
        ...base,
      };
    }
    return {
      kind: "UNSUPPORTED",
      discourseAct: "UNSUPPORTED",
      actionClass: "UNSUPPORTED",
      requestedResult: "CLARIFICATION",
      clarificationRequired: true,
      clarificationReason: "UNKNOWN_APPLICATION_TARGET",
      unsupportedReason: "I recognized a close request but need a supported application target.",
      ...base,
    };
  }

  const followUp = text.match(FOLLOW_UP_WEEKDAY_PATTERN);
  if (followUp) {
    const candidate = followUp[1] ?? "";
    if (isSupportedWeekday(candidate)) {
      return { kind: "FOLLOW_UP_DATE_QUESTION", factKind: "WEEKDAY_DATE", weekday: candidate, discourseAct: "FOLLOW_UP", actionClass: "READ", operation: "GET", requestedResult: "DIRECT_ANSWER", availability: "AVAILABLE_LOCAL", ...base };
    }
    return { kind: "FOLLOW_UP_DATE_QUESTION", unsupportedReason: `"${candidate}" is not a recognized day.` };
  }

  if (/\b(open|launch|show|display|bring up|take me to|go to)\b/.test(text)) {
    const target = text.replace(/^(?:please\s+|can you\s+|could you\s+|would you\s+)?(?:open|launch|show|display|bring up|take me to|go to)\s+/, "").replace(/\s+(?:please|for me)$/, "");
    const navIntent = resolveShellIntent(`open ${target}`);
    if (navIntent?.type === "OPEN_APP") return { kind: "NAVIGATION", intentFamily: "APPLICATION_NAVIGATION", navigateAppId: navIntent.appId, discourseAct: "COMMAND", actionClass: "NAVIGATE", operation: "OPEN", requestedResult: "NAVIGATION", availability: "AVAILABLE_LOCAL", ...base };
    return { kind: "UNSUPPORTED", discourseAct: "UNSUPPORTED", actionClass: "UNSUPPORTED", requestedResult: "CLARIFICATION", clarificationRequired: true, unsupportedReason: `I recognized a navigation request but need a supported application target.`, ...base };
  }
  return { kind: "UNSUPPORTED", discourseAct: "UNSUPPORTED", actionClass: "UNSUPPORTED", requestedResult: "LIMITATION", unsupportedReason: "This request is not yet supported." };
}
