import { describe, expect, it } from "vitest";
import {
  CONTINUITY_POLICY_CONFIGURATION,
  CONTINUITY_STATES,
  EVIDENCE_SUFFICIENCY_STATES,
  HISTORICAL_CONFIDENCE_BANDS,
  JOURNEY_PROJECTION_PURPOSES,
  PROJECTION_ELIGIBILITY_STATES,
  assessEvidenceSufficiency,
  assessHistoricalConfidence,
  assessJourneyContinuity,
  assessProjectionEligibility,
  validateProjectionProvenance,
} from "../src/index";
import type { ContinuityEvidenceRecord, ContinuityRequirement } from "../src/model";

const requirement = (overrides: Partial<ContinuityRequirement> = {}): ContinuityRequirement => ({
  id: "req-1",
  required: true,
  title: "Milestone evidence",
  mandatory: true,
  evidenceTypes: ["VALIDATION_EVIDENCE"],
  provenanceRequired: true,
  ...overrides,
});
const evidence = (overrides: Partial<ContinuityEvidenceRecord> = {}): ContinuityEvidenceRecord => ({
  id: "e-1",
  requirementId: "req-1",
  sourceKind: "TEST_EVIDENCE",
  compatible: true,
  precedence: "VALIDATION_EVIDENCE",
  provenance: "prov-1",
  sensitivity: "PUBLIC_PROJECT_METADATA",
  ownerOnly: false,
  freshness: "CURRENT",
  createsAuthority: false,
  ...overrides,
});

