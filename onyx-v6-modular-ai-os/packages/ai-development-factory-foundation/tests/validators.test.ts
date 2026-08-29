import { describe, expect, it } from "vitest";
import {
  CONTINUITY_GAP_REASONS,
  EVIDENCE_STATUSES,
  FACTORY_CONSTITUTION,
  FACTORY_MODES,
  FACTORY_STAGES,
  READ_ONLY_COMMAND_CLASSES,
  RESTRICTIVE_TRANSITION_REASONS,
  SENSITIVE_DATA_CLASSES,
  SOURCE_ORIGINS,
  TRUST_CLASSIFICATIONS,
  assessModeTransition,
  freezeCapabilityManifest,
  freezeDecisionPackage,
  validateCapabilityManifest,
  validateCommand,
  validateConstitution,
  validateContinuityDraft,
  validateDecision,
  validateEvidence,
  validateInventory,
  validateSensitiveExclusion,
  validateSourceClassification,
  validatePromptClassification,
  validateTaskEnvelope,
  freezeContinuityGap,
  freezeTaskEnvelope,
  projectContinuityGaps,
  projectEvidenceInventory,
} from "../src/index";
import { MALFORMED_INPUT_KINDS, classifyMalformedInput, dispositionForMalformedInput, inspectRecord, inspectRecordSnapshot, validateBoundedNumber, validateBoundedString } from "../src/factory-constitution";

const baseEnvelope = {
  taskId: "task-1",
  taskType: "INSPECT",
  purpose: "inspect repository",
  requestedBy: "collaborator",
  authorizedBy: "Rahul",
  authorityClassification: "PROPOSAL_ONLY",
  repositoryId: "test831495/onyx-alpha1-transfer",
  repositoryVisibilityClassification: "PUBLIC",
  baselineCommit: "fcc6489155e93f0aea79aedfe32c6fd789f558ae",
  expectedBranch: "main",
  permittedPaths: ["packages"],
  prohibitedPaths: [".env"],
  permittedCommandClasses: [],
  prohibitedCommandClasses: ["GIT_COMMIT"],
  networkPolicy: "DENY",
  dataPolicy: "REPOSITORY_METADATA_ONLY",
  secretPolicy: "PROHIBIT",
  providerPolicy: "NONE",
  resourceBudget: { maxItems: 10 },
  modelBudget: { maxTokens: 0 },
  timeBudget: { maxMilliseconds: 1000 },
  outputClasses: ["EVIDENCE"],
  evidenceRequirements: ["baseline"],
  reviewerRequirements: ["independent"],
  expiresAt: "2026-08-28T00:00:00.000Z",
  cancellationState: "ACTIVE",
  killSwitchState: "ARMED",
  operatingMode: "READ_ONLY_INSPECTION",
  factoryStage: "F1",
  policyVersion: "1.0.0",
  schemaVersion: "1.0.0",
  provenance: "owner-request",
  continuityGapPolicy: "TYPED_GAPS",
  stopConditions: ["MUTATION"],
  mutationAllowed: false,
  createsAuthority: false,
  networkAllowed: false,
  productionSecretsAllowed: false,
  productionDataAllowed: false,
  householdPrivateDataAllowed: false,
  gitWriteAllowed: false,
  remoteWriteAllowed: false,
  runtimeActivationAllowed: false,
};

const omit = (value: Record<string, unknown>, field: string): Record<string, unknown> => {
  const copy = { ...value };
  delete copy[field];
  return copy;
};

const baseline = "fcc6489155e93f0aea79aedfe32c6fd789f558ae";
const baseManifest = {
  capabilityId: "inspect",
  capabilityType: "INSPECTION",
  owner: "Rahul",
  purpose: "inspect",
  version: "1.0.0",
  contractVersion: "1.0.0",
  stage: "F1",
  registrationState: "REGISTERED",
  activationState: "INACTIVE",
  operatingMode: "READ_ONLY_INSPECTION",
  readWrite: "READ_ONLY",
  localRemote: "LOCAL",
  networkRequirement: "DENIED",
  allowedDataClasses: ["METADATA"],
  requiredScopes: ["packages/foundation"],
  prohibitedScopes: [".env"],
  budgets: { maxItems: 1 },
  expiresAt: "2026-08-28T00:00:00.000Z",
  evidenceRequirements: ["baseline"],
  reviewerRequirements: ["independent"],
  disablePath: "disable",
  rollbackPath: "rollback",
  quarantinePath: "quarantine",
  providerClassification: "NONE",
  provenance: "fixture",
  licensingClassification: "INTERNAL",
  reversibilityClass: "REVERSIBLE",
  riskClass: "LOW",
  statusReason: "inspection",
  lastReviewedAt: "2026-08-27T00:00:00.000Z",
  evidenceFreshnessPolicy: "current",
  createsAuthority: false,
  executesActions: false,
  mutatesState: false,
};

const baseEvidence = {
  evidenceId: "e1",
  status: "OBSERVED",
  subject: "baseline",
  sourceOrigin: "REPOSITORY_SOURCE",
  sourceLocator: "repository",
  baseline,
  provenance: "fixture",
  digest: "sha256:fixture",
  validationMethod: "inspection",
  validationResult: {},
  completenessStatus: "COMPLETE",
  freshnessPolicy: "current",
  observedAt: "2026-08-27T00:00:00.000Z",
  authorityStatus: "NON_AUTHORIZING",
  reviewStatus: "UNREVIEWED",
};

const baseDecision = {
  decisionRequested: "review",
  recommendedOption: "defer",
  alternatives: ["defer"],
  benefits: "safe",
  risks: "delay",
  reversibility: "reversible",
  cost: "zero",
  evidence: ["e1"],
  consequencesOfDelay: "delay",
  exactOwnerActionRequired: "review",
  scopeImpact: "none",
  authorityImpact: "none",
  privacyImpact: "none",
  securityImpact: "none",
  recoveryImpact: "none",
  performanceImpact: "none",
  uxImpact: "none",
  providerLockInImpact: "none",
  residualRisks: ["delay"],
  reassessmentTrigger: "evidence",
  baseline,
  provenance: "fixture",
  reviewStatus: "UNREVIEWED",
  authorityStatus: "NON_AUTHORIZING",
};

describe("deterministic validators", () => {
  it("creates bounded immutable snapshots without changing inspectRecord", () => {
    const nested = { value: "nested" };
    const input = { required: "ok", nested, list: [1, { value: "array" }] };
    expect(inspectRecord(input, ["required", "nested", "list"])).toEqual({ valid: true, reasonCodes: [] });
    const inspection = inspectRecordSnapshot(input, ["required", "nested", "list"]);
    expect(inspection).toMatchObject({ valid: true, reasonCodes: [] });
    expect(Object.getPrototypeOf(inspection.snapshot!)).toBeNull();
    expect(Object.isFrozen(inspection.snapshot)).toBe(true);
    expect(Object.isFrozen(inspection.snapshot!.nested)).toBe(true);
    expect(Object.isFrozen(inspection.snapshot!.list)).toBe(true);
    nested.value = "changed";
    input.list[1] = { value: "changed" };
    expect(inspection.snapshot).toMatchObject({ nested: { value: "nested" }, list: [1, { value: "array" }] });
    expect(inspection.snapshot).not.toBe(input);
    expect(inspection.snapshot!.nested).not.toBe(nested);
  });

  it("contains hostile snapshot input in one guarded observation pass", () => {
    let prototypes = 0; let keys = 0; let descriptors = 0; let reads = 0;
    const target = { required: "ok" };
    const proxy = new Proxy(target, {
      getPrototypeOf: (value) => { prototypes += 1; return Object.getPrototypeOf(value); },
      ownKeys: (value) => { keys += 1; return Reflect.ownKeys(value); },
      getOwnPropertyDescriptor: (value, key) => { descriptors += 1; return Object.getOwnPropertyDescriptor(value, key); },
      get: () => { reads += 1; throw new Error("must-not-read"); },
    });
    expect(inspectRecordSnapshot(proxy, ["required"])).toMatchObject({ valid: true, snapshot: { required: "ok" } });
    expect(prototypes).toBe(1);
    expect(keys).toBe(1);
    expect(descriptors).toBe(1);
    expect(reads).toBe(0);
    const getter = {} as Record<string, unknown>;
    Object.defineProperty(getter, "required", { enumerable: true, get: () => { throw new Error("must-not-run"); } });
    expect(inspectRecordSnapshot(getter, ["required"])).toMatchObject({ valid: false, kind: "ACCESSOR_PROPERTY", snapshot: undefined });
    expect(inspectRecordSnapshot({ required: undefined }, ["required"])).toMatchObject({ valid: false, snapshot: undefined });
  });

  it("enforces snapshot nested bounds and hostile classifications", () => {
    const nested: Record<string, unknown> = { required: "ok" }; let cursor = nested;
    for (let index = 0; index < 17; index += 1) { cursor.child = {}; cursor = cursor.child as Record<string, unknown>; }
    expect(inspectRecordSnapshot(nested)).toMatchObject({ valid: false, snapshot: undefined });
    expect(inspectRecordSnapshot({ values: Array.from({ length: 257 }, () => 1) })).toMatchObject({ valid: false, snapshot: undefined });
    const cycle: Record<string, unknown> = { required: "ok" }; cycle.self = cycle;
    expect(inspectRecordSnapshot(cycle)).toMatchObject({ valid: false, snapshot: undefined });
    expect(inspectRecordSnapshot(Object.assign(Object.create(null), { required: "ok" }))).toMatchObject({ valid: true });
  });
  it("contains hostile reflective failures without diagnostic leakage", () => {
    expect(MALFORMED_INPUT_KINDS.filter((kind) => kind === "UNINSPECTABLE_INPUT")).toHaveLength(1);
    const failures = [
      [new Proxy({ required: "ok" }, { getPrototypeOf: () => { throw new Error("prototype-secret"); } }), "PROTOTYPE_INSPECTION_FAILED"],
      [new Proxy({ required: "ok" }, { ownKeys: () => { throw new Error("keys-secret"); } }), "KEY_ENUMERATION_FAILED"],
      [new Proxy({ required: "ok" }, { getOwnPropertyDescriptor: () => { throw new Error("descriptor-secret"); } }), "DESCRIPTOR_INSPECTION_FAILED"],
    ] as const;
    for (const [input, reasonCode] of failures) {
      const result = inspectRecord(input, ["required"]);
      expect(result).toEqual({ valid: false, kind: "UNINSPECTABLE_INPUT", reasonCodes: [reasonCode] });
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.reasonCodes)).toBe(true);
      expect(JSON.stringify(result)).not.toMatch(/prototype-secret|keys-secret|descriptor-secret|Error|stack|target-secret|value-secret/i);
    }
    const { proxy, revoke } = Proxy.revocable({ required: "ok" }, {});
    revoke();
    expect(inspectRecord(proxy)).toMatchObject({ valid: false, kind: "UNINSPECTABLE_INPUT", reasonCodes: ["OBJECT_INSPECTION_REVOKED"] });
    const invariantTarget = Object.preventExtensions({ required: "ok" });
    const invariantProxy = new Proxy(invariantTarget, { ownKeys: () => ["required", "extra"] });
    expect(inspectRecord(invariantProxy)).toMatchObject({ valid: false, kind: "UNINSPECTABLE_INPUT", reasonCodes: ["KEY_ENUMERATION_FAILED"] });
  });

  it("preserves array precedence before hostile prototype inspection", () => {
    expect(inspectRecord([], ["required"])).toEqual({ valid: false, kind: "ARRAY_INPUT", reasonCodes: ["RECORD_REQUIRED"] });
    expect(inspectRecord(new Proxy([], {}), ["required"])).toMatchObject({ kind: "ARRAY_INPUT", reasonCodes: ["RECORD_REQUIRED"] });

    let arrayPrototypeCalls = 0;
    const hostileArray = new Proxy([], {
      getPrototypeOf: () => { arrayPrototypeCalls += 1; throw new Error("array-prototype-secret"); },
    });
    const hostileArrayResult = inspectRecord(hostileArray, ["required"]);
    expect(hostileArrayResult).toEqual({ valid: false, kind: "ARRAY_INPUT", reasonCodes: ["RECORD_REQUIRED"] });
    expect(arrayPrototypeCalls).toBe(0);
    expect(JSON.stringify(hostileArrayResult)).not.toMatch(/array-prototype-secret|Error|stack/i);

    const revoked = Proxy.revocable([], {});
    revoked.revoke();
    const revokedResult = inspectRecord(revoked.proxy, ["required"]);
    expect(revokedResult).toEqual({ valid: false, kind: "UNINSPECTABLE_INPUT", reasonCodes: ["OBJECT_INSPECTION_REVOKED"] });
    expect(JSON.stringify(revokedResult)).not.toMatch(/TypeError|stack|Cannot perform/i);
  });

  it("keeps array and object hostile inspections non-mutating", () => {
    let arrayPrototypeCalls = 0;
    let objectPrototypeCalls = 0;
    let setCalls = 0;
    let deleteCalls = 0;
    let defineCalls = 0;
    let setPrototypeCalls = 0;
    const mutationTraps = {
      set: () => { setCalls += 1; return false; },
      deleteProperty: () => { deleteCalls += 1; return false; },
      defineProperty: () => { defineCalls += 1; return false; },
      setPrototypeOf: () => { setPrototypeCalls += 1; return false; },
    };
    const hostileArray = new Proxy([], {
      ...mutationTraps,
      getPrototypeOf: () => { arrayPrototypeCalls += 1; throw new Error("array-prototype-secret"); },
    });
    const hostileObject = new Proxy({ required: "ok" }, {
      ...mutationTraps,
      getPrototypeOf: () => { objectPrototypeCalls += 1; throw new Error("object-prototype-secret"); },
    });

    const arrayResult = inspectRecord(hostileArray, ["required"]);
    const objectResult = inspectRecord(hostileObject, ["required"]);

    expect(arrayResult).toEqual({ valid: false, kind: "ARRAY_INPUT", reasonCodes: ["RECORD_REQUIRED"] });
    expect(objectResult).toEqual({ valid: false, kind: "UNINSPECTABLE_INPUT", reasonCodes: ["PROTOTYPE_INSPECTION_FAILED"] });
    expect(arrayPrototypeCalls).toBe(0);
    expect(objectPrototypeCalls).toBe(1);
    expect(setCalls + deleteCalls + defineCalls + setPrototypeCalls).toBe(0);
    expect(JSON.stringify([arrayResult, objectResult])).not.toMatch(/array-prototype-secret|object-prototype-secret|Error|stack/i);
  });

  it("bounds own-key inspection and preserves precedence at the boundary", () => {
    const boundedKeys = ["required", ...Array.from({ length: 255 }, (_, index) => `field-${index}`)];
    const exactlyBounded = Object.fromEntries(boundedKeys.map((key) => [key, "ok"]));
    const overBound = { ...exactlyBounded, extra: "ok" };
    expect(inspectRecord(exactlyBounded, boundedKeys)).toEqual({ valid: true, reasonCodes: [] });
    expect(inspectRecord(overBound, boundedKeys)).toEqual({ valid: false, kind: "INVALID_VALUE", reasonCodes: ["RECORD_KEY_LIMIT_EXCEEDED"] });
    let descriptorCalls = 0;
    const overBoundProxy = new Proxy(overBound, { getOwnPropertyDescriptor: (target, key) => { descriptorCalls += 1; return Object.getOwnPropertyDescriptor(target, key); } });
    expect(inspectRecord(overBoundProxy, boundedKeys)).toMatchObject({ valid: false, kind: "INVALID_VALUE", reasonCodes: ["RECORD_KEY_LIMIT_EXCEEDED"] });
    expect(descriptorCalls).toBe(0);
    expect(inspectRecord({ required: "ok", constructor: "unsafe" }, ["required"])).toMatchObject({ kind: "DANGEROUS_KEY" });
    expect(inspectRecord(Object.create({ inherited: true }), ["required"])).toMatchObject({ kind: "UNSAFE_PROTOTYPE" });
    expect(inspectRecord(undefined, ["required"])).toMatchObject({ kind: "UNDEFINED_INPUT" });
    expect(inspectRecord(null, ["required"])).toMatchObject({ kind: "NULL_INPUT" });
    expect(inspectRecord({}, ["required"])).toMatchObject({ kind: "MISSING_FIELD" });
  });

  it("keeps hostile inspection non-mutating, non-authorizing, and deterministic", () => {
    let getterCalls = 0;
    let setCalls = 0;
    let deleteCalls = 0;
    let defineCalls = 0;
    let setPrototypeCalls = 0;
    const target = { required: "ok" };
    Object.defineProperty(target, "accessor", { enumerable: true, get: () => { getterCalls += 1; return "secret-value"; } });
    const hostile = new Proxy(target, {
      set: () => { setCalls += 1; return false; },
      deleteProperty: () => { deleteCalls += 1; return false; },
      defineProperty: () => { defineCalls += 1; return false; },
      setPrototypeOf: () => { setPrototypeCalls += 1; return false; },
    });
    const results = Array.from({ length: 3 }, () => inspectRecord(hostile, ["required"]));
    expect(results[0]).toEqual({ valid: false, kind: "ACCESSOR_PROPERTY", reasonCodes: ["ACCESSOR_NOT_ALLOWED"] });
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(getterCalls).toBe(0);
    expect(setCalls + deleteCalls + defineCalls + setPrototypeCalls).toBe(0);
    expect(target).toHaveProperty("required", "ok");
    expect(target).toHaveProperty("accessor");
    for (const owner of ["TASK_ENVELOPE", "CAPABILITY", "EVIDENCE", "CONSTITUTION"] as const) expect(dispositionForMalformedInput(owner, "UNINSPECTABLE_INPUT")).toBe(owner === "CAPABILITY" ? "QUARANTINED" : owner === "EVIDENCE" ? "NOT_ASSESSABLE" : "DENIED");
  });

  it("returns no malformed kind for a structurally valid required record", () => {
    const input = { required: "ok" };
    const before = JSON.stringify(input);
    const inspection = inspectRecord(input, ["required"]);

    expect(inspection.valid).toBe(true);
    expect(inspection.kind).toBeUndefined();
    expect(classifyMalformedInput(input)).toBeUndefined();
    expect(classifyMalformedInput(input)).toBeUndefined();
    expect(input).toEqual(JSON.parse(before));
  });

  it("classifies malformed records without invoking accessors and preserves typed absence", () => {
    const cases: [unknown, string][] = [[null, "NULL_INPUT"], [[], "ARRAY_INPUT"], [1, "PRIMITIVE_INPUT"], [{}, "MISSING_FIELD"]];
    for (const [input, kind] of cases) expect(inspectRecord(input, ["required"])).toMatchObject({ valid: false, kind });
    const accessor = {} as Record<string, unknown>;
    let getterCalled = false;
    Object.defineProperty(accessor, "required", { enumerable: true, get: () => { getterCalled = true; return "value"; } });
    expect(inspectRecord(accessor, ["required"])).toMatchObject({ valid: false, kind: "ACCESSOR_PROPERTY" });
    expect(getterCalled).toBe(false);
    expect(inspectRecord(Object.assign(Object.create(null), { required: "value" }), ["required"]).valid).toBe(true);
    expect(inspectRecord({ required: "value", constructor: "unsafe" }, ["required"])).toMatchObject({ valid: false, kind: "DANGEROUS_KEY" });
  });

  it("keeps owner dispositions and diagnostics restrictive, bounded, and non-authorizing", () => {
    for (const kind of ["NULL_INPUT", "MISSING_FIELD", "DANGEROUS_KEY", "INVALID_VALUE"] as const) {
      expect(dispositionForMalformedInput("TASK_ENVELOPE", kind)).toBe("DENIED");
      expect(dispositionForMalformedInput("CAPABILITY", kind)).toBe("QUARANTINED");
      expect(classifyMalformedInput({})).toBe("MISSING_FIELD");
    }
    const diagnostic = validateSensitiveExclusion({ excludedClass: "PASSWORDS", sourceOrigin: "SYNTHETIC_FIXTURE", subject: "sensitive-value", collectionStopped: true, reasonCode: "SENSITIVE_EVIDENCE_EXCLUDED", ingested: false, echoed: false, persisted: false, ownerVisibleEscalation: true, authorityStatus: "NON_AUTHORIZING" });
    expect(diagnostic).toMatchObject({ status: "DENIED", reasonCode: "SENSITIVE_EVIDENCE_EXCLUDED", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    expect(JSON.stringify(diagnostic)).not.toContain("sensitive-value");
  });

  it("validates bounded primitive classes with stable reasons and explicit absence", () => {
    for (const value of [null, undefined, 1n, Symbol("x"), () => true, Number.NaN, Infinity, -Infinity]) expect(validateBoundedNumber(value)).toMatchObject({ valid: false });
    expect(validateBoundedNumber(0, { minimum: 0, maximum: 1 })).toMatchObject({ valid: true, reasonCodes: [] });
    expect(validateBoundedNumber(-1, { minimum: 0, maximum: 1 }).reasonCodes).toEqual(["NUMBER_BELOW_MINIMUM"]);
    expect(validateBoundedNumber(2, { minimum: 0, maximum: 1 }).reasonCodes).toEqual(["NUMBER_ABOVE_MAXIMUM"]);
    for (const value of ["", "   ", "a\u0000", "a\u200b", "a\u202e"]) expect(validateBoundedString(value)).toMatchObject({ valid: false });
    expect(validateBoundedString("abc", { minimumLength: 3, maximumLength: 3 })).toMatchObject({ valid: true, reasonCodes: [] });
    expect(validateBoundedString("ab", { minimumLength: 3, maximumLength: 3 }).reasonCodes).toEqual(["STRING_TOO_SHORT"]);
    expect(validateBoundedString("abcd", { minimumLength: 3, maximumLength: 3 }).reasonCodes).toEqual(["STRING_TOO_LONG"]);
  });

  it("enforces the default string ceiling and deterministic combined reason precedence", () => {
    expect(validateBoundedString("x".repeat(4096)).valid).toBe(true);
    expect(validateBoundedString("x".repeat(4097)).reasonCodes).toEqual(["STRING_TOO_LONG"]);
    expect(validateBoundedString("", { minimumLength: 1 }).reasonCodes).toEqual(["STRING_EMPTY", "STRING_WHITESPACE_ONLY", "STRING_TOO_SHORT"]);
    const input = { required: "stable" };
    const snapshot = JSON.stringify(input);
    const inspection = inspectRecord(input, ["required"]);
    expect(inspection).toEqual({ valid: true, reasonCodes: [] });
    expect(input).toEqual(JSON.parse(snapshot));
    expect(Object.isFrozen(inspection)).toBe(true);
    expect(Object.isFrozen(inspection.reasonCodes)).toBe(true);
  });
  it("denies malformed, null, unknown, and authority-bearing inputs", () => {
    expect(validateConstitution(null).status).toBe("DENIED");
    expect(validateConstitution({ ...FACTORY_CONSTITUTION, createsAuthority: true }).reasonCode).toBe("CONSTITUTION_INVARIANT_FAILED");
    expect(validateTaskEnvelope({ ...baseEnvelope, networkAllowed: true }).status).toBe("DENIED");
    expect(validateTaskEnvelope({ ...baseEnvelope, unknownField: true }).status).toBe("DENIED");
  });

  it("rejects inherited enumerable fields without reading accessors", () => {
    const inherited = Object.assign(Object.create({ inheritedField: true }), baseEnvelope);
    expect(validateTaskEnvelope(inherited)).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID", createsAuthority: false });
    let getterCalled = false;
    const accessor = { ...baseEnvelope };
    Object.defineProperty(accessor, "purpose", { enumerable: true, get: () => { getterCalled = true; return "inspect repository"; } });
    expect(validateTaskEnvelope(accessor)).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID" });
    expect(getterCalled).toBe(false);
  });

  it("validates a bounded envelope and rejects path overlap and unknown stages", () => {
    expect(validateTaskEnvelope(baseEnvelope).status).toBe("VALID");
    expect(validateTaskEnvelope({ ...baseEnvelope, prohibitedPaths: ["packages/"] }).status).toBe("DENIED");
    expect(validateTaskEnvelope({ ...baseEnvelope, factoryStage: "F5" }).status).toBe("DENIED");
  });

  it("covers every required envelope field, frozen false invariant, baseline, and path bypass family", () => {
    for (const field of Object.keys(baseEnvelope)) expect(validateTaskEnvelope(omit(baseEnvelope, field)), field).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID" });
    for (const field of ["mutationAllowed", "createsAuthority", "networkAllowed", "productionSecretsAllowed", "productionDataAllowed", "householdPrivateDataAllowed", "gitWriteAllowed", "remoteWriteAllowed", "runtimeActivationAllowed"]) expect(validateTaskEnvelope({ ...baseEnvelope, [field]: true }), field).toMatchObject({ status: "DENIED", createsAuthority: false });
    for (const hash of ["Fcc6489155e93f0aea79aedfe32c6fd789f558ae", baseline.slice(0, 39), `${baseline}0`, "g".repeat(40)]) expect(validateTaskEnvelope({ ...baseEnvelope, baselineCommit: hash }), hash).toMatchObject({ status: "DENIED" });
    for (const path of ["", "/etc", "C:/etc", "//server/share", "https://x", "a\\b", "a//b", "a/./b", "a/../b", "%2e%2e/x", "a/", "a.", "a ", "a\u0000", "a\u202eb", "a\u200bb", "a∕b", "cafe\u0301"]) expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: [path] }), path || "empty").toMatchObject({ status: "DENIED" });
    expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: ["packages/a"], prohibitedPaths: ["packages-ab"] }).status).toBe("VALID");
  });

  it("rejects invalid envelope actors, policies, budgets, timestamps, and duplicate policy values", () => {
    for (const [field, value] of [["requestedBy", ""], ["authorityClassification", "OWNER"], ["repositoryVisibilityClassification", "SECRET"], ["expectedBranch", "feature branch"], ["networkPolicy", "ALLOW"], ["dataPolicy", "ALL_DATA"], ["secretPolicy", "ALLOW"], ["providerPolicy", "REMOTE"], ["continuityGapPolicy", "IGNORE"], ["cancellationState", "UNKNOWN"], ["killSwitchState", "UNKNOWN"], ["expiresAt", "2026-99-99T00:00:00.000Z"]] as [string, unknown][]) expect(validateTaskEnvelope({ ...baseEnvelope, [field]: value }), field).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID", createsAuthority: false });
  });

  it("remains valid for synthetic repository and actor identifiers when structurally coherent", () => {
    expect(validateTaskEnvelope({ ...baseEnvelope, repositoryId: "synthetic-owner/synthetic-repo" }).status).toBe("VALID");
    expect(validateTaskEnvelope({ ...baseEnvelope, repositoryId: "wrong/repository" }).status).toBe("VALID");
    expect(validateTaskEnvelope({ ...baseEnvelope, requestedBy: "synthetic-agent-1", authorizedBy: "synthetic-owner-reference" }).status).toBe("VALID");
    expect(validateTaskEnvelope({ ...baseEnvelope, authorizedBy: "collaborator" }).status).toBe("VALID");
  });

  it("rejects malformed repository identifiers regardless of specific deployment", () => {
    for (const repositoryId of ["", "   ", "a".repeat(201), "../etc/passwd", "http://example.test/repo", "owner/repo\u200b", "owner;rm -rf/repo", "owner//repo", "/owner/repo", "owner/repo/", "owner", "owner/\u202erepo"]) expect(validateTaskEnvelope({ ...baseEnvelope, repositoryId }), repositoryId || "empty").toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID" });
  });

  it("rejects malformed actor references for requestedBy and authorizedBy independent of specific identity", () => {
    for (const value of ["", "   ", "a".repeat(257), "collab orator", "collaborator\u200b", "collaborator;rm", "collaborator`x`", "collaborator$(x)", "\u202ecollaborator"]) expect(validateTaskEnvelope({ ...baseEnvelope, requestedBy: value }), value || "empty").toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID" });
    for (const value of ["", "   ", "a".repeat(257), "Rahul owner", "owner\u200b"]) expect(validateTaskEnvelope({ ...baseEnvelope, authorizedBy: value }), value || "empty").toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID" });
  });

  it("keeps authority classification closed and unaffected by actor display-name content", () => {
    expect(validateTaskEnvelope({ ...baseEnvelope, authorizedBy: "owner-claim", authorityClassification: "OWNER_AUTHORIZED" })).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID", createsAuthority: false });
    expect(validateTaskEnvelope({ ...baseEnvelope, requestedBy: "Rahul", authorizedBy: "anyone" })).toMatchObject({ status: "VALID", createsAuthority: false });
    const swapped = validateTaskEnvelope({ ...baseEnvelope, requestedBy: "synthetic-agent", authorizedBy: "synthetic-authority" });
    expect(swapped).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    expect(validateTaskEnvelope(baseEnvelope).status).toBe("VALID");
    for (const [field, value] of [["resourceBudget", { maxItems: -1 }], ["modelBudget", { maxTokens: Number.NaN }], ["timeBudget", { maxMilliseconds: Number.POSITIVE_INFINITY }], ["resourceBudget", { maxItems: 1_000_000_001 }], ["evidenceRequirements", ["baseline", "baseline"]], ["reviewerRequirements", ["independent", "independent"]], ["stopConditions", ["MUTATION", "MUTATION"]]] as [string, unknown][]) expect(validateTaskEnvelope({ ...baseEnvelope, [field]: value }), field).toMatchObject({ status: "DENIED", createsAuthority: false });
    for (const field of ["outputClasses", "evidenceRequirements", "reviewerRequirements", "stopConditions"]) expect(validateTaskEnvelope({ ...baseEnvelope, [field]: [] }), field).toMatchObject({ status: "DENIED", createsAuthority: false });
  });

  it("validates the F1 capability manifest while keeping registration, activation, mode, and stage separate", () => {
    expect(validateCapabilityManifest(baseManifest)).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    for (const field of Object.keys(baseManifest)) expect(validateCapabilityManifest(omit(baseManifest, field)), field).toMatchObject({ status: "QUARANTINED", reasonCode: "CAPABILITY_INVALID_OR_UNSAFE" });
    for (const [field, value] of [["createsAuthority", true], ["executesActions", true], ["mutatesState", true], ["readWrite", "WRITE"], ["localRemote", "REMOTE"], ["networkRequirement", "REQUIRED"], ["activationState", "ACTIVE"], ["registrationState", "UNKNOWN"], ["operatingMode", "ACTIVE"], ["stage", "F5"]] as [string, unknown][]) expect(validateCapabilityManifest({ ...baseManifest, [field]: value }), field).toMatchObject({ status: "QUARANTINED" });
    const frozen = freezeCapabilityManifest(baseManifest); expect(Object.isFrozen(frozen)).toBe(true); expect(baseManifest.budgets.maxItems).toBe(1);
  });

  it("rejects unsafe capability scopes, budgets, temporal ordering, and lifecycle paths", () => {
    for (const [field, value] of [["requiredScopes", ["packages/a", "packages/a"]], ["prohibitedScopes", [".env", ".env"]], ["budgets", { maxItems: -1 }], ["budgets", { maxItems: Number.NaN }], ["budgets", { maxItems: Number.POSITIVE_INFINITY }], ["budgets", { maxItems: 1_000_000_001 }], ["expiresAt", "invalid"], ["expiresAt", "2026-08-26T00:00:00.000Z"], ["lastReviewedAt", "invalid"], ["disablePath", "/disable"], ["rollbackPath", "../rollback"], ["quarantinePath", "quarantine/"], ["licensingClassification", "UNKNOWN"], ["reversibilityClass", "UNKNOWN"], ["riskClass", "UNKNOWN"], ["evidenceFreshnessPolicy", ""]] as [string, unknown][]) expect(validateCapabilityManifest({ ...baseManifest, [field]: value }), field).toMatchObject({ status: "QUARANTINED", reasonCode: "CAPABILITY_INVALID_OR_UNSAFE", createsAuthority: false });
    expect(validateCapabilityManifest({ ...baseManifest, requiredScopes: ["packages/a"], prohibitedScopes: ["packages/a/b"] })).toMatchObject({ status: "QUARANTINED" });
    for (const field of ["evidenceRequirements", "reviewerRequirements"]) expect(validateCapabilityManifest({ ...baseManifest, [field]: [] }), field).toMatchObject({ status: "QUARANTINED", createsAuthority: false });
  });

  it("rejects command execution surfaces and accepts only inert read-only policy records", () => {
    const valid = { commandClass: "GIT_STATUS", args: ["--short"], paths: ["packages"], networkAllowed: false, mutationAllowed: false, executes: false };
    expect(validateCommand(valid).status).toBe("VALID");
    for (const arg of ["; git push", "$(cat .env)", "| sh", ">out", "git commit", "curl https://example.com"]) expect(validateCommand({ ...valid, args: [arg] }).status).toBe("DENIED");
    expect(validateCommand({ ...valid, commandClass: "UNKNOWN" }).status).toBe("DENIED");
  });
  it("accepts every command class only as a typed inert descriptor", () => {
    for (const commandClass of READ_ONLY_COMMAND_CLASSES) {
      const descriptor = { commandClass, args: commandClass === "GIT_REV_PARSE" ? ["HEAD"] : [], paths: ["packages/foundation"], networkAllowed: false, mutationAllowed: false, executes: false };
      expect(validateCommand(descriptor), commandClass).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    }
    const valid = { commandClass: "GIT_STATUS", args: [], paths: ["packages/foundation"], networkAllowed: false, mutationAllowed: false, executes: false };
    for (const value of [null, undefined, "git status", ["git", "status"], 1, {}, { ...valid, unknown: true }, { ...valid, networkAllowed: true }, { ...valid, mutationAllowed: true }, { ...valid, executes: true }, { ...valid, args: [[]] }, { ...valid, args: [{ value: "x" }] }, { ...valid, args: [""] }]) expect(validateCommand(value)).toMatchObject({ status: "DENIED", createsAuthority: false });
  });
  it("enforces positive option grammars and rejects shell, injection, Unicode, and mutation tokens", () => {
    const descriptor = (commandClass: string, args: string[]) => ({ commandClass, args, paths: ["packages/foundation"], networkAllowed: false, mutationAllowed: false, executes: false });
    for (const [commandClass, args] of [["GIT_STATUS", ["--short"]], ["GIT_DIFF_READ_ONLY", ["--check"]], ["TEXT_GREP", ["-n"]], ["GIT_REV_PARSE", ["HEAD"]]] as [string, string[]][]) expect(validateCommand(descriptor(commandClass, args)), `${commandClass}-valid`).toMatchObject({ status: "VALID" });
    for (const [commandClass, args] of [["GIT_STATUS", ["--commit"]], ["GIT_BRANCH_SHOW_CURRENT", ["--delete"]], ["GIT_TAG_LIST", ["--create"]], ["GIT_REMOTE_LIST", ["add"]], ["FILE_FIND", ["-exec"]], ["TEXT_SED_DISPLAY", ["-i"]], ["TEXT_TAIL", ["-f"]], ["PACKAGE_TEST_PLAN", ["install"]], ["GITHUB_READ_ONLY_QUERY", ["create-issue"]], ["GIT_REV_PARSE", ["-bad"]]] as [string, string[]][]) expect(validateCommand(descriptor(commandClass, args)), `${commandClass}-forbidden`).toMatchObject({ status: "DENIED" });
    for (const token of [";", "；", "&&", "||", "|", ">", "`id`", "$(id)", "\\", "*", "?", "@file", "curl", "pnpm install", "--upload-pack", "--exec-path", "--git-dir", "--work-tree", "--config", "--ext-diff", "--textconv", "--output", "https://example.test", "packages/../x", "packages\\x", "packages/%2e%2e/x", "packages/∕x", "packages/⁄x", "packages/\u200bx", "packages/\u2060x", "packages/\ufeffx", "packages/\u202ex"]) {
      expect(validateCommand(descriptor("GIT_STATUS", [token])), token).toMatchObject({ status: "DENIED", reasonCode: "COMMAND_POLICY_DENIED" });
      expect(validateCommand(descriptor("GIT_STATUS", [`safe-${token}`])), `embedded-${token}`).toMatchObject({ status: "DENIED" });
    }
    expect(validateCommand(descriptor("GIT_STATUS", Array.from({ length: 33 }, () => "--short"))).status).toBe("DENIED");
    expect(validateCommand({ ...descriptor("GIT_STATUS", []), paths: ["/etc"] }).status).toBe("DENIED");
    expect(validateCommand({ ...descriptor("GIT_STATUS", []), paths: ["packages/a", "packages/a"] }).status).toBe("DENIED");
  });

  it("keeps evidence non-authorizing and blocks Factory acceptance", () => {
    const record = baseEvidence;
    expect(validateEvidence(record).status).toBe("VALID");
    expect(validateEvidence({ ...record, status: "ACCEPTED" }).reasonCode).toBe("FACTORY_CANNOT_ACCEPT_EVIDENCE");
    expect(validateEvidence({ ...record, status: "VERIFIED", validationResult: { outcome: "VALID" } }).status).toBe("VALID");
  });

  it("covers evidence statuses, verified evidence, external acceptance chains, and invalid inventory records", () => {
    for (const status of EVIDENCE_STATUSES.filter((status) => !["ACCEPTED", "VERIFIED", "SUPERSEDED", "STALE", "CONFLICTING", "MISSING", "NOT_APPLICABLE", "NOT_ASSESSABLE"].includes(status))) expect(validateEvidence({ ...baseEvidence, status }), status).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    expect(validateEvidence({ ...baseEvidence, status: "VERIFIED", validationResult: { outcome: "VALID" } })).toMatchObject({ status: "VALID" });
    const accepted = { ...baseEvidence, status: "ACCEPTED", sourceOrigin: "APPROVED_EVIDENCE", authorityStatus: "EXTERNALLY_ACCEPTED", externalDecisionId: "decision", acceptedBy: "owner", acceptedAt: "2026-08-27T00:00:00.000Z", externalReviewEvidence: "review" };
    expect(validateEvidence(accepted)).toMatchObject({ status: "VALID" });
    for (const field of ["externalDecisionId", "acceptedBy", "acceptedAt", "externalReviewEvidence"]) expect(validateEvidence(omit(accepted, field)), field).toMatchObject({ status: "INVALID" });
    expect(validateInventory({ records: [baseEvidence], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "VALID" });
    expect(validateInventory({ records: [{ ...baseEvidence, evidenceId: "x" }, { ...baseEvidence, evidenceId: "x" }], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "INVALID" });
  });
  it("rejects unsafe evidence records without invoking accessors or echoing values", () => {
    const nullPrototype = Object.assign(Object.create(null), baseEvidence);
    expect(validateEvidence(nullPrototype)).toMatchObject({ status: "VALID", createsAuthority: false });
    let getterCalled = 0;
    const accessor = { ...baseEvidence };
    Object.defineProperty(accessor, "subject", { enumerable: true, get: () => { getterCalled += 1; return "sensitive-synthetic"; } });
    expect(validateEvidence(accessor)).toMatchObject({ status: "INVALID", createsAuthority: false });
    expect(getterCalled).toBe(0);
    const dangerous = Object.assign(Object.create(null), baseEvidence);
    Object.defineProperty(dangerous, "constructor", { enumerable: true, value: "unsafe" });
    expect(validateEvidence(dangerous)).toMatchObject({ status: "INVALID", createsAuthority: false });
    expect(JSON.stringify(validateEvidence(accessor))).not.toContain("sensitive-synthetic");
  });

  it("requires non-authoritative continuity drafts and classified untrusted sources", () => {
    expect(validateContinuityDraft({ authorityStatus: "NON_AUTHORIZING", reviewStatus: "UNREVIEWED", promotedToAuthoritative: false, entries: [{ entryId: "e1", subject: "x", sourceStatus: "EXTERNALLY_SUPPLIED", sourceLocator: "source", provenance: "external", evidenceReferences: [], timestamp: "2026-08-27T00:00:00.000Z", freshnessRule: "current", authorityStatus: "NON_AUTHORIZING", reviewStatus: "UNREVIEWED", promotedToAuthoritative: false }] }).status).toBe("VALID");
    expect(validateContinuityDraft({ authorityStatus: "NON_AUTHORIZING", reviewStatus: "UNREVIEWED", promotedToAuthoritative: true, entries: [] }).status).toBe("DENIED");
    expect(validateSourceClassification({ sourceOrigin: "MODEL_OUTPUT", trustClassification: "UNTRUSTED_CONTENT", canOverridePolicy: false, canExecuteInstructions: false }).status).toBe("VALID");
    expect(validateSourceClassification({ sourceOrigin: "MODEL_OUTPUT", trustClassification: "AUTHORITY_SOURCE", canOverridePolicy: true, canExecuteInstructions: true }).status).toBe("DENIED");
  });

  it("covers all continuity source statuses, decisions, source origins, and trust classifications", () => {
    for (const sourceStatus of ["REPOSITORY_OBSERVED", "EXTERNALLY_SUPPLIED", "DETERMINISTICALLY_VERIFIED", "MISSING", "STALE", "CONFLICTING", "NOT_ASSESSABLE"]) expect(validateContinuityDraft({ authorityStatus: "NON_AUTHORIZING", reviewStatus: "UNREVIEWED", promotedToAuthoritative: false, entries: [{ entryId: "e1", subject: "x", sourceStatus, provenance: "fixture", evidenceReferences: [], authorityStatus: "NON_AUTHORIZING", reviewStatus: "UNREVIEWED", promotedToAuthoritative: false }] }), sourceStatus).toMatchObject({ status: "VALID" });
    expect(validateDecision(baseDecision)).toMatchObject({ status: "VALID", createsAuthority: false });
    for (const field of Object.keys(baseDecision)) expect(validateDecision(omit(baseDecision, field)), field).toMatchObject({ status: "INVALID" });
    expect(Object.isFrozen(freezeDecisionPackage(baseDecision))).toBe(true);
    const expectedByOrigin = {
      FACTORY_CONSTITUTION: "AUTHORITY_SOURCE",
      OWNER_TASK_ENVELOPE: "GOVERNANCE_INPUT",
      REPOSITORY_SOURCE: "UNTRUSTED_CONTENT",
      REPOSITORY_DOCUMENTATION: "UNTRUSTED_CONTENT",
      ISSUE: "UNTRUSTED_CONTENT",
      PULL_REQUEST: "UNTRUSTED_CONTENT",
      REVIEW_COMMENT: "UNTRUSTED_CONTENT",
      GENERATED_FILE: "UNTRUSTED_CONTENT",
      PACKAGE_METADATA: "UNTRUSTED_CONTENT",
      EXTERNAL_DOCUMENT: "UNTRUSTED_CONTENT",
      MODEL_OUTPUT: "UNTRUSTED_CONTENT",
      TOOL_OUTPUT: "UNTRUSTED_CONTENT",
      SYNTHETIC_FIXTURE: "SYNTHETIC_TEST_DATA",
      APPROVED_EVIDENCE: "TRUSTED_EVIDENCE_REFERENCE",
    } as const;
    for (const [sourceOrigin, trustClassification] of Object.entries(expectedByOrigin)) {
      expect(validateSourceClassification({ sourceOrigin, trustClassification, canOverridePolicy: false, canExecuteInstructions: false }), `${sourceOrigin}-${trustClassification}`).toMatchObject({ status: "VALID" });
      for (const alternate of TRUST_CLASSIFICATIONS.filter((candidate) => candidate !== trustClassification)) {
        expect(validateSourceClassification({ sourceOrigin, trustClassification: alternate, canOverridePolicy: false, canExecuteInstructions: false }), `${sourceOrigin}-${alternate}`).toMatchObject({ status: "DENIED", reasonCode: "UNTRUSTED_SOURCE_POLICY_OVERRIDE" });
      }
    }
  });

  it("represents sensitive exclusion without ingesting or persisting content", () => {
    expect(validateSensitiveExclusion({ excludedClass: "PASSWORDS", sourceOrigin: "REPOSITORY_SOURCE", subject: "x", collectionStopped: true, reasonCode: "SENSITIVE_EVIDENCE_EXCLUDED", ingested: false, echoed: false, persisted: false, ownerVisibleEscalation: true, authorityStatus: "NON_AUTHORIZING" }).reasonCode).toBe("SENSITIVE_EVIDENCE_EXCLUDED");
    expect(validateSensitiveExclusion({ excludedClass: "PASSWORDS", sourceOrigin: "REPOSITORY_SOURCE", subject: "x", collectionStopped: true, reasonCode: "SENSITIVE_EVIDENCE_EXCLUDED", ingested: true, echoed: false, persisted: false, ownerVisibleEscalation: true, authorityStatus: "NON_AUTHORIZING" }).status).toBe("INVALID");
  });

  it("excludes every sensitive class without echoing, persisting, or returning synthetic sensitive labels", () => {
    for (const excludedClass of SENSITIVE_DATA_CLASSES) {
      const result = validateSensitiveExclusion({ excludedClass, sourceOrigin: "SYNTHETIC_FIXTURE", subject: "synthetic-label", collectionStopped: true, reasonCode: "SENSITIVE_EVIDENCE_EXCLUDED", ingested: false, echoed: false, persisted: false, ownerVisibleEscalation: true, authorityStatus: "NON_AUTHORIZING" });
      expect(result).toMatchObject({ status: "DENIED", reasonCode: "SENSITIVE_EVIDENCE_EXCLUDED", authorityStatus: "NON_AUTHORIZING" });
      expect(JSON.stringify(result)).not.toContain("synthetic-label");
    }
  });

  it("assesses structured mode transitions without authority and with precedence", () => {
    const valid = { currentMode: "GOVERNANCE_ONLY", requestedMode: "READ_ONLY_INSPECTION", currentStage: "F1", actorAuthorityClassification: "OWNER", now: "2026-08-27T00:00:00.000Z", expiresAt: "2026-08-28T00:00:00.000Z", remainingBudget: 1, integrityStatus: "VALID", policyStatus: "AVAILABLE", auditStatus: "AVAILABLE", killSwitch: false, evidenceConflict: false, prohibitedContent: false };
    const allowed = assessModeTransition(valid);
    expect(allowed.outcome).toBe("ALLOWED");
    expect(allowed.effectiveMode).toBe("READ_ONLY_INSPECTION");
    expect(allowed.reasonCodes).toEqual(["TRANSITION_ALLOWED_READ_ONLY"]);
    expect(allowed.createsAuthority).toBe(false);
    expect(allowed.executesActions).toBe(false);
    expect(allowed.mutatesState).toBe(false);
    expect(allowed.authorityStatus).toBe("NON_AUTHORIZING");
    expect(assessModeTransition({ ...valid, actorAuthorityClassification: "GOVERNANCE" }).outcome).toBe("ALLOWED");
    expect(assessModeTransition({ ...valid, actorAuthorityClassification: "COLLABORATOR" }).outcome).toBe("RESTRICTED");
    expect(assessModeTransition({ ...valid, killSwitch: true, requestedMode: "READ_ONLY_INSPECTION" }).effectiveMode).toBe("DISABLED");
    expect(assessModeTransition({ ...valid, integrityStatus: "FAILED", requestedMode: "READ_ONLY_INSPECTION" }).effectiveMode).toBe("QUARANTINED");
    expect(assessModeTransition({ ...valid, policyStatus: "UNKNOWN" }).effectiveMode).toBe("QUARANTINED");
    expect(assessModeTransition({ ...valid, auditStatus: "UNAVAILABLE" }).outcome).toBe("RESTRICTED");
    expect(assessModeTransition({ ...valid, now: "2026-08-29T00:00:00.000Z" }).effectiveMode).toBe("EXPIRED");
    expect(assessModeTransition({ ...valid, remainingBudget: 0 }).effectiveMode).toBe("EXPIRED");
    expect(assessModeTransition({ ...valid, currentMode: "ACTIVE" }).outcome).toBe("REJECTED");
    expect(assessModeTransition({ ...valid, requestedMode: "ACTIVE" }).outcome).toBe("REJECTED");
    expect(assessModeTransition({ ...valid, unknownField: true }).outcome).toBe("REJECTED");
    expect(Object.isFrozen(allowed)).toBe(true);
    expect(Object.isFrozen(allowed.reasonCodes)).toBe(true);
  });

  it("keeps repository-relative paths reject full-width and encoded traversal variants without silent normalization", () => {
    const invalid = ["＼", "∕", "⁄", "∖", "／", "﹨", "a\u200bb", "a\u2066b", "a\u202eb", "a\u202cb", "a\u202db", "a\u2067b", "a\u2068b", "a\u2069b", "%2F", "%2f", "%5C", "%5c", "%2E", "%2E%2E", "%2e%2e/x", "a.", "a ", "a/", "a//b", "a\\b", "a\tb", "a\nb", "a\rb", "a\u0000b"];
    for (const path of invalid) expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: [path] }), path).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID" });
    expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: ["packages/a"], prohibitedPaths: ["packages-ab"] }).status).toBe("VALID");
    expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: ["packages/a"], prohibitedPaths: ["packages/a/b"] }).status).toBe("VALID");
    expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: ["packages/a"], prohibitedPaths: ["packages/a"] }).status).toBe("DENIED");
    expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: ["packages/a", "packages/a/b"] }).status).toBe("DENIED");
  });
  it("rejects each remaining Unicode path-control character without mutating input", () => {
    const controls = ["\u200c", "\u200d", "\u200e", "\u200f", "\u2060", "\ufeff"];
    for (const control of controls) {
      const input = { ...baseEnvelope, permittedPaths: [`packages/${control}/file.ts`] };
      expect(validateTaskEnvelope(input), `U+${control.codePointAt(0)!.toString(16).toUpperCase()}`).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID", createsAuthority: false });
      expect(input.permittedPaths).toEqual([`packages/${control}/file.ts`]);
      expect(JSON.stringify(validateTaskEnvelope(input))).not.toContain(control);
    }
    expect(validateTaskEnvelope(baseEnvelope).status).toBe("VALID");
    expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: ["packages/a"], prohibitedPaths: ["packages-ab"] }).status).toBe("VALID");
    expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: ["packages/a"], prohibitedPaths: ["packages/a/b"] }).status).toBe("VALID");
    expect(validateTaskEnvelope({ ...baseEnvelope, permittedPaths: ["packages/a"], prohibitedPaths: ["packages/a"] }).status).toBe("DENIED");
  });

  it("treats task-envelope timestamps as out-of-scope and keeps unknown-capability disposition in F0 governance", () => {
    expect(validateTaskEnvelope({ ...baseEnvelope, creationTimestamp: "2026-08-27T00:00:00.000Z" })).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID" });
    expect(validateTaskEnvelope({ ...baseEnvelope, reviewedAt: "2026-08-27T00:00:00.000Z" })).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID" });
    expect(validateTaskEnvelope({ ...baseEnvelope, expiresAt: "not-a-date" })).toMatchObject({ status: "DENIED", reasonCode: "TASK_ENVELOPE_INVALID" });
    expect(FACTORY_CONSTITUTION.unknownCapabilityDisposition).toBe("QUARANTINED");
    expect(validateConstitution({ ...FACTORY_CONSTITUTION, unknownCapabilityDisposition: "ALLOW" })).toMatchObject({ status: "DENIED", reasonCode: "CONSTITUTION_INVARIANT_FAILED" });
    expect(validateCapabilityManifest({ ...baseManifest, capabilityType: "UNKNOWN_CAPABILITY" })).toMatchObject({ status: "QUARANTINED", reasonCode: "CAPABILITY_INVALID_OR_UNSAFE" });
  });

  it("keeps owner decisions non-authorizing while permitting externally reviewed status and deterministic source trust defaults", () => {
    const externallyReviewed = { ...baseDecision, reviewStatus: "INDEPENDENTLY_REVIEWED" as const, provenance: "owner-draft", evidence: ["e1", "e2"] };
    expect(validateDecision(externallyReviewed)).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    expect(validateDecision({ ...externallyReviewed, reviewStatus: "OWNER_ACCEPTED" as unknown })).toMatchObject({ status: "INVALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    const input = { sourceOrigin: "REPOSITORY_SOURCE", trustClassification: "UNTRUSTED_CONTENT", canOverridePolicy: false, canExecuteInstructions: false };
    expect(validateSourceClassification(input)).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    expect(validateSourceClassification({ sourceOrigin: "FACTORY_CONSTITUTION", trustClassification: "AUTHORITY_SOURCE", canOverridePolicy: false, canExecuteInstructions: false })).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    expect(validateSourceClassification({ sourceOrigin: "APPROVED_EVIDENCE", trustClassification: "TRUSTED_EVIDENCE_REFERENCE", canOverridePolicy: false, canExecuteInstructions: false })).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    expect(validateSourceClassification({ sourceOrigin: "REPOSITORY_SOURCE", trustClassification: "AUTHORITY_SOURCE", canOverridePolicy: true, canExecuteInstructions: true })).toMatchObject({ status: "DENIED", createsAuthority: false });
    expect(validateSourceClassification({ sourceOrigin: "SYNTHETIC_FIXTURE", trustClassification: "UNTRUSTED_CONTENT", canOverridePolicy: false, canExecuteInstructions: false })).toMatchObject({ status: "DENIED", createsAuthority: false });
    const validPrompt = {
      sourceOrigin: "REPOSITORY_SOURCE",
      trustClassification: "UNTRUSTED_CONTENT",
      instructionDataClassification: "DATA",
      requestedPurpose: "inspect repository",
      immutableTaskPurpose: "inspect repository",
      prohibitedActionReference: "PROHIBITED_ACTION_REF_1",
      extractionStatus: "NOT_REQUESTED",
      citationReferences: ["cit-1"],
      conflictStatus: "NO_CONFLICT",
      escalationRequired: "NOT_REQUIRED",
      createsAuthority: false,
      authorityStatus: "NON_AUTHORIZING",
    };
    expect(validateSourceClassification({ sourceOrigin: "REPOSITORY_SOURCE", trustClassification: "UNTRUSTED_CONTENT", canOverridePolicy: false, canExecuteInstructions: false })).toMatchObject({ status: "VALID", createsAuthority: false });
    expect(validateSourceClassification({ sourceOrigin: "MODEL_OUTPUT", trustClassification: "UNTRUSTED_CONTENT", canOverridePolicy: false, canExecuteInstructions: false })).toMatchObject({ status: "VALID", createsAuthority: false });
    expect(validPrompt).toEqual(validPrompt);
    expect(externallyReviewed).toEqual({ ...baseDecision, reviewStatus: "INDEPENDENTLY_REVIEWED", provenance: "owner-draft", evidence: ["e1", "e2"] });
  });

  it("validates prompt-classification metadata deterministically and rejects policy overrides", () => {
    const valid = {
      sourceOrigin: "REPOSITORY_SOURCE",
      trustClassification: "UNTRUSTED_CONTENT",
      instructionDataClassification: "DATA",
      requestedPurpose: "inspect repository",
      immutableTaskPurpose: "inspect repository",
      prohibitedActionReference: "PROHIBITED_ACTION_REF_1",
      extractionStatus: "NOT_REQUESTED",
      citationReferences: ["cit-1"],
      conflictStatus: "NO_CONFLICT",
      escalationRequired: "NOT_REQUIRED",
      createsAuthority: false,
      authorityStatus: "NON_AUTHORIZING",
    };
    expect(validateSourceClassification({ sourceOrigin: "REPOSITORY_SOURCE", trustClassification: "UNTRUSTED_CONTENT", canOverridePolicy: false, canExecuteInstructions: false })).toMatchObject({ status: "VALID" });
    expect(validatePromptClassification(valid)).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    expect(validatePromptClassification({ ...valid, requestedPurpose: "" })).toMatchObject({ status: "DENIED" });
    expect(validatePromptClassification({ ...valid, immutableTaskPurpose: "different-purpose" })).toMatchObject({ status: "DENIED" });
    expect(validatePromptClassification({ ...valid, createsAuthority: true })).toMatchObject({ status: "DENIED" });
    expect(validatePromptClassification({ ...valid, authorityStatus: "EXTERNALLY_ACCEPTED" })).toMatchObject({ status: "DENIED" });
    expect(validatePromptClassification({ ...valid, citationReferences: ["cit-1", "cit-1"] })).toMatchObject({ status: "DENIED" });
    expect(validatePromptClassification({ ...valid, conflictStatus: "AUTHORITY_ESCALATION_ATTEMPT", escalationRequired: "OWNER_REVIEW_REQUIRED" })).toMatchObject({ status: "VALID" });
    expect(validatePromptClassification({ ...valid, conflictStatus: "AUTHORITY_ESCALATION_ATTEMPT", escalationRequired: "NOT_REQUIRED" })).toMatchObject({ status: "DENIED" });
    expect(validatePromptClassification({ ...valid, sourceOrigin: "REPOSITORY_SOURCE", trustClassification: "AUTHORITY_SOURCE" })).toMatchObject({ status: "DENIED" });
    expect(validatePromptClassification({ ...valid, prohibitedActionReference: "" })).toMatchObject({ status: "DENIED" });
  });
});
