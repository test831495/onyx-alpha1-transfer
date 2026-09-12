import type { ConversationRequest } from "./conversationContract";
import { parseConversationalRequest, type ConversationIntentEnvelope } from "./conversationIntentGrammar";
import { resolveShellIntent } from "./shellState";

export type ConversationClassificationKind = "CANCEL" | "SESSION_CLOSE" | "NAVIGATION" | "DETERMINISTIC" | "REGISTERED_APPLICATION" | "CONNECTOR_REQUEST" | "FOLLOW_UP" | "GENERAL_CONVERSATION" | "CLARIFICATION" | "UNSUPPORTED" | "POLICY_DENIED";
export type ConversationSideEffect = "NONE" | "NAVIGATION" | "ACTION_DISPATCH" | "DETERMINISTIC_RESPONSE" | "CONNECTOR_REQUEST" | "CLARIFICATION" | "GENERAL_CONVERSATION" | "UNSUPPORTED" | "POLICY_DENIED" | "CANCEL_SESSION";
export type ConversationTruthSourceClass = "DETERMINISTIC_LOCAL" | "CONNECTOR" | "UNKNOWN";

export interface ConversationClassification {
  readonly kind: ConversationClassificationKind;
  readonly sourceClassifier: "CONVERSATIONAL_GRAMMAR" | "SHELL" | "REGISTERED_APPLICATION" | "CONNECTOR_PROJECTION" | "GENERAL_FALLBACK";
  readonly confidence: "DETERMINISTIC" | "NOT_AVAILABLE";
  readonly ambiguity: "NONE" | "CLARIFICATION_REQUIRED";
  readonly contextOutcome: "NOT_APPLICABLE" | "MISSING_CONTEXT" | "RESOLVED";
  readonly truthSourceClass: ConversationTruthSourceClass;
  readonly limitationCodes: readonly string[];
  readonly sideEffect: ConversationSideEffect;
  readonly legacyKind: string;
}

export const UNIFIED_PRIMARY_INTENT_CLASSES = [
  "POLICY_DENIED_OR_PROHIBITED",
  "CANCEL_OR_SESSION_CLOSE",
  "CORRECTION",
  "FOLLOW_UP",
  "CLARIFICATION_RESPONSE",
  "DETERMINISTIC_DATE_TIME",
  "NAVIGATION_OR_REGISTERED_APPLICATION",
  "LOCAL_CAPABILITY_REQUEST",
  "CONNECTOR_CAPABILITY_REQUEST",
  "SEARCH_OR_RETRIEVAL_REQUEST",
  "EXPLANATION_OR_COMPARISON",
  "CREATIVE_OR_BRAINSTORMING",
  "GENERAL_CONVERSATION",
  "MULTI_INTENT",
  "AMBIGUOUS",
  "OUT_OF_DOMAIN",
  "UNSUPPORTED",
  "UNTRUSTED_INSTRUCTION_OR_PROMPT_INJECTION",
  "UNKNOWN",
] as const;

export type UnifiedPrimaryIntentClass = (typeof UNIFIED_PRIMARY_INTENT_CLASSES)[number];
export type UnifiedConfidenceEvidence =
  | "EXACT_RULE"
  | "STRUCTURED_CONTEXT"
  | "ALIAS_MATCH"
  | "HEURISTIC_MATCH"
  | "CONFLICTING_EVIDENCE"
  | "INSUFFICIENT_EVIDENCE";

export interface UnifiedClassifierOptions {
  readonly latestVoiceGeneration?: number;
  readonly untrustedContent?: boolean;
}