describe("B4-3 continuity policy", () => {
  it("exposes the frozen closed vocabularies", () => {
    expect(CONTINUITY_STATES).toEqual(expect.arrayContaining([
      "COMPLETE_CONTINUITY",
      "PARTIAL_CONTINUITY",
      "GAP_PRESENT",
      "INSUFFICIENT_EVIDENCE",
      "CONFLICTED_CONTINUITY",
      "UNKNOWN_CONTINUITY",
      "MALFORMED_ASSESSMENT",
    ]));
    expect(EVIDENCE_SUFFICIENCY_STATES).toEqual(expect.arrayContaining([
      "SUFFICIENT",
      "PARTIALLY_SUFFICIENT",
      "INSUFFICIENT",
      "MISSING",
      "PROHIBITED",
      "STALE",
      "CONFLICTED",
      "NOT_ASSESSABLE",
    ]));
    expect(HISTORICAL_CONFIDENCE_BANDS).toEqual(expect.arrayContaining([
      "HIGH_CONFIDENCE",
      "MEDIUM_CONFIDENCE",
      "LOW_CONFIDENCE",
      "UNVERIFIED",
      "CONFLICTED",
      "NOT_ASSESSABLE",
    ]));
    expect(JOURNEY_PROJECTION_PURPOSES).toEqual(expect.arrayContaining([
      "PROJECT_PHASE_HISTORY",
      "ARCHITECTURE_HISTORY",
      "IMPLEMENTATION_HISTORY",
      "VALIDATION_HISTORY",
      "DECISION_HISTORY",
      "RELEASE_HISTORY",
      "RECOVERY_HISTORY",
      "CONTINUITY_SUMMARY",
    ]));
    expect(PROJECTION_ELIGIBILITY_STATES).toEqual(expect.arrayContaining([
      "ELIGIBLE",
      "PARTIALLY_ELIGIBLE",
      "OWNER_REVIEW_REQUIRED",
      "DENIED",
      "UNVERIFIED",
      "MALFORMED",
    ]));
    expect(CONTINUITY_POLICY_CONFIGURATION).toMatchObject({ createsAuthority: false });
  });

  it("assesses complete continuity only when all mandatory facts pass", () => {
    const result = assessJourneyContinuity({
      requirements: [requirement()],
      evidence: [evidence()],
      gaps: [],
      conflicts: [],
      sensitivity: "PUBLIC_PROJECT_METADATA",
      ownerScopeVerified: true,
      canonicalPrimaryOwner: true,
      policyVersion: "B4-3",
    });
    expect(result.continuityState).toBe("COMPLETE_CONTINUITY");
    expect(result.missingEvidence).toBe(false);
    expect(result.createsAuthority).toBe(false);
  });

  it("fails closed for missing mandatory evidence", () => {
    const result = assessJourneyContinuity({
      requirements: [requirement()],
      evidence: [],
      gaps: [],
      conflicts: [],
      sensitivity: "PUBLIC_PROJECT_METADATA",
      ownerScopeVerified: true,
      canonicalPrimaryOwner: true,
      policyVersion: "B4-3",
    });
    expect(result.continuityState).toBe("INSUFFICIENT_EVIDENCE");
    expect(result.missingEvidence).toBe(true);
  });

  it("blocks COMPLETE_CONTINUITY for stale mandatory evidence", () => {
    const result = assessJourneyContinuity({
      requirements: [requirement()],
      evidence: [evidence({ freshness: "STALE" })],
      gaps: [],
      conflicts: [],
      sensitivity: "PUBLIC_PROJECT_METADATA",
      ownerScopeVerified: true,
      canonicalPrimaryOwner: true,
      policyVersion: "B4-3",
    });
    expect(result.continuityState).not.toBe("COMPLETE_CONTINUITY");
    expect(result.continuityState).toBe("INSUFFICIENT_EVIDENCE");
  });

  it("blocks HIGH_CONFIDENCE for stale mandatory evidence", () => {
    const result = assessHistoricalConfidence({
      requirements: [requirement()],
      evidence: [evidence({ freshness: "STALE" })],
      gaps: [],
      conflicts: [],
      sensitivity: "PUBLIC_PROJECT_METADATA",
      ownerScopeVerified: true,
      canonicalPrimaryOwner: true,
      policyVersion: "B4-3",
    });
    expect(result.band).not.toBe("HIGH_CONFIDENCE");
    expect(result.band).toBe("LOW_CONFIDENCE");
  });

  it("prevents prohibited evidence from ever producing COMPLETE_CONTINUITY", () => {
    const result = assessJourneyContinuity({
      requirements: [requirement()],
      evidence: [evidence({ sensitivity: "PROHIBITED_SECRET_CONTENT" })],
      gaps: [],
      conflicts: [],
      sensitivity: "PUBLIC_PROJECT_METADATA",
      ownerScopeVerified: true,
      canonicalPrimaryOwner: true,
      policyVersion: "B4-3",
    });
    expect(result.continuityState).not.toBe("COMPLETE_CONTINUITY");
    expect(result.continuityState).toBe("INSUFFICIENT_EVIDENCE");
  });

  describe("assessEvidenceSufficiency reachability", () => {
    it("returns SUFFICIENT for allowed current mandatory evidence", () => {
      const result = assessEvidenceSufficiency({
        required: [requirement()],
        evidence: [evidence()],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("SUFFICIENT");
      expect(result.missingEvidence).toBe(false);
      expect(result.createsAuthority).toBe(false);
    });

    it("returns MISSING when required evidence is absent", () => {
      const result = assessEvidenceSufficiency({
        required: [requirement()],
        evidence: [],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("MISSING");
      expect(result.missingEvidence).toBe(true);
    });

    it("returns INSUFFICIENT for present but incompatible evidence", () => {
      const result = assessEvidenceSufficiency({
        required: [requirement()],
        evidence: [evidence({ compatible: false })],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("INSUFFICIENT");
    });

    it("returns PARTIALLY_SUFFICIENT when compatible evidence does not match the required evidence type", () => {
      const result = assessEvidenceSufficiency({
        required: [requirement({ evidenceTypes: ["ARCHITECTURE_EVIDENCE"] })],
        evidence: [evidence({ precedence: "VALIDATION_EVIDENCE" })],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("PARTIALLY_SUFFICIENT");
      expect(result.missingEvidence).toBe(true);
    });

    it.each([
      ["PROHIBITED_SECRET_CONTENT"],
      ["PROHIBITED_PRIVATE_HOUSEHOLD_CONTENT"],
      ["PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT"],
    ])("returns PROHIBITED and contributes zero for %s evidence", (sensitivity) => {
      const result = assessEvidenceSufficiency({
        required: [requirement()],
        evidence: [evidence({ sensitivity })],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("PROHIBITED");
      expect(result.missingEvidence).toBe(true);
      expect(result.createsAuthority).toBe(false);
    });

    it("returns STALE for explicit stale mandatory evidence", () => {
      const result = assessEvidenceSufficiency({
        required: [requirement()],
        evidence: [evidence({ freshness: "STALE" })],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("STALE");
    });

    it("returns STALE for materially changed or invalidated mandatory evidence", () => {
      const result = assessEvidenceSufficiency({
        required: [requirement()],
        evidence: [evidence({ freshness: "MATERIALLY_CHANGED" })],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("STALE");
    });

    it("returns CONFLICTED for unresolved relevant conflicts", () => {
      const result = assessEvidenceSufficiency({
        required: [requirement()],
        evidence: [evidence()],
        conflicts: ["conflict-1"],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("CONFLICTED");
    });

    it("returns NOT_ASSESSABLE when required freshness facts are unknown", () => {
      const result = assessEvidenceSufficiency({
        required: [requirement()],
        evidence: [evidence({ freshness: "UNKNOWN_FRESHNESS" })],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("NOT_ASSESSABLE");
    });

    it("returns NOT_ASSESSABLE when supplied sensitivity is unknown or unrecognized", () => {
      const result = assessEvidenceSufficiency({
        required: [requirement()],
        evidence: [evidence({ compatible: false, sensitivity: "UNKNOWN_SENSITIVITY" })],
        sensitivity: "PUBLIC_PROJECT_METADATA",
        ownerScopeVerified: true,
        canonicalPrimaryOwner: true,
        policyVersion: "B4-3",
      });
      expect(result.state).toBe("NOT_ASSESSABLE");
    });

    it("proves every declared evidence-sufficiency state is reachable", () => {
      const fixtures: Record<(typeof EVIDENCE_SUFFICIENCY_STATES)[number], Parameters<typeof assessEvidenceSufficiency>[0]> = {
        SUFFICIENT: { required: [requirement()], evidence: [evidence()], sensitivity: "PUBLIC_PROJECT_METADATA", ownerScopeVerified: true, canonicalPrimaryOwner: true, policyVersion: "B4-3" },
        PARTIALLY_SUFFICIENT: { required: [requirement({ evidenceTypes: ["ARCHITECTURE_EVIDENCE"] })], evidence: [evidence()], sensitivity: "PUBLIC_PROJECT_METADATA", ownerScopeVerified: true, canonicalPrimaryOwner: true, policyVersion: "B4-3" },
        INSUFFICIENT: { required: [requirement()], evidence: [evidence({ compatible: false })], sensitivity: "PUBLIC_PROJECT_METADATA", ownerScopeVerified: true, canonicalPrimaryOwner: true, policyVersion: "B4-3" },
        MISSING: { required: [requirement()], evidence: [], sensitivity: "PUBLIC_PROJECT_METADATA", ownerScopeVerified: true, canonicalPrimaryOwner: true, policyVersion: "B4-3" },
        PROHIBITED: { required: [requirement()], evidence: [evidence({ sensitivity: "PROHIBITED_SECRET_CONTENT" })], sensitivity: "PUBLIC_PROJECT_METADATA", ownerScopeVerified: true, canonicalPrimaryOwner: true, policyVersion: "B4-3" },
        STALE: { required: [requirement()], evidence: [evidence({ freshness: "STALE" })], sensitivity: "PUBLIC_PROJECT_METADATA", ownerScopeVerified: true, canonicalPrimaryOwner: true, policyVersion: "B4-3" },
        CONFLICTED: { required: [requirement()], evidence: [evidence()], conflicts: ["conflict-1"], sensitivity: "PUBLIC_PROJECT_METADATA", ownerScopeVerified: true, canonicalPrimaryOwner: true, policyVersion: "B4-3" },
        NOT_ASSESSABLE: { required: [requirement()], evidence: [evidence({ freshness: "UNKNOWN_FRESHNESS" })], sensitivity: "PUBLIC_PROJECT_METADATA", ownerScopeVerified: true, canonicalPrimaryOwner: true, policyVersion: "B4-3" },
      };
      for (const [expectedState, input] of Object.entries(fixtures)) {
        const result = assessEvidenceSufficiency(input);
        expect(result.state, `expected fixture for ${expectedState} to reach it`).toBe(expectedState);
      }
    });
  });

  it("assigns confidence and visibility deterministically", () => {
    const result = assessHistoricalConfidence({
      requirements: [requirement()],
      evidence: [evidence()],
      gaps: [],
      conflicts: [],
      sensitivity: "PUBLIC_PROJECT_METADATA",
      ownerScopeVerified: true,
      canonicalPrimaryOwner: true,
      policyVersion: "B4-3",
    });
    expect(result.band).toBe("HIGH_CONFIDENCE");
    expect(result.createsAuthority).toBe(false);
  });

  describe("assessEvidenceSufficiency top-level sensitivity and owner scope", () => {
    const sufficiencyInput = (sensitivity: string, ownerScopeVerified: boolean, canonicalPrimaryOwner: boolean) => ({
      required: [requirement()],
      evidence: [evidence({ sensitivity })],
      sensitivity,
      ownerScopeVerified,
      canonicalPrimaryOwner,
      policyVersion: "B4-3",
    });

    it.each([
      ["OWNER_PRIVATE_PROJECT_HISTORY", false, false, "NOT_ASSESSABLE"],
      ["OWNER_PRIVATE_PROJECT_HISTORY", true, false, "NOT_ASSESSABLE"],
      ["OWNER_PRIVATE_PROJECT_HISTORY", false, true, "NOT_ASSESSABLE"],
      ["SECURITY_SENSITIVE_METADATA", false, false, "NOT_ASSESSABLE"],
      ["SECURITY_SENSITIVE_METADATA", true, false, "NOT_ASSESSABLE"],
      ["CREDENTIAL_ADJACENT_METADATA", false, false, "NOT_ASSESSABLE"],
      ["CREDENTIAL_ADJACENT_METADATA", true, true, "NOT_ASSESSABLE"],
      ["UNKNOWN_SENSITIVITY", true, true, "NOT_ASSESSABLE"],
      ["UNSUPPORTED_SENSITIVITY", true, true, "NOT_ASSESSABLE"],
    ] as const)("fails closed for %s", (sensitivity, ownerScopeVerified, canonicalPrimaryOwner, expected) => {
      const result = assessEvidenceSufficiency(sufficiencyInput(sensitivity, ownerScopeVerified, canonicalPrimaryOwner));
      expect(result.state).toBe(expected);
      expect(result.state).not.toBe("SUFFICIENT");
      expect(result.state).not.toBe("PARTIALLY_SUFFICIENT");
      expect(result.createsAuthority).toBe(false);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it.each([
      "PROHIBITED_SECRET_CONTENT",
      "PROHIBITED_PRIVATE_HOUSEHOLD_CONTENT",
      "PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT",
    ])("returns PROHIBITED for %s even with verified owner scope", (sensitivity) => {
      const result = assessEvidenceSufficiency(sufficiencyInput(sensitivity, true, true));
      expect(result.state).toBe("PROHIBITED");
      expect(result.createsAuthority).toBe(false);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("allows verified owner scope to proceed for protected evidence", () => {
      for (const sensitivity of ["OWNER_PRIVATE_PROJECT_HISTORY", "SECURITY_SENSITIVE_METADATA"]) {
        const result = assessEvidenceSufficiency(sufficiencyInput(sensitivity, true, true));
        expect(result.state).toBe("SUFFICIENT");
        expect(result.createsAuthority).toBe(false);
        expect(Object.isFrozen(result)).toBe(true);
      }
    });

    it("keeps the trusted freshness vocabulary closed", () => {
      const valid = evidence({ freshness: "CURRENT" });
      expect(assessEvidenceSufficiency(sufficiencyInput("PUBLIC_PROJECT_METADATA", true, true)).state).toBe("SUFFICIENT");
      expect(valid.freshness).toBe("CURRENT");
      // @ts-expect-error Unsupported freshness must not enter the trusted record contract.
      const unsupported: ContinuityEvidenceRecord = { ...valid, freshness: "UNSUPPORTED_FRESHNESS" };
      const result = assessEvidenceSufficiency({ ...sufficiencyInput("PUBLIC_PROJECT_METADATA", true, true), evidence: [unsupported] });
      expect(result.state).toBe("NOT_ASSESSABLE");
    });
  });

  describe("assessProjectionEligibility fail-closed sensitivity coverage", () => {
    const projectionInput = (overrides: Partial<Parameters<typeof assessProjectionEligibility>[0]> = {}) => ({
      purpose: "ARCHITECTURE_HISTORY" as const,
      sensitivity: "PUBLIC_PROJECT_METADATA",
      ownerScopeVerified: false,
      canonicalPrimaryOwner: false,
      evidence: ["evidence-1"],
      provenance: ["reason-1"],
      policyVersion: "B4-3",
      ...overrides,
    });

    it("PUBLIC_PROJECT_METADATA is eligible only when other mandatory conditions pass", () => {
      expect(assessProjectionEligibility(projectionInput()).eligibility).toBe("ELIGIBLE");
      expect(assessProjectionEligibility(projectionInput({ evidence: [], provenance: [] })).eligibility).toBe("UNVERIFIED");
    });

    it("returns exact PARTIALLY_ELIGIBLE for allowed evidence with incomplete provenance", () => {
      const result = assessProjectionEligibility(projectionInput({ provenance: [] }));
      expect(result.eligibility).toBe("PARTIALLY_ELIGIBLE");
      expect(result.createsAuthority).toBe(false);
      expect("projection" in result).toBe(false);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("HOUSEHOLD_SAFE_METADATA is eligible only when other mandatory conditions pass", () => {
      expect(assessProjectionEligibility(projectionInput({ sensitivity: "HOUSEHOLD_SAFE_METADATA" })).eligibility).toBe("ELIGIBLE");
    });

    it("requires verified canonical Primary Owner scope for OWNER_PRIVATE_PROJECT_HISTORY", () => {
      const denied = assessProjectionEligibility(projectionInput({ sensitivity: "OWNER_PRIVATE_PROJECT_HISTORY" }));
      expect(denied.eligibility).toBe("OWNER_REVIEW_REQUIRED");
      const allowed = assessProjectionEligibility(projectionInput({ sensitivity: "OWNER_PRIVATE_PROJECT_HISTORY", ownerScopeVerified: true, canonicalPrimaryOwner: true }));
      expect(allowed.eligibility).toBe("ELIGIBLE");
    });

    it("never returns ELIGIBLE for CREDENTIAL_ADJACENT_METADATA", () => {
      const unverified = assessProjectionEligibility(projectionInput({ sensitivity: "CREDENTIAL_ADJACENT_METADATA" }));
      expect(unverified.eligibility).toBe("DENIED");
      const verified = assessProjectionEligibility(projectionInput({ sensitivity: "CREDENTIAL_ADJACENT_METADATA", ownerScopeVerified: true, canonicalPrimaryOwner: true }));
      expect(verified.eligibility).toBe("OWNER_REVIEW_REQUIRED");
      expect(verified.eligibility).not.toBe("ELIGIBLE");
    });

    it("returns DENIED for PROHIBITED_SECRET_CONTENT regardless of owner scope", () => {
      const result = assessProjectionEligibility(projectionInput({ sensitivity: "PROHIBITED_SECRET_CONTENT", ownerScopeVerified: true, canonicalPrimaryOwner: true }));
      expect(result.eligibility).toBe("DENIED");
    });

    it("returns DENIED for PROHIBITED_PRIVATE_HOUSEHOLD_CONTENT regardless of owner scope", () => {
      const result = assessProjectionEligibility(projectionInput({ sensitivity: "PROHIBITED_PRIVATE_HOUSEHOLD_CONTENT", ownerScopeVerified: true, canonicalPrimaryOwner: true }));
      expect(result.eligibility).toBe("DENIED");
    });

    it("returns DENIED for PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT regardless of owner scope", () => {
      const result = assessProjectionEligibility(projectionInput({ sensitivity: "PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT", ownerScopeVerified: true, canonicalPrimaryOwner: true }));
      expect(result.eligibility).toBe("DENIED");
    });

    it("fails closed for UNKNOWN_SENSITIVITY and never returns ELIGIBLE or PARTIALLY_ELIGIBLE", () => {
      const result = assessProjectionEligibility(projectionInput({ sensitivity: "UNKNOWN_SENSITIVITY", ownerScopeVerified: true, canonicalPrimaryOwner: true }));
      expect(result.eligibility).toBe("UNVERIFIED");
      expect(result.eligibility).not.toBe("ELIGIBLE");
      expect(result.eligibility).not.toBe("PARTIALLY_ELIGIBLE");
    });

    it("fails closed to MALFORMED for an unrecognized sensitivity value", () => {
      const result = assessProjectionEligibility(projectionInput({ sensitivity: "NOT_A_REAL_SENSITIVITY_CLASS" }));
      expect(result.eligibility).toBe("MALFORMED");
    });

    it("verified owner scope does not override a prohibited sensitivity", () => {
      const result = assessProjectionEligibility(projectionInput({ sensitivity: "PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT", ownerScopeVerified: true, canonicalPrimaryOwner: true }));
      expect(result.eligibility).toBe("DENIED");
    });

    it("every projection eligibility result has createsAuthority: false", () => {
      for (const sensitivity of [
        "PUBLIC_PROJECT_METADATA",
        "HOUSEHOLD_SAFE_METADATA",
        "OWNER_PRIVATE_PROJECT_HISTORY",
        "CREDENTIAL_ADJACENT_METADATA",
        "PROHIBITED_SECRET_CONTENT",
        "PROHIBITED_PRIVATE_HOUSEHOLD_CONTENT",
        "PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT",
        "UNKNOWN_SENSITIVITY",
      ]) {
        expect(assessProjectionEligibility(projectionInput({ sensitivity })).createsAuthority).toBe(false);
      }
    });
  });

  it("validates provenance envelopes and preserves references", () => {
    const result = validateProjectionProvenance({
      purpose: "ARCHITECTURE_HISTORY",
      evidenceReferences: ["prov-1"],
      reasonReferences: ["reason-1"],
      gapReferences: [],
      conflictReferences: [],
      policyVersion: "B4-3",
    });
    expect(result.valid).toBe(true);
    expect(result.createsAuthority).toBe(false);
  });

  it("does not mutate caller inputs and keeps returned collections truthfully immutable", () => {
    const requirements = [requirement()];
    const evidenceRecords = [evidence()];
    const before = JSON.stringify({ requirements, evidenceRecords });
    const continuityResult = assessJourneyContinuity({
      requirements,
      evidence: evidenceRecords,
      gaps: [],
      conflicts: [],
      sensitivity: "PUBLIC_PROJECT_METADATA",
      ownerScopeVerified: true,
      canonicalPrimaryOwner: true,
      policyVersion: "B4-3",
    });
    expect(JSON.stringify({ requirements, evidenceRecords })).toBe(before);
    expect(Object.isFrozen(continuityResult)).toBe(true);
  });
});
