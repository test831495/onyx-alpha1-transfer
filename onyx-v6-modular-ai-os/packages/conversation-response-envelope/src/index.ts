import { TRUTH_SOURCE_CLASSES, UNCERTAINTY_CLASSES, type TruthResolutionReceipt } from "@onyx/conversation-truth-resolver";

export const ENVELOPE_VERSION = "B4B-1" as const;
export const RESPONSE_CLASSES = Object.freeze(["ANSWER", "CLARIFICATION", "LIMITATION", "RECOMMENDATION", "ACTION_PREVIEW", "REFUSAL", "RECOVERY", "UNAVAILABLE"] as const);
export type ResponseClass = (typeof RESPONSE_CLASSES)[number];
export const CONTENT_CLASSES = Object.freeze(["GREETING", "GENERAL_EXPLANATION", "BRAINSTORMING", "COMPARISON", "TECHNICAL_DISCUSSION", "PLANNING_DISCUSSION", "CLARIFICATION", "LIMITATION", "RECOVERY_GUIDANCE", "REFUSAL"] as const);
export type ContentClass = (typeof CONTENT_CLASSES)[number];
export const CHARACTER_IDS = Object.freeze(["ONYX", "NOVA"] as const);
export type CharacterId = (typeof CHARACTER_IDS)[number];
export const PARITY_CLASSES = Object.freeze(["SEMANTICALLY_ALIGNED", "CRITICAL_OMISSION", "MATERIAL_CONTRADICTION", "NOT_ASSESSABLE"] as const);
export type ParityClass = (typeof PARITY_CLASSES)[number];
export const CHARACTER_PROFILES = Object.freeze({
  ONYX: Object.freeze({ profileVersion: "B4B-1", characterId: "ONYX", canonicalRoleClass: "CLOUD_AUGMENTED_LOCAL_CORE", reasoningEmphasisClass: "SYSTEMS_AND_EXECUTION_CLARITY", communicationStyleClass: "DIRECT_CONTEXTUAL", localFirstCompatibility: true, identityInvariantVersion: "2.1" }),
  NOVA: Object.freeze({ profileVersion: "B4B-1", characterId: "NOVA", canonicalRoleClass: "LOCAL_FIRST", reasoningEmphasisClass: "LOCAL_PRIVACY_AND_PRACTICALITY", communicationStyleClass: "WARM_PRACTICAL", localFirstCompatibility: true, identityInvariantVersion: "2.1" }),
} as const);

export type CriticalFact = "RISK" | "LIMITATION" | "UNCERTAINTY" | "REFUSAL_BASIS" | "OWNER_DECISION";
export type CharacterProfileCompatibility = Readonly<(typeof CHARACTER_PROFILES)[CharacterId]>;
export type B4AReceiptInput = Readonly<Pick<TruthResolutionReceipt, "truthSourceClass" | "uncertaintyClass" | "materialConflict" | "conflictTypes" | "selectedEvidenceIds" | "rejectedEvidenceIds" | "missingEvidenceClasses" | "assumptions" | "limitations" | "privacyResult" | "nonAuthority" | "executionAuthorized" | "approvalGranted" | "memoryWriteAuthorized" | "connectorExecutionAuthorized"> & Partial<TruthResolutionReceipt>>;
export type GeneralConversationCandidate = Readonly<{
  candidateVersion: typeof ENVELOPE_VERSION;
  suppliedSpeaker: CharacterId;
  responseClassHint?: ResponseClass;
  displayCandidate: string;
  spokenCandidate: string;
  contentClass: ContentClass;
  generatedOrGroundedClass: "GENERATED_GENERAL" | "GROUNDED";
  truthSourceClass: TruthResolutionReceipt["truthSourceClass"];
  provenanceClass: "SUPPLIED_SAFE_CONTENT" | "B4A_RECEIPT";
  responseLanguageClass: "ENGLISH" | "HINDI" | "HINGLISH";
  criticalFacts: readonly CriticalFact[];
  operationalClaim?: boolean;
  b4aReceipt?: B4AReceiptInput;
  ownerDecisionRequired?: boolean;
  assumptions?: readonly string[];
  limitations?: readonly string[];
  followUpClass?: "NONE" | "CLARIFICATION" | "NEXT_STEP";
}>;

export type CharacterResponseEnvelope = Readonly<{
  envelopeVersion: typeof ENVELOPE_VERSION;
  characterProfileVersion: string;
  suppliedSpeaker: CharacterId;
  responseClass: ResponseClass;
  displayText: string;
  spokenText: string;
  truthSourceClass: TruthResolutionReceipt["truthSourceClass"];
  uncertaintyClass: TruthResolutionReceipt["uncertaintyClass"];
  evidenceReferences: readonly string[];
  freshnessClass: "CURRENT" | "STALE" | "UNKNOWN";
  assumptions: readonly string[];
  limitations: readonly string[];
  missingEvidenceClasses: readonly TruthResolutionReceipt["truthSourceClass"][];
  conflictClasses: readonly string[];
  provenanceClass: GeneralConversationCandidate["provenanceClass"];
  generatedOrGroundedClass: GeneralConversationCandidate["generatedOrGroundedClass"];
  ownerDecisionRequired: boolean;
  ownerDecisionClass: "NONE" | "REQUIRED";
  followUpClass: NonNullable<GeneralConversationCandidate["followUpClass"]>;
  responseLanguageClass: GeneralConversationCandidate["responseLanguageClass"];
  displaySpokenParityClass: ParityClass;
  privacyResult: "ELIGIBLE" | "NOT_ELIGIBLE" | "UNKNOWN";
  replayEvidence: string;
  nonAuthority: true;
  executionAuthorized: false;
  approvalGranted: false;
  memoryWriteAuthorized: false;
  connectorExecutionAuthorized: false;
  speakerSelectedByB4B: false;
}>;
export type BuildResult = Readonly<{ ok: true; envelope: CharacterResponseEnvelope } | { ok: false; reason: "INVALID_SPEAKER" | "INVALID_SCHEMA" | "PROHIBITED_CONTENT" | "B4A_RECEIPT_REQUIRED" | "PARITY_FAILED" | "BOUNDS_EXCEEDED" }>;

