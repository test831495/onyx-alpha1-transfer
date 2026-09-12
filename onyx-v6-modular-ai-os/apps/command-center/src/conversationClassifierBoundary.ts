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

export function classifyConversationRequest(request: ConversationRequest): ConversationClassification {
  const envelope = parseConversationalRequest(request.rawText);
  if (/(?:ignore|bypass|override|circumvent)[^\n]{0,80}\b(?:rules?|policy|security)\b/i.test(request.normalizedText)) {
    return result("POLICY_DENIED", "CONVERSATIONAL_GRAMMAR", "POLICY_DENIED", "UNKNOWN", envelope, "POLICY_BYPASS");
  }
  if (envelope.risk === "R5_PROHIBITED") return result("POLICY_DENIED", "CONVERSATIONAL_GRAMMAR", "POLICY_DENIED", "UNKNOWN", envelope, "POLICY_BYPASS");
  if (envelope.kind === "CANCEL") return result("CANCEL", "CONVERSATIONAL_GRAMMAR", "CANCEL_SESSION", "UNKNOWN", envelope);
  if (envelope.intentFamily === "SESSION_CLOSE_INTENT") return result("SESSION_CLOSE", "CONVERSATIONAL_GRAMMAR", "CANCEL_SESSION", "UNKNOWN", envelope);
  if (envelope.clarificationRequired) return result("CLARIFICATION", "CONVERSATIONAL_GRAMMAR", "CLARIFICATION", "UNKNOWN", envelope);
  if (envelope.kind === "FOLLOW_UP_DATE_QUESTION") return result("FOLLOW_UP", "CONVERSATIONAL_GRAMMAR", "DETERMINISTIC_RESPONSE", "DETERMINISTIC_LOCAL", envelope, undefined, "MISSING_CONTEXT");
  if (envelope.kind === "DATE_QUESTION" || envelope.kind === "TIME_QUERY" || envelope.kind === "UI_VISIBLE_QUESTION" || envelope.kind === "CALENDAR_LOCAL_FACT") return result("DETERMINISTIC", "CONVERSATIONAL_GRAMMAR", "DETERMINISTIC_RESPONSE", "DETERMINISTIC_LOCAL", envelope);
  if (envelope.kind === "CALENDAR_PROVIDER_LIMITATION") return result("CONNECTOR_REQUEST", "CONNECTOR_PROJECTION", "CONNECTOR_REQUEST", "CONNECTOR", envelope, "CONNECTOR_UNAVAILABLE");
  if (envelope.kind === "NAVIGATION" || envelope.kind === "COMPOSITE_NAVIGATE_AND_FACT") return result("NAVIGATION", "CONVERSATIONAL_GRAMMAR", "NAVIGATION", "DETERMINISTIC_LOCAL", envelope);

  const shell = resolveShellIntent(request.rawText);
  if (shell) return result("REGISTERED_APPLICATION", "SHELL", "NAVIGATION", "DETERMINISTIC_LOCAL", envelope);
  return result("GENERAL_CONVERSATION", "GENERAL_FALLBACK", "GENERAL_CONVERSATION", "UNKNOWN", envelope);
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