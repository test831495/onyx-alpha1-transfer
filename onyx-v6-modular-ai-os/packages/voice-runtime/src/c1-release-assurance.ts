import type { GoldenLanguage } from "./conversation-assurance";

export const C1_SEMANTIC_STATES = Object.freeze([
  "IDLE", "LISTENING", "UNDERSTANDING", "RESPONDING", "INTERRUPTED", "OFFLINE", "RECOVERING", "FALLBACK",
] as const);

export const C1_PERFORMANCE_BUDGETS = Object.freeze([
  { metric: "acknowledgement", maxMs: 300, synthetic: true },
  { metric: "end-of-turn", maxMs: 700, synthetic: true },
  { metric: "first-transcript-fragment", maxMs: 800, synthetic: true },
  { metric: "final-transcript", maxMs: 1500, synthetic: true },
  { metric: "working-acknowledgement", maxMs: 500, synthetic: true },
  { metric: "routine-audible-response", maxMs: 1800, synthetic: true },
  { metric: "grounded-audible-response", maxMs: 3500, synthetic: true },
  { metric: "barge-in", maxMs: 250, synthetic: true },
  { metric: "tts-stop", maxMs: 200, synthetic: true },
  { metric: "fallback-announcement", maxMs: 1000, synthetic: true },
  { metric: "recoverable-session", maxMs: 3000, synthetic: true },
] as const);

export function classifyC1Language(text: string, fallback: GoldenLanguage): GoldenLanguage {
  const normalized = text.toLowerCase();
  if (/\b(kya|aaj|hai|badla|dikhao|kar do)\b/.test(normalized)) return /\b(hey|update|today)\b/.test(normalized) ? "Hinglish" : "Hindi";
  return /[\u0900-\u097f]/.test(text) ? "Hindi" : /[a-z]/i.test(text) ? "English" : fallback;
}

export function createC1HeroBriefing(language: GoldenLanguage) {
  return Object.freeze({
    source: "B1_SYNTHETIC" as const,
    language,
    citations: Object.freeze(["synthetic:b1:briefing"]),
    authorization: "SERVER_AUTHORITATIVE_DENY_BY_DEFAULT" as const,
    partial: false,
    nonAuthorizing: true as const,
  });
}

export function createC1AssuranceReceipt(input: { readonly requestId: string; readonly providerFailure: boolean; readonly cancelled: boolean }) {
  return Object.freeze({
    requestId: input.requestId,
    cancelled: input.cancelled,
    fallback: input.providerFailure,
    providerActivation: false as const,
    recoveryReactivatesProvider: false as const,
    retryCount: 0,
    performanceEvidence: "SYNTHETIC_LIMITATION" as const,
    nonAuthorizing: true as const,
  });
}