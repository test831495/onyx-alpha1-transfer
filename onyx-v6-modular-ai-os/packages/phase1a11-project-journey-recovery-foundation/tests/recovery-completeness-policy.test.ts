import { describe, expect, it } from "vitest";
import {
  MAX_BLOCKED_BY_REFERENCES,
  MAX_EVIDENCE_REFERENCES,
  MAX_PROHIBITED_CONTENT_FINDINGS,
  MAX_RECOVERY_COMPLETENESS_GAPS,
  MAX_RESTORATION_DEPENDENCIES,
  RECOVERY_COMPLETENESS_ASSESSMENT_STATE_LABELS,
  RECOVERY_COMPLETENESS_ASSESSMENT_STATES,
  RECOVERY_COMPLETENESS_GAP_REASON_LABELS,
  RECOVERY_COMPLETENESS_GAP_REASONS,
  RECOVERY_CRYPTO_MIGRATION_CLASSES,
  RECOVERY_CRYPTO_MIGRATION_CLASS_LABELS,
  RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES,
  RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASS_LABELS,
  RECOVERY_EVIDENCE_PRECEDENCE_RESULTS,
  RECOVERY_EVIDENCE_PRECEDENCE_RESULT_LABELS,
  RECOVERY_PORTABILITY_EVIDENCE_CLASSES,
  RECOVERY_PORTABILITY_EVIDENCE_CLASS_LABELS,
  RECOVERY_PROHIBITED_CONTENT_CLASSES,
  RECOVERY_PROHIBITED_CONTENT_CLASS_LABELS,
  RECOVERY_RESTORATION_STAGES,
  RECOVERY_RESTORATION_STAGE_LABELS,
  assessRecoveryCompleteness,
  validateRecoveryCompletenessAssessmentInput,
  validateRecoveryCompletenessGap,
  validateRecoveryCryptoMigrationEvidence,
  validateRecoveryDeviceLifecycleEvidence,
  validateRecoveryPortabilityEvidence,
  validateRecoveryProhibitedContentDescriptor,
  validateRecoveryRestorationDependency,
} from "../src/index";
import type {
  RecoveryCompletenessAssessmentInput,
  RecoveryCompletenessGap,
  RecoveryCryptoMigrationEvidence,
  RecoveryDeviceLifecycleEvidence,
  RecoveryPortabilityEvidence,
  RecoveryProhibitedContentDescriptor,
  RecoveryRestorationDependency,
} from "../src/model";

const gap = (overrides: Partial<RecoveryCompletenessGap> = {}): RecoveryCompletenessGap => ({
  requirementId: "req_1",
  reason: "REQUIRED_EVIDENCE_MISSING",
  evidenceReference: "evidence_1",
  createsAuthority: false,
  ...overrides,
});
const dependency = (overrides: Partial<RecoveryRestorationDependency> = {}): RecoveryRestorationDependency => ({
  stage: "HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS",
  dependsOnStage: "TRUST_ANCHORS_AND_CRYPTO_POLICY",
  unresolvedGapReason: "RESTORATION_DEPENDENCY_UNRESOLVED",
  createsAuthority: false,
  ...overrides,
});
const prohibited = (overrides: Partial<RecoveryProhibitedContentDescriptor> = {}): RecoveryProhibitedContentDescriptor => ({
  findingId: "finding_1",
  contentClass: "PASSWORDS",
  disposition: "PROHIBITED",
  evidenceReference: "evidence_1",
  createsAuthority: false,
  ...overrides,
});
const portability = (overrides: Partial<RecoveryPortabilityEvidence> = {}): RecoveryPortabilityEvidence => ({
  evidenceId: "portability_1",
  evidenceClass: "PROVIDER_EXIT_READINESS",
  presence: "PRESENT",
  policyVersion: "B4_4A2",
  providerNeutralReference: "portable_ref_1",
  createsAuthority: false,
  ...overrides,
});
const cryptoEvidence = (overrides: Partial<RecoveryCryptoMigrationEvidence> = {}): RecoveryCryptoMigrationEvidence => ({
  evidenceId: "crypto_1",
  migrationClass: "POLICY_TRANSITION",
  presence: "PRESENT",
  policyVersion: "B4_4A2",
  evidenceReference: "crypto_ref_1",
  createsAuthority: false,
  ...overrides,
});
const deviceEvidence = (overrides: Partial<RecoveryDeviceLifecycleEvidence> = {}): RecoveryDeviceLifecycleEvidence => ({
  evidenceId: "device_1",
  lifecycleClass: "DEVICE_REVOCATION",
  presence: "PRESENT",
  policyVersion: "B4_4A2",
  evidenceReference: "device_ref_1",
  createsAuthority: false,
  ...overrides,
});
const input = (overrides: Partial<RecoveryCompletenessAssessmentInput> = {}): RecoveryCompletenessAssessmentInput => ({
  gaps: [],
  restorationDependencies: [],
  prohibitedContentFindings: [],
  portabilityEvidence: [portability()],
  cryptoMigrationEvidence: [cryptoEvidence()],
  deviceLifecycleEvidence: [deviceEvidence()],
  tombstoneReferences: [],
  revocationReferences: [],
  blockedByReferences: [],
  policyVersion: "B4_4A2",
  createsAuthority: false,
  ...overrides,
});
const expectLabelCoverage = (values: readonly string[], labels: Record<string, { title: string; createsAuthority: false }>): void => {
  expect(Object.keys(labels).sort()).toEqual([...values].sort());
  for (const value of values) expect(labels[value]).toMatchObject({ title: expect.any(String), createsAuthority: false });
};

describe("B4-4A.2 recovery completeness policy", () => {
  it("covers every closed gap reason and label", () => {
    expect(RECOVERY_COMPLETENESS_GAP_REASONS).toHaveLength(15);
    for (const reason of RECOVERY_COMPLETENESS_GAP_REASONS) expect(validateRecoveryCompletenessGap(gap({ reason })).state).toBe("VALID");
    expectLabelCoverage(RECOVERY_COMPLETENESS_GAP_REASONS, RECOVERY_COMPLETENESS_GAP_REASON_LABELS as Record<string, { title: string; createsAuthority: false }>);
  });

  it("rejects unknown gap reasons", () => {
    expect(validateRecoveryCompletenessGap(gap({ reason: "UNKNOWN_REASON" as never })).state).toBe("INVALID");
  });

  it("uses exact restoration stage order", () => {
    expect(RECOVERY_RESTORATION_STAGES).toEqual([
      "TRUST_ANCHORS_AND_CRYPTO_POLICY",
      "HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS",
      "REVOCATIONS_AND_INCIDENTS",
      "ROLES_AND_CURRENT_AUTHORIZATION_POLICIES",
      "DEVICE_REGISTRY_AND_SUPPORTED_CLIENT_POLICY",
      "SESSIONS_INVALIDATED_HISTORY_ONLY",
      "APPROVAL_AND_CONSUMPTION_STATE",
      "DELETION_TOMBSTONES",
      "MEMORY_AND_SYNCHRONIZATION_METADATA",
      "CONNECTORS_OPTIONAL_RUNTIME_SERVICES_LAST",
    ]);
  });

  it("rejects unknown restoration stages", () => {
    expect(validateRecoveryRestorationDependency(dependency({ stage: "UNKNOWN_STAGE" as never })).state).toBe("INVALID");
  });

  it("covers prohibited content vocabulary and labels", () => {
    expect(RECOVERY_PROHIBITED_CONTENT_CLASSES).toHaveLength(13);
    for (const contentClass of RECOVERY_PROHIBITED_CONTENT_CLASSES) expect(validateRecoveryProhibitedContentDescriptor(prohibited({ contentClass })).state).toBe("VALID");
    expectLabelCoverage(RECOVERY_PROHIBITED_CONTENT_CLASSES, RECOVERY_PROHIBITED_CONTENT_CLASS_LABELS as Record<string, { title: string; createsAuthority: false }>);
  });

  it("rejects unknown prohibited content classes", () => {
    expect(validateRecoveryProhibitedContentDescriptor(prohibited({ contentClass: "UNKNOWN_CLASS" as never })).state).toBe("INVALID");
  });

  it("covers portability evidence classes and labels", () => {
    expect(RECOVERY_PORTABILITY_EVIDENCE_CLASSES).toHaveLength(4);
    for (const evidenceClass of RECOVERY_PORTABILITY_EVIDENCE_CLASSES) expect(validateRecoveryPortabilityEvidence(portability({ evidenceClass })).state).toBe("VALID");
    expectLabelCoverage(RECOVERY_PORTABILITY_EVIDENCE_CLASSES, RECOVERY_PORTABILITY_EVIDENCE_CLASS_LABELS as Record<string, { title: string; createsAuthority: false }>);
  });

  it("covers crypto migration classes and labels", () => {
    expect(RECOVERY_CRYPTO_MIGRATION_CLASSES).toHaveLength(4);
    for (const migrationClass of RECOVERY_CRYPTO_MIGRATION_CLASSES) expect(validateRecoveryCryptoMigrationEvidence(cryptoEvidence({ migrationClass })).state).toBe("VALID");
    expectLabelCoverage(RECOVERY_CRYPTO_MIGRATION_CLASSES, RECOVERY_CRYPTO_MIGRATION_CLASS_LABELS as Record<string, { title: string; createsAuthority: false }>);
  });

  it("covers device lifecycle classes and labels", () => {
    expect(RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES).toHaveLength(9);
    for (const lifecycleClass of RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES) expect(validateRecoveryDeviceLifecycleEvidence(deviceEvidence({ lifecycleClass })).state).toBe("VALID");
    expectLabelCoverage(RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES, RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASS_LABELS as Record<string, { title: string; createsAuthority: false }>);
  });

  it("covers assessment states and precedence labels", () => {
    expect(RECOVERY_COMPLETENESS_ASSESSMENT_STATES).toEqual([
      "COMPLETE_FOR_METADATA_SCOPE",
      "INCOMPLETE_VISIBLE_GAPS",
      "NOT_ASSESSABLE",
      "REJECTED_PROHIBITED_CONTENT",
    ]);
    expectLabelCoverage(RECOVERY_COMPLETENESS_ASSESSMENT_STATES, RECOVERY_COMPLETENESS_ASSESSMENT_STATE_LABELS as Record<string, { title: string; createsAuthority: false }>);
    expectLabelCoverage(RECOVERY_EVIDENCE_PRECEDENCE_RESULTS, RECOVERY_EVIDENCE_PRECEDENCE_RESULT_LABELS as Record<string, { title: string; createsAuthority: false }>);
  });

  it("rejects null where object is required", () => {
    expect(validateRecoveryCompletenessGap(null as never).state).toBe("INVALID");
  });

  it("rejects arrays where objects are required", () => {
    expect(validateRecoveryRestorationDependency([] as never).state).toBe("INVALID");
  });

  it("rejects Date objects where plain objects are required", () => {
    expect(validateRecoveryProhibitedContentDescriptor(new Date() as never).state).toBe("INVALID");
  });

  it("rejects class instances where plain objects are required", () => {
    class Carrier {
      public readonly findingId = "finding_1";
      public readonly contentClass = "PASSWORDS";
      public readonly disposition = "PROHIBITED";
      public readonly createsAuthority = false as const;
    }
    expect(validateRecoveryProhibitedContentDescriptor(new Carrier() as never).state).toBe("INVALID");
  });

  it("rejects inherited-property objects", () => {
    const inherited = Object.create({ requirementId: "req_1" });
    Object.assign(inherited, { reason: "REQUIRED_EVIDENCE_MISSING", createsAuthority: false });
    expect(validateRecoveryCompletenessGap(inherited as RecoveryCompletenessGap).state).toBe("INVALID");
  });

  it("rejects symbol-key objects", () => {
    const value = gap();
    Object.defineProperty(value, Symbol("payload"), { enumerable: true, value: "x" });
    expect(validateRecoveryCompletenessGap(value).state).toBe("INVALID");
  });

  it("rejects unknown own keys", () => {
    expect(validateRecoveryPortabilityEvidence({ ...portability(), unknownKey: "x" } as RecoveryPortabilityEvidence).state).toBe("INVALID");
  });

  it("rejects missing required keys", () => {
    expect(validateRecoveryCryptoMigrationEvidence({ ...cryptoEvidence(), evidenceReference: "" }).state).toBe("INVALID");
  });

  it("rejects createsAuthority true", () => {
    expect(validateRecoveryDeviceLifecycleEvidence({ ...deviceEvidence(), createsAuthority: true } as never).state).toBe("INVALID");
  });

  it("rejects malformed nested objects in assessment input", () => {
    expect(validateRecoveryCompletenessAssessmentInput(input({ gaps: [gap({ evidenceReference: "bad ref" })] })).state).toBe("INVALID");
  });

  it("rejects symbol-bearing assessment arrays without mutating caller input", () => {
    const fields = [
      "gaps",
      "restorationDependencies",
      "prohibitedContentFindings",
      "portabilityEvidence",
      "cryptoMigrationEvidence",
      "deviceLifecycleEvidence",
      "tombstoneReferences",
      "revocationReferences",
      "blockedByReferences",
    ] as const;

    expect(validateRecoveryCompletenessAssessmentInput(input()).state).toBe("VALID");
    for (const field of fields) {
      const candidate = input();
      const collection = candidate[field] as unknown[];
      const symbol = Symbol(field);
      Object.defineProperty(collection, symbol, { enumerable: true, value: "synthetic" });
      const before = JSON.stringify(candidate);
      const first = validateRecoveryCompletenessAssessmentInput(candidate);
      const second = validateRecoveryCompletenessAssessmentInput(candidate);

      expect(first.state).toBe("INVALID");
      expect(first).toEqual(second);
      expect(first.createsAuthority).toBe(false);
      expect(first.value).toBeUndefined();
      expect(JSON.stringify(candidate)).toBe(before);
      expect(Object.getOwnPropertySymbols(collection)).toContain(symbol);
    }
  });

  it("accepts opaque identifiers at length 128", () => {
    const longValue = `a${"b".repeat(127)}`;
    expect(validateRecoveryCompletenessGap(gap({ requirementId: longValue, evidenceReference: longValue })).state).toBe("VALID");
  });

  it("rejects opaque identifiers at length 129", () => {
    const tooLong = `a${"b".repeat(128)}`;
    expect(validateRecoveryCompletenessGap(gap({ requirementId: tooLong })).state).toBe("INVALID");
  });

  it("rejects unsafe URL, path, query, fragment, assignment, control, and command-like references", () => {
    const invalid = [
      "https://example.test",
      "file:///tmp/private",
      "../private/path",
      "/absolute/path",
      "ref?token=value",
      "ref#fragment",
      "token=value",
      "value with spaces",
      "value\u0001control",
      "command-run",
    ];
    for (const value of invalid) {
      expect(validateRecoveryPortabilityEvidence(portability({ providerNeutralReference: value })).state).toBe("INVALID");
      expect(validateRecoveryCryptoMigrationEvidence(cryptoEvidence({ evidenceReference: value })).state).toBe("INVALID");
      expect(validateRecoveryDeviceLifecycleEvidence(deviceEvidence({ evidenceReference: value })).state).toBe("INVALID");
    }
  });

  it("accepts maximum bound collections", () => {
    const gaps = Array.from({ length: MAX_RECOVERY_COMPLETENESS_GAPS }, (_, index) => gap({ requirementId: `req_${index + 1}` }));
    const dependencies: RecoveryRestorationDependency[] = [];
    for (let stageIndex = 1; stageIndex < RECOVERY_RESTORATION_STAGES.length; stageIndex += 1) {
      for (let dependsOnIndex = 0; dependsOnIndex < stageIndex; dependsOnIndex += 1) {
        if (dependencies.length === MAX_RESTORATION_DEPENDENCIES) break;
        dependencies.push(dependency({
          stage: RECOVERY_RESTORATION_STAGES[stageIndex],
          dependsOnStage: RECOVERY_RESTORATION_STAGES[dependsOnIndex],
        }));
      }
      if (dependencies.length === MAX_RESTORATION_DEPENDENCIES) break;
    }
    expect(dependencies).toHaveLength(MAX_RESTORATION_DEPENDENCIES);
    const blockedByReferences = Array.from({ length: MAX_BLOCKED_BY_REFERENCES }, (_, index) => `blocked_${index + 1}`);
    const evidence = Array.from({ length: MAX_EVIDENCE_REFERENCES }, (_, index) => portability({ evidenceId: `portability_${index + 1}`, providerNeutralReference: `portable_ref_${index + 1}` }));
    const findings = Array.from({ length: MAX_PROHIBITED_CONTENT_FINDINGS }, (_, index) => prohibited({ findingId: `finding_${index + 1}` }));
    const candidate = input({
      gaps,
      restorationDependencies: dependencies,
      blockedByReferences,
      portabilityEvidence: evidence,
      cryptoMigrationEvidence: evidence.map((value, index) => cryptoEvidence({ evidenceId: `crypto_${index + 1}`, evidenceReference: value.providerNeutralReference })),
      deviceLifecycleEvidence: evidence.map((value, index) => deviceEvidence({ evidenceId: `device_${index + 1}`, evidenceReference: value.providerNeutralReference })),
      prohibitedContentFindings: findings,
    });
    expect(validateRecoveryCompletenessAssessmentInput(candidate).state).toBe("VALID");
  });

  it("rejects maximum plus one collection sizes", () => {
    const tooMany = Array.from({ length: MAX_RECOVERY_COMPLETENESS_GAPS + 1 }, (_, index) => gap({ requirementId: `req_${index + 1}` }));
    expect(validateRecoveryCompletenessAssessmentInput(input({ gaps: tooMany })).state).toBe("INVALID");
  });

  it("rejects duplicate IDs and references", () => {
    expect(validateRecoveryCompletenessAssessmentInput(input({
      prohibitedContentFindings: [prohibited(), prohibited()],
    })).state).toBe("INVALID");
    expect(validateRecoveryCompletenessAssessmentInput(input({
      blockedByReferences: ["blocked_1", "blocked_1"],
    })).state).toBe("INVALID");
  });

  it("rejects duplicate dependency pairs", () => {
    expect(validateRecoveryCompletenessAssessmentInput(input({
      restorationDependencies: [dependency(), dependency()],
    })).state).toBe("INVALID");
  });

  it("accepts valid backward dependencies", () => {
    expect(validateRecoveryRestorationDependency(dependency()).state).toBe("VALID");
  });

  it("rejects self dependencies", () => {
    expect(validateRecoveryRestorationDependency(dependency({ stage: "REVOCATIONS_AND_INCIDENTS", dependsOnStage: "REVOCATIONS_AND_INCIDENTS" })).state).toBe("INVALID");
  });

  it("rejects forward dependencies", () => {
    expect(validateRecoveryRestorationDependency(dependency({ stage: "TRUST_ANCHORS_AND_CRYPTO_POLICY", dependsOnStage: "HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS" })).state).toBe("INVALID");
  });

  it("rejects equal-stage dependencies", () => {
    expect(validateRecoveryRestorationDependency(dependency({ stage: "APPROVAL_AND_CONSUMPTION_STATE", dependsOnStage: "APPROVAL_AND_CONSUMPTION_STATE" })).state).toBe("INVALID");
  });

  it("rejects cyclic dependencies", () => {
    const cyclic = input({
      restorationDependencies: [
        dependency({ stage: "HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS", dependsOnStage: "TRUST_ANCHORS_AND_CRYPTO_POLICY" }),
        dependency({ stage: "TRUST_ANCHORS_AND_CRYPTO_POLICY", dependsOnStage: "HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS" }),
      ],
    });
    expect(validateRecoveryCompletenessAssessmentInput(cyclic).state).toBe("INVALID");
  });

  it("keeps connector stage last", () => {
    expect(RECOVERY_RESTORATION_STAGES[RECOVERY_RESTORATION_STAGES.length - 1]).toBe("CONNECTORS_OPTIONAL_RUNTIME_SERVICES_LAST");
  });

  it("keeps sessions stage invalidated-history-only", () => {
    expect(RECOVERY_RESTORATION_STAGES).toContain("SESSIONS_INVALIDATED_HISTORY_ONLY");
  });

  it("validates category-only prohibited descriptors", () => {
    expect(validateRecoveryProhibitedContentDescriptor(prohibited()).state).toBe("VALID");
  });

  it("rejects raw prohibited payload fields", () => {
    expect(validateRecoveryProhibitedContentDescriptor({ ...prohibited(), rawPayload: "secret" } as RecoveryProhibitedContentDescriptor).state).toBe("INVALID");
  });

  it("accepts PRESENT evidence as complete for metadata scope", () => {
    expect(assessRecoveryCompleteness(input()).state).toBe("COMPLETE_FOR_METADATA_SCOPE");
  });

  it("treats MISSING evidence as an incomplete visible gap", () => {
    expect(assessRecoveryCompleteness(input({ portabilityEvidence: [portability({ presence: "MISSING" })] })).state).toBe("INCOMPLETE_VISIBLE_GAPS");
  });

  it("treats STALE evidence as an incomplete visible gap", () => {
    expect(assessRecoveryCompleteness(input({ cryptoMigrationEvidence: [cryptoEvidence({ presence: "STALE" })] })).state).toBe("INCOMPLETE_VISIBLE_GAPS");
  });

  it("treats PROHIBITED evidence as an incomplete visible gap", () => {
    expect(assessRecoveryCompleteness(input({ deviceLifecycleEvidence: [deviceEvidence({ presence: "PROHIBITED" })] })).state).toBe("INCOMPLETE_VISIBLE_GAPS");
  });

  it("rejects unknown evidence presence values", () => {
    expect(validateRecoveryPortabilityEvidence(portability({ presence: "UNKNOWN" as never })).state).toBe("INVALID");
  });

  it("returns NO_OVERRIDE_REQUIRED with empty tombstone and revocation references", () => {
    expect(assessRecoveryCompleteness(input()).precedenceResult).toBe("NO_OVERRIDE_REQUIRED");
  });

  it("returns TOMBSTONE_PRECEDENCE_APPLIED when only tombstones are present", () => {
    expect(assessRecoveryCompleteness(input({ tombstoneReferences: ["tombstone_1"] })).precedenceResult).toBe("TOMBSTONE_PRECEDENCE_APPLIED");
  });

  it("returns REVOCATION_PRECEDENCE_APPLIED when only revocations are present", () => {
    expect(assessRecoveryCompleteness(input({ revocationReferences: ["revocation_1"] })).precedenceResult).toBe("REVOCATION_PRECEDENCE_APPLIED");
  });

  it("returns TOMBSTONE_AND_REVOCATION_PRECEDENCE_APPLIED when both are present", () => {
    expect(assessRecoveryCompleteness(input({ tombstoneReferences: ["tombstone_1"], revocationReferences: ["revocation_1"] })).precedenceResult).toBe("TOMBSTONE_AND_REVOCATION_PRECEDENCE_APPLIED");
  });

  it("does not mutate precedence inputs", () => {
    const candidate = input({ tombstoneReferences: ["tombstone_1"], revocationReferences: ["revocation_1"] });
    const before = JSON.stringify(candidate);
    assessRecoveryCompleteness(candidate);
    expect(JSON.stringify(candidate)).toBe(before);
  });

  it("keeps precedence outputs non-authorizing", () => {
    expect(assessRecoveryCompleteness(input({ tombstoneReferences: ["tombstone_1"] })).createsAuthority).toBe(false);
  });

  it("returns NOT_ASSESSABLE for not-assessable evidence", () => {
    expect(assessRecoveryCompleteness(input({ portabilityEvidence: [portability({ presence: "NOT_ASSESSABLE" })] })).state).toBe("NOT_ASSESSABLE");
  });

  it("returns REJECTED_PROHIBITED_CONTENT for prohibited findings", () => {
    expect(assessRecoveryCompleteness(input({ prohibitedContentFindings: [prohibited()] })).state).toBe("REJECTED_PROHIBITED_CONTENT");
  });

  it("gives prohibited-content state precedence over otherwise complete evidence", () => {
    expect(assessRecoveryCompleteness(input({ prohibitedContentFindings: [prohibited()] })).state).toBe("REJECTED_PROHIBITED_CONTENT");
  });

  it("returns deterministic deep-equal outputs for repeated identical input", () => {
    const candidate = input({ blockedByReferences: ["blocked_1"] });
    const first = assessRecoveryCompleteness(candidate);
    const second = assessRecoveryCompleteness(candidate);
    expect(second).toEqual(first);
  });

  it("keeps caller inputs unchanged and unfrozen", () => {
    const candidate = input({ gaps: [gap()] });
    const before = JSON.stringify(candidate);
    const output = assessRecoveryCompleteness(candidate);
    expect(JSON.stringify(candidate)).toBe(before);
    expect(Object.isFrozen(candidate)).toBe(false);
    expect(Object.isFrozen(candidate.gaps)).toBe(false);
    expect(Object.isFrozen(output)).toBe(true);
  });

  it("freezes returned values and nested arrays", () => {
    const output = assessRecoveryCompleteness(input({ gaps: [gap()], blockedByReferences: ["blocked_1"] }));
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.gaps)).toBe(true);
    expect(Object.isFrozen(output.blockedByReferences)).toBe(true);
  });

  it("returns copied output references", () => {
    const candidate = input({ gaps: [gap()] });
    const output = assessRecoveryCompleteness(candidate);
    expect(output.gaps).not.toBe(candidate.gaps);
    expect(output.blockedByReferences).not.toBe(candidate.blockedByReferences);
  });

  it("does not expose runtime operations through assessment outputs", () => {
    const output = assessRecoveryCompleteness(input());
    expect("execute" in (output as unknown as Record<string, unknown>)).toBe(false);
    expect("restore" in (output as unknown as Record<string, unknown>)).toBe(false);
    expect("deploy" in (output as unknown as Record<string, unknown>)).toBe(false);
  });

  it("marks all validator results as non-authorizing", () => {
    const results = [
      validateRecoveryCompletenessGap(gap()),
      validateRecoveryRestorationDependency(dependency()),
      validateRecoveryProhibitedContentDescriptor(prohibited()),
      validateRecoveryPortabilityEvidence(portability()),
      validateRecoveryCryptoMigrationEvidence(cryptoEvidence()),
      validateRecoveryDeviceLifecycleEvidence(deviceEvidence()),
      validateRecoveryCompletenessAssessmentInput(input()),
    ];
    for (const validated of results) expect(validated.createsAuthority).toBe(false);
  });

  it("validates exact exported bounds", () => {
    expect(MAX_RECOVERY_COMPLETENESS_GAPS).toBe(32);
    expect(MAX_RESTORATION_DEPENDENCIES).toBe(32);
    expect(MAX_EVIDENCE_REFERENCES).toBe(64);
    expect(MAX_BLOCKED_BY_REFERENCES).toBe(64);
    expect(MAX_PROHIBITED_CONTENT_FINDINGS).toBe(32);
  });
});
