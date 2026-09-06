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

/**
 * Normalizes raw conversational text: lowercase, drop apostrophes (so
 * "tomorrow's" collapses to "tomorrows"), expand the bounded "what's"
 * contraction to "what is" so it matches the grammar patterns below, turn
 * remaining punctuation into spaces, and collapse whitespace.
 */
export function normalizeConversationalText(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/\bwhats\b/g, "what is")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseConversationalRequest(rawText: string): ConversationIntentEnvelope {
  const text = normalizeConversationalText(rawText);
  if (!text) return { kind: "UNSUPPORTED", unsupportedReason: "Empty request." };

  if (CANCEL_PATTERN.test(text)) return { kind: "CANCEL" };

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
