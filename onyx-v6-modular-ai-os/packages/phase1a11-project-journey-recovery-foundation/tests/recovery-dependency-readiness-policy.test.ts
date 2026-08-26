import { describe, expect, it } from "vitest";
import {
  RECOVERY_DEPENDENCY_ARTIFACT_STAGE_BY_CLASS, RECOVERY_DEPENDENCY_ARTIFACT_EVIDENCE_STATUSES,
  RECOVERY_DEPENDENCY_READINESS_STATES, validateRecoveryDependencyReadinessInput,
  assessRecoveryDependencyReadiness, projectRecoveryArtifactsInRestorationOrder,
  MAX_RECOVERY_ARTIFACT_DECLARATIONS, MAX_RECOVERY_ARTIFACT_PREREQUISITES,
  MAX_PREREQUISITES_PER_RECOVERY_ARTIFACT, MAX_RECOVERY_DEPENDENCY_CONTINUITY_GAPS,
} from "../src/index";
import type { RecoveryDependencyArtifactClass, RecoveryDependencyArtifactDeclaration, RecoveryDependencyArtifactPeerRequirement, RecoveryDependencyArtifactPrerequisite, RecoveryDependencyReadinessInput } from "../src/recovery-dependency-readiness-policy";
import { RECOVERY_DEPENDENCY_ARTIFACT_CLASSES } from "../src/recovery-dependency-readiness-policy";

const declaration = (artifactClass: RecoveryDependencyArtifactClass, evidenceStatus: RecoveryDependencyArtifactDeclaration["evidenceStatus"] = "VERIFIED"): RecoveryDependencyArtifactDeclaration => ({ artifactClass, stage: RECOVERY_DEPENDENCY_ARTIFACT_STAGE_BY_CLASS[artifactClass], evidenceStatus, evidenceReferences: [`e-${artifactClass}`], createsAuthority: false });
const base = (overrides: Partial<RecoveryDependencyReadinessInput> = {}): RecoveryDependencyReadinessInput => ({ artifactDeclarations: RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.map((item) => declaration(item)), prerequisites: [], peerRequirements: [], policyVersion: "policy-1", prohibitedReactivation: false, createsAuthority: false, ...overrides });
const relation = (artifactClass: RecoveryDependencyArtifactClass, prerequisiteClass: RecoveryDependencyArtifactClass): RecoveryDependencyArtifactPrerequisite => ({ artifactClass, prerequisiteClass, createsAuthority: false });
const peer = (artifactClass: RecoveryDependencyArtifactClass, peerArtifactClass: RecoveryDependencyArtifactClass, evidenceStatus: RecoveryDependencyArtifactPeerRequirement["evidenceStatus"] = "VERIFIED"): RecoveryDependencyArtifactPeerRequirement => ({ artifactClass, peerArtifactClass, evidenceStatus, evidenceReferences: [`peer-${artifactClass}`], createsAuthority: false });
const crossStageRelations = [
  "HOUSEHOLD_IDENTITY_METADATA|TRUST_ANCHOR_METADATA", "HOUSEHOLD_IDENTITY_METADATA|CRYPTOGRAPHIC_POLICY_METADATA",
  "REVOCATION_METADATA|HOUSEHOLD_IDENTITY_METADATA", "INCIDENT_METADATA|HOUSEHOLD_IDENTITY_METADATA",
  "ROLE_METADATA|HOUSEHOLD_IDENTITY_METADATA", "ROLE_METADATA|HOUSEHOLD_MEMBERSHIP_METADATA", "ROLE_METADATA|REVOCATION_METADATA", "ROLE_METADATA|INCIDENT_METADATA",
  "AUTHORIZATION_POLICY_METADATA|HOUSEHOLD_IDENTITY_METADATA", "AUTHORIZATION_POLICY_METADATA|HOUSEHOLD_MEMBERSHIP_METADATA", "AUTHORIZATION_POLICY_METADATA|REVOCATION_METADATA", "AUTHORIZATION_POLICY_METADATA|INCIDENT_METADATA",
  "DEVICE_REGISTRY_METADATA|AUTHORIZATION_POLICY_METADATA", "DEVICE_REGISTRY_METADATA|REVOCATION_METADATA", "DEVICE_REGISTRY_METADATA|INCIDENT_METADATA",
  "SUPPORTED_CLIENT_POLICY_METADATA|AUTHORIZATION_POLICY_METADATA", "SUPPORTED_CLIENT_POLICY_METADATA|REVOCATION_METADATA",
  "INVALIDATED_SESSION_HISTORY|HOUSEHOLD_IDENTITY_METADATA", "INVALIDATED_SESSION_HISTORY|AUTHORIZATION_POLICY_METADATA", "INVALIDATED_SESSION_HISTORY|DEVICE_REGISTRY_METADATA", "INVALIDATED_SESSION_HISTORY|REVOCATION_METADATA",
  "APPROVAL_CONSUMPTION_STATE|HOUSEHOLD_IDENTITY_METADATA", "APPROVAL_CONSUMPTION_STATE|AUTHORIZATION_POLICY_METADATA", "APPROVAL_CONSUMPTION_STATE|REVOCATION_METADATA", "APPROVAL_CONSUMPTION_STATE|INVALIDATED_SESSION_HISTORY",
  "DELETION_TOMBSTONE_METADATA|HOUSEHOLD_IDENTITY_METADATA", "DELETION_TOMBSTONE_METADATA|AUTHORIZATION_POLICY_METADATA", "DELETION_TOMBSTONE_METADATA|REVOCATION_METADATA",
  "MEMORY_METADATA|HOUSEHOLD_IDENTITY_METADATA", "MEMORY_METADATA|AUTHORIZATION_POLICY_METADATA", "MEMORY_METADATA|DEVICE_REGISTRY_METADATA", "MEMORY_METADATA|REVOCATION_METADATA", "MEMORY_METADATA|DELETION_TOMBSTONE_METADATA",
  "SYNCHRONIZATION_METADATA|DEVICE_REGISTRY_METADATA", "SYNCHRONIZATION_METADATA|REVOCATION_METADATA", "SYNCHRONIZATION_METADATA|DELETION_TOMBSTONE_METADATA",
  "CONNECTOR_METADATA|HOUSEHOLD_IDENTITY_METADATA", "CONNECTOR_METADATA|AUTHORIZATION_POLICY_METADATA", "CONNECTOR_METADATA|DEVICE_REGISTRY_METADATA", "CONNECTOR_METADATA|REVOCATION_METADATA", "CONNECTOR_METADATA|DELETION_TOMBSTONE_METADATA",
  "OPTIONAL_RUNTIME_SERVICE_METADATA|AUTHORIZATION_POLICY_METADATA", "OPTIONAL_RUNTIME_SERVICE_METADATA|DEVICE_REGISTRY_METADATA", "OPTIONAL_RUNTIME_SERVICE_METADATA|REVOCATION_METADATA", "OPTIONAL_RUNTIME_SERVICE_METADATA|DELETION_TOMBSTONE_METADATA",
] as const;
const allCrossStagePrerequisites = (): RecoveryDependencyArtifactPrerequisite[] => crossStageRelations.map((value) => { const [artifactClass, prerequisiteClass] = value.split("|") as [RecoveryDependencyArtifactClass, RecoveryDependencyArtifactClass]; return relation(artifactClass, prerequisiteClass); });
const missingPeers = (): RecoveryDependencyArtifactPeerRequirement[] => [peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA", "MISSING"), peer("HOUSEHOLD_MEMBERSHIP_METADATA", "HOUSEHOLD_IDENTITY_METADATA", "MISSING"), peer("AUTHORIZATION_POLICY_METADATA", "ROLE_METADATA", "MISSING"), peer("SUPPORTED_CLIENT_POLICY_METADATA", "DEVICE_REGISTRY_METADATA", "MISSING"), peer("SYNCHRONIZATION_METADATA", "MEMORY_METADATA", "MISSING"), peer("OPTIONAL_RUNTIME_SERVICE_METADATA", "CONNECTOR_METADATA", "MISSING")];
const invalid = (input: unknown): void => expect(validateRecoveryDependencyReadinessInput(input as RecoveryDependencyReadinessInput).valid).toBe(false);

 describe("B4-4A.3 recovery dependency readiness", () => {
  it("has the exact closed artifact vocabulary and order", () => expect(RECOVERY_DEPENDENCY_ARTIFACT_CLASSES).toEqual(["TRUST_ANCHOR_METADATA", "CRYPTOGRAPHIC_POLICY_METADATA", "HOUSEHOLD_IDENTITY_METADATA", "HOUSEHOLD_MEMBERSHIP_METADATA", "REVOCATION_METADATA", "INCIDENT_METADATA", "ROLE_METADATA", "AUTHORIZATION_POLICY_METADATA", "DEVICE_REGISTRY_METADATA", "SUPPORTED_CLIENT_POLICY_METADATA", "INVALIDATED_SESSION_HISTORY", "APPROVAL_CONSUMPTION_STATE", "DELETION_TOMBSTONE_METADATA", "MEMORY_METADATA", "SYNCHRONIZATION_METADATA", "CONNECTOR_METADATA", "OPTIONAL_RUNTIME_SERVICE_METADATA"]));
  it("has the exact readiness and evidence vocabularies", () => { expect(RECOVERY_DEPENDENCY_READINESS_STATES).toHaveLength(6); expect(RECOVERY_DEPENDENCY_ARTIFACT_EVIDENCE_STATUSES).toEqual(["VERIFIED", "MISSING", "CONFLICTING", "UNVERIFIED"]); });
  it("maps every class to exactly one accepted stage", () => expect(RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.every((item) => RECOVERY_DEPENDENCY_ARTIFACT_STAGE_BY_CLASS[item])).toBe(true));
  it("accepts the complete verified envelope", () => expect(assessRecoveryDependencyReadiness(base()).state).toBe("READY_FOR_METADATA_REVIEW"));
  it("is deterministic", () => expect(assessRecoveryDependencyReadiness(base())).toEqual(assessRecoveryDependencyReadiness(base())));
  it("projects stable restoration order", () => expect(projectRecoveryArtifactsInRestorationOrder(base())).toEqual(RECOVERY_DEPENDENCY_ARTIFACT_CLASSES));
  it("does not mutate input", () => { const input = base(); const before = JSON.stringify(input); assessRecoveryDependencyReadiness(input); expect(JSON.stringify(input)).toBe(before); });
  it("freezes output and nested arrays", () => { const result = assessRecoveryDependencyReadiness(base()); expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.gaps)).toBe(true); expect(Object.isFrozen(result.restorationOrder)).toBe(true); });
  it("always reports non-authority metadata", () => expect(assessRecoveryDependencyReadiness(base()).createsAuthority).toBe(false));
  it("accepts the 17 unique declarations, the effective semantic maximum", () => expect(validateRecoveryDependencyReadinessInput(base()).valid).toBe(true));
  it("rejects duplicate declarations within the defensive ceiling", () => { const declarations = RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.map((item) => declaration(item)); while (declarations.length < MAX_RECOVERY_ARTIFACT_DECLARATIONS) declarations.push(declaration(RECOVERY_DEPENDENCY_ARTIFACT_CLASSES[0])); const result = validateRecoveryDependencyReadinessInput(base({ artifactDeclarations: declarations })); expect(result.valid).toBe(false); expect(result.reasons).toContain("artifactDeclarations contain duplicates"); });
  it("rejects the 33rd declaration for the structural ceiling", () => { const declarations = RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.map((item) => declaration(item)); while (declarations.length < MAX_RECOVERY_ARTIFACT_DECLARATIONS + 1) declarations.push(declaration(RECOVERY_DEPENDENCY_ARTIFACT_CLASSES[0])); const result = validateRecoveryDependencyReadinessInput(base({ artifactDeclarations: declarations })); expect(result.valid).toBe(false); expect(result.reasons).toContain("artifactDeclarations exceed maximum bound"); });
  it("accepts valid opaque references at length 128", () => expect(validateRecoveryDependencyReadinessInput(base({ artifactDeclarations: [ { ...declaration("TRUST_ANCHOR_METADATA"), evidenceReferences: ["a".repeat(128)] }, ...RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.slice(1).map((item) => declaration(item)) ] })).valid).toBe(true));

  it.each([
    ["unknown artifact", { artifactClass: "UNKNOWN" }], ["unknown stage", { stage: "UNKNOWN" }], ["conflicting mapping", { stage: "DELETION_TOMBSTONES" }],
    ["symbol field", { [Symbol("x")]: true }], ["extra field", { extra: true }],
  ])("rejects %s declarations", (_name, change) => { const declarations = [...base().artifactDeclarations]; declarations[0] = { ...declarations[0], ...change } as RecoveryDependencyArtifactDeclaration; invalid(base({ artifactDeclarations: declarations })); });
  it.each([
    ["duplicate artifact", [declaration("TRUST_ANCHOR_METADATA"), declaration("TRUST_ANCHOR_METADATA")]],
    ["sparse declarations", Object.assign(new Array(17), { 0: declaration("TRUST_ANCHOR_METADATA") })],
  ])("rejects %s", (_name, declarations) => invalid(base({ artifactDeclarations: declarations as RecoveryDependencyArtifactDeclaration[] })));
  it("rejects a wrong prototype declaration", () => { const value = Object.create({}); Object.assign(value, declaration("TRUST_ANCHOR_METADATA")); invalid(base({ artifactDeclarations: [value, ...RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.slice(1).map((item) => declaration(item))] })); });
  it.each([
    ["self prerequisite", relation("HOUSEHOLD_IDENTITY_METADATA", "HOUSEHOLD_IDENTITY_METADATA")],
    ["same-stage prerequisite", relation("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA")],
    ["forward prerequisite", relation("TRUST_ANCHOR_METADATA", "HOUSEHOLD_IDENTITY_METADATA")],
    ["unknown prerequisite", { artifactClass: "TRUST_ANCHOR_METADATA", prerequisiteClass: "UNKNOWN", createsAuthority: false }],
    ["duplicate prerequisite", relation("HOUSEHOLD_IDENTITY_METADATA", "TRUST_ANCHOR_METADATA")],
  ])("rejects %s relations", (name, item) => { const prerequisites = name === "duplicate prerequisite" ? [item as RecoveryDependencyArtifactPrerequisite, item as RecoveryDependencyArtifactPrerequisite] : [item as RecoveryDependencyArtifactPrerequisite]; invalid(base({ prerequisites })); });
  it("rejects a cyclic multi-node relation", () => invalid(base({ prerequisites: [relation("HOUSEHOLD_IDENTITY_METADATA", "TRUST_ANCHOR_METADATA"), relation("TRUST_ANCHOR_METADATA", "HOUSEHOLD_IDENTITY_METADATA")] })));
  it("rejects extra and symbol-owned array properties", () => { const values = [relation("HOUSEHOLD_IDENTITY_METADATA", "TRUST_ANCHOR_METADATA")] as RecoveryDependencyArtifactPrerequisite[]; Object.defineProperty(values, "extra", { value: true }); invalid(base({ prerequisites: values })); });
  it("rejects more than the prerequisite bound", () => invalid(base({ prerequisites: Array.from({ length: MAX_RECOVERY_ARTIFACT_PREREQUISITES + 1 }, () => relation("HOUSEHOLD_IDENTITY_METADATA", "TRUST_ANCHOR_METADATA")) })));
  it("rejects more than the per-artifact bound", () => invalid(base({ prerequisites: Array.from({ length: MAX_PREREQUISITES_PER_RECOVERY_ARTIFACT + 1 }, () => relation("ROLE_METADATA", "TRUST_ANCHOR_METADATA")) })));
  it("rejects 129-character references", () => invalid(base({ artifactDeclarations: [ { ...declaration("TRUST_ANCHOR_METADATA"), evidenceReferences: ["a".repeat(129)] }, ...RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.slice(1).map((item) => declaration(item)) ] })));
  it("rejects malformed input", () => invalid({}));
  it("rejects a non-plain input", () => invalid(new Date()));
  it("rejects a non-boolean reactivation marker", () => invalid(base({ prohibitedReactivation: "yes" as never })));
  it("rejects unknown peer relations", () => invalid(base({ peerRequirements: [peer("TRUST_ANCHOR_METADATA", "CRYPTOGRAPHIC_POLICY_METADATA")] })));
  it("rejects duplicate peer relations", () => invalid(base({ peerRequirements: [peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA"), peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA")] })));
  it("rejects self peer relations", () => invalid(base({ peerRequirements: [peer("TRUST_ANCHOR_METADATA", "TRUST_ANCHOR_METADATA")] })));
  it("rejects peer array symbol properties", () => { const values = [peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA")] as RecoveryDependencyArtifactPeerRequirement[]; Object.defineProperty(values, Symbol("x"), { value: true }); invalid(base({ peerRequirements: values })); });
  it("rejects too many peer requirements", () => invalid(base({ peerRequirements: Array.from({ length: MAX_RECOVERY_ARTIFACT_PREREQUISITES + 1 }, () => peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA")) })));

  it("shows missing artifact gaps", () => expect(assessRecoveryDependencyReadiness(base({ artifactDeclarations: base().artifactDeclarations.slice(1) })).state).toBe("BLOCKED_MISSING_PREREQUISITE"));
  it("shows missing evidence gaps", () => expect(assessRecoveryDependencyReadiness(base({ artifactDeclarations: [declaration("TRUST_ANCHOR_METADATA", "MISSING"), ...RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.slice(1).map((item) => declaration(item))] })).state).toBe("BLOCKED_MISSING_PREREQUISITE"));
  it("shows unverified evidence gaps", () => expect(assessRecoveryDependencyReadiness(base({ artifactDeclarations: [declaration("TRUST_ANCHOR_METADATA", "UNVERIFIED"), ...RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.slice(1).map((item) => declaration(item))] })).state).toBe("BLOCKED_UNVERIFIED_EVIDENCE"));
  it("shows missing peer evidence", () => expect(assessRecoveryDependencyReadiness(base({ peerRequirements: [peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA", "MISSING")] })).state).toBe("BLOCKED_MISSING_PREREQUISITE"));
  it("shows unverified peer evidence", () => expect(assessRecoveryDependencyReadiness(base({ peerRequirements: [peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA", "UNVERIFIED")] })).state).toBe("BLOCKED_UNVERIFIED_EVIDENCE"));
  it("blocks conflicting prerequisite evidence", () => expect(assessRecoveryDependencyReadiness(base({ artifactDeclarations: [declaration("TRUST_ANCHOR_METADATA", "CONFLICTING"), ...RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.slice(1).map((item) => declaration(item))] })).state).toBe("BLOCKED_CONFLICTING_PREREQUISITE"));
  it("blocks conflicting peer evidence", () => expect(assessRecoveryDependencyReadiness(base({ peerRequirements: [peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA", "CONFLICTING")] })).state).toBe("BLOCKED_CONFLICTING_PREREQUISITE"));
  it("gives prohibited reactivation precedence", () => expect(assessRecoveryDependencyReadiness(base({ prohibitedReactivation: true })).state).toBe("BLOCKED_PROHIBITED_REACTIVATION"));
  it("keeps prohibited reactivation non-authorizing", () => expect(assessRecoveryDependencyReadiness(base({ prohibitedReactivation: true })).createsAuthority).toBe(false));
  it("returns NOT_ASSESSABLE for invalid assessment", () => expect(assessRecoveryDependencyReadiness({} as RecoveryDependencyReadinessInput).state).toBe("NOT_ASSESSABLE"));
  it("preserves evidence references", () => expect(assessRecoveryDependencyReadiness(base()).evidenceReferences).toContain("e-TRUST_ANCHOR_METADATA"));
  it("keeps order independent of declaration order", () => expect(projectRecoveryArtifactsInRestorationOrder(base({ artifactDeclarations: [...base().artifactDeclarations].reverse() }))).toEqual(RECOVERY_DEPENDENCY_ARTIFACT_CLASSES));
  it("caps continuity gaps", () => expect(assessRecoveryDependencyReadiness(base({ artifactDeclarations: [] })).gaps.length).toBeLessThanOrEqual(MAX_RECOVERY_DEPENDENCY_CONTINUITY_GAPS));
  it("keeps exactly 64 produced gaps complete", () => { const result = assessRecoveryDependencyReadiness(base({ artifactDeclarations: RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.map((item) => declaration(item, "MISSING")), prerequisites: allCrossStagePrerequisites(), peerRequirements: missingPeers().slice(0, 2) })); expect(result.gaps).toHaveLength(64); expect(result.reason).toBeUndefined(); expect(result.state).toBe("BLOCKED_MISSING_PREREQUISITE"); });
  it("fails closed without exposing partial gaps on overflow", () => { const input = base({ artifactDeclarations: RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.map((item) => declaration(item, "MISSING")), prerequisites: allCrossStagePrerequisites(), peerRequirements: missingPeers() }); const before = JSON.stringify(input); const result = assessRecoveryDependencyReadiness(input); expect(result.state).toBe("NOT_ASSESSABLE"); expect(result.reason).toBe("CONTINUITY_GAPS_EXCEED_REPRESENTATION_BOUND"); expect(result.gaps).toEqual([]); expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.gaps)).toBe(true); expect(result.createsAuthority).toBe(false); expect(JSON.stringify(input)).toBe(before); });
  it("preserves higher-priority overflow states", () => { const result = assessRecoveryDependencyReadiness(base({ prohibitedReactivation: true, artifactDeclarations: RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.map((item) => declaration(item, "MISSING")), prerequisites: allCrossStagePrerequisites(), peerRequirements: missingPeers() })); expect(result.state).toBe("BLOCKED_PROHIBITED_REACTIVATION"); expect(result.reason).toBe("CONTINUITY_GAPS_EXCEED_REPRESENTATION_BOUND"); });
  it("keeps peer evidence separate from ordering", () => expect(assessRecoveryDependencyReadiness(base({ peerRequirements: [peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA")] })).restorationOrder).toEqual(RECOVERY_DEPENDENCY_ARTIFACT_CLASSES));
  it("accepts the six exact peer pairs", () => expect(validateRecoveryDependencyReadinessInput(base({ peerRequirements: [peer("CRYPTOGRAPHIC_POLICY_METADATA", "TRUST_ANCHOR_METADATA"), peer("HOUSEHOLD_MEMBERSHIP_METADATA", "HOUSEHOLD_IDENTITY_METADATA"), peer("AUTHORIZATION_POLICY_METADATA", "ROLE_METADATA"), peer("SUPPORTED_CLIENT_POLICY_METADATA", "DEVICE_REGISTRY_METADATA"), peer("SYNCHRONIZATION_METADATA", "MEMORY_METADATA"), peer("OPTIONAL_RUNTIME_SERVICE_METADATA", "CONNECTOR_METADATA")] })).valid).toBe(true));
  it("rejects unknown policy versions", () => invalid(base({ policyVersion: "restore-now" })));
  it("rejects authority-bearing declarations", () => invalid(base({ artifactDeclarations: [{ ...declaration("TRUST_ANCHOR_METADATA"), createsAuthority: true }, ...RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.slice(1).map((item) => declaration(item))] as never })));
  it("rejects authority-bearing prerequisites", () => invalid(base({ prerequisites: [{ ...relation("HOUSEHOLD_IDENTITY_METADATA", "TRUST_ANCHOR_METADATA"), createsAuthority: true }] as never })));
  it("rejects duplicate evidence references", () => invalid(base({ artifactDeclarations: [{ ...declaration("TRUST_ANCHOR_METADATA"), evidenceReferences: ["same", "same"] }, ...RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.slice(1).map((item) => declaration(item))] })));
  it("accepts verified artifact metadata with optional empty evidence references", () => { const input = base({ artifactDeclarations: [{ ...declaration("TRUST_ANCHOR_METADATA"), evidenceReferences: [] }, ...RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.slice(1).map((item) => declaration(item))] }); const before = JSON.stringify(input); const result = assessRecoveryDependencyReadiness(input); expect(validateRecoveryDependencyReadinessInput(input).valid).toBe(true); expect(result.state).toBe("READY_FOR_METADATA_REVIEW"); expect(result.evidenceReferences).toHaveLength(16); expect(result.evidenceReferences).not.toContain("e-TRUST_ANCHOR_METADATA"); expect(input.artifactDeclarations[0]?.evidenceReferences).toEqual([]); expect(JSON.stringify(input)).toBe(before); expect(result.createsAuthority).toBe(false); });
  it("accepts null-prototype plain input records", () => { const input = Object.assign(Object.create(null), base()); expect(validateRecoveryDependencyReadinessInput(input).valid).toBe(true); });
  it("returns an empty projection for malformed input", () => expect(projectRecoveryArtifactsInRestorationOrder({} as RecoveryDependencyReadinessInput)).toEqual([]));
  it("freezes evidence references", () => expect(Object.isFrozen(assessRecoveryDependencyReadiness(base()).evidenceReferences)).toBe(true));
  it("does not expose an execution target", () => expect(assessRecoveryDependencyReadiness(base()).executionTarget).toBeUndefined());
 });