const MAX_TEXT = 4096;
const MAX_ITEMS = 32;
const RESPONSE_LANGUAGE_CLASSES = Object.freeze(["ENGLISH", "HINDI", "HINGLISH"] as const);
const PROVENANCE_CLASSES = Object.freeze(["SUPPLIED_SAFE_CONTENT", "B4A_RECEIPT"] as const);
const FOLLOW_UP_CLASSES = Object.freeze(["NONE", "CLARIFICATION", "NEXT_STEP"] as const);
const CRITICAL_FACTS = Object.freeze(["RISK", "LIMITATION", "UNCERTAINTY", "REFUSAL_BASIS", "OWNER_DECISION"] as const);
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const JWT_PATTERN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9._~+/-]+=*\b/i;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const KEYWORD_PATTERN = /(?:^|[\s"'`:(=])(?:api[-_ ]?key|access[-_ ]?token|refresh[-_ ]?token|session[-_ ]?token|authorization|bearer|secret|password|private\s+key|credential|oauth)(?:$|[\s"'`\])=:;,.]|\b)/i;
const OPERATIONAL_TRUTH = new Set(["CALENDAR_EVENT", "MAIL_METADATA", "PR_STATE", "CHECK_STATUS", "CURRENT_PROJECT_READINESS", "OWNER_DECISION"]);
const isEnum = <T extends readonly string[]>(values: T, value: unknown): value is T[number] => typeof value === "string" && values.includes(value);
const isString = (value: unknown): value is string => typeof value === "string";
const freeze = <T>(value: T, seen = new Set<object>()): T => {
  if (value === null || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value as Record<string, unknown>)) freeze(child, seen);
  return Object.freeze(value);
};
const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
};
const fingerprint = (value: unknown): string => {
  let hash = 2166136261;
  for (const character of stable(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `${(hash >>> 0).toString(16).padStart(8, "0")}00000000`;
};
const boundedStrings = (values: readonly string[] | undefined): readonly string[] => Object.freeze([...(values ?? [])].filter((value) => typeof value === "string" && value.length <= 256).sort().slice(0, MAX_ITEMS));
const hasHighEntropy = (value: string): boolean => {
  if (value.length < 20) return false;
  const letters = value.replace(/[^A-Za-z]/g, "").length;
  const digits = value.replace(/[^0-9]/g, "").length;
  const distinct = new Set(value).size;
  return letters >= 8 && digits >= 2 && distinct / value.length >= 0.6;
};
const isB4AReceiptShape = (receipt: unknown): receipt is B4AReceiptInput => {
  if (!receipt || typeof receipt !== "object") return false;
  const record = receipt as Record<string, unknown>;
  if (record.truthSourceClass !== undefined && !isEnum(TRUTH_SOURCE_CLASSES, record.truthSourceClass)) return false;
  if (record.uncertaintyClass !== undefined && !isEnum(UNCERTAINTY_CLASSES, record.uncertaintyClass)) return false;
  if (record.nonAuthority !== undefined && (typeof record.nonAuthority !== "boolean" || record.nonAuthority !== true)) return false;
  if (record.executionAuthorized !== undefined && (typeof record.executionAuthorized !== "boolean" || record.executionAuthorized !== false)) return false;
  if (record.approvalGranted !== undefined && (typeof record.approvalGranted !== "boolean" || record.approvalGranted !== false)) return false;
  if (record.memoryWriteAuthorized !== undefined && (typeof record.memoryWriteAuthorized !== "boolean" || record.memoryWriteAuthorized !== false)) return false;
  if (record.connectorExecutionAuthorized !== undefined && (typeof record.connectorExecutionAuthorized !== "boolean" || record.connectorExecutionAuthorized !== false)) return false;
  if (record.materialConflict !== undefined && typeof record.materialConflict !== "boolean") return false;
  if (record.provenanceComplete !== undefined && typeof record.provenanceComplete !== "boolean") return false;
  if (record.replayEvidence !== undefined && (typeof record.replayEvidence !== "string" || record.replayEvidence.length > 256)) return false;
  if (record.selectedEvidenceIds !== undefined && (!Array.isArray(record.selectedEvidenceIds) || record.selectedEvidenceIds.some((entry) => typeof entry !== "string" || entry.length > 256))) return false;
  if (record.rejectedEvidenceIds !== undefined && (!Array.isArray(record.rejectedEvidenceIds) || record.rejectedEvidenceIds.some((entry) => typeof entry !== "string" || entry.length > 256))) return false;
  if (record.conflictTypes !== undefined && (!Array.isArray(record.conflictTypes) || record.conflictTypes.some((entry) => typeof entry !== "string" || entry.length > 256))) return false;
  if (record.missingEvidenceClasses !== undefined && (!Array.isArray(record.missingEvidenceClasses) || record.missingEvidenceClasses.some((entry) => !isEnum(TRUTH_SOURCE_CLASSES, entry)))) return false;
  if (record.assumptions !== undefined && (!Array.isArray(record.assumptions) || record.assumptions.some((entry) => !isString(entry) || entry.length > 256))) return false;
  if (record.limitations !== undefined && (!Array.isArray(record.limitations) || record.limitations.some((entry) => !isString(entry) || entry.length > 256))) return false;
  if (record.privacyResult !== undefined && !isEnum(["ELIGIBLE", "NOT_ELIGIBLE", "UNKNOWN"] as const, record.privacyResult)) return false;
  return true;
};
const validCandidate = (candidate: unknown): candidate is GeneralConversationCandidate => {
  if (!candidate || typeof candidate !== "object") return false;
  const input = candidate as Record<string, unknown>;
  if (input.candidateVersion !== ENVELOPE_VERSION || !isEnum(CHARACTER_IDS, input.suppliedSpeaker)) return false;
  if (!isEnum(CONTENT_CLASSES, input.contentClass) || !isEnum(["GENERATED_GENERAL", "GROUNDED"] as const, input.generatedOrGroundedClass)) return false;
  if (!isEnum(TRUTH_SOURCE_CLASSES, input.truthSourceClass)) return false;
  if (!isEnum(PROVENANCE_CLASSES, input.provenanceClass)) return false;
  if (input.responseClassHint !== undefined && !isEnum(RESPONSE_CLASSES, input.responseClassHint)) return false;
  if (!isString(input.displayCandidate) || !input.displayCandidate.trim() || input.displayCandidate.length > MAX_TEXT) return false;
  if (!isString(input.spokenCandidate) || !input.spokenCandidate.trim() || input.spokenCandidate.length > MAX_TEXT) return false;
  if (!isEnum(RESPONSE_LANGUAGE_CLASSES, input.responseLanguageClass)) return false;
  if (!Array.isArray(input.criticalFacts) || input.criticalFacts.length > MAX_ITEMS) return false;
  if (!input.criticalFacts.every((fact) => isEnum(CRITICAL_FACTS, fact))) return false;
  if (input.assumptions !== undefined && (!Array.isArray(input.assumptions) || input.assumptions.length > MAX_ITEMS || input.assumptions.some((entry) => !isString(entry) || entry.length > 256))) return false;
  if (input.limitations !== undefined && (!Array.isArray(input.limitations) || input.limitations.length > MAX_ITEMS || input.limitations.some((entry) => !isString(entry) || entry.length > 256))) return false;
  if (input.followUpClass !== undefined && !isEnum(FOLLOW_UP_CLASSES, input.followUpClass)) return false;
  if (typeof input.operationalClaim !== "undefined" && typeof input.operationalClaim !== "boolean") return false;
  if (typeof input.ownerDecisionRequired !== "undefined" && typeof input.ownerDecisionRequired !== "boolean") return false;
  if (input.b4aReceipt !== undefined && !isB4AReceiptShape(input.b4aReceipt)) return false;
  return true;
};
const criticalTerms: Record<CriticalFact, readonly string[]> = {
  RISK: ["risk"], LIMITATION: ["limit", "cannot", "unable"], UNCERTAINTY: ["uncertain", "unknown", "not verified"],
  REFUSAL_BASIS: ["refus", "cannot"], OWNER_DECISION: ["owner", "approval", "decision"],
};
export function classifySensitiveEvidence(input: unknown): "SAFE" | "SENSITIVE" {
  if (typeof input !== "string") return "SENSITIVE";
  const value = input.trim();
  if (!value) return "SAFE";
  if (EMAIL_PATTERN.test(value) || JWT_PATTERN.test(value) || BEARER_PATTERN.test(value) || KEYWORD_PATTERN.test(value)) return "SENSITIVE";
  if (value.length >= 32 && BASE64URL_PATTERN.test(value) && (hasHighEntropy(value) || /[A-Za-z0-9_-]{32,}/.test(value))) return "SENSITIVE";
  if (value.length >= 24 && value.length <= 512 && /^[A-Za-z0-9._~+/-]+$/.test(value) && hasHighEntropy(value)) return "SENSITIVE";
  if (value.length >= 16 && (value.match(/-/g) || []).length >= 6 && /^[A-Za-z0-9\s._~+/-]+$/.test(value)) return "SENSITIVE";
  return "SAFE";
}
export function validateDisplaySpokenParity(input: Readonly<{ displayText: string; spokenText: string; criticalFacts: readonly CriticalFact[] }>): ParityClass {
  if (typeof input.displayText !== "string" || typeof input.spokenText !== "string" || !input.displayText || !input.spokenText) return "NOT_ASSESSABLE";
  if (/\b(approved|executed|completed|done)\b/i.test(input.spokenText) && !/\b(approved|executed|completed|done)\b/i.test(input.displayText)) return "MATERIAL_CONTRADICTION";
  if (/\b(approved|executed)\b/i.test(input.displayText) && !/\b(approved|executed)\b/i.test(input.spokenText)) return "CRITICAL_OMISSION";
  for (const fact of input.criticalFacts) if (!criticalTerms[fact].some((term) => input.spokenText.toLowerCase().includes(term))) return "CRITICAL_OMISSION";
  return /\b(approved|executed)\b/i.test(input.displayText) ? "MATERIAL_CONTRADICTION" : "SEMANTICALLY_ALIGNED";
}

function requiresEvidence(candidate: GeneralConversationCandidate): boolean {
  if (candidate.operationalClaim === true) return true;
  if (candidate.generatedOrGroundedClass === "GROUNDED") return true;
  return candidate.truthSourceClass === "CONNECTOR_GROUNDED" || candidate.truthSourceClass === "CURRENT_GOVERNANCE" || candidate.truthSourceClass === "STRATEGIC_MEMORY" || candidate.truthSourceClass === "PUBLIC_EXTERNAL";
}

function mapResponse(candidate: GeneralConversationCandidate, receipt?: B4AReceiptInput): ResponseClass {
  if (candidate.responseClassHint === "REFUSAL" || candidate.contentClass === "REFUSAL") return "REFUSAL";
  if (candidate.responseClassHint === "RECOVERY" || candidate.contentClass === "RECOVERY_GUIDANCE") return "RECOVERY";
  if (candidate.responseClassHint === "UNAVAILABLE") return "UNAVAILABLE";
  if (candidate.responseClassHint === "ACTION_PREVIEW") return "ACTION_PREVIEW";
  if (candidate.responseClassHint === "RECOMMENDATION") return "RECOMMENDATION";
  if (candidate.responseClassHint === "CLARIFICATION" || candidate.contentClass === "CLARIFICATION") return "CLARIFICATION";
  if (candidate.responseClassHint === "LIMITATION" || candidate.contentClass === "LIMITATION") return "LIMITATION";
  if (receipt && (receipt.materialConflict || receipt.uncertaintyClass === "CONFLICTING" || receipt.uncertaintyClass === "STALE" || receipt.uncertaintyClass === "UNKNOWN" || receipt.uncertaintyClass === "NOT_ASSESSABLE" || receipt.uncertaintyClass === "PARTIAL")) return "LIMITATION";
  if (candidate.truthSourceClass === "UNAVAILABLE") return "UNAVAILABLE";
  return "ANSWER";
}

export function buildCharacterResponseEnvelope(candidate: unknown): BuildResult {
  try {
    if (!candidate || typeof candidate !== "object" || !isEnum(CHARACTER_IDS, (candidate as Record<string, unknown>).suppliedSpeaker)) return { ok: false, reason: "INVALID_SPEAKER" };
    if (!validCandidate(candidate)) return { ok: false, reason: "INVALID_SCHEMA" };
    const input = candidate as GeneralConversationCandidate;
    if (classifySensitiveEvidence(input.displayCandidate) === "SENSITIVE" || classifySensitiveEvidence(input.spokenCandidate) === "SENSITIVE") return { ok: false, reason: "PROHIBITED_CONTENT" };
    if ([input.displayCandidate, input.spokenCandidate].some((text) => typeof text !== "string" || !text || text.length > MAX_TEXT)) return { ok: false, reason: "PROHIBITED_CONTENT" };
    if (!Array.isArray(input.criticalFacts) || input.criticalFacts.length > MAX_ITEMS || (input.assumptions?.length ?? 0) > MAX_ITEMS || (input.limitations?.length ?? 0) > MAX_ITEMS) return { ok: false, reason: "BOUNDS_EXCEEDED" };
    const receipt = input.b4aReceipt;
    if (requiresEvidence(input) && !receipt) return { ok: false, reason: "B4A_RECEIPT_REQUIRED" };
    if (receipt && (receipt.privacyResult === "NOT_ELIGIBLE" || !receipt.nonAuthority || receipt.executionAuthorized || receipt.approvalGranted || receipt.memoryWriteAuthorized || receipt.connectorExecutionAuthorized)) return { ok: false, reason: "INVALID_SCHEMA" };
    if (receipt && !isB4AReceiptShape(receipt)) return { ok: false, reason: "INVALID_SCHEMA" };
    const parity = validateDisplaySpokenParity({ displayText: input.displayCandidate, spokenText: input.spokenCandidate, criticalFacts: input.criticalFacts });
    if (parity !== "SEMANTICALLY_ALIGNED") return { ok: false, reason: "PARITY_FAILED" };
    const responseClass = mapResponse(input, receipt);
    const envelope: CharacterResponseEnvelope = {
      envelopeVersion: ENVELOPE_VERSION, characterProfileVersion: CHARACTER_PROFILES[input.suppliedSpeaker].profileVersion,
      suppliedSpeaker: input.suppliedSpeaker, responseClass, displayText: input.displayCandidate, spokenText: input.spokenCandidate,
      truthSourceClass: receipt?.truthSourceClass ?? input.truthSourceClass, uncertaintyClass: receipt?.uncertaintyClass ?? "UNKNOWN",
      evidenceReferences: Object.freeze([...(receipt?.selectedEvidenceIds ?? []), ...(receipt?.rejectedEvidenceIds ?? [])].filter((id, index, all) => all.indexOf(id) === index).sort().slice(0, MAX_ITEMS)),
      freshnessClass: receipt?.uncertaintyClass === "STALE" ? "STALE" : "UNKNOWN",
      assumptions: boundedStrings([...(input.assumptions ?? []), ...(receipt?.assumptions ?? [])]), limitations: boundedStrings([...(input.limitations ?? []), ...(receipt?.limitations ?? [])]),
      missingEvidenceClasses: Object.freeze([...(receipt?.missingEvidenceClasses ?? [])].sort().slice(0, MAX_ITEMS)), conflictClasses: Object.freeze([...(receipt?.conflictTypes ?? [])].sort().slice(0, MAX_ITEMS)),
      provenanceClass: input.provenanceClass, generatedOrGroundedClass: input.generatedOrGroundedClass,
      ownerDecisionRequired: input.ownerDecisionRequired === true, ownerDecisionClass: input.ownerDecisionRequired === true ? "REQUIRED" : "NONE",
      followUpClass: input.followUpClass ?? "NONE", responseLanguageClass: input.responseLanguageClass, displaySpokenParityClass: parity,
      privacyResult: receipt?.privacyResult ?? "UNKNOWN", replayEvidence: "", nonAuthority: true as const, executionAuthorized: false as const,
      approvalGranted: false as const, memoryWriteAuthorized: false as const, connectorExecutionAuthorized: false as const, speakerSelectedByB4B: false as const,
    };
    return { ok: true, envelope: freeze({ ...envelope, replayEvidence: fingerprint({ ...envelope, displayText: fingerprint(envelope.displayText), spokenText: fingerprint(envelope.spokenText), replayEvidence: undefined }) }) };
  } catch {
    return { ok: false, reason: "INVALID_SCHEMA" };
  }
}
