import { describe, expect, it } from "vitest";
import { assessEvidenceAgainstPolicy } from "../src";
import { ACCEPTANCE_IDS, ACCEPTANCE_REGISTRY, ARTIFACT_PURPOSES, ARTIFACT_PURPOSE_LABELS, CAPTURE_POLICY_LABELS, CAPTURE_POLICY_RESULTS, CAPTURE_PRIORITIES, CAPTURE_PRIORITY_LABELS, CONTINUITY_EVIDENCE_LABELS, CONTINUITY_GAP_LABELS_B42, CONTINUITY_GAP_TYPES, FRIENDLY_LABELS, IDENTITY_CLASSIFICATION_LABELS, IDENTITY_CLASSIFICATIONS, JOURNEY_EVENT_KINDS, JOURNEY_EVENT_KIND_LABELS, MANDATORY_EVIDENCE_POLICY, NOISE_CLASSIFICATION_LABELS, NOISE_CLASSIFICATIONS, NOISE_DECISION_LABELS, NOISE_DECISIONS, OPERATING_MODE_B42_LABELS, OPERATING_MODES_B42, PRIVACY_CLASSIFICATION_LABELS, PRIVACY_CLASSIFICATIONS, PRIVACY_DECISION_LABELS, PRIVACY_DECISIONS, SIGNIFICANCE_CLASSIFICATION_LABELS, SIGNIFICANCE_CLASSIFICATIONS, SOURCE_COMPATIBILITY_RULES, SOURCE_KIND_LABELS, SOURCE_KINDS, SOURCE_PRECEDENCE, SOURCE_PRECEDENCE_BY_KIND, SOURCE_PRECEDENCE_LABELS, assessArtifactSeparation, assessConflict, assessEvidence, assessEvent, assessMaterialRevision, assessNoise, assessOwnerCorrection, assessOwnerScope, assessSupersession, classifyCapturePriority, classifyIdentity, classifyPrivacy, createEvidenceReference, createMandatoryEvidencePolicy, boundedFreeze, eventIdentityKey } from "../src";
import type { FriendlyLabel } from "../src/labels";

const evidence = (reference: string, sourceKind: (typeof SOURCE_KINDS)[number], eventKind: (typeof JOURNEY_EVENT_KINDS)[number]) => createEvidenceReference(reference, sourceKind, eventKind);
const missingInput = () => ({ eventKind: "PULL_REQUEST_MERGED" as const, evidence: [] as readonly ReturnType<typeof evidence>[], malformed: false, stale: false, materialChangeAfterAssessment: false, conflicting: false, privacyClassification: "PUBLIC_PROJECT_METADATA" as const });
const budget = { maximumOptionalContextItems: 2, maximumInformationalEventsPerMilestone: 3, repeatedEventThreshold: 2, burstThreshold: 4, createsAuthority: false as const };
const validEvent = { eventId: "event-1", eventKind: "PULL_REQUEST_MERGED" as const, significance: "MANDATORY_MILESTONE" as const, sourceKind: "MERGED_PULL_REQUEST" as const, sourceReference: "pr-1", occurredAt: "2026-08-24T10:00:00Z", recordedAt: "2026-08-24T10:01:00Z", detailedProjectJourney: false, canonicalPrimaryOwner: false, ownerScopeVerified: false, privacyClassification: "PUBLIC_PROJECT_METADATA" as const };
const expectLabels = <const Values extends readonly string[]>(values: Values, labels: Readonly<Record<Values[number], FriendlyLabel>>): void => { expect(Object.keys(labels).sort()).toEqual([...values].sort()); for (const value of values) expect(labels[value as Values[number]]).toMatchObject({ title: expect.any(String), explanation: expect.any(String), safeNextAction: expect.any(String), createsAuthority: false }); };