export interface UnifiedClassificationResult {
  readonly classificationId: string;
  readonly primaryIntentClass: UnifiedPrimaryIntentClass;
  readonly secondaryIntentClasses: readonly UnifiedPrimaryIntentClass[];
  readonly proposedSteps: readonly string[];
  readonly ambiguityClass: "NONE" | "STALE_VOICE_GENERATION" | "INSUFFICIENT_EVIDENCE" | "CONFLICTING_CONTEXT";
  readonly confidenceEvidence: readonly UnifiedConfidenceEvidence[];
  readonly languageEvidence: Readonly<{ locale: string; codeSwitch: boolean }>;
  readonly promptInjectionRisk: "NONE" | "UNTRUSTED_CONTENT" | "DIRECT_INJECTION";
  readonly proposedNextBoundary: "NONE" | "LEGACY_DISPATCH" | "CLARIFICATION_OR_ABSTENTION";
  readonly truthSourceRequirement: "DETERMINISTIC_LOCAL" | "CONNECTOR" | "UNKNOWN";
  readonly contextRequirement: "NONE" | "SESSION_CONTEXT";
  readonly replayEvidence: string;
  readonly limitationCodes: readonly string[];
  readonly executionAuthorized: false;
  readonly approvalGranted: false;
  readonly sideEffectPerformed: false;
  readonly zeroSideEffect: true;
  readonly nonAuthorizing: true;
}

export function classifyConversationRequest(request: ConversationRequest): ConversationClassification {
  const envelope = parseConversationalRequest(request.rawText);
  if (/(?:ignore|bypass|override|circumvent)[^\n]{0,80}\b(?:rules?|policy|security)\b/i.test(request.normalizedText)) {
    return result("POLICY_DENIED", "CONVERSATIONAL_GRAMMAR", "POLICY_DENIED", "UNKNOWN", envelope, "POLICY_BYPASS");
  }
  if (envelope.risk === "R5_PROHIBITED") return result("POLICY_DENIED", "CONVERSATIONAL_GRAMMAR", "POLICY_DENIED", "UNKNOWN", envelope, "POLICY_BYPASS");
  if (envelope.kind === "CANCEL") return result("CANCEL", "CONVERSATIONAL_GRAMMAR", "CANCEL_SESSION", "UNKNOWN", envelope);
  if (envelope.intentFamily === "SESSION_CLOSE_INTENT") return result("SESSION_CLOSE", "CONVERSATIONAL_GRAMMAR", "CANCEL_SESSION", "UNKNOWN", envelope);
  if (envelope.clarificationRequired) return result("CLARIFICATION", "CONVERSATIONAL_GRAMMAR", "CLARIFICATION", "UNKNOWN", envelope);
  if (envelope.kind === "FOLLOW_UP_DATE_QUESTION") {
    if (envelope.unsupportedReason || !envelope.weekday) return result("CLARIFICATION", "CONVERSATIONAL_GRAMMAR", "CLARIFICATION", "UNKNOWN", envelope, "FOLLOW_UP_UNSUPPORTED");
    return result("FOLLOW_UP", "CONVERSATIONAL_GRAMMAR", "DETERMINISTIC_RESPONSE", "DETERMINISTIC_LOCAL", envelope, undefined, "MISSING_CONTEXT");
  }
  if (envelope.kind === "DATE_QUESTION" || envelope.kind === "TIME_QUERY" || envelope.kind === "UI_VISIBLE_QUESTION" || envelope.kind === "CALENDAR_LOCAL_FACT") return result("DETERMINISTIC", "CONVERSATIONAL_GRAMMAR", "DETERMINISTIC_RESPONSE", "DETERMINISTIC_LOCAL", envelope);
  if (envelope.kind === "CALENDAR_PROVIDER_LIMITATION") return result("CONNECTOR_REQUEST", "CONNECTOR_PROJECTION", "CONNECTOR_REQUEST", "CONNECTOR", envelope, "CONNECTOR_UNAVAILABLE");
  if (envelope.kind === "NAVIGATION" || envelope.kind === "COMPOSITE_NAVIGATE_AND_FACT") return result("NAVIGATION", "CONVERSATIONAL_GRAMMAR", "NAVIGATION", "DETERMINISTIC_LOCAL", envelope);

  const shell = resolveShellIntent(request.rawText);
  if (shell) return result("REGISTERED_APPLICATION", "SHELL", "NAVIGATION", "DETERMINISTIC_LOCAL", envelope);
  return result("GENERAL_CONVERSATION", "GENERAL_FALLBACK", "GENERAL_CONVERSATION", "UNKNOWN", envelope);
}

