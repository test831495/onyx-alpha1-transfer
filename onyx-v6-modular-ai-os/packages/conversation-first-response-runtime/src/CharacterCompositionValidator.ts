import { CHARACTER_PROFILE_VERSION, COMPOSITION_VERSION, MAX_RESPONSE_TEXT, freeze } from "./constants";
import type { CharacterResponseCandidate } from "./CharacterResponseCandidate";
import { profileFor } from "./CharacterVoiceProfile";

export const VALIDATION_REASON_CODES = Object.freeze([
  "MISSING_IDENTIFIER", "INVALID_SPEAKER", "INVALID_VERSION", "UNSUPPORTED_OPERATIONAL_CLAIM", "INVENTED_SOURCE_REFERENCE",
  "EXECUTION_CLAIM", "AUTHORITY_CLAIM", "CONSCIOUSNESS_CLAIM", "PROFILE_MISMATCH", "MISSING_LIMITATION", "BOUNDS_EXCEEDED",
  "INVALID_TRUTH_STATUS", "INVALID_FOLLOW_UP", "DESTRUCTIVE_ACTION_WITHOUT_APPROVAL",
] as const);
export type ValidationReasonCode = (typeof VALIDATION_REASON_CODES)[number];
export type CompositionValidation = Readonly<{ status: "VALID" | "INVALID" | "NOT_ASSESSABLE"; reasonCodes: readonly ValidationReasonCode[]; nonAuthorizing: true; executionAuthorized: false; approvalGranted: false }>;

export function validateCharacterResponseCandidate(candidate: unknown): CompositionValidation {
  const reasons: ValidationReasonCode[] = [];
  if (!candidate || typeof candidate !== "object") return result("NOT_ASSESSABLE", ["MISSING_IDENTIFIER"]);
  const value = candidate as Partial<CharacterResponseCandidate>;
  if (!value.candidateId || !value.planId) reasons.push("MISSING_IDENTIFIER");
  if (value.speaker !== "ONYX" && value.speaker !== "NOVA" && value.speaker !== "COUNCIL" && value.speaker !== "NONE") reasons.push("INVALID_SPEAKER");
  if (value.characterProfileVersion !== CHARACTER_PROFILE_VERSION || value.compositionVersion !== COMPOSITION_VERSION) reasons.push("INVALID_VERSION");
  if (typeof value.text !== "string" || typeof value.spokenText !== "string" || value.text.length > MAX_RESPONSE_TEXT || value.spokenText.length > MAX_RESPONSE_TEXT) reasons.push("BOUNDS_EXCEEDED");
  if (value.speaker === "NONE") reasons.push("PROFILE_MISMATCH");
  if (value.speaker && profileFor(value.speaker) === null) reasons.push("PROFILE_MISMATCH");
  if (!["GROUNDED", "SUPPLIED_CONTEXT", "CREATIVE", "LIMITED", "NOT_ASSESSABLE"].includes(value.truthStatus ?? "")) reasons.push("INVALID_TRUTH_STATUS");
  if (!["NONE", "OPTIONAL", "REQUIRED"].includes(value.followUp ?? "")) reasons.push("INVALID_FOLLOW_UP");
  if (!value.sourceReferences?.every((reference) => typeof reference === "string" && reference.length > 0)) reasons.push("INVENTED_SOURCE_REFERENCE");
  if (/\b(?:executed|approved|authorized|completed|deleted|sent)\b/i.test(value.text ?? "")) reasons.push("EXECUTION_CLAIM");
  if (/\b(?:approved|authorized|authority|permission granted)\b/i.test(value.text ?? "")) reasons.push("AUTHORITY_CLAIM");
  if (/\b(?:i am conscious|i feel|i have feelings|i am alive)\b/i.test(value.text ?? "")) reasons.push("CONSCIOUSNESS_CLAIM");
  if (value.truthStatus === "LIMITED" && !/cannot verify|unavailable|clarif|no action has been taken/i.test(value.text ?? "")) reasons.push("MISSING_LIMITATION");
  if (value.proposedActions?.some((action) => /delete|destroy|send|approve/i.test(action)) && !/approval/i.test(value.text ?? "")) reasons.push("DESTRUCTIVE_ACTION_WITHOUT_APPROVAL");
  return result(reasons.length ? "INVALID" : "VALID", reasons);
}

function result(status: CompositionValidation["status"], reasonCodes: readonly ValidationReasonCode[]): CompositionValidation {
  return freeze({ status, reasonCodes: Object.freeze([...reasonCodes]), nonAuthorizing: true as const, executionAuthorized: false as const, approvalGranted: false as const });
}