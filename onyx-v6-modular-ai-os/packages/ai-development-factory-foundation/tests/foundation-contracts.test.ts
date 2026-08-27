import { describe, expect, it } from "vitest";
import * as factory from "../src/index";
import { AUTHORITY_IMPACTS, BLOCKER_STATES, CONTINUITY_GAP_REASONS, EVIDENCE_STATUSES, FACTORY_CONSTITUTION, FACTORY_MODES, FACTORY_STAGES, READ_ONLY_COMMAND_CLASSES, RESTRICTIVE_TRANSITION_REASONS, assessModeTransition, freezeContinuityGap, freezeEvidenceRecord, freezeContinuityDraft, freezeTaskEnvelope, projectContinuityGaps, projectEvidenceInventory, validateCommand, validateConstitution, validateFactoryMode, validateFactoryStage, validateGap, validateModeTransition, validateEvidence, validateInventory } from "../src/index";

const baseline = "fcc6489155e93f0aea79aedfe32c6fd789f558ae";
const EVALUATION_TIME = "2026-08-27T00:00:00.000Z";
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
const historicalEvidence = (status: string, evidenceId = "e1") => status === "ACCEPTED" ? { ...baseEvidence, evidenceId, status, sourceOrigin: "APPROVED_EVIDENCE", authorityStatus: "EXTERNALLY_ACCEPTED", externalDecisionId: "decision", acceptedBy: "owner", acceptedAt: "2026-08-27T00:00:00.000Z", externalReviewEvidence: "review" } : status === "VERIFIED" ? { ...baseEvidence, evidenceId, status, validationResult: { outcome: "VALID" } } : status === "SUPERSEDED" ? { ...baseEvidence, evidenceId, status, supersedes: ["e-old"] } : status === "STALE" ? { ...baseEvidence, evidenceId, status, staleReason: "FRESHNESS_WINDOW_EXCEEDED", expiresAt: "2026-08-26T00:00:00.000Z" } : status === "CONFLICTING" ? { ...baseEvidence, evidenceId, status, contradictionIds: ["e-other"] } : status === "MISSING" ? { ...baseEvidence, evidenceId, status, absenceReason: "SOURCE_INACCESSIBLE", sourceLocator: "NOT_AVAILABLE", digest: "NOT_AVAILABLE" } : status === "NOT_APPLICABLE" ? { ...baseEvidence, evidenceId, status, applicabilityReason: "OUTSIDE_REQUESTED_SCOPE" } : status === "NOT_ASSESSABLE" ? { ...baseEvidence, evidenceId, status, assessmentLimitationReason: "DETERMINISTIC_VERIFICATION_UNAVAILABLE" } : { ...baseEvidence, evidenceId, status };
const observedEvidence = (evidenceId: string, status: string = "OBSERVED") => status === "ACCEPTED" ? { ...baseEvidence, evidenceId, status, sourceOrigin: "APPROVED_EVIDENCE", authorityStatus: "EXTERNALLY_ACCEPTED", externalDecisionId: "decision", acceptedBy: "owner", acceptedAt: "2026-08-27T00:00:00.000Z", externalReviewEvidence: "review" } : status === "VERIFIED" ? { ...baseEvidence, evidenceId, status, validationResult: { outcome: "VALID" } } : status === "SUPERSEDED" ? { ...baseEvidence, evidenceId, status, supersedes: ["e-old"] } : status === "STALE" ? { ...baseEvidence, evidenceId, status, staleReason: "FRESHNESS_WINDOW_EXCEEDED", expiresAt: "2026-08-26T00:00:00.000Z" } : status === "CONFLICTING" ? { ...baseEvidence, evidenceId, status, contradictionIds: ["e-other"] } : status === "MISSING" ? { ...baseEvidence, evidenceId, status, absenceReason: "SOURCE_INACCESSIBLE", sourceLocator: "NOT_AVAILABLE", digest: "NOT_AVAILABLE" } : status === "NOT_APPLICABLE" ? { ...baseEvidence, evidenceId, status, applicabilityReason: "OUTSIDE_REQUESTED_SCOPE" } : status === "NOT_ASSESSABLE" ? { ...baseEvidence, evidenceId, status, assessmentLimitationReason: "DETERMINISTIC_VERIFICATION_UNAVAILABLE" } : { ...baseEvidence, evidenceId, status };
const validGap = (gapId: string, reasonCode: string = "MISSING_BASELINE_PROOF") => ({ gapId, reasonCode, subject: "fixture", requiredEvidence: "baseline", observedEvidence: "absent", impact: "blocked", blockerStatus: "BLOCKED", remediationOwner: "owner", recheckTrigger: "evidence", provenance: "fixture", authorityImpact: "REQUIRES_OWNER", relatedEvidenceIds: ["evidence-1"], baseline, policyVersion: "1.0.0" });