export function classifyUnifiedConversationRequest(
  request: ConversationRequest,
  options: UnifiedClassifierOptions = {},
): UnifiedClassificationResult {
  const envelope = parseConversationalRequest(request.rawText);
  const languageEvidence = Object.freeze({
    locale: request.locale,
    codeSwitch: request.locale.startsWith("hi") || /\b(?:kal|aaj|kholo|dikhao|batao)\b/i.test(request.rawText),
  });
  const injection = detectPromptInjection(request.rawText, options.untrustedContent === true);
  const staleVoice = request.source === "VOICE" && request.voice?.generation !== undefined
    && options.latestVoiceGeneration !== undefined
    && request.voice.generation < options.latestVoiceGeneration;

  let primaryIntentClass: UnifiedPrimaryIntentClass;
  let secondaryIntentClasses: UnifiedPrimaryIntentClass[] = [];
  let proposedSteps: string[] = [];
  let ambiguityClass: UnifiedClassificationResult["ambiguityClass"] = "NONE";
  let confidenceEvidence: UnifiedConfidenceEvidence[] = ["EXACT_RULE"];
  let proposedNextBoundary: UnifiedClassificationResult["proposedNextBoundary"] = "LEGACY_DISPATCH";
  let truthSourceRequirement: UnifiedClassificationResult["truthSourceRequirement"] = "UNKNOWN";
  let contextRequirement: UnifiedClassificationResult["contextRequirement"] = "NONE";
  const limitationCodes: string[] = [];

  if (injection !== "NONE") {
    primaryIntentClass = "UNTRUSTED_INSTRUCTION_OR_PROMPT_INJECTION";
    proposedNextBoundary = "CLARIFICATION_OR_ABSTENTION";
    confidenceEvidence = ["EXACT_RULE"];
    limitationCodes.push(injection === "DIRECT_INJECTION" ? "DIRECT_INJECTION" : "UNTRUSTED_CONTENT");
  } else if (staleVoice) {
    primaryIntentClass = "AMBIGUOUS";
    ambiguityClass = "STALE_VOICE_GENERATION";
    proposedNextBoundary = "CLARIFICATION_OR_ABSTENTION";
    confidenceEvidence = ["INSUFFICIENT_EVIDENCE"];
    limitationCodes.push("STALE_VOICE_GENERATION");
  } else if (envelope.kind === "CANCEL" || envelope.intentFamily === "SESSION_CLOSE_INTENT") {
    primaryIntentClass = "CANCEL_OR_SESSION_CLOSE";
    proposedNextBoundary = "LEGACY_DISPATCH";
    truthSourceRequirement = "DETERMINISTIC_LOCAL";
  } else if (envelope.correction || envelope.discourseAct === "CORRECTION") {
    primaryIntentClass = "CORRECTION";
    contextRequirement = "SESSION_CONTEXT";
    proposedNextBoundary = "CLARIFICATION_OR_ABSTENTION";
    confidenceEvidence = ["STRUCTURED_CONTEXT"];
  } else if (envelope.kind === "COMPOSITE_NAVIGATE_AND_FACT") {
    primaryIntentClass = "MULTI_INTENT";
    secondaryIntentClasses = ["NAVIGATION_OR_REGISTERED_APPLICATION", "DETERMINISTIC_DATE_TIME"];
    proposedSteps = ["NAVIGATION_OR_REGISTERED_APPLICATION", "DETERMINISTIC_DATE_TIME"];
    truthSourceRequirement = "DETERMINISTIC_LOCAL";
  } else if (envelope.kind === "FOLLOW_UP_DATE_QUESTION") {
    primaryIntentClass = envelope.unsupportedReason ? "AMBIGUOUS" : "FOLLOW_UP";
    contextRequirement = "SESSION_CONTEXT";
    truthSourceRequirement = "DETERMINISTIC_LOCAL";
    if (envelope.unsupportedReason) {
      ambiguityClass = "INSUFFICIENT_EVIDENCE";
      proposedNextBoundary = "CLARIFICATION_OR_ABSTENTION";
      confidenceEvidence = ["INSUFFICIENT_EVIDENCE"];
    }
  } else if (envelope.kind === "DATE_QUESTION" || envelope.kind === "TIME_QUERY" || envelope.kind === "CALENDAR_LOCAL_FACT" || envelope.kind === "UI_VISIBLE_QUESTION") {
    primaryIntentClass = "DETERMINISTIC_DATE_TIME";
    truthSourceRequirement = "DETERMINISTIC_LOCAL";
  } else if (envelope.kind === "CALENDAR_PROVIDER_LIMITATION") {
    primaryIntentClass = "CONNECTOR_CAPABILITY_REQUEST";
    truthSourceRequirement = "CONNECTOR";
    limitationCodes.push("CONNECTOR_UNAVAILABLE");
    proposedNextBoundary = "CLARIFICATION_OR_ABSTENTION";
  } else if (envelope.kind === "NAVIGATION" || resolveShellIntent(request.rawText)) {
    primaryIntentClass = "NAVIGATION_OR_REGISTERED_APPLICATION";
    truthSourceRequirement = "DETERMINISTIC_LOCAL";
  } else if (envelope.kind === "UNSUPPORTED") {
    primaryIntentClass = /\b(?:api|connector|calendar|mail|search|retrieve|open|launch)\b/i.test(request.rawText)
      ? "UNSUPPORTED"
      : "GENERAL_CONVERSATION";
    proposedNextBoundary = "CLARIFICATION_OR_ABSTENTION";
    confidenceEvidence = ["INSUFFICIENT_EVIDENCE"];
    limitationCodes.push("UNSUPPORTED_OR_UNVERIFIED");
  } else {
    primaryIntentClass = "UNKNOWN";
    proposedNextBoundary = "CLARIFICATION_OR_ABSTENTION";
    confidenceEvidence = ["INSUFFICIENT_EVIDENCE"];
  }

  const replayEvidence = stableReplayEvidence(request.normalizedText, request.source, request.locale, primaryIntentClass, secondaryIntentClasses.join(","));
  return Object.freeze({
    classificationId: `b3-${replayEvidence}`,
    primaryIntentClass,
    secondaryIntentClasses: Object.freeze(secondaryIntentClasses),
    proposedSteps: Object.freeze(proposedSteps),
    ambiguityClass,
    confidenceEvidence: Object.freeze(confidenceEvidence),
    languageEvidence,
    promptInjectionRisk: injection,
    proposedNextBoundary,
    truthSourceRequirement,
    contextRequirement,
    replayEvidence,
    limitationCodes: Object.freeze(limitationCodes),
    executionAuthorized: false,
    approvalGranted: false,
    sideEffectPerformed: false,
    zeroSideEffect: true,
    nonAuthorizing: true,
  });
}

