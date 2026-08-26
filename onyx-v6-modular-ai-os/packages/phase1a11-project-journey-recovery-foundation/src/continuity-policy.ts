import { boundedFreeze } from "./capture-policy";
import type {
  ContinuityAssessmentInput,
  ContinuityAssessmentResult,
  ContinuityEvidenceRecord,
  ContinuityRequirement,
  EvidenceSufficiencyAssessmentResult,
  HistoricalConfidenceAssessmentResult,
} from "./model";

export const CONTINUITY_STATES = boundedFreeze([
  "COMPLETE_CONTINUITY",
  "PARTIAL_CONTINUITY",
  "GAP_PRESENT",
  "INSUFFICIENT_EVIDENCE",
  "CONFLICTED_CONTINUITY",
  "UNKNOWN_CONTINUITY",
  "MALFORMED_ASSESSMENT",
] as const);
export type ContinuityState = (typeof CONTINUITY_STATES)[number];

export const EVIDENCE_SUFFICIENCY_STATES = boundedFreeze([
  "SUFFICIENT",
  "PARTIALLY_SUFFICIENT",
  "INSUFFICIENT",
  "MISSING",
  "PROHIBITED",
  "STALE",
  "CONFLICTED",
  "NOT_ASSESSABLE",
] as const);
export type EvidenceSufficiencyState = (typeof EVIDENCE_SUFFICIENCY_STATES)[number];

export const HISTORICAL_CONFIDENCE_BANDS = boundedFreeze([
  "HIGH_CONFIDENCE",
  "MEDIUM_CONFIDENCE",
  "LOW_CONFIDENCE",
  "UNVERIFIED",
  "CONFLICTED",
  "NOT_ASSESSABLE",
] as const);
export type HistoricalConfidenceBand = (typeof HISTORICAL_CONFIDENCE_BANDS)[number];

export const EVIDENCE_FRESHNESS_STATES = boundedFreeze([
  "CURRENT",
  "STALE",
  "MATERIALLY_CHANGED",
  "UNKNOWN_FRESHNESS",
] as const);
export type EvidenceFreshnessState = (typeof EVIDENCE_FRESHNESS_STATES)[number];

export const SAFE_NEXT_ACTIONS = boundedFreeze([
  "KEEP_EVIDENCE_VISIBLE_WITH_PROVENANCE",
  "KEEP_GAPS_VISIBLE",
  "REQUEST_OWNER_REVIEW",
  "DENY_PROHIBITED_CONTENT",
  "REQUIRE_FRESH_PROVENANCE",
  "DO_NOT_CREATE_AUTHORITY",
] as const);
export type SafeNextAction = (typeof SAFE_NEXT_ACTIONS)[number];

export const CONTINUITY_POLICY_CONFIGURATION = boundedFreeze({
  version: "B4-3",
  failClosed: true,
  createsAuthority: false,
  defaultVisible: false,
  ownerScopeRequired: true,
  provenanceRequired: true,
  runtimeOperationsDeferred: true,
} as const);

// Shared sensitivity classification reused by continuity assessment and projection eligibility so both stay fail-closed and consistent.
export type SensitivityTier = "OPEN" | "OWNER_GATED" | "CREDENTIAL_ADJACENT" | "PROHIBITED" | "UNKNOWN" | "UNRECOGNIZED";

const SENSITIVITY_TIERS: Readonly<Record<string, SensitivityTier>> = boundedFreeze({
  PUBLIC_PROJECT_METADATA: "OPEN",
  HOUSEHOLD_SAFE_METADATA: "OPEN",
  OWNER_PRIVATE_PROJECT_HISTORY: "OWNER_GATED",
  SECURITY_SENSITIVE_METADATA: "OWNER_GATED",
  CREDENTIAL_ADJACENT_METADATA: "CREDENTIAL_ADJACENT",
  PROHIBITED_SECRET_CONTENT: "PROHIBITED",
  PROHIBITED_PRIVATE_HOUSEHOLD_CONTENT: "PROHIBITED",
  PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT: "PROHIBITED",
  UNKNOWN_SENSITIVITY: "UNKNOWN",
});

export const classifySensitivityTier = (value: string): SensitivityTier => SENSITIVITY_TIERS[value] ?? "UNRECOGNIZED";

const isOwnerRestrictedSensitivity = (value: string): boolean => {
  const tier = classifySensitivityTier(value);
  return tier === "OWNER_GATED" || tier === "CREDENTIAL_ADJACENT";
};
const isKnownFreshness = (value: string): boolean => (EVIDENCE_FRESHNESS_STATES as readonly string[]).includes(value);

// Per-requirement evidence evaluation. PROHIBITED is checked first: it is the sharpest invariant
// and must never be diluted into a vaguer NOT_ASSESSABLE result.
const evaluateRequirementEvidence = (
  requirementId: string,
  evidence: readonly ContinuityEvidenceRecord[],
  requirement: Pick<ContinuityRequirement, "provenanceRequired" | "evidenceTypes" | "mandatory">,
): EvidenceSufficiencyState => {
  const related = evidence.filter((entry) => entry.requirementId === requirementId);
  if (related.length === 0) return "MISSING";

  if (related.some((entry) => classifySensitivityTier(String(entry.sensitivity)) === "PROHIBITED")) return "PROHIBITED";

  const compatible = related.filter((entry) => entry.compatible === true);
  if (compatible.length === 0) {
    const hasUnassessableSensitivity = related.some((entry) => {
      const tier = classifySensitivityTier(String(entry.sensitivity));
      return tier === "UNKNOWN" || tier === "UNRECOGNIZED";
    });
    return hasUnassessableSensitivity ? "NOT_ASSESSABLE" : "INSUFFICIENT";
  }

  const requiresCurrentEvidence = requirement.mandatory !== false;
  if (requiresCurrentEvidence) {
    if (compatible.some((entry) => entry.freshness === "STALE" || entry.freshness === "MATERIALLY_CHANGED")) return "STALE";
    if (compatible.every((entry) => !isKnownFreshness(String(entry.freshness)) || entry.freshness === "UNKNOWN_FRESHNESS")) return "NOT_ASSESSABLE";
  }

  const provenanceOk =
    requirement.provenanceRequired !== true ||
    compatible.some((entry) => typeof entry.provenance === "string" && entry.provenance.trim().length > 0);
  if (!provenanceOk) return "INSUFFICIENT";

  const evidenceTypesOk =
    !Array.isArray(requirement.evidenceTypes) ||
    requirement.evidenceTypes.length === 0 ||
    compatible.some((entry) => requirement.evidenceTypes!.includes(entry.precedence));
  if (!evidenceTypesOk) return "PARTIALLY_SUFFICIENT";

  return "SUFFICIENT";
};

export const assessJourneyContinuity = (
  input: ContinuityAssessmentInput,
): ContinuityAssessmentResult => {
  const hasConflicts = Array.isArray(input.conflicts) && input.conflicts.length > 0;
  const topTier = classifySensitivityTier(String(input.sensitivity));

  if (topTier === "PROHIBITED") {
    return boundedFreeze({ continuityState: "UNKNOWN_CONTINUITY", missingEvidence: true, hasConflicts, policyVersion: input.policyVersion, createsAuthority: false });
  }
  if (topTier === "UNKNOWN" || topTier === "UNRECOGNIZED") {
    return boundedFreeze({ continuityState: "MALFORMED_ASSESSMENT", missingEvidence: true, hasConflicts, policyVersion: input.policyVersion, createsAuthority: false });
  }
  if (isOwnerRestrictedSensitivity(String(input.sensitivity)) && !(input.ownerScopeVerified && input.canonicalPrimaryOwner)) {
    return boundedFreeze({ continuityState: "UNKNOWN_CONTINUITY", missingEvidence: true, hasConflicts, policyVersion: input.policyVersion, createsAuthority: false });
  }

  const requiredRequirements = input.requirements.filter(
    (requirement) => requirement.required !== false && (requirement.mandatory ?? true),
  );
  const perRequirement = requiredRequirements.map((requirement) => evaluateRequirementEvidence(requirement.id, input.evidence, requirement));
  const hasGaps = Array.isArray(input.gaps) && input.gaps.length > 0;

  if (perRequirement.includes("NOT_ASSESSABLE")) {
    return boundedFreeze({ continuityState: "MALFORMED_ASSESSMENT", missingEvidence: true, hasConflicts, policyVersion: input.policyVersion, createsAuthority: false });
  }
  if (hasConflicts) {
    return boundedFreeze({
      continuityState: "CONFLICTED_CONTINUITY",
      missingEvidence: perRequirement.some((state) => state !== "SUFFICIENT"),
      hasConflicts: true,
      policyVersion: input.policyVersion,
      createsAuthority: false,
    });
  }

  const blocked = perRequirement.some((state) => state === "MISSING" || state === "INSUFFICIENT" || state === "PROHIBITED" || state === "STALE");
  if (blocked) {
    return boundedFreeze({
      continuityState: hasGaps ? "GAP_PRESENT" : "INSUFFICIENT_EVIDENCE",
      missingEvidence: true,
      hasConflicts: false,
      policyVersion: input.policyVersion,
      createsAuthority: false,
    });
  }

  if (perRequirement.includes("PARTIALLY_SUFFICIENT")) {
    return boundedFreeze({ continuityState: "PARTIAL_CONTINUITY", missingEvidence: true, hasConflicts: false, policyVersion: input.policyVersion, createsAuthority: false });
  }

  return boundedFreeze({ continuityState: "COMPLETE_CONTINUITY", missingEvidence: false, hasConflicts: false, policyVersion: input.policyVersion, createsAuthority: false });
};

export const assessEvidenceSufficiency = (
  input: Omit<ContinuityAssessmentInput, "requirements"> & {
    readonly required: readonly ContinuityRequirement[];
  },
): EvidenceSufficiencyAssessmentResult => {
  const topTier = classifySensitivityTier(String(input.sensitivity));
  if (topTier === "PROHIBITED") {
    return boundedFreeze({ state: "PROHIBITED", missingEvidence: true, policyVersion: input.policyVersion, createsAuthority: false });
  }
  if (topTier === "UNKNOWN" || topTier === "UNRECOGNIZED") {
    return boundedFreeze({ state: "NOT_ASSESSABLE", missingEvidence: true, policyVersion: input.policyVersion, createsAuthority: false });
  }
  if (topTier === "CREDENTIAL_ADJACENT") {
    return boundedFreeze({ state: "NOT_ASSESSABLE", missingEvidence: true, policyVersion: input.policyVersion, createsAuthority: false });
  }
  if (isOwnerRestrictedSensitivity(String(input.sensitivity)) && !(input.ownerScopeVerified && input.canonicalPrimaryOwner)) {
    return boundedFreeze({ state: "NOT_ASSESSABLE", missingEvidence: true, policyVersion: input.policyVersion, createsAuthority: false });
  }

  const required = input.required.filter(
    (requirement) => requirement.required !== false && (requirement.mandatory ?? true),
  );

  if (required.length === 0) {
    return boundedFreeze({ state: "SUFFICIENT", missingEvidence: false, policyVersion: input.policyVersion, createsAuthority: false });
  }

  const perRequirement = required.map((requirement) => evaluateRequirementEvidence(requirement.id, input.evidence, requirement));
  const hasConflicts = Array.isArray(input.conflicts) && input.conflicts.length > 0;

  // Precedence: PROHIBITED first (never diluted), then NOT_ASSESSABLE, then remaining states in increasing sufficiency.
  const state: EvidenceSufficiencyState = perRequirement.includes("PROHIBITED")
    ? "PROHIBITED"
    : perRequirement.includes("NOT_ASSESSABLE")
      ? "NOT_ASSESSABLE"
      : hasConflicts
        ? "CONFLICTED"
        : perRequirement.includes("STALE")
          ? "STALE"
          : perRequirement.includes("MISSING")
            ? "MISSING"
            : perRequirement.includes("INSUFFICIENT")
              ? "INSUFFICIENT"
              : perRequirement.includes("PARTIALLY_SUFFICIENT")
                ? "PARTIALLY_SUFFICIENT"
                : "SUFFICIENT";

  return boundedFreeze({
    state,
    missingEvidence: state !== "SUFFICIENT",
    policyVersion: input.policyVersion,
    createsAuthority: false,
  });
};

export const assessHistoricalConfidence = (
  input: ContinuityAssessmentInput,
): HistoricalConfidenceAssessmentResult => {
  const result = assessJourneyContinuity(input);
  const band: HistoricalConfidenceBand =
    result.continuityState === "COMPLETE_CONTINUITY"
      ? "HIGH_CONFIDENCE"
      : result.continuityState === "CONFLICTED_CONTINUITY"
        ? "CONFLICTED"
        : result.continuityState === "PARTIAL_CONTINUITY"
          ? "MEDIUM_CONFIDENCE"
          : result.continuityState === "GAP_PRESENT" || result.continuityState === "INSUFFICIENT_EVIDENCE"
            ? "LOW_CONFIDENCE"
            : result.continuityState === "MALFORMED_ASSESSMENT"
              ? "NOT_ASSESSABLE"
              : "UNVERIFIED";

  return boundedFreeze({
    band,
    policyVersion: input.policyVersion,
    createsAuthority: false,
  });
};
