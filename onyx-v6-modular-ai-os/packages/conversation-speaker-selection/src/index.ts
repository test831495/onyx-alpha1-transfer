export const SPEAKER_SELECTION_VERSION = "B4C-1" as const;

export const SPEAKERS = ["ONYX", "NOVA"] as const;
export type Speaker = (typeof SPEAKERS)[number];
export type ExplicitSpeakerRequest = "NONE" | "ONYX" | "NOVA" | "BOTH" | "COUNCIL";
export type SelectionDisposition = "SELECTED" | "COUNCIL_ELIGIBLE" | "CLARIFICATION_REQUIRED" | "UNAVAILABLE" | "NOT_ASSESSABLE";
export type SelectionReasonCode =
  | "EXPLICIT_CHARACTER_REQUEST"
  | "EXPLICIT_BOTH_REQUEST"
  | "EXPLICIT_COUNCIL_REQUEST"
  | "FOLLOW_UP_TURN_OWNERSHIP"
  | "NOVA_LOCAL_PRACTICAL_PREFERENCE"
  | "ONYX_ARCHITECTURE_STRATEGY_PREFERENCE"
  | "MATERIAL_DUAL_PERSPECTIVE_COUNCIL_CANDIDATE"
  | "LOW_CONFIDENCE_DEFAULT_SPEAKER"
  | "LOW_CONFIDENCE_CLARIFICATION_REQUIRED"
  | "REQUESTED_CHARACTER_UNAVAILABLE"
  | "UNTRUSTED_SPEAKER_DIRECTIVE_REJECTED"
  | "SESSION_OWNERSHIP_INVALID"
  | "POLICY_RESTRICTED"
  | "NOT_ASSESSABLE";
export type CouncilEligibility = "ELIGIBLE" | "NOT_ELIGIBLE" | "CLARIFICATION_REQUIRED";
export type CouncilEligibilityReason =
  | "EXPLICIT_COUNCIL_REQUEST"
  | "EXPLICIT_BOTH_REQUEST"
  | "MATERIAL_DUAL_PERSPECTIVE_TRADEOFF"
  | "MATERIAL_EVIDENCE_CONFLICT"
  | "MATERIAL_PRACTICAL_AND_GOVERNANCE_TENSION"
  | "SINGLE_PERSPECTIVE_SUFFICIENT"
  | "LOW_MATERIALITY"
  | "INSUFFICIENT_EVIDENCE"
  | "CLARIFICATION_REQUIRED"
  | "POLICY_RESTRICTED"
  | "COUNCIL_NOT_REQUESTED";
export type FeatureMode = "OFF" | "TEST_HARNESS" | "SHADOW";
export type EmotionalContext = "NORMAL" | "CONFUSION" | "FRICTION" | "UNCERTAINTY" | "OVERLOAD" | "RECOVERY" | "ACHIEVEMENT" | "HIGH_CONSEQUENCE";
export type EmotionalEvidenceClass = "EXPLICIT_USER_STATEMENT" | "STRONG_LANGUAGE_PATTERN" | "SESSION_FRICTION_PATTERN" | "INSUFFICIENT_EVIDENCE";
export type ConfidenceEvidence = "LOW" | "MEDIUM" | "HIGH";
export type AdaptationClass = "STANDARD" | "SLOWER_PACE" | "MORE_STRUCTURE" | "CONCISE_NEXT_STEP" | "REDUCED_COGNITIVE_LOAD" | "EVIDENCE_FORWARD" | "CAUTIOUS_HIGH_CONSEQUENCE" | "BRIEF_ACHIEVEMENT_RECOGNITION";
export type PrivacyResult = "ELIGIBLE" | "NOT_ELIGIBLE" | "UNKNOWN";
export type SpeakerTopicClass = "GENERAL" | "LOCAL_PRACTICAL" | "ARCHITECTURE_AND_RISK" | "UNKNOWN";
export type FollowUpClass = "NONE" | "FOLLOW_UP_OWNERSHIP" | "CLARIFICATION";
export type OperatingMode = "LOCAL" | "HYBRID" | "REMOTE";
export type IntentClass = "GENERAL_INQUIRY" | "TECHNICAL_REQUEST" | "LOCAL_WORKFLOW" | "UNKNOWN";
export type AmbiguityClass = "LOW" | "MEDIUM" | "HIGH";
export type LanguageClass = "ENGLISH" | "HINDI" | "HINGLISH";
export type CodeSwitchEvidenceClass = "NONE" | "LIGHT" | "MEDIUM";
export type FreshnessClass = "CURRENT" | "STALE" | "UNKNOWN";
export type SessionLineage = readonly string[];
export type RouterLimitation = "NONE" | "UNAVAILABLE_CHARACTER" | "NEEDS_CLARIFICATION" | "POLICY_RESTRICTED";

export type SpeakerSelectionRequest = Readonly<{
  requestVersion: string;
  requestFingerprint: string;
  explicitSpeakerRequest: ExplicitSpeakerRequest;
  explicitRequestTrusted: boolean;
  externalOrUntrustedSpeakerDirectivePresent: boolean;
  intentClass: IntentClass;
  ambiguityClass: AmbiguityClass;
  clarificationRequired: boolean;
  sessionFingerprint: string;
  currentTurnOwner: Speaker | "NONE";
  followUpClass: FollowUpClass;
  followUpOwnershipFreshness: FreshnessClass;
  currentDefaultSpeaker: Speaker;
  onyxAvailable: boolean;
  novaAvailable: boolean;
  localCapabilityAvailable: boolean;
  cloudCapabilityAvailable: boolean;
  topicClass: SpeakerTopicClass;
  materialityClass: "LOW" | "MEDIUM" | "HIGH";
  truthSourceClass: "DETERMINISTIC_LOCAL" | "CONNECTOR_GROUNDED" | "CURRENT_GOVERNANCE" | "PUBLIC_EXTERNAL" | "UNKNOWN";
  uncertaintyClass: "KNOWN" | "PARTIAL" | "UNKNOWN" | "LOW";
  materialConflictPresent: boolean;
  languageClass: LanguageClass;
  codeSwitchEvidenceClass: CodeSwitchEvidenceClass;
  operatingMode: OperatingMode;
  featureMode: FeatureMode;
  privacyEligibility: PrivacyResult;
  emotionalEvidence: readonly string[];
  trustedFreshnessFacts: readonly string[];
  boundedSessionLineage: SessionLineage;
}>;

export type SpeakerDecision = Readonly<{
  decisionVersion: string;
  requestFingerprint: string;
  selectedSpeaker?: Speaker;
  selectionDisposition: SelectionDisposition;
  selectionReasonCode: SelectionReasonCode;
  precedenceLevel: number;
  explicitRequestHonored: boolean;
  followUpOwnershipUsed: boolean;
  councilEligibility: CouncilEligibility;
  councilEligibilityReason: CouncilEligibilityReason;
  clarificationRequired: boolean;
  confidenceEvidence: ConfidenceEvidence;
  limitations: readonly RouterLimitation[];
  unavailableCharacter?: Speaker;
  fallbackApplied: boolean;
  activeDefaultSpeakerUsed: boolean;
  emotionalContextProjection: EmotionalContext;
  featureMode: FeatureMode;
  shadowOnly: boolean;
  privacyResult: PrivacyResult;
  replayEvidence: string;
  nonAuthority: true;
  executionAuthorized: false;
  approvalGranted: false;
  memoryWriteAuthorized: false;
  connectorExecutionAuthorized: false;
  councilExecuted: false;
  responseGenerated: false;
}>;

export type EmotionalContextProjectionInput = Readonly<{
  projectionVersion: string;
  sessionFingerprint: string;
  emotionalEvidence: readonly string[];
  featureMode: FeatureMode;
  privacyResult: PrivacyResult;
}>;

export type EmotionalContextProjection = Readonly<{
  projectionVersion: string;
  context: EmotionalContext;
  evidenceClass: EmotionalEvidenceClass;
  confidenceEvidence: ConfidenceEvidence;
  reasonCodes: readonly string[];
  responseAdaptations: readonly AdaptationClass[];
  prohibitedEffects: readonly string[];
  sessionBound: true;
  expiresWithSession: true;
  strategicMemoryEligible: false;
  psychologicalDiagnosis: false;
  crossSessionScoring: false;
  authorityChanged: false;
  truthPolicyChanged: false;
  speakerSelectedByEmotion: false;
  privacyResult: PrivacyResult;
  replayEvidence: string;
}>;

export type ShadowDivergenceReceipt = Readonly<{
  receiptVersion: string;
  featureMode: FeatureMode;
  legacySpeakerClass?: string;
  candidateSpeakerClass: string;
  speakerDiverged: boolean;
  precedenceLevel: number;
  reasonCode: SelectionReasonCode;
  councilEligibility: CouncilEligibility;
  clarificationRequired: boolean;
  emotionalContext: EmotionalContext;
  confidenceEvidence: ConfidenceEvidence;
  limitationClass: RouterLimitation;
  authorityInvariantEqual: boolean;
  sideEffectsObserved: false;
  candidateVisible: false;
  persistenceOccurred: false;
  replayEvidence: string;
}>;

export const DEFAULT_REQUEST: SpeakerSelectionRequest = Object.freeze({
  requestVersion: "B4C-1",
  requestFingerprint: "default",
  explicitSpeakerRequest: "NONE",
  explicitRequestTrusted: true,
  externalOrUntrustedSpeakerDirectivePresent: false,
  intentClass: "GENERAL_INQUIRY",
  ambiguityClass: "LOW",
  clarificationRequired: false,
  sessionFingerprint: "default-session",
  currentTurnOwner: "NOVA",
  followUpClass: "NONE",
  followUpOwnershipFreshness: "CURRENT",
  currentDefaultSpeaker: "NOVA",
  onyxAvailable: true,
  novaAvailable: true,
  localCapabilityAvailable: true,
  cloudCapabilityAvailable: true,
  topicClass: "GENERAL",
  materialityClass: "LOW",
  truthSourceClass: "DETERMINISTIC_LOCAL",
  uncertaintyClass: "KNOWN",
  materialConflictPresent: false,
  languageClass: "ENGLISH",
  codeSwitchEvidenceClass: "NONE",
  operatingMode: "LOCAL",
  featureMode: "OFF",
  privacyEligibility: "ELIGIBLE",
  emotionalEvidence: Object.freeze([]),
  trustedFreshnessFacts: Object.freeze(["CURRENT_SESSION"]),
  boundedSessionLineage: Object.freeze(["default-session"]),
});

const freeze = <T>(value: T): T => Object.freeze(value);
const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(",")}}`;
  return JSON.stringify(value) ?? "null";
};
const hash = (value: unknown): string => {
  let result = 2166136261;
  for (const char of stableStringify(value)) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, "0");
};

const normalizeRequest = (request: SpeakerSelectionRequest): SpeakerSelectionRequest => {
  if (!request || typeof request !== "object") throw new Error("INVALID_REQUEST");
  return freeze({
    ...request,
    emotionalEvidence: Object.freeze([...request.emotionalEvidence]),
    trustedFreshnessFacts: Object.freeze([...request.trustedFreshnessFacts]),
    boundedSessionLineage: Object.freeze([...request.boundedSessionLineage]),
  });
};

const canUseSpeaker = (speaker: Speaker, request: SpeakerSelectionRequest): boolean => {
  if (speaker === "ONYX") return request.onyxAvailable;
  if (speaker === "NOVA") return request.novaAvailable;
  return false;
};

const computeCouncilEligibility = (request: SpeakerSelectionRequest): { councilEligibility: CouncilEligibility; councilEligibilityReason: CouncilEligibilityReason } => {
  if (request.explicitSpeakerRequest === "COUNCIL" || request.explicitSpeakerRequest === "BOTH") {
    return { councilEligibility: "ELIGIBLE", councilEligibilityReason: request.explicitSpeakerRequest === "COUNCIL" ? "EXPLICIT_COUNCIL_REQUEST" : "EXPLICIT_BOTH_REQUEST" };
  }
  if (request.materialConflictPresent || request.materialityClass === "HIGH") {
    return { councilEligibility: "ELIGIBLE", councilEligibilityReason: "MATERIAL_DUAL_PERSPECTIVE_TRADEOFF" };
  }
  return { councilEligibility: "NOT_ELIGIBLE", councilEligibilityReason: "SINGLE_PERSPECTIVE_SUFFICIENT" };
};

function buildEmission(request: SpeakerSelectionRequest, selectedSpeaker?: Speaker): SpeakerDecision {
  const council = computeCouncilEligibility(request);
  const emotionalProjection = buildEmotionalContextProjection({
    projectionVersion: SPEAKER_SELECTION_VERSION,
    sessionFingerprint: request.sessionFingerprint,
    emotionalEvidence: request.emotionalEvidence,
    featureMode: request.featureMode,
    privacyResult: request.privacyEligibility,
  });

  const decision: SpeakerDecision = {
    decisionVersion: SPEAKER_SELECTION_VERSION,
    requestFingerprint: request.requestFingerprint,
    selectedSpeaker,
    selectionDisposition: selectedSpeaker ? "SELECTED" : "CLARIFICATION_REQUIRED",
    selectionReasonCode: "LOW_CONFIDENCE_DEFAULT_SPEAKER",
    precedenceLevel: 7,
    explicitRequestHonored: false,
    followUpOwnershipUsed: false,
    councilEligibility: council.councilEligibility,
    councilEligibilityReason: council.councilEligibilityReason,
    clarificationRequired: false,
    confidenceEvidence: "LOW",
    limitations: ["NONE"] as readonly RouterLimitation[],
    fallbackApplied: true,
    activeDefaultSpeakerUsed: true,
    emotionalContextProjection: emotionalProjection.context,
    featureMode: request.featureMode,
    shadowOnly: request.featureMode === "SHADOW",
    privacyResult: request.privacyEligibility,
    replayEvidence: "",
    nonAuthority: true,
    executionAuthorized: false,
    approvalGranted: false,
    memoryWriteAuthorized: false,
    connectorExecutionAuthorized: false,
    councilExecuted: false,
    responseGenerated: false,
  };

  return Object.freeze({
    ...decision,
    replayEvidence: hash({
      decision,
      council,
      emotionalProjection,
    }),
  });
}

export function decideSpeaker(request: SpeakerSelectionRequest): SpeakerDecision {
  const normalized = normalizeRequest(request);
  if (normalized.privacyEligibility === "NOT_ELIGIBLE") {
    return buildEmission(normalized, undefined);
  }
  if (normalized.externalOrUntrustedSpeakerDirectivePresent || (normalized.explicitSpeakerRequest !== "NONE" && !normalized.explicitRequestTrusted)) {
    return Object.freeze({
      ...buildEmission(normalized, undefined),
      selectionDisposition: "NOT_ASSESSABLE",
      selectionReasonCode: "UNTRUSTED_SPEAKER_DIRECTIVE_REJECTED",
      clarificationRequired: true,
      councilEligibility: "CLARIFICATION_REQUIRED",
      councilEligibilityReason: "CLARIFICATION_REQUIRED",
      limitations: ["NEEDS_CLARIFICATION"] as readonly RouterLimitation[],
      confidenceEvidence: "LOW",
      precedenceLevel: 1,
      explicitRequestHonored: false,
      followUpOwnershipUsed: false,
      selectedSpeaker: undefined,
      fallbackApplied: false,
      activeDefaultSpeakerUsed: false,
    });
  }

  if (normalized.explicitSpeakerRequest === "ONYX" || normalized.explicitSpeakerRequest === "NOVA") {
    const speaker = normalized.explicitSpeakerRequest as Speaker;
    if (!canUseSpeaker(speaker, normalized)) {
      return Object.freeze({
        ...buildEmission(normalized, undefined),
        selectedSpeaker: undefined,
        selectionDisposition: "UNAVAILABLE",
        selectionReasonCode: "REQUESTED_CHARACTER_UNAVAILABLE",
        councilEligibility: "NOT_ELIGIBLE",
        councilEligibilityReason: "POLICY_RESTRICTED",
        clarificationRequired: true,
        limitations: ["UNAVAILABLE_CHARACTER"] as readonly RouterLimitation[],
        unavailableCharacter: speaker,
        precedenceLevel: 1,
        explicitRequestHonored: false,
        followUpOwnershipUsed: false,
      });
    }
    return Object.freeze({
      ...buildEmission(normalized, speaker),
      selectedSpeaker: speaker,
      selectionDisposition: "SELECTED",
      selectionReasonCode: "EXPLICIT_CHARACTER_REQUEST",
      precedenceLevel: 1,
      explicitRequestHonored: true,
      clarificationRequired: false,
      councilEligibility: "NOT_ELIGIBLE",
      councilEligibilityReason: "SINGLE_PERSPECTIVE_SUFFICIENT",
      limitations: ["NONE"] as readonly RouterLimitation[],
      fallbackApplied: false,
      activeDefaultSpeakerUsed: false,
    });
  }

  if (normalized.explicitSpeakerRequest === "BOTH" || normalized.explicitSpeakerRequest === "COUNCIL") {
    return Object.freeze({
      ...buildEmission(normalized, undefined),
      selectedSpeaker: undefined,
      selectionDisposition: "COUNCIL_ELIGIBLE",
      selectionReasonCode: normalized.explicitSpeakerRequest === "COUNCIL" ? "EXPLICIT_COUNCIL_REQUEST" : "EXPLICIT_BOTH_REQUEST",
      precedenceLevel: 2,
      explicitRequestHonored: false,
      followUpOwnershipUsed: false,
      councilEligibility: "ELIGIBLE",
      councilEligibilityReason: normalized.explicitSpeakerRequest === "COUNCIL" ? "EXPLICIT_COUNCIL_REQUEST" : "EXPLICIT_BOTH_REQUEST",
      clarificationRequired: false,
      limitations: ["NONE"] as readonly RouterLimitation[],
      fallbackApplied: false,
      activeDefaultSpeakerUsed: false,
    });
  }

  if (normalized.followUpClass === "FOLLOW_UP_OWNERSHIP" && normalized.followUpOwnershipFreshness === "CURRENT" && normalized.currentTurnOwner !== "NONE") {
    return Object.freeze({
      ...buildEmission(normalized, normalized.currentTurnOwner as Speaker),
      selectedSpeaker: normalized.currentTurnOwner as Speaker,
      selectionDisposition: "SELECTED",
      selectionReasonCode: "FOLLOW_UP_TURN_OWNERSHIP",
      precedenceLevel: 3,
      explicitRequestHonored: false,
      followUpOwnershipUsed: true,
      councilEligibility: "NOT_ELIGIBLE",
      councilEligibilityReason: "SINGLE_PERSPECTIVE_SUFFICIENT",
      clarificationRequired: false,
      limitations: ["NONE"] as readonly RouterLimitation[],
      fallbackApplied: false,
      activeDefaultSpeakerUsed: false,
    });
  }

  if (normalized.topicClass === "LOCAL_PRACTICAL") {
    return Object.freeze({
      ...buildEmission(normalized, "NOVA"),
      selectedSpeaker: "NOVA",
      selectionDisposition: "SELECTED",
      selectionReasonCode: "NOVA_LOCAL_PRACTICAL_PREFERENCE",
      precedenceLevel: 4,
      explicitRequestHonored: false,
      followUpOwnershipUsed: false,
      councilEligibility: "NOT_ELIGIBLE",
      councilEligibilityReason: "SINGLE_PERSPECTIVE_SUFFICIENT",
      clarificationRequired: false,
      limitations: ["NONE"] as readonly RouterLimitation[],
      fallbackApplied: false,
      activeDefaultSpeakerUsed: false,
    });
  }

  if (normalized.topicClass === "ARCHITECTURE_AND_RISK") {
    return Object.freeze({
      ...buildEmission(normalized, "ONYX"),
      selectedSpeaker: "ONYX",
      selectionDisposition: "SELECTED",
      selectionReasonCode: "ONYX_ARCHITECTURE_STRATEGY_PREFERENCE",
      precedenceLevel: 5,
      explicitRequestHonored: false,
      followUpOwnershipUsed: false,
      councilEligibility: "NOT_ELIGIBLE",
      councilEligibilityReason: "SINGLE_PERSPECTIVE_SUFFICIENT",
      clarificationRequired: false,
      limitations: ["NONE"] as readonly RouterLimitation[],
      fallbackApplied: false,
      activeDefaultSpeakerUsed: false,
    });
  }

  if (normalized.materialConflictPresent || normalized.materialityClass === "HIGH") {
    return Object.freeze({
      ...buildEmission(normalized, undefined),
      selectionDisposition: "COUNCIL_ELIGIBLE",
      selectionReasonCode: "MATERIAL_DUAL_PERSPECTIVE_COUNCIL_CANDIDATE",
      precedenceLevel: 6,
      explicitRequestHonored: false,
      followUpOwnershipUsed: false,
      councilEligibility: "ELIGIBLE",
      councilEligibilityReason: "MATERIAL_DUAL_PERSPECTIVE_TRADEOFF",
      clarificationRequired: false,
      limitations: ["NONE"] as readonly RouterLimitation[],
      fallbackApplied: false,
      activeDefaultSpeakerUsed: false,
    });
  }

  const defaultSpeaker = normalized.currentDefaultSpeaker;
  if (defaultSpeaker === "NOVA" || defaultSpeaker === "ONYX") {
    return Object.freeze({
      ...buildEmission(normalized, defaultSpeaker),
      selectedSpeaker: defaultSpeaker,
      selectionDisposition: "SELECTED",
      selectionReasonCode: "LOW_CONFIDENCE_DEFAULT_SPEAKER",
      precedenceLevel: 7,
      explicitRequestHonored: false,
      followUpOwnershipUsed: false,
      councilEligibility: "NOT_ELIGIBLE",
      councilEligibilityReason: "LOW_MATERIALITY",
      clarificationRequired: false,
      limitations: ["NONE"] as readonly RouterLimitation[],
      fallbackApplied: true,
      activeDefaultSpeakerUsed: true,
    });
  }

  return Object.freeze({
    ...buildEmission(normalized, undefined),
    selectedSpeaker: undefined,
    selectionDisposition: "CLARIFICATION_REQUIRED",
    selectionReasonCode: "LOW_CONFIDENCE_CLARIFICATION_REQUIRED",
    precedenceLevel: 7,
    explicitRequestHonored: false,
    followUpOwnershipUsed: false,
    councilEligibility: "CLARIFICATION_REQUIRED",
    councilEligibilityReason: "CLARIFICATION_REQUIRED",
    clarificationRequired: true,
    limitations: ["NEEDS_CLARIFICATION"] as readonly RouterLimitation[],
    fallbackApplied: false,
    activeDefaultSpeakerUsed: false,
  });
}

export function buildEmotionalContextProjection(input: EmotionalContextProjectionInput): EmotionalContextProjection {
  const evidence = [...input.emotionalEvidence].filter((entry) => typeof entry === "string");
  const contextMap: Record<string, EmotionalContext> = {
    EXPLICIT_CONFUSION: "CONFUSION",
    STRONG_FRICTION: "FRICTION",
    TIME_FRICTION: "FRICTION",
    LACK_OF_NEXT_STEP_CERTAINTY: "UNCERTAINTY",
    EXCESSIVE_LOAD: "OVERLOAD",
    RECOVERY: "RECOVERY",
    VERIFIED_SUCCESS: "ACHIEVEMENT",
    HIGH_CONSEQUENCE: "HIGH_CONSEQUENCE",
  };
  let context: EmotionalContext = "NORMAL";
  for (const entry of evidence) {
    const mapped = contextMap[entry];
    if (mapped) context = mapped;
  }
  const reasonCodes = evidence.length === 0 ? ["INSUFFICIENT_EVIDENCE"] : evidence.slice(0, 4);
  const result: EmotionalContextProjection = {
    projectionVersion: input.projectionVersion,
    context,
    evidenceClass: evidence.length === 0 ? "INSUFFICIENT_EVIDENCE" : "EXPLICIT_USER_STATEMENT",
    confidenceEvidence: context === "NORMAL" ? "LOW" : "MEDIUM",
    reasonCodes,
    responseAdaptations: context === "NORMAL" ? ["STANDARD"] : ["CONCISE_NEXT_STEP"],
    prohibitedEffects: Object.freeze(["speakerSelectedByEmotion", "authorityChanged", "crossSessionStorage", "diagnosis"]),
    sessionBound: true,
    expiresWithSession: true,
    strategicMemoryEligible: false,
    psychologicalDiagnosis: false,
    crossSessionScoring: false,
    authorityChanged: false,
    truthPolicyChanged: false,
    speakerSelectedByEmotion: false,
    privacyResult: input.privacyResult,
    replayEvidence: hash({
      projectionVersion: input.projectionVersion,
      sessionFingerprint: input.sessionFingerprint,
      context,
      evidence,
      privacyResult: input.privacyResult,
    }),
  };
  return Object.freeze(result);
}

export function buildShadowDivergenceReceipt(input: {
  featureMode: FeatureMode;
  legacySpeakerClass?: string;
  candidateSpeakerClass: string;
  precedenceLevel: number;
  reasonCode: SelectionReasonCode;
  councilEligibility: CouncilEligibility;
  clarificationRequired: boolean;
  emotionalContext: EmotionalContext;
  confidenceEvidence: ConfidenceEvidence;
  limitationClass: RouterLimitation;
  authorityInvariantEqual: boolean;
  replayEvidence: string;
}): ShadowDivergenceReceipt {
  const receipt: ShadowDivergenceReceipt = {
    receiptVersion: SPEAKER_SELECTION_VERSION,
    featureMode: input.featureMode,
    legacySpeakerClass: input.legacySpeakerClass,
    candidateSpeakerClass: input.candidateSpeakerClass,
    speakerDiverged: input.legacySpeakerClass !== input.candidateSpeakerClass,
    precedenceLevel: input.precedenceLevel,
    reasonCode: input.reasonCode,
    councilEligibility: input.councilEligibility,
    clarificationRequired: input.clarificationRequired,
    emotionalContext: input.emotionalContext,
    confidenceEvidence: input.confidenceEvidence,
    limitationClass: input.limitationClass,
    authorityInvariantEqual: input.authorityInvariantEqual,
    sideEffectsObserved: false,
    candidateVisible: false,
    persistenceOccurred: false,
    replayEvidence: input.replayEvidence,
  };
  return Object.freeze(receipt);
}
