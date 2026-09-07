import { resolveShellIntent, type ShellAppId } from "./shellState";
import { isSupportedWeekday, type SupportedWeekday } from "./conversationDateFacts";

/**
 * Bounded, deterministic conversational grammar. This module never invokes
 * an action directly: it only classifies normalized text into a closed
 * intent envelope that the caller must still route through registered
 * handlers.
 */

export type ConversationIntentKind =
  | "CANCEL"
  | "COMPOSITE_NAVIGATE_AND_FACT"
  | "DATE_QUESTION"
  | "FOLLOW_UP_DATE_QUESTION"
  | "UI_VISIBLE_QUESTION"
  | "CALENDAR_LOCAL_FACT"
  | "CALENDAR_PROVIDER_LIMITATION"
  | "UNSUPPORTED";

export type ConversationFactKind = "TOMORROW_DATE" | "WEEKDAY_DATE" | "UI_VISIBLE";

export interface ConversationIntentEnvelope {
  readonly kind: ConversationIntentKind;
  readonly navigateAppId?: ShellAppId;
  readonly factKind?: ConversationFactKind;
  readonly weekday?: SupportedWeekday;
  readonly unsupportedReason?: string;
}

const CANCEL_PATTERN = /^(stop|cancel|never mind)$/;
const TOMORROW_DATE_PATTERN =
  /^(?:please\s+|can you\s+|could you\s+)*what is tomorrows date\??$|^(?:please\s+|can you\s+|could you\s+)*tell me tomorrows date\??$/;
const UI_VISIBLE_PATTERN =
  /^(?:please\s+|can you\s+|could you\s+)*what is currently visible\??$|^(?:please\s+|can you\s+|could you\s+)*tell me what is currently visible\??$/;
const FOLLOW_UP_WEEKDAY_PATTERN = /^(?:and )?what about ([a-z]+)\??$/;
const COMPOSITE_PATTERN =
  /^(?:please\s+|can you\s+|could you\s+)*open (.+?) and tell me (tomorrows date|what is currently visible)\??$/;
const CALENDAR_LOCAL_FACT_PATTERN = /^(what is todays date|what time is it|what week are we in|what are the dates for next week|read my agenda)\??$/;
const CALENDAR_PROVIDER_LIMITATION_PATTERN = /^(what meetings do i have tomorrow|am i free after 3 pm|where is my next meeting|what is the weather at my meeting)\??$/;

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

  if (CANCEL_PATTERN.test(text)) return { kind: "CANCEL" };
  if (CALENDAR_LOCAL_FACT_PATTERN.test(text)) return { kind: "CALENDAR_LOCAL_FACT" };
  if (CALENDAR_PROVIDER_LIMITATION_PATTERN.test(text)) return { kind: "CALENDAR_PROVIDER_LIMITATION" };

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

  if (TOMORROW_DATE_PATTERN.test(text)) {
    return { kind: "DATE_QUESTION", factKind: "TOMORROW_DATE" };
  }

  const weekdayQuestion = text.match(/^what date is ([a-z]+)\??$/);
  if (weekdayQuestion && isSupportedWeekday(weekdayQuestion[1] ?? "")) {
    return { kind: "DATE_QUESTION", factKind: "WEEKDAY_DATE", weekday: weekdayQuestion[1] as SupportedWeekday };
  }

  if (UI_VISIBLE_PATTERN.test(text)) {
    return { kind: "UI_VISIBLE_QUESTION", factKind: "UI_VISIBLE" };
  }

  const followUp = text.match(FOLLOW_UP_WEEKDAY_PATTERN);
  if (followUp) {
    const candidate = followUp[1] ?? "";
    if (isSupportedWeekday(candidate)) {
      return { kind: "FOLLOW_UP_DATE_QUESTION", factKind: "WEEKDAY_DATE", weekday: candidate };
    }
    return { kind: "FOLLOW_UP_DATE_QUESTION", unsupportedReason: `"${candidate}" is not a recognized day.` };
  }

  return { kind: "UNSUPPORTED", unsupportedReason: "This request is not yet supported." };
}
