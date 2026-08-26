import { describe, expect, it } from "vitest";
import {
  RECOVERY_ARTIFACT_CLASSES, RECOVERY_ARTIFACT_LABELS, RECOVERY_EVIDENCE_PRESENCE_LABELS, RECOVERY_EVIDENCE_PRESENCE_STATES,
  RECOVERY_EVIDENCE_REQUIREMENTS, RECOVERY_EVIDENCE_REQUIREMENT_LABELS, RECOVERY_METADATA_KIND_LABELS, RECOVERY_METADATA_KINDS,
  RECOVERY_METADATA_LABELS, RECOVERY_METADATA_VALIDATION_LABELS, validateRecoveryArtifactReference, validateRecoveryEvidenceReference,
  validateRecoveryMetadataDescriptor, validateRecoveryValidationDescriptor,
} from "../src/index";

const base = { sensitivity: "PUBLIC_PROJECT_METADATA" as const, createsAuthority: false as const };
const descriptor = (extra: Record<string, unknown> = {}) => ({ metadataId: "m-1", metadataKind: "RECOVERY_DESCRIPTOR" as const, classification: "safe", policyVersion: "B4-4A.1", ...base, ...extra });
const artifact = (extra: Record<string, unknown> = {}) => ({ referenceId: "recovery-ref-001", artifactClass: "JOURNEY_RECORD_SET" as const, providerNeutralReference: "recovery-ref-001", ...base, ...extra });
const evidence = (extra: Record<string, unknown> = {}) => ({ evidenceId: "e-1", evidenceType: "TEST", provenanceReference: "p-1", presence: "PRESENT" as const, policyVersion: "B4-4A.1", ...base, ...extra });
const validation = (expectations: any[] = [{ evidenceType: "OWNER_RECORD", requirement: "REQUIRED" }], extra: Record<string, unknown> = {}) => ({ descriptorId: "v-1", purpose: "metadata review", evidenceExpectations: expectations, missingEvidenceOutcome: "visible gap", policyVersion: "B4-4A.1", createsAuthority: false as const, ...extra });
describe("B4-4A.1 recovery metadata", () => {
  it("exposes closed vocabularies and exhaustive frozen labels", () => {
    expect(RECOVERY_METADATA_KINDS).toHaveLength(4);
    expect(RECOVERY_ARTIFACT_CLASSES).toHaveLength(8);
    expect(RECOVERY_EVIDENCE_PRESENCE_STATES).toHaveLength(6);
    expect(RECOVERY_EVIDENCE_REQUIREMENTS).toEqual(["REQUIRED", "OPTIONAL", "PROHIBITED"]);
    for (const map of [RECOVERY_METADATA_KIND_LABELS, RECOVERY_ARTIFACT_LABELS, RECOVERY_EVIDENCE_PRESENCE_LABELS, RECOVERY_EVIDENCE_REQUIREMENT_LABELS, RECOVERY_METADATA_VALIDATION_LABELS]) {
      expect(Object.isFrozen(map)).toBe(true);
      for (const entry of Object.values(map)) expect(entry.title.length).toBeGreaterThan(0);
    }
    expect(Object.isFrozen(RECOVERY_METADATA_LABELS)).toBe(true);
  });
  it("validates descriptors and rejects unknown, inherited, array, and symbol fields", () => {
    expect(validateRecoveryMetadataDescriptor(descriptor())).toMatchObject({ state: "VALID", createsAuthority: false });
    expect(validateRecoveryMetadataDescriptor(descriptor({ metadataKind: "UNKNOWN" })).state).toBe("INVALID");
    expect(validateRecoveryMetadataDescriptor(descriptor({ authValue: "x" })).state).toBe("INVALID");
    const inherited = Object.create({ metadataId: "m-1" });
    Object.assign(inherited, { metadataKind: "RECOVERY_DESCRIPTOR", classification: "safe", sensitivity: base.sensitivity, policyVersion: "v", createsAuthority: false });
    expect(validateRecoveryMetadataDescriptor(inherited)).toMatchObject({ state: "INVALID", createsAuthority: false });
    expect(validateRecoveryMetadataDescriptor([] as never).state).toBe("INVALID");
    const symbolInput = descriptor();
    Object.defineProperty(symbolInput, Symbol("payload"), { enumerable: true, value: "x" });
    expect(validateRecoveryMetadataDescriptor(symbolInput)).toMatchObject({ state: "INVALID" });
  });
  it("accepts only bounded opaque artifact references", () => {
    for (const value of ["recovery-ref-001", "policy.metadata.v1", "artifact_reference_01"]) expect(validateRecoveryArtifactReference(artifact({ providerNeutralReference: value })).state).toBe("VALID");
    for (const value of ["https://user:password@example.test/a", "https://example.test/a", "file:///tmp/recovery", "../private/data", "/absolute/path", "C:\\private\\data", "user@example.test", "ref?token=value", "ref#fragment", "ref%2Fsecret", "ref value", "ref\nvalue", "ref\u0000value", "a".repeat(129)]) {
      expect(validateRecoveryArtifactReference(artifact({ providerNeutralReference: value })).state).toBe("INVALID");
    }
    expect(validateRecoveryArtifactReference(artifact({ credentialBlob: "x" })).state).toBe("INVALID");
  });
  it("rejects unsafe opaque identifiers and references in every contract", () => {
    const unsafe = ["https://example.test", "https://user:password@example.test/a", "file:///tmp/private", "../private/path", "/absolute/path", "ref?token=value", "ref#fragment", "ref%2Fsecret", "token=value", "value with spaces", "value\u0001control", "a".repeat(129)];
    const cases: Array<[string, (value: string) => unknown]> = [
      ["metadataId", (value) => validateRecoveryMetadataDescriptor(descriptor({ metadataId: value }))],
      ["classification", (value) => validateRecoveryMetadataDescriptor(descriptor({ classification: value }))],
      ["policyVersion", (value) => validateRecoveryMetadataDescriptor(descriptor({ policyVersion: value }))],
      ["sourceReference", (value) => validateRecoveryMetadataDescriptor(descriptor({ sourceReference: value }))],
      ["referenceId", (value) => validateRecoveryArtifactReference(artifact({ referenceId: value }))],
      ["providerNeutralReference", (value) => validateRecoveryArtifactReference(artifact({ providerNeutralReference: value }))],
      ["evidenceId", (value) => validateRecoveryEvidenceReference(evidence({ evidenceId: value }))],
      ["evidenceType", (value) => validateRecoveryEvidenceReference(evidence({ evidenceType: value }))],
      ["provenanceReference", (value) => validateRecoveryEvidenceReference(evidence({ provenanceReference: value }))],
      ["evidence policyVersion", (value) => validateRecoveryEvidenceReference(evidence({ policyVersion: value }))],
      ["descriptorId", (value) => validateRecoveryValidationDescriptor(validation(undefined, { descriptorId: value }))],
      ["expectation evidenceType", (value) => validateRecoveryValidationDescriptor(validation([{ evidenceType: value, requirement: "REQUIRED" }]))],
      ["validation policyVersion", (value) => validateRecoveryValidationDescriptor(validation(undefined, { policyVersion: value }))],
    ];
    for (const [field, validate] of cases) for (const value of unsafe) expect(validate(value), `${field}: ${JSON.stringify(value)}`).toMatchObject({ state: "INVALID" });
  });
  it("accepts bounded descriptions and rejects unsafe description forms", () => {
    for (const value of ["recovery evidence is incomplete", "required evidence is missing", "validation remains not assessable", "recovery status is missing", "metadata mode remains active"]) {
      expect(validateRecoveryValidationDescriptor(validation(undefined, { purpose: value, missingEvidenceOutcome: value })).state).toBe("VALID");
    }
    for (const value of ["https://example.test", "https://user:password@example.test/a", "file:///tmp/private", "urn:recovery:metadata", "custom-scheme:value", "mailto:user@example.test", "data:text/plain,value", "../private/path", "/absolute/path", "ref?token=value", "ref#fragment", "ref%2Fsecret", "password=secret", "status=missing", "key=value", "mode = active", "payload={value}", "{\"payload\":true}", "<payload>", "command --restore", "restore from backup", "value\u0001control", " leading", "trailing ", "a".repeat(257)]) {
      expect(validateRecoveryValidationDescriptor(validation(undefined, { purpose: value })).state, `purpose: ${JSON.stringify(value)}`).toBe("INVALID");
      expect(validateRecoveryValidationDescriptor(validation(undefined, { missingEvidenceOutcome: value })).state, `missingEvidenceOutcome: ${JSON.stringify(value)}`).toBe("INVALID");
    }
    expect(validateRecoveryValidationDescriptor(validation(undefined, { purpose: "a".repeat(256), missingEvidenceOutcome: "a".repeat(256) })).state).toBe("VALID");
  });
  it("preserves every closed evidence presence state and rejects unknown fields", () => {
    for (const presence of RECOVERY_EVIDENCE_PRESENCE_STATES) expect(validateRecoveryEvidenceReference(evidence({ presence })).state).toBe("VALID");
    expect(validateRecoveryEvidenceReference(evidence({ presence: "UNKNOWN" })).state).toBe("INVALID");
    expect(validateRecoveryEvidenceReference(evidence({ payloadData: "x" })).state).toBe("INVALID");
  });
  it("keeps required, optional, and prohibited expectations distinct", () => {
    const expectations = RECOVERY_EVIDENCE_REQUIREMENTS.map((requirement) => ({ evidenceType: `${requirement}_EVIDENCE`, requirement }));
    const result = validateRecoveryValidationDescriptor(validation(expectations));
    expect(result).toMatchObject({ state: "VALID", createsAuthority: false });
    expect((result.value as any).evidenceExpectations.map((item: any) => item.requirement)).toEqual(["REQUIRED", "OPTIONAL", "PROHIBITED"]);
    expect(validateRecoveryValidationDescriptor(validation([{ evidenceType: "A", requirement: "UNKNOWN" }])).state).toBe("INVALID");
    expect(validateRecoveryValidationDescriptor(validation([{ evidenceType: "A", requirement: "REQUIRED", downgraded: true }])).state).toBe("INVALID");
  });
  it("returns frozen copied data and does not mutate or freeze caller input", () => {
    const expectations = [{ evidenceType: "OWNER_RECORD", requirement: "REQUIRED" as const }];
    const input = validation(expectations);
    const result = validateRecoveryValidationDescriptor(input) as any;
    expect(result.value).toMatchObject({ descriptorId: "v-1", purpose: "metadata review", policyVersion: "B4-4A.1", missingEvidenceOutcome: "visible gap" });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.value)).toBe(true);
    expect(Object.isFrozen(result.value.evidenceExpectations)).toBe(true);
    expect(Object.isFrozen(result.value.evidenceExpectations[0])).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
    expect(Object.isFrozen(expectations)).toBe(false);
    expect(Object.isFrozen(expectations[0])).toBe(false);
    expectations[0]!.evidenceType = "CHANGED";
    expect(result.value.evidenceExpectations[0].evidenceType).toBe("OWNER_RECORD");
    expect(validateRecoveryMetadataDescriptor(descriptor()).value).not.toBe(descriptor());
    expect(validateRecoveryArtifactReference(artifact()).value).toMatchObject({ providerNeutralReference: "recovery-ref-001" });
    expect(validateRecoveryEvidenceReference(evidence({ presence: "MISSING" })).value).toMatchObject({ presence: "MISSING" });
  });
  it("rejects unknown nested and malformed validation data", () => {
    expect(validateRecoveryValidationDescriptor(validation([{ evidenceType: "A", requirement: "REQUIRED", secretValue2: "x" }])).state).toBe("INVALID");
    expect(validateRecoveryValidationDescriptor(validation(undefined, { evidenceExpectations: [] })).state).toBe("VALID");
    expect(validateRecoveryValidationDescriptor(validation(undefined, { evidenceExpectations: {} })).state).toBe("INVALID");
  });
  it("keeps all results non-authorizing", () => {
    const results = [validateRecoveryMetadataDescriptor(descriptor()), validateRecoveryArtifactReference(artifact()), validateRecoveryEvidenceReference(evidence()), validateRecoveryValidationDescriptor(validation()), validateRecoveryArtifactReference(artifact({ providerNeutralReference: "bad/ref" }))];
    for (const result of results) expect(result.createsAuthority).toBe(false);
  });
});