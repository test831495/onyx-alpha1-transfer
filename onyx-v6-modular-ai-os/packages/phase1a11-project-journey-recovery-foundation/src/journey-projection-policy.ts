import { boundedFreeze } from "./capture-policy";
import { classifySensitivityTier } from "./continuity-policy";
import type {
  JourneyProjectionPurpose,
  ProjectionEligibilityAssessmentResult,
  ProjectionEligibilityState,
  ProjectionProvenanceAssessmentResult,
} from "./model";

export const JOURNEY_PROJECTION_PURPOSES = boundedFreeze([
  "PROJECT_PHASE_HISTORY",
  "ARCHITECTURE_HISTORY",
  "IMPLEMENTATION_HISTORY",
  "VALIDATION_HISTORY",
  "DECISION_HISTORY",
  "RELEASE_HISTORY",
  "RECOVERY_HISTORY",
  "CONTINUITY_SUMMARY",
] as const);

export const PROJECTION_ELIGIBILITY_STATES = boundedFreeze([
  "ELIGIBLE",
  "PARTIALLY_ELIGIBLE",
  "OWNER_REVIEW_REQUIRED",
  "DENIED",
  "UNVERIFIED",
  "MALFORMED",
] as const);

export const assessProjectionEligibility = (input: {
  readonly purpose: JourneyProjectionPurpose | string;
  readonly sensitivity: string;
  readonly ownerScopeVerified: boolean;
  readonly canonicalPrimaryOwner: boolean;
  readonly evidence: readonly unknown[];
  readonly provenance: readonly unknown[];
  readonly policyVersion: string;
}): ProjectionEligibilityAssessmentResult => {
  const isKnownPurpose = (JOURNEY_PROJECTION_PURPOSES as readonly string[]).includes(String(input.purpose));
  const tier = classifySensitivityTier(String(input.sensitivity));
  const ownerVerified = input.ownerScopeVerified && input.canonicalPrimaryOwner;
  const evidencePresent = input.evidence.length > 0;
  const provenancePresent = input.provenance.length > 0;
  const completeness: "COMPLETE" | "PARTIAL" | "NONE" =
    evidencePresent && provenancePresent ? "COMPLETE" : evidencePresent || provenancePresent ? "PARTIAL" : "NONE";

  let eligibility: ProjectionEligibilityState;
  if (!isKnownPurpose || tier === "UNRECOGNIZED") {
    eligibility = "MALFORMED";
  } else if (tier === "PROHIBITED") {
    eligibility = "DENIED";
  } else if (tier === "UNKNOWN") {
    eligibility = "UNVERIFIED";
  } else if (tier === "CREDENTIAL_ADJACENT") {
    // Credential-adjacent metadata never becomes automatically eligible, even with verified owner scope.
    eligibility = ownerVerified ? "OWNER_REVIEW_REQUIRED" : "DENIED";
  } else if (tier === "OWNER_GATED" && !ownerVerified) {
    eligibility = "OWNER_REVIEW_REQUIRED";
  } else {
    eligibility = completeness === "COMPLETE" ? "ELIGIBLE" : completeness === "PARTIAL" ? "PARTIALLY_ELIGIBLE" : "UNVERIFIED";
  }

  return boundedFreeze({
    eligibility,
    policyVersion: input.policyVersion,
    createsAuthority: false,
  });
};
export const validateProjectionProvenance = (input: {
  readonly purpose: JourneyProjectionPurpose | string;
  readonly evidenceReferences: readonly string[];
  readonly reasonReferences: readonly string[];
  readonly gapReferences: readonly string[];
  readonly conflictReferences: readonly string[];
  readonly policyVersion: string;
}): ProjectionProvenanceAssessmentResult => {
  const validPurpose = (JOURNEY_PROJECTION_PURPOSES as readonly string[]).includes(String(input.purpose));
  const evidenceValid = input.evidenceReferences.every(
    (reference) => typeof reference === "string" && reference.trim().length > 0,
  );
  const reasonValid = input.reasonReferences.every(
    (reference) => typeof reference === "string" && reference.trim().length > 0,
  );
  const valid = validPurpose && evidenceValid && reasonValid;

  return boundedFreeze({
    valid,
    policyVersion: input.policyVersion,
    createsAuthority: false,
  });
};