function detectPromptInjection(rawText: string, untrustedContent: boolean): UnifiedClassificationResult["promptInjectionRisk"] {
  if (untrustedContent) return "UNTRUSTED_CONTENT";
  return /\b(?:ignore|bypass|override|reveal|disclose)\b[^\n]{0,100}\b(?:rules?|policy|system prompt|instructions?)\b/i.test(rawText)
    ? "DIRECT_INJECTION"
    : "NONE";
}

function stableReplayEvidence(...parts: readonly string[]): string {
  let hash = 2166136261;
  for (const part of parts.join("|").normalize("NFKC")) {
    hash ^= part.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function result(
  kind: ConversationClassificationKind,
  sourceClassifier: ConversationClassification["sourceClassifier"],
  sideEffect: ConversationSideEffect,
  truthSourceClass: ConversationTruthSourceClass,
  envelope: ConversationIntentEnvelope,
  limitationCode?: string,
  contextOutcome: ConversationClassification["contextOutcome"] = "NOT_APPLICABLE",
  legacyKind = envelope.kind,
): ConversationClassification {
  return Object.freeze({
    kind,
    sourceClassifier,
    confidence: "DETERMINISTIC",
    ambiguity: envelope.clarificationRequired ? "CLARIFICATION_REQUIRED" : "NONE",
    contextOutcome,
    truthSourceClass,
    limitationCodes: Object.freeze(limitationCode ? [limitationCode] : []),
    sideEffect,
    legacyKind,
  });
}