describe("foundation closed contracts", () => {
  it("preserves the F0 deny-by-default constitution", () => {
    expect(FACTORY_CONSTITUTION.createsAuthority).toBe(false);
    expect(FACTORY_CONSTITUTION.executesActions).toBe(false);
    expect(FACTORY_CONSTITUTION.mutatesState).toBe(false);
    expect(FACTORY_CONSTITUTION.networkDeniedByDefault).toBe(true);
    expect(FACTORY_CONSTITUTION.ownerPromotionRequired).toBe(true);
    expect(Object.isFrozen(FACTORY_CONSTITUTION)).toBe(true);
  });
  it("exposes contracts, validators, and projections without internal helpers", () => {
    for (const internalName of ["cloneFreeze", "isSafeRecord"]) expect(internalName in factory, internalName).toBe(false);
  });
  it("rejects every altered F0 invariant and closed-schema hazard", () => {
    for (const [field, value] of Object.entries(FACTORY_CONSTITUTION)) {
      const altered = typeof value === "boolean" ? !value : `${value}-invalid`;
      expect(validateConstitution({ ...FACTORY_CONSTITUTION, [field]: altered }), String(field)).toMatchObject({ status: "DENIED", reasonCode: "CONSTITUTION_INVARIANT_FAILED", createsAuthority: false });
    }
    for (const input of [null, undefined, "constitution", [], Object.create({ inherited: true }), new (class Constitution {})()]) expect(validateConstitution(input)).toMatchObject({ status: "DENIED", reasonCode: "CONSTITUTION_SCHEMA_INVALID" });
    expect(validateConstitution({ ...FACTORY_CONSTITUTION, unknown: true })).toMatchObject({ status: "DENIED", reasonCode: "CONSTITUTION_SCHEMA_INVALID" });
    expect(FACTORY_CONSTITUTION.contractVersion).toBe("1.0.0");
    expect(Object.isFrozen(FACTORY_CONSTITUTION)).toBe(true);
  });
  it("accepts a null-prototype constitution record and rejects unsafe descriptors without mutation", () => {
    const nullPrototype = Object.assign(Object.create(null), FACTORY_CONSTITUTION);
    expect(validateConstitution(nullPrototype)).toMatchObject({ status: "VALID", reasonCode: "CONSTITUTION_VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    let getterCalled = false;
    const accessor = { ...FACTORY_CONSTITUTION };
    Object.defineProperty(accessor, "readOnlyByDefault", { enumerable: true, get: () => { getterCalled = true; return true; } });
    const withSymbol = { ...FACTORY_CONSTITUTION, [Symbol("field")]: true };
    const dangerous = Object.assign(Object.create(null), FACTORY_CONSTITUTION); Object.defineProperty(dangerous, "constructor", { enumerable: true, value: "unsafe" });
    for (const unsafe of [accessor, withSymbol, dangerous]) expect(validateConstitution(unsafe)).toMatchObject({ status: "DENIED", reasonCode: "CONSTITUTION_SCHEMA_INVALID", createsAuthority: false });
    expect(getterCalled).toBe(false);
    expect(nullPrototype.readOnlyByDefault).toBe(true);
  });
  it("fixes every F0 unknown-condition disposition to a restrictive value", () => {
    expect(FACTORY_CONSTITUTION.unknownCapabilityDisposition).toBe("QUARANTINED");
    expect(FACTORY_CONSTITUTION.unknownPolicyDisposition).toBe("DENIED");
    expect(FACTORY_CONSTITUTION.unavailablePolicyDisposition).toBe("QUARANTINED");
    expect(FACTORY_CONSTITUTION.auditUnavailableDisposition).toBe("DENIED");
    for (const field of ["unknownCapabilityDisposition", "unknownPolicyDisposition", "unavailablePolicyDisposition", "auditUnavailableDisposition"]) for (const value of ["ALLOW", "UNKNOWN", "", 1]) expect(validateConstitution({ ...FACTORY_CONSTITUTION, [field]: value }), `${field}-${String(value)}`).toMatchObject({ status: "DENIED", reasonCode: "CONSTITUTION_INVARIANT_FAILED" });
  });
  it("keeps stages and modes closed and separate", () => {
    expect(FACTORY_STAGES).toEqual(["F0", "F1", "F2", "F3", "F4"]);
    expect(FACTORY_MODES).toContain("READ_ONLY_INSPECTION");
    expect(FACTORY_STAGES).not.toContain("F5");
    expect(validateModeTransition({ from: "GOVERNANCE_ONLY", to: "READ_ONLY_INSPECTION", reason: "OWNER_PROMOTION" })).toBe(true);
    expect(validateModeTransition({ from: "READ_ONLY_INSPECTION", to: "READ_ONLY_DECISION_PACKAGE", reason: "OWNER_PROMOTION" })).toBe(false);
    expect(validateModeTransition({ from: "READ_ONLY_INSPECTION", to: "QUARANTINED", reason: "UNKNOWN_POLICY" })).toBe(true);
  });
  it("rejects invalid transition times instead of allowing a read-only relaxation", () => {
    expect(validateModeTransition({ currentMode: "GOVERNANCE_ONLY", proposedMode: "READ_ONLY_INSPECTION", currentStage: "F1", actorAuthorityClassification: "OWNER", now: "not-a-time", expiresAt: "2026-08-28T00:00:00.000Z", remainingBudget: 1, integrityStatus: "VALID", policyStatus: "AVAILABLE", auditStatus: "AVAILABLE", killSwitch: false, evidenceConflict: false, prohibitedContent: false })).toBe(false);
  });
  it("covers all stages, modes, and restrictive transition reasons without authority", () => {
    for (const stage of FACTORY_STAGES) expect(validateFactoryStage(stage)).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    for (const invalid of ["F5", "", 1, null]) expect(validateFactoryStage(invalid)).toMatchObject({ status: "DENIED", reasonCode: "UNKNOWN_STAGE" });
    for (const mode of FACTORY_MODES) expect(validateFactoryMode(mode)).toMatchObject({ status: "VALID", createsAuthority: false });
    for (const invalid of ["ACTIVE", "", 1, null]) expect(validateFactoryMode(invalid)).toMatchObject({ status: "DENIED", reasonCode: "UNKNOWN_MODE" });
    for (const reason of RESTRICTIVE_TRANSITION_REASONS) expect(validateModeTransition({ from: "READ_ONLY_INSPECTION", to: "QUARANTINED", reason }), reason).toBe(true);
    expect(validateModeTransition({ from: "GOVERNANCE_ONLY", to: "READ_ONLY_VALIDATION_PLANNING", reason: "OWNER_PROMOTION" })).toBe(true);
    expect(validateModeTransition({ from: "READ_ONLY_INSPECTION", to: "READ_ONLY_VALIDATION_PLANNING", reason: "OWNER_PROMOTION" })).toBe(false);
  });
  it("assesses structured transition facts fail-closed with restrictive precedence", () => {
    const valid = { currentMode: "GOVERNANCE_ONLY", proposedMode: "READ_ONLY_INSPECTION", currentStage: "F1", actorAuthorityClassification: "OWNER", now: "2026-08-27T00:00:00.000Z", expiresAt: "2026-08-28T00:00:00.000Z", remainingBudget: 1, integrityStatus: "VALID", policyStatus: "AVAILABLE", auditStatus: "AVAILABLE", killSwitch: false, evidenceConflict: false, prohibitedContent: false };
    expect(validateModeTransition(valid)).toBe(true);
    expect(validateModeTransition({ ...valid, actorAuthorityClassification: "GOVERNANCE" })).toBe(true);
    expect(validateModeTransition({ ...valid, actorAuthorityClassification: "COLLABORATOR" })).toBe(false);
    for (const [field, value] of [["now", "invalid"], ["expiresAt", "invalid"], ["remainingBudget", -1], ["remainingBudget", Number.NaN], ["remainingBudget", Number.POSITIVE_INFINITY], ["integrityStatus", "UNKNOWN"], ["policyStatus", "INVALID"], ["auditStatus", "UNKNOWN"], ["killSwitch", "yes"], ["evidenceConflict", 1], ["prohibitedContent", null], ["currentStage", "F5"], ["currentMode", "ACTIVE"], ["proposedMode", "ACTIVE"]] as [string, unknown][]) expect(validateModeTransition({ ...valid, [field]: value }), field).toBe(false);
    expect(validateModeTransition({ ...valid, now: "2026-08-28T00:00:00.000Z", proposedMode: "EXPIRED" })).toBe(true);
    expect(validateModeTransition({ ...valid, remainingBudget: 0, proposedMode: "EXPIRED" })).toBe(true);
    expect(validateModeTransition({ ...valid, integrityStatus: "FAILED", proposedMode: "QUARANTINED" })).toBe(true);
    expect(validateModeTransition({ ...valid, policyStatus: "UNKNOWN", proposedMode: "QUARANTINED" })).toBe(true);
    expect(validateModeTransition({ ...valid, policyStatus: "UNAVAILABLE", proposedMode: "DISABLED" })).toBe(true);
    expect(validateModeTransition({ ...valid, auditStatus: "UNAVAILABLE", proposedMode: "QUARANTINED" })).toBe(true);
    expect(validateModeTransition({ ...valid, killSwitch: true, evidenceConflict: true, proposedMode: "DISABLED" })).toBe(true);
    expect(validateModeTransition({ ...valid, evidenceConflict: true, proposedMode: "QUARANTINED" })).toBe(true);
    expect(validateModeTransition({ ...valid, prohibitedContent: true, proposedMode: "QUARANTINED" })).toBe(true);
    expect(validateModeTransition({ ...valid, unknown: true })).toBe(false);
  });
  it("preserves every simultaneous restrictive reason in stable precedence order", () => {
    const base = { currentMode: "GOVERNANCE_ONLY", requestedMode: "READ_ONLY_INSPECTION", currentStage: "F1", actorAuthorityClassification: "COLLABORATOR", now: "2026-08-29T00:00:00.000Z", expiresAt: "2026-08-28T00:00:00.000Z", remainingBudget: 0, integrityStatus: "FAILED", policyStatus: "UNKNOWN", auditStatus: "UNAVAILABLE", killSwitch: true, evidenceConflict: true, prohibitedContent: true } as const;
    const expected = ["KILL_SWITCH_ACTIVE", "PROHIBITED_CONTENT", "INTEGRITY_FAILURE", "POLICY_UNKNOWN", "AUDIT_UNAVAILABLE", "EVIDENCE_CONFLICT", "TASK_EXPIRED", "BUDGET_EXHAUSTED", "ACTOR_AUTHORITY_INSUFFICIENT"];
    const input = { ...base };
    const assessment = assessModeTransition(input);
    expect(assessment.reasonCodes).toEqual(expected);
    expect(assessment.effectiveMode).toBe("DISABLED");
    expect(assessment.outcome).toBe("RESTRICTED");
    expect(Object.isFrozen(assessment)).toBe(true);
    expect(Object.isFrozen(assessment.reasonCodes)).toBe(true);
    expect(assessment.createsAuthority).toBe(false);
    expect(assessment.executesActions).toBe(false);
    expect(assessment.mutatesState).toBe(false);
    expect(assessment.authorityStatus).toBe("NON_AUTHORIZING");
    expect(input).toEqual(base);
  });
  it("retains ordered policy, audit, conflict, and authority restrictions", () => {
    const input = { currentMode: "GOVERNANCE_ONLY", requestedMode: "READ_ONLY_INSPECTION", currentStage: "F1", actorAuthorityClassification: "COLLABORATOR", now: "2026-08-27T00:00:00.000Z", expiresAt: "2026-08-28T00:00:00.000Z", remainingBudget: 1, integrityStatus: "FAILED", policyStatus: "UNAVAILABLE", auditStatus: "UNAVAILABLE", killSwitch: false, evidenceConflict: true, prohibitedContent: false } as const;
    const assessment = assessModeTransition(input);
    expect(assessment.reasonCodes).toEqual(["INTEGRITY_FAILURE", "POLICY_UNAVAILABLE", "AUDIT_UNAVAILABLE", "EVIDENCE_CONFLICT", "ACTOR_AUTHORITY_INSUFFICIENT"]);
    expect(assessment.effectiveMode).toBe("QUARANTINED");
    expect(assessment.outcome).toBe("RESTRICTED");
    expect(assessModeTransition(input)).toEqual(assessment);
    expect(validateModeTransition(input)).toBe(false);
  });
  it("keeps expiry and budget restrictions ahead of owner-authorized relaxation", () => {
    const input = { currentMode: "GOVERNANCE_ONLY", requestedMode: "READ_ONLY_INSPECTION", currentStage: "F1", actorAuthorityClassification: "OWNER", now: "2026-08-29T00:00:00.000Z", expiresAt: "2026-08-28T00:00:00.000Z", remainingBudget: 0, integrityStatus: "VALID", policyStatus: "AVAILABLE", auditStatus: "AVAILABLE", killSwitch: false, evidenceConflict: false, prohibitedContent: false } as const;
    const assessment = assessModeTransition(input);
    expect(assessment.reasonCodes).toEqual(["TASK_EXPIRED", "BUDGET_EXHAUSTED"]);
    expect(assessment.effectiveMode).toBe("EXPIRED");
    expect(assessment.outcome).toBe("RESTRICTED");
    expect(assessment.createsAuthority).toBe(false);
    expect(assessment.executesActions).toBe(false);
    expect(assessment.mutatesState).toBe(false);
    expect(assessment.authorityStatus).toBe("NON_AUTHORIZING");
    expect(validateModeTransition(input)).toBe(false);
    for (const actor of ["COLLABORATOR", "PLANNER", "EVIDENCE_COLLECTOR"]) expect(assessModeTransition({ ...input, actorAuthorityClassification: actor }).reasonCodes).toContain("ACTOR_AUTHORITY_INSUFFICIENT");
  });
  it("proves public projections deep-freeze safe values without mutating input", () => {
    const repeated = { value: "x" };
    const input = { nested: repeated, alsoNested: repeated, items: [1, 2] };
    const output = freezeTaskEnvelope(input);
    expect(output).not.toBe(input);
    expect(Object.isFrozen(output.nested)).toBe(true);
    expect(Object.isFrozen(output.items)).toBe(true);
    expect(input.nested).toBe(repeated);
    expect((output.nested as Record<string, string>).value).toBe("x");
    expect((output.alsoNested as Record<string, string>).value).toBe("x");
    const cycle: Record<string, unknown> = {}; cycle.self = cycle;
    expect(() => freezeTaskEnvelope(cycle)).toThrow("CYCLE_NOT_ALLOWED");
  });
  it("accepts bounded JSON-like values and clones repeated references safely", () => {
    const repeated = { label: "bounded", values: [null, true, false, 0, 12, -3, 1.25, -0.5, "", "ascii", "cafe" ] };
    const input = { empty: {}, nullRecord: Object.assign(Object.create(null), { ok: true }), repeated, again: repeated, list: [repeated, "text"] };
    const output = freezeTaskEnvelope(input);
    expect(output).not.toBe(input);
    expect(output).toEqual({ empty: {}, nullRecord: { ok: true }, repeated, again: repeated, list: [repeated, "text"] });
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.repeated)).toBe(true);
    expect(Object.isFrozen((output.repeated as { values: unknown[] }).values)).toBe(true);
    expect(Object.isFrozen(output.list)).toBe(true);
    expect(input.repeated).not.toBe(output.repeated);
    input.repeated.label = "changed";
    expect((output.repeated as { label: string }).label).toBe("bounded");
  });
  it("rejects unsupported values, descriptors, prototypes, keys, cycles, and bounds", () => {
    const values: unknown[] = [undefined, 1n, Symbol("value"), () => true, Number.NaN, Infinity, -Infinity, new Date(), new Map(), new Set(), new WeakMap(), new WeakSet(), /x/u, new ArrayBuffer(1), new DataView(new ArrayBuffer(1)), new Uint8Array(1), Promise.resolve(), new Error("synthetic"), new URL("https://example.test"), new (class Sample {})()];
    for (const value of values) expect(() => freezeTaskEnvelope({ value })).toThrow();
    const getter: Record<string, unknown> = {};
    let getterCalled = 0;
    Object.defineProperty(getter, "value", { enumerable: true, get: () => { getterCalled += 1; return "unsafe"; } });
    const setter: Record<string, unknown> = {};
    let setterCalled = 0;
    Object.defineProperty(setter, "value", { enumerable: true, set: () => { setterCalled += 1; } });
    expect(() => freezeTaskEnvelope(getter)).toThrow("UNSAFE_RECORD");
    expect(() => freezeTaskEnvelope(setter)).toThrow("UNSAFE_RECORD");
    expect(getterCalled).toBe(0);
    expect(setterCalled).toBe(0);
    const accessorArray = [] as unknown[];
    Object.defineProperty(accessorArray, "0", { enumerable: true, get: () => { getterCalled += 1; return "unsafe"; } });
    expect(() => freezeTaskEnvelope({ value: accessorArray })).toThrow("UNSAFE_ARRAY");
    expect(getterCalled).toBe(0);
    const dangerousProto = Object.create(null); Object.defineProperty(dangerousProto, "__proto__", { enumerable: true, value: 1 });
    for (const value of [Object.assign(Object.create({ inherited: true }), { value: 1 }), dangerousProto, { prototype: 1 }, { constructor: 1 }, new URL("https://example.test")]) expect(() => freezeTaskEnvelope(value)).toThrow();
    const objectCycle: Record<string, unknown> = {}; objectCycle.self = objectCycle;
    const arrayCycle: unknown[] = []; arrayCycle.push(arrayCycle);
    const mixedCycle: Record<string, unknown> = { array: [] }; (mixedCycle.array as unknown[]).push(mixedCycle);
    for (const value of [objectCycle, arrayCycle, mixedCycle]) expect(() => freezeTaskEnvelope({ value } as Record<string, unknown>)).toThrow("CYCLE_NOT_ALLOWED");
    let depth: Record<string, unknown> = {};
    for (let index = 0; index < 12; index += 1) depth = { child: depth };
    expect(() => freezeTaskEnvelope(depth)).not.toThrow();
    let tooDeep: Record<string, unknown> = {};
    for (let index = 0; index < 14; index += 1) tooDeep = { child: tooDeep };
    expect(() => freezeTaskEnvelope(tooDeep)).toThrow("UNSAFE_VALUE");
    expect(() => freezeTaskEnvelope({ value: "x".repeat(4097) })).toThrow("STRING_BOUND_EXCEEDED");
    expect(() => freezeTaskEnvelope({ value: Array.from({ length: 257 }, () => 1) })).toThrow("ARRAY_BOUND_EXCEEDED");
    expect(() => freezeTaskEnvelope(Object.fromEntries(Array.from({ length: 257 }, (_, index) => [`key-${index}`, index])))).toThrow("UNSAFE_RECORD");
    const manyNodes = Object.fromEntries(Array.from({ length: 9 }, (_, index) => [`values-${index}`, Array.from({ length: 256 }, () => ({ value: 1 }))]));
    expect(() => freezeTaskEnvelope(manyNodes)).toThrow("NODE_BOUND_EXCEEDED");
  });
  it("accepts values exactly at each public clone bound", () => {
    expect(() => freezeTaskEnvelope({ value: "x".repeat(4096) })).not.toThrow();
    expect(() => freezeTaskEnvelope({ value: Array.from({ length: 256 }, () => 1) })).not.toThrow();
    expect(() => freezeTaskEnvelope(Object.fromEntries(Array.from({ length: 256 }, (_, index) => [`key-${index}`, index])))).not.toThrow();
    let exactDepth: Record<string, unknown> = {};
    for (let index = 0; index < 11; index += 1) exactDepth = { child: exactDepth };
    expect(() => freezeTaskEnvelope(exactDepth)).not.toThrow();
  });
  it("freezes evidence records through the public boundary without mutating input", () => {
    const input = { ...baseEvidence, validationResult: { outcome: "VALID" }, nested: ["synthetic"] };
    const output = freezeEvidenceRecord(input);
    expect(output).not.toBe(input);
    expect(Object.isFrozen(output)).toBe(true);
    expect(Object.isFrozen(output.validationResult)).toBe(true);
    expect(Object.isFrozen(output.nested)).toBe(true);
    input.nested[0] = "changed";
    expect((output.nested as string[])[0]).toBe("synthetic");
  });
  it("validates every evidence status without promotion or authority", () => {
    for (const status of EVIDENCE_STATUSES.filter((value) => value !== "ACCEPTED" && value !== "VERIFIED")) {
      const result = validateEvidence(observedEvidence("e1", status));
      expect(result).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    }
    for (const status of ["observed", "UNKNOWN", "", null, undefined, 1, [], {}]) expect(validateEvidence({ ...baseEvidence, status })).toMatchObject({ status: "INVALID", createsAuthority: false });
    expect(validateEvidence({ ...baseEvidence, status: "REPORTED", sourceLocator: "" }).status).toBe("INVALID");
  });
  it("requires deterministic verified evidence and rejects incomplete variants", () => {
    const verified = { ...baseEvidence, status: "VERIFIED", validationResult: { outcome: "VALID", method: "sha256" } };
    expect(validateEvidence(verified)).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    for (const [field, value] of [["baseline", "bad"], ["baseline", baseline.toUpperCase()], ["validationMethod", ""], ["validationResult", "passed"], ["validationResult", {}], ["validationResult", { outcome: "INVALID" }], ["provenance", ""], ["digest", ""], ["completenessStatus", "INCOMPLETE"], ["sourceLocator", ""], ["authorityStatus", "EXTERNALLY_ACCEPTED"], ["unknown", true]] as [string, unknown][]) expect(validateEvidence({ ...verified, [field]: value }), field).toMatchObject({ status: "NOT_ASSESSABLE", createsAuthority: false });
    for (const [field, value] of [["observedAt", "2026-99-99T00:00:00.000Z"], ["sourceLocator", "TODO"], ["provenance", "TBD"], ["digest", "0000000000000000000000000000000000000000"], ["validationMethod", "passed"]] as [string, unknown][]) expect(validateEvidence({ ...verified, [field]: value }), field).toMatchObject({ status: "NOT_ASSESSABLE", createsAuthority: false });
  });
  it("accepts only externally referenced accepted evidence", () => {
    const accepted = { ...baseEvidence, status: "ACCEPTED", sourceOrigin: "APPROVED_EVIDENCE", authorityStatus: "EXTERNALLY_ACCEPTED", externalDecisionId: "decision-1", acceptedBy: "owner-reference", acceptedAt: "2026-08-27T00:00:00.000Z", externalReviewEvidence: "review-reference" };
    expect(validateEvidence(accepted)).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    for (const field of ["externalDecisionId", "acceptedBy", "acceptedAt", "externalReviewEvidence"]) expect(validateEvidence({ ...accepted, [field]: "" }), field).toMatchObject({ status: "INVALID" });
    expect(validateEvidence({ ...accepted, sourceOrigin: "FACTORY_CONSTITUTION" })).toMatchObject({ status: "INVALID" });
    expect(validateEvidence({ ...accepted, acceptedAt: "invalid" })).toMatchObject({ status: "INVALID" });
    expect(validateEvidence({ ...accepted, authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "DENIED", reasonCode: "FACTORY_CANNOT_ACCEPT_EVIDENCE" });
  });
  it("keeps evidence inventory deterministic, immutable, and visibly non-authorizing", () => {
    const accepted = { ...baseEvidence, evidenceId: "e-accepted", status: "ACCEPTED", sourceOrigin: "APPROVED_EVIDENCE", authorityStatus: "EXTERNALLY_ACCEPTED", externalDecisionId: "decision-1", acceptedBy: "owner-reference", acceptedAt: "2026-08-27T00:00:00.000Z", externalReviewEvidence: "review-reference" };
    const records = [
      historicalEvidence("STALE", "e-stale"),
      { ...historicalEvidence("CONFLICTING", "e-conflict") },
      historicalEvidence("MISSING", "e-missing"),
      { ...baseEvidence, evidenceId: "e-reported", status: "REPORTED" },
      historicalEvidence("VERIFIED", "e-verified"),
      accepted,
    ];
    const input = [...records];
    const inventory = projectEvidenceInventory(input, EVALUATION_TIME);
    expect(inventory.records.map((record) => record.evidenceId)).toEqual(["e-accepted", "e-conflict", "e-missing", "e-reported", "e-stale", "e-verified"]);
    expect(inventory.byStatus).toEqual({ ACCEPTED: 1, CONFLICTING: 1, MISSING: 1, REPORTED: 1, STALE: 1, VERIFIED: 1 });
    expect(inventory.externallyAccepted.map((record) => record.evidenceId)).toEqual(["e-accepted"]);
    expect(inventory.conflicts.map((record) => record.evidenceId)).toEqual(["e-conflict"]);
    expect(inventory.stale.map((record) => record.evidenceId)).toEqual(["e-stale"]);
    expect(inventory.expired.map((record) => record.evidenceId)).toEqual(["e-stale"]);
    expect(inventory.missing.map((record) => record.evidenceId)).toEqual(["e-missing"]);
    expect(inventory.reported.map((record) => record.evidenceId)).toEqual(["e-reported"]);
    expect(inventory.verified.map((record) => record.evidenceId)).toEqual(["e-verified"]);
    expect(inventory.authorityStatus).toBe("NON_AUTHORIZING");
    expect(Object.isFrozen(inventory)).toBe(true);
    expect(Object.isFrozen(inventory.records)).toBe(true);
    input.reverse();
    expect(inventory.records[0]?.evidenceId).toBe("e-accepted");
  });
  it("validates every inventory record and rejects duplicate IDs", () => {
    const valid = { ...baseEvidence };
    expect(validateInventory({ records: [], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "VALID", createsAuthority: false });
    expect(validateInventory({ records: [valid], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "VALID", authorityStatus: "NON_AUTHORIZING" });
    expect(validateInventory({ records: [{ ...valid, status: "UNKNOWN" }], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "INVALID" });
    expect(validateInventory({ records: [valid, { ...valid, evidenceId: "e2" }], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "VALID" });
    expect(validateInventory({ records: [valid, valid], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "INVALID" });
    expect(validateInventory({ records: [valid], authorityStatus: "EXTERNALLY_ACCEPTED" })).toMatchObject({ status: "INVALID" });
  });
  it("derives a deterministic, bounded expired subset of stale evidence from an explicit evaluation time", () => {
    const beforeExpiry = { ...baseEvidence, evidenceId: "e-before", status: "STALE", staleReason: "FRESHNESS_WINDOW_EXCEEDED", expiresAt: "2026-08-28T00:00:00.000Z" };
    const atExpiry = { ...baseEvidence, evidenceId: "e-at", status: "STALE", staleReason: "FRESHNESS_WINDOW_EXCEEDED", expiresAt: "2026-08-27T00:00:00.000Z" };
    const afterExpiry = { ...baseEvidence, evidenceId: "e-after", status: "STALE", staleReason: "FRESHNESS_WINDOW_EXCEEDED", expiresAt: "2026-08-26T00:00:00.000Z" };
    const verifiedWithExpiryField = { ...baseEvidence, evidenceId: "e-verified-expiry", status: "VERIFIED", validationResult: { outcome: "VALID" }, expiresAt: "2026-08-01T00:00:00.000Z" };
    const observed = { ...baseEvidence, evidenceId: "e-observed" };
    const literalExpired = { ...baseEvidence, evidenceId: "e-literal-expired", status: "EXPIRED" };
    const records = [beforeExpiry, atExpiry, afterExpiry, verifiedWithExpiryField, observed, literalExpired];
    const before = JSON.parse(JSON.stringify(records));
    const inventory = projectEvidenceInventory(records, EVALUATION_TIME);
    expect(inventory.stale.map((record) => record.evidenceId)).toEqual(["e-after", "e-at", "e-before"]);
    expect(inventory.expired.map((record) => record.evidenceId)).toEqual(["e-after", "e-at"]);
    expect(inventory.expired.every((record) => inventory.stale.some((stale) => stale.evidenceId === record.evidenceId))).toBe(true);
    expect(inventory.invalid.map((record) => record.evidenceId)).toEqual(expect.arrayContaining(["e-literal-expired", "e-verified-expiry"]));
    expect(inventory.verified.map((record) => record.evidenceId)).toEqual([]);
    expect(inventory.observed.map((record) => record.evidenceId)).toEqual(["e-observed"]);
    expect(inventory.expired.some((record) => record.evidenceId === "e-observed")).toBe(false);
    expect(() => projectEvidenceInventory(records, "not-a-time")).toThrow();
    expect(() => projectEvidenceInventory(records, "")).toThrow();
    expect(() => projectEvidenceInventory(records, "2026-99-99T00:00:00.000Z")).toThrow();
    expect(projectEvidenceInventory(records, EVALUATION_TIME)).toEqual(inventory);
    expect(Object.isFrozen(inventory.stale)).toBe(true);
    expect(Object.isFrozen(inventory.expired)).toBe(true);
    expect(records).toEqual(before);
    expect(inventory.authorityStatus).toBe("NON_AUTHORIZING");
  });
  it("keeps invalid inventory records visible instead of presenting a complete summary", () => {
    const invalid = { ...baseEvidence, evidenceId: "e-invalid", status: "UNKNOWN" };
    const inventory = projectEvidenceInventory([baseEvidence, invalid], EVALUATION_TIME);
    expect(inventory.records.map((record) => record.evidenceId)).toEqual(["e-invalid", "e1"]);
    expect(inventory.invalid.map((record) => record.evidenceId)).toEqual(["e-invalid"]);
    expect(inventory.byStatus).toEqual({ OBSERVED: 1, UNKNOWN: 1 });
    expect(inventory.authorityStatus).toBe("NON_AUTHORIZING");
  });
  it("enforces historical status ownership, typed absence, and explicit expiry facts", () => {
    const superseded = { ...baseEvidence, status: "SUPERSEDED", supersedes: ["e-old"] };
    const stale = { ...baseEvidence, status: "STALE", staleReason: "FRESHNESS_WINDOW_EXCEEDED", expiresAt: "2026-08-26T00:00:00.000Z" };
    const conflicting = { ...baseEvidence, status: "CONFLICTING", contradictionIds: ["e-other"] };
    const missing = historicalEvidence("MISSING");
    const notApplicable = { ...baseEvidence, status: "NOT_APPLICABLE", applicabilityReason: "OUTSIDE_REQUESTED_SCOPE" };
    const notAssessable = { ...baseEvidence, status: "NOT_ASSESSABLE", assessmentLimitationReason: "DETERMINISTIC_VERIFICATION_UNAVAILABLE" };
    for (const record of [superseded, stale, conflicting, missing, notApplicable, notAssessable]) expect(validateEvidence(record), record.status).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    expect(validateEvidence({ ...superseded, supersedes: ["e1"] }).status).toBe("INVALID");
    expect(validateEvidence({ ...conflicting, contradictionIds: ["e-other", "e-other"] }).status).toBe("INVALID");
    expect(validateEvidence({ ...missing, absenceReason: "TODO", sourceLocator: "fabricated" }).status).toBe("INVALID");
    expect(validateEvidence({ ...notApplicable, applicabilityReason: "N/A" }).status).toBe("INVALID");
    expect(validateEvidence({ ...notAssessable, assessmentLimitationReason: "" }).status).toBe("INVALID");
    expect(validateEvidence({ ...stale, expiresAt: "invalid" }).status).toBe("INVALID");
    expect(validateEvidence({ ...stale, expiresAt: "2026-08-28T00:00:00.000Z" }).status).toBe("VALID");
    expect(validateEvidence({ ...baseEvidence, status: "MISSING", observedValue: "fabricated" }).status).toBe("INVALID");
  });
  it("validates historical relationships across inventory without selecting a winner", () => {
    const old = { ...baseEvidence, evidenceId: "e-old" };
    const replacement = { ...baseEvidence, evidenceId: "e-new", status: "SUPERSEDED", supersedes: ["e-old"] };
    const left = { ...baseEvidence, evidenceId: "e-left", status: "CONFLICTING", contradictionIds: ["e-right"] };
    const right = { ...baseEvidence, evidenceId: "e-right", status: "CONFLICTING", contradictionIds: ["e-left"] };
    expect(validateInventory({ records: [old, replacement, left, right], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "VALID" });
    const inventory = projectEvidenceInventory([replacement, old, right, left], EVALUATION_TIME);
    expect(inventory.records.map((record) => record.evidenceId)).toEqual(["e-left", "e-new", "e-old", "e-right"]);
    expect(inventory.records.map((record) => record.status)).toContain("SUPERSEDED");
    expect(inventory.records.filter((record) => record.status === "CONFLICTING")).toHaveLength(2);
    expect(validateInventory({ records: [{ ...replacement, supersedes: ["missing"] }, old], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "INVALID" });
    expect(validateInventory({ records: [{ ...old, evidenceId: "e-a", status: "SUPERSEDED", supersedes: ["e-b"] }, { ...old, evidenceId: "e-b", status: "SUPERSEDED", supersedes: ["e-a"] }], authorityStatus: "NON_AUTHORIZING" })).toMatchObject({ status: "INVALID" });
    expect(inventory.authorityStatus).toBe("NON_AUTHORIZING");
  });
  it("exposes the complete Factory gap vocabulary without reusing B4 IDs", () => {
    expect(CONTINUITY_GAP_REASONS).toContain("MISSING_BASELINE_PROOF");
    expect(CONTINUITY_GAP_REASONS).toContain("SENSITIVE_EVIDENCE_EXCLUDED");
    expect(CONTINUITY_GAP_REASONS.every((reason) => !reason.startsWith("B4"))).toBe(true);
  });
  it("projects evidence deterministically without accepting it", () => {
    const records = [
      { evidenceId: "b", status: "STALE", authorityStatus: "NON_AUTHORIZING", reviewStatus: "UNREVIEWED" },
      { evidenceId: "a", status: "OBSERVED", authorityStatus: "NON_AUTHORIZING", reviewStatus: "UNREVIEWED" },
    ] as const;
    const inventory = projectEvidenceInventory(records, EVALUATION_TIME);
    expect(inventory.records.map((record) => record.evidenceId)).toEqual(["a", "b"]);
    expect(inventory.authorityStatus).toBe("NON_AUTHORIZING");
    expect(inventory.byStatus).toEqual({ OBSERVED: 1, STALE: 1 });
    expect(EVIDENCE_STATUSES).toContain("ACCEPTED");
  });
  it("projects every evidence status without promotion, conflict resolution, or stale hiding", () => {
    const records = EVIDENCE_STATUSES.map((status, index) => historicalEvidence(status, `e-${String(index).padStart(2, "0")}`));
    const inventory = projectEvidenceInventory(records, EVALUATION_TIME);
    expect(inventory.records.map((record) => record.status)).toEqual(EVIDENCE_STATUSES);
    expect(inventory.authorityStatus).toBe("NON_AUTHORIZING");
    expect(inventory.externallyAccepted).toHaveLength(1);
    expect(inventory.stale).toHaveLength(1);
    expect(inventory.conflicts).toHaveLength(1);
    expect(inventory.missing).toHaveLength(1);
    expect(Object.isFrozen(inventory.records)).toBe(true);
  });
  it("covers every continuity-gap reason and makes overflow not assessable", () => {
    for (const reasonCode of CONTINUITY_GAP_REASONS) expect(validateGap(validGap("gap", reasonCode)), reasonCode).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    const input = [validGap("b"), validGap("a")];
    expect(projectContinuityGaps(input).gaps.map((gap) => gap.gapId)).toEqual(["a", "b"]);
    expect(projectContinuityGaps(Array.from({ length: 1001 }, (_, index) => validGap(`gap-${index}`)))).toMatchObject({ outcome: "NOT_ASSESSABLE", reasonCode: "REPRESENTATION_OVERFLOW", gaps: [], createsAuthority: false });
    expect(() => freezeContinuityGap({ self: null, ...validGap("gap") })).not.toThrow();
  });
  it("accepts only typed inert descriptors for every read-only command class", () => {
    for (const commandClass of READ_ONLY_COMMAND_CLASSES) expect(validateCommand({ commandClass, args: commandClass === "GIT_REV_PARSE" ? ["HEAD"] : [], paths: ["packages/foundation"], networkAllowed: false, mutationAllowed: false, executes: false }), commandClass).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    const base = { commandClass: "GIT_STATUS", args: [], paths: ["packages/foundation"], networkAllowed: false, mutationAllowed: false, executes: false };
    for (const token of [";", "；", "git；push", "&", "|", ">", "`", "$(x)", "${x}", "\n", "\r", "\t", "\u200b", "\u202e", "\u2002", "../x", "/x", "C:/x", "@file"]) expect(validateCommand({ ...base, args: [token] }), token).toMatchObject({ status: "DENIED", reasonCode: "COMMAND_POLICY_DENIED" });
    expect(validateCommand({ ...base, commandClass: "GIT_COMMIT" })).toMatchObject({ status: "DENIED", reasonCode: "COMMAND_POLICY_DENIED" });
    expect(validateCommand({ ...base, args: ["--upload-pack"] })).toMatchObject({ status: "DENIED" });
  });
  it("covers every continuity reason, blocker, and authority-impact value", () => {
    for (const reasonCode of CONTINUITY_GAP_REASONS) expect(validateGap({ ...validGap(`gap-${reasonCode}`), reasonCode })).toMatchObject({ status: "VALID", createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    for (const blockerStatus of BLOCKER_STATES) expect(validateGap({ ...validGap(`gap-${blockerStatus}`), blockerStatus })).toMatchObject({ status: "VALID" });
    for (const authorityImpact of AUTHORITY_IMPACTS) expect(validateGap({ ...validGap(`gap-${authorityImpact}`), authorityImpact })).toMatchObject({ status: "VALID" });
    for (const field of ["reasonCode", "blockerStatus", "authorityImpact"] as const) for (const value of ["", "unknown", null, undefined, 1, []]) expect(validateGap({ ...validGap("invalid"), [field]: value })).toMatchObject({ status: "INVALID" });
  });
  it("enforces gap schema, provenance, references, ordering, and overflow boundaries", () => {
    const valid = validGap("gap-1");
    expect(validateGap(Object.assign(Object.create(null), valid))).toMatchObject({ status: "VALID" });
    expect(validateGap({ ...valid, unknown: true })).toMatchObject({ status: "INVALID" });
    expect(validateGap({ ...valid, relatedEvidenceIds: ["e1", "e1"] })).toMatchObject({ status: "INVALID" });
    expect(validateGap({ ...valid, baseline: baseline.toUpperCase(), provenance: "" })).toMatchObject({ status: "INVALID" });
    const gaps = [validGap("gap-c"), validGap("gap-a"), validGap("gap-b")];
    expect(projectContinuityGaps([...gaps].reverse())).toEqual(projectContinuityGaps(gaps));
    expect(projectContinuityGaps([])).toMatchObject({ outcome: "VALID", gaps: [], createsAuthority: false });
    const atBound = Array.from({ length: 1000 }, (_, index) => validGap(`gap-${String(index).padStart(4, "0")}`));
    expect(projectContinuityGaps(atBound).gaps).toHaveLength(1000);
    expect(projectContinuityGaps([...atBound, validGap("gap-over")])).toMatchObject({ outcome: "NOT_ASSESSABLE", reasonCode: "REPRESENTATION_OVERFLOW", gaps: [], createsAuthority: false, authorityStatus: "NON_AUTHORIZING" });
    const output = freezeContinuityGap(valid);
    expect(Object.isFrozen(output)).toBe(true);
    expect(output).not.toBe(valid);
  });
  it("rejects gap accessors and unsafe prototypes without invoking getters", () => {
    let getterCalled = 0;
    const accessor = { ...validGap("gap-accessor") };
    Object.defineProperty(accessor, "subject", { enumerable: true, get: () => { getterCalled += 1; return "synthetic"; } });
    expect(validateGap(accessor)).toMatchObject({ status: "INVALID", createsAuthority: false });
    expect(getterCalled).toBe(0);
    expect(validateGap(Object.assign(Object.create({ inherited: true }), validGap("gap-prototype")))).toMatchObject({ status: "INVALID", createsAuthority: false });
    const dangerous = Object.assign(Object.create(null), validGap("gap-dangerous"));
    Object.defineProperty(dangerous, "constructor", { enumerable: true, value: "unsafe" });
    expect(validateGap(dangerous)).toMatchObject({ status: "INVALID", createsAuthority: false });
  });
});