describe("B4-2 governed capture policy", () => {
  it("contains individually authored CAPTURE records and preserves the frozen family shape", () => {
    const capture = ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "CAPTURE");
    expect(capture).toHaveLength(24);
    expect(capture.map((entry) => entry.id)).toEqual(ACCEPTANCE_IDS.slice(68, 92));
    expect(new Set(capture.map((entry) => entry.authoritativeRequirement)).size).toBe(24);
    expect(new Set(capture.map((entry) => entry.userMeaning)).size).toBe(24);
    expect(capture.every((entry) => entry.createsAuthority === false && entry.runtimeStatus === "RUNTIME_DEFERRED" && entry.uiStatus === "UI_DEFERRED")).toBe(true);
    expect(ACCEPTANCE_REGISTRY.slice(0, 68).map((entry) => entry.id)).toEqual(ACCEPTANCE_IDS.slice(0, 68));
  });
  it("contains the exact closed vocabularies", () => {
    expect(JOURNEY_EVENT_KINDS).toHaveLength(26); expect(SIGNIFICANCE_CLASSIFICATIONS).toHaveLength(6); expect(SOURCE_KINDS).toHaveLength(15); expect(SOURCE_PRECEDENCE).toHaveLength(6); expect(CAPTURE_POLICY_RESULTS).toHaveLength(12); expect(CONTINUITY_GAP_TYPES).toHaveLength(13); expect(PRIVACY_DECISIONS).toHaveLength(6); expect(IDENTITY_CLASSIFICATIONS).toHaveLength(8); expect(CAPTURE_PRIORITIES).toHaveLength(4); expect(NOISE_CLASSIFICATIONS).toHaveLength(6); expect(ARTIFACT_PURPOSES).toHaveLength(8); expect(OPERATING_MODES_B42).toEqual(["ACTIVE", "LIGHT", "VACATION", "HIBERNATION"]);
  });
  it("maps every source exactly once and enforces compatibility", () => {
    expect(Object.keys(SOURCE_PRECEDENCE_BY_KIND).sort()).toEqual([...SOURCE_KINDS].sort());
    expect(JOURNEY_EVENT_KINDS.every((kind) => SOURCE_COMPATIBILITY_RULES[kind].required.length > 0)).toBe(true);
    expect(evidence("pr-1", "MERGED_PULL_REQUEST", "PULL_REQUEST_MERGED").compatible).toBe(true);
    expect(evidence("test-1", "TEST_EVIDENCE", "PULL_REQUEST_MERGED").compatible).toBe(false);
  });
  it("fails closed for missing, unsupported, malformed, stale, changed, and conflicting evidence", () => {
    expect(assessEvidence(missingInput()).result).toBe("DEFERRED_MISSING_EVIDENCE");
    expect(assessEvidence({ ...missingInput(), malformed: true }).result).toBe("DENIED_MALFORMED_EVENT");
    expect(assessEvidence({ ...missingInput(), stale: true }).gap).toBe("EVIDENCE_EXPIRED");
    expect(assessEvidence({ ...missingInput(), materialChangeAfterAssessment: true }).gap).toBe("MATERIAL_CHANGE_AFTER_ASSESSMENT");
    expect(assessEvidence({ ...missingInput(), evidence: [evidence("test-1", "TEST_EVIDENCE", "PULL_REQUEST_MERGED")] }).result).toBe("DENIED_UNSUPPORTED_SOURCE");
    const conflicting = assessEvidence({ ...missingInput(), evidence: [evidence("pr-1", "MERGED_PULL_REQUEST", "PULL_REQUEST_MERGED"), evidence("review-1", "MERGE_VERIFICATION", "PULL_REQUEST_MERGED")], conflicting: true });
    expect(conflicting).toMatchObject({ result: "DEFERRED_CONFLICTING_EVIDENCE", conflictPreserved: true, createsAuthority: false }); expect(conflicting.evidenceReferences).toHaveLength(2);
  });
  it("assesses malformed events and preserves conflict details", () => {
    expect(assessEvent(null).result).toBe("DENIED_MALFORMED_EVENT"); expect(assessEvent({ ...validEvent, sourceKind: "UNKNOWN" }).result).toBe("DENIED_MALFORMED_EVENT");
    expect(assessEvent(validEvent).result).toBe("DEFERRED_MISSING_EVIDENCE");
    const conflict = assessConflict([evidence("a", "MERGED_PULL_REQUEST", "PULL_REQUEST_MERGED"), evidence("b", "MERGE_VERIFICATION", "PULL_REQUEST_MERGED")], true, "MATERIAL_DISAGREEMENT", "Synthetic evidence differs.");
    expect(conflict).toMatchObject({ unresolved: true, ownerOnly: true, conflictDetails: "Synthetic evidence differs.", createsAuthority: false }); expect(conflict.competingEvidence).toHaveLength(2);
  });
  it("uses collision-safe identity and distinguishes duplicate classes", () => {
    const first = { eventKind: "VALIDATION_COMPLETED" as const, sourceKind: "TEST_EVIDENCE" as const, sourceReference: "a|b", occurredAt: "c" }; const second = { eventKind: "VALIDATION_COMPLETED" as const, sourceKind: "TEST_EVIDENCE" as const, sourceReference: "a", occurredAt: "b|c" };
    expect(eventIdentityKey(first)).not.toBe(eventIdentityKey(second)); expect(eventIdentityKey({ ...first })).toBe(eventIdentityKey(first));
    const base = { sourceReference: "x", exactMatch: false, replayed: false, potentialMatch: false, materiallyChanged: false, lateEvidence: false, superseding: false };
    expect(classifyIdentity(base)).toBe("NEW_EVENT"); expect(classifyIdentity({ ...base, exactMatch: true })).toBe("EXACT_DUPLICATE"); expect(classifyIdentity({ ...base, replayed: true })).toBe("REPLAYED_EVENT"); expect(classifyIdentity({ ...base, potentialMatch: true })).toBe("POTENTIAL_DUPLICATE"); expect(classifyIdentity({ ...base, materiallyChanged: true })).toBe("MATERIAL_REVISION"); expect(classifyIdentity({ ...base, lateEvidence: true })).toBe("LATE_EVIDENCE"); expect(classifyIdentity({ ...base, superseding: true })).toBe("SUPERSEDING_EVENT"); expect(classifyIdentity({ ...base, replayed: true, exactMatch: true })).toBe("AMBIGUOUS_IDENTITY"); expect(classifyIdentity({ ...base, replayed: true, materiallyChanged: true })).toBe("AMBIGUOUS_IDENTITY"); expect(classifyIdentity({ ...base, sourceReference: "" })).toBe("AMBIGUOUS_IDENTITY");
  });
  it("preserves revision, supersession, and owner-correction references", () => {
    expect(assessMaterialRevision("prior", true)).toMatchObject({ classification: "MATERIAL_REVISION", priorRecordReference: "prior", preservesPriorEvidence: true, createsAuthority: false }); expect(assessSupersession("prior", "next", "OWNER_CORRECTION", "provenance")).toMatchObject({ required: true, priorRecordReference: "prior", supersedingRecordReference: "next", validReason: true, validProvenance: true, createsAuthority: false }); expect(assessOwnerCorrection("prior", "next", "OWNER_CORRECTION", "provenance", false).allowed).toBe(false); expect(assessOwnerCorrection("prior", "next", "OWNER_CORRECTION", "provenance", true)).toMatchObject({ allowed: true, ownerOnly: true, createsAuthority: false });
  });
  it("fails closed for privacy and keeps technical information hidden", () => {
    expect(classifyPrivacy("PUBLIC_PROJECT_METADATA")).toBe("ALLOW_METADATA_ONLY"); expect(classifyPrivacy("OWNER_PRIVATE_PROJECT_HISTORY")).toBe("ALLOW_OWNER_ONLY"); expect(classifyPrivacy("CREDENTIAL_ADJACENT_METADATA")).toBe("ALLOW_AFTER_REDACTION"); expect(classifyPrivacy("UNKNOWN_SENSITIVITY")).toBe("DENY_UNKNOWN_SENSITIVITY"); expect(classifyPrivacy("PROHIBITED_SECRET_CONTENT")).toBe("DENY_PROHIBITED_CONTENT");
  });
  it("preserves critical evidence while applying configurable mode and noise policy", () => {
    expect(classifyCapturePriority("VACATION", "CRITICAL_CONTINUITY")).toMatchObject({ allowed: true, behavior: "PRESERVE", createsAuthority: false }); expect(classifyCapturePriority("HIBERNATION", "OPTIONAL_ENRICHMENT").behavior).toBe("DEFER"); expect(assessNoise("MATERIAL_EVENT", budget, 0, 0, 0, 0, false).decision).toBe("PRESERVE"); expect(assessNoise("REPEATED_NONMATERIAL_EVENT", budget, 2, 0, 0, 0, false).decision).toBe("AGGREGATE_LATER"); expect(assessNoise("LOCAL_DEBUG_EVENT", budget, 0, 0, 0, 0, false).decision).toBe("REJECT_NOISE"); expect(assessNoise("TRANSIENT_TOOLING_EVENT", budget, 0, 2, 0, 0, false).decision).toBe("DEFER"); expect(assessNoise("UNSUPPORTED_NOISE", budget, 0, 0, 0, 0, true).decision).toBe("PRESERVE"); expect(createMandatoryEvidencePolicy("PULL_REQUEST_MERGED", 2).minimumEvidenceCount).toBe(2);
  });
  it("separates Journey references from artifact payload absorption", () => { for (const purpose of ARTIFACT_PURPOSES) expect(assessArtifactSeparation(purpose)).toMatchObject({ source: purpose, target: "PROJECT_JOURNEY_RECORD", allowedAsJourneyReference: true, payloadAbsorptionAllowed: false, createsAuthority: false }); expect(assessArtifactSeparation("USER_MEMORY", "USER_MEMORY").allowedAsJourneyReference).toBe(false); });
  it("defers invalid configurable budgets without dropping mandatory evidence", () => { expect(assessNoise("SUPPORTING_EVENT", { ...budget, burstThreshold: -1 }, 0, 0, 0, 0, false).decision).toBe("DEFER"); expect(assessNoise("SUPPORTING_EVENT", { ...budget, burstThreshold: -1 }, 0, 0, 0, 0, true).decision).toBe("PRESERVE"); });
  it("provides exhaustive structured labels and immutable nested policy data", () => {
    for (const labels of [CAPTURE_POLICY_LABELS, IDENTITY_CLASSIFICATION_LABELS, CONTINUITY_GAP_LABELS_B42, PRIVACY_DECISION_LABELS, CAPTURE_PRIORITY_LABELS, NOISE_CLASSIFICATION_LABELS, ARTIFACT_PURPOSE_LABELS, OPERATING_MODE_B42_LABELS]) for (const label of Object.values(labels)) expect(label).toMatchObject({ title: expect.any(String), explanation: expect.any(String), safeNextAction: expect.any(String), severity: expect.any(String), createsAuthority: false, technicalInformation: { available: true, defaultVisible: false } });
    expect(Object.isFrozen(JOURNEY_EVENT_KINDS)).toBe(true); expect(Object.isFrozen(SOURCE_COMPATIBILITY_RULES)).toBe(true); expect(Object.isFrozen(SOURCE_COMPATIBILITY_RULES.PULL_REQUEST_MERGED.required)).toBe(true); expect(Object.isFrozen(MANDATORY_EVIDENCE_POLICY)).toBe(true); expect(Object.isFrozen(MANDATORY_EVIDENCE_POLICY.PULL_REQUEST_MERGED.requiredSourceKinds)).toBe(true);
  });
  it("enforces caller-supplied configurable evidence limits", () => {
    const policy = createMandatoryEvidencePolicy("PULL_REQUEST_MERGED", 2);
    expect(assessEvidenceAgainstPolicy({ ...missingInput(), evidence: [evidence("pr-1", "MERGED_PULL_REQUEST", "PULL_REQUEST_MERGED")] }, policy).result).toBe("DEFERRED_MISSING_EVIDENCE");
  });
  it("requires privacy classification and fails closed for every unknown or prohibited class", () => {
    for (const privacyClassification of ["UNKNOWN_SENSITIVITY", "PROHIBITED_SECRET_CONTENT", "PROHIBITED_PRIVATE_HOUSEHOLD_CONTENT", "PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT"] as const) {
      expect(assessEvidence({ ...missingInput(), privacyClassification }).result).toMatch(/DENIED/);
      expect(assessEvent({ eventKind: "PULL_REQUEST_MERGED", sourceKind: "MERGED_PULL_REQUEST", sourceReference: "pr-1", occurredAt: "2026-08-24", privacyClassification }).privacyDecision).toMatch(/DENY/);
    }
    expect(assessEvent({ eventKind: "PULL_REQUEST_MERGED", sourceKind: "MERGED_PULL_REQUEST", sourceReference: "pr-1", occurredAt: "2026-08-24" }).privacyDecision).toBe("DENY_UNKNOWN_SENSITIVITY");
    expect(assessEvent({ ...validEvent, privacyClassification: "CREDENTIAL_ADJACENT_METADATA", safeRedactionPossible: true }).privacyDecision).toBe("ALLOW_AFTER_REDACTION");
    expect(assessEvent({ ...validEvent, privacyClassification: "CREDENTIAL_ADJACENT_METADATA" }).privacyDecision).toBe("DEFER_FOR_OWNER_REVIEW");
    expect(assessEvent({ ...validEvent, sourceReference: "journey-1", detailedProjectJourney: true, canonicalPrimaryOwner: true, ownerScopeVerified: true, privacyClassification: "OWNER_PRIVATE_PROJECT_HISTORY" })).toMatchObject({ ownerOnly: true, privacyDecision: "ALLOW_OWNER_ONLY", createsAuthority: false });
  });
  it("enforces detailed Journey access only for verified canonical owner scope", () => {
    const owner = { detailedProjectJourney: true, authenticatedAsCanonicalPrimaryOwner: true, ownerScopeVerified: true, privacyClassification: "OWNER_PRIVATE_PROJECT_HISTORY" as const, requestedDisclosureLevel: "DETAILED_OWNER" as const, characterOrAlias: "NOVA" };
    expect(assessOwnerScope(owner)).toMatchObject({ allowed: true, ownerOnly: true, createsAuthority: false });
    for (const denied of [{ ...owner, authenticatedAsCanonicalPrimaryOwner: false }, { ...owner, ownerScopeVerified: false }, { ...owner, privacyClassification: "PUBLIC_PROJECT_METADATA" as const }, { ...owner, requestedDisclosureLevel: "CURATED_BASIC" as const }, { ...owner, authenticatedAsCanonicalPrimaryOwner: "true" as unknown as boolean }]) expect(assessOwnerScope(denied).allowed).toBe(false);
    expect(assessOwnerScope({ ...owner, detailedProjectJourney: false }).ownerOnly).toBe(false);
  });
  it("preserves all policy inputs and nested frozen policy data", () => {
    const input = { ...missingInput(), evidence: [evidence("pr-1", "MERGED_PULL_REQUEST", "PULL_REQUEST_MERGED")] };
    const before = JSON.parse(JSON.stringify(input));
    assessEvidence(input); expect(input).toEqual(before);
    const conflictInput = [evidence("a", "MERGED_PULL_REQUEST", "PULL_REQUEST_MERGED")]; const conflictBefore = JSON.parse(JSON.stringify(conflictInput)); assessConflict(conflictInput, false); expect(conflictInput).toEqual(conflictBefore);
    const unchangedBudget = { ...budget }; assessNoise("SUPPORTING_EVENT", unchangedBudget, 0, 0, 0, 0, false); expect(unchangedBudget).toEqual(budget);
    const owner = { detailedProjectJourney: true, authenticatedAsCanonicalPrimaryOwner: true, ownerScopeVerified: true, privacyClassification: "OWNER_PRIVATE_PROJECT_HISTORY" as const, requestedDisclosureLevel: "DETAILED_OWNER" as const }; const ownerBefore = { ...owner }; assessOwnerScope(owner); expect(owner).toEqual(ownerBefore);
    expect(() => { (SOURCE_COMPATIBILITY_RULES.PULL_REQUEST_MERGED.required as unknown as string[]).push("TEST_EVIDENCE"); }).toThrow();
    expect(() => { (MANDATORY_EVIDENCE_POLICY.PULL_REQUEST_MERGED as unknown as { requiredSourceKinds: string[] }).requiredSourceKinds.push("TEST_EVIDENCE"); }).toThrow();
    expect(() => { (CAPTURE_POLICY_LABELS.ELIGIBLE_FOR_FUTURE_CAPTURE as unknown as { technicalInformation: { notes: string } }).technicalInformation.notes = "changed"; }).toThrow();
  });
  it("enforces every mandatory event field and owner scope at both boundaries", () => {
    for (const [field, expected] of [["eventId", "EVENT_ID_MISSING"], ["significance", "SIGNIFICANCE_INVALID"], ["recordedAt", "RECORDED_AT_INVALID"], ["occurredAt", "OCCURRED_AT_INVALID"]] as const) expect(assessEvent({ ...validEvent, [field]: field === "eventId" ? "" : "invalid" }).reasonCodes).toContain(expected);
    expect(assessEvent({ ...validEvent, privacyClassification: undefined }).reasonCodes).toContain("PRIVACY_CLASSIFICATION_MISSING");
    const privateEvent = { ...validEvent, detailedProjectJourney: true, privacyClassification: "OWNER_PRIVATE_PROJECT_HISTORY" as const };
    expect(assessEvent(privateEvent)).toMatchObject({ result: "DENIED_OWNER_SCOPE", ownerOnly: true, createsAuthority: false });
    expect(assessEvidence({ ...missingInput(), privacyClassification: "OWNER_PRIVATE_PROJECT_HISTORY", detailedProjectJourney: true, canonicalPrimaryOwner: false, ownerScopeVerified: true })).toMatchObject({ result: "DENIED_OWNER_SCOPE", createsAuthority: false });
    expect(assessEvent({ ...privateEvent, canonicalPrimaryOwner: true, ownerScopeVerified: true, characterOrAlias: "NOVA" } as typeof privateEvent & { characterOrAlias: string }).result).toBe("DEFERRED_MISSING_EVIDENCE");
  });
  it("enforces detailed Journey owner scope regardless of privacy classification", () => {
    expect(assessEvent({ ...validEvent, detailedProjectJourney: true, canonicalPrimaryOwner: true, ownerScopeVerified: true }).result).toBe("DEFERRED_MISSING_EVIDENCE");
    expect(assessEvent({ ...validEvent, detailedProjectJourney: true, privacyClassification: "HOUSEHOLD_SAFE_METADATA", canonicalPrimaryOwner: false, ownerScopeVerified: true })).toMatchObject({ result: "DENIED_OWNER_SCOPE", ownerOnly: true, createsAuthority: false });
    expect(assessEvent({ ...validEvent, detailedProjectJourney: true, privacyClassification: "SECURITY_SENSITIVE_METADATA", canonicalPrimaryOwner: true, ownerScopeVerified: undefined }).reasonCodes).toContain("OWNER_FACTS_MISSING_OR_MALFORMED");
    expect(assessEvent({ ...validEvent, detailedProjectJourney: true, canonicalPrimaryOwner: false, ownerScopeVerified: true, characterOrAlias: "NOVA" } as typeof validEvent & { characterOrAlias: string })).toMatchObject({ result: "DENIED_OWNER_SCOPE", createsAuthority: false });
    expect(assessEvidence({ ...missingInput(), detailedProjectJourney: true, canonicalPrimaryOwner: true, ownerScopeVerified: true }).result).toBe("DEFERRED_MISSING_EVIDENCE");
    expect(assessEvidence({ ...missingInput(), detailedProjectJourney: true, canonicalPrimaryOwner: false, ownerScopeVerified: true })).toMatchObject({ result: "DENIED_OWNER_SCOPE", ownerOnly: true, createsAuthority: false });
  });
  it("covers every source precedence and compatibility rule", () => {
    for (const sourceKind of SOURCE_KINDS) expect(SOURCE_PRECEDENCE.includes(SOURCE_PRECEDENCE_BY_KIND[sourceKind])).toBe(true);
    for (const eventKind of JOURNEY_EVENT_KINDS) {
      const rule = SOURCE_COMPATIBILITY_RULES[eventKind];
      expect(rule.required.length).toBeGreaterThan(0);
      expect(rule.required.every((source) => !rule.prohibited.includes(source))).toBe(true);
      expect(rule.optionalCorroboration.every((source) => !rule.prohibited.includes(source))).toBe(true);
      expect(rule.prohibited.length + rule.required.length + rule.optionalCorroboration.length).toBe(SOURCE_KINDS.length);
      const requiredSource = rule.required[0];
      if (!requiredSource) throw new Error("compatibility rule has no required source");
      const required = evidence("required", requiredSource, eventKind);
      expect(required.compatible).toBe(true);
      expect(assessEvidence({ ...missingInput(), eventKind, evidence: [required] }).result).not.toBe("DENIED_UNSUPPORTED_SOURCE");
      for (const prohibited of rule.prohibited) expect(assessEvidence({ ...missingInput(), eventKind, evidence: [evidence("prohibited", prohibited, eventKind)] }).result).toBe("DENIED_UNSUPPORTED_SOURCE");
    }
  });
  it("provides authored labels for every B4-2 presentation vocabulary", () => {
    expectLabels(JOURNEY_EVENT_KINDS, JOURNEY_EVENT_KIND_LABELS); expectLabels(SIGNIFICANCE_CLASSIFICATIONS, SIGNIFICANCE_CLASSIFICATION_LABELS); expectLabels(SOURCE_KINDS, SOURCE_KIND_LABELS); expectLabels(SOURCE_PRECEDENCE, SOURCE_PRECEDENCE_LABELS); expectLabels(CAPTURE_POLICY_RESULTS, CAPTURE_POLICY_LABELS); expectLabels(IDENTITY_CLASSIFICATIONS, IDENTITY_CLASSIFICATION_LABELS); expectLabels(CONTINUITY_GAP_TYPES, CONTINUITY_GAP_LABELS_B42); expectLabels(PRIVACY_CLASSIFICATIONS, PRIVACY_CLASSIFICATION_LABELS); expectLabels(PRIVACY_DECISIONS, PRIVACY_DECISION_LABELS); expectLabels(CAPTURE_PRIORITIES, CAPTURE_PRIORITY_LABELS); expectLabels(NOISE_CLASSIFICATIONS, NOISE_CLASSIFICATION_LABELS); expectLabels(NOISE_DECISIONS, NOISE_DECISION_LABELS); expectLabels(ARTIFACT_PURPOSES, ARTIFACT_PURPOSE_LABELS); expectLabels(OPERATING_MODES_B42, OPERATING_MODE_B42_LABELS);
    expect(new Set(Object.values(JOURNEY_EVENT_KIND_LABELS).map((label) => label.explanation)).size).toBe(JOURNEY_EVENT_KINDS.length);
  });
  it("freezes legacy labels and bounds the policy freeze helper", () => {
    const semantic = FRIENDLY_LABELS.MILESTONE;
    expect(Object.isFrozen(FRIENDLY_LABELS)).toBe(true); expect(Object.isFrozen(semantic)).toBe(true); expect(Object.isFrozen(semantic.technicalInformation)).toBe(true); expect(Object.isFrozen(CONTINUITY_EVIDENCE_LABELS)).toBe(true);
    expect(() => { (FRIENDLY_LABELS as unknown as { MILESTONE: FriendlyLabel }).MILESTONE = semantic; }).toThrow();
    const cyclic: { child?: unknown } = {}; cyclic.child = cyclic; expect(() => boundedFreeze(cyclic)).not.toThrow(); expect(Object.isFrozen(cyclic)).toBe(true);
    const tooDeep: { child?: unknown } = {}; let cursor = tooDeep; for (let index = 0; index < 40; index += 1) { cursor.child = {}; cursor = cursor.child as { child?: unknown }; } expect(() => boundedFreeze(tooDeep)).toThrow();
    expect(() => boundedFreeze(Array.from({ length: 513 }, () => ({})))).toThrow();
  });
  it("validates genuine supersession and correction references", () => {
    expect(assessSupersession("prior", "next", "MATERIAL_REVISION", "provenance")).toMatchObject({ required: true, validReferences: true, validReason: true, validProvenance: true, createsAuthority: false });
    for (const invalidReference of ["", " ", "bad reference", "<bad>"]) expect(assessSupersession(invalidReference, "next", "MATERIAL_REVISION", "provenance").validReferences).toBe(false);
    for (const invalidReference of ["", " ", "bad reference", "<bad>"]) expect(assessSupersession("prior", invalidReference, "MATERIAL_REVISION", "provenance").validReferences).toBe(false);
    expect(assessSupersession("same", "same", "MATERIAL_REVISION", "provenance").validReferences).toBe(false); expect(assessSupersession("prior", "next", "", "provenance").validReason).toBe(false); expect(assessSupersession("prior", "next", "MATERIAL_REVISION", " ").validProvenance).toBe(false);
    expect(assessOwnerCorrection("prior", "next", "OWNER_CORRECTION", "provenance", true)).toMatchObject({ allowed: true, validReferences: true, validReason: true, validProvenance: true, createsAuthority: false });
    expect(assessOwnerCorrection("prior", "prior", "OWNER_CORRECTION", "provenance", true).allowed).toBe(false); expect(assessOwnerCorrection(" ", "next", "OWNER_CORRECTION", "provenance", true).allowed).toBe(false); expect(assessOwnerCorrection("prior", "next", "", "provenance", true).validReason).toBe(false); expect(assessOwnerCorrection("prior", "next", "OWNER_CORRECTION", "", true).validProvenance).toBe(false); expect(assessOwnerCorrection("prior", "next", "OWNER_CORRECTION", "provenance", false).allowed).toBe(false);
  });
  it("exposes readonly nested policy contracts at compile time", () => {
    const identity = { ...({ sourceReference: "x", exactMatch: false, replayed: false, potentialMatch: false, materiallyChanged: false, lateEvidence: false, superseding: false } as const) };
    // @ts-expect-error Identity facts are readonly public contract properties.
    identity.exactMatch = true;
    // @ts-expect-error Evidence policy arrays are readonly.
    if (false) MANDATORY_EVIDENCE_POLICY.PULL_REQUEST_MERGED.requiredSourceKinds[0] = "TEST_EVIDENCE";
    expect(identity.sourceReference).toBe("x");
  });
});