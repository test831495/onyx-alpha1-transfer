import { describe, expect, it } from "vitest";
import { ACCEPTANCE_REGISTRY, validateAcceptanceRegistry } from "../src/index";
import type { AcceptanceEntry, DependencyIdentifier } from "../src/model";

const change = (index: number, values: Record<string, unknown>): AcceptanceEntry[] => ACCEPTANCE_REGISTRY.map((entry, entryIndex) => entryIndex === index ? { ...entry, ...values } as AcceptanceEntry : { ...entry });
const expectDiagnostic = (input: unknown, diagnostic: keyof ReturnType<typeof validateAcceptanceRegistry>) => {
  const result = validateAcceptanceRegistry(input);
  expect(result.valid).toBe(false);
  expect(result[diagnostic]).toEqual(expect.arrayContaining([expect.any(String)]));
};
const FROZEN_B4_1_BASELINE: ReadonlyArray<readonly [string, string]> = [
  ["JOURNEY-001", "e3550ed8"], ["JOURNEY-002", "780feb5e"], ["JOURNEY-003", "eb2c35b1"], ["JOURNEY-004", "74314f35"], ["JOURNEY-005", "97c8fd15"], ["JOURNEY-006", "492d82bb"], ["JOURNEY-007", "fbcab9a9"], ["JOURNEY-008", "7b4378e7"], ["JOURNEY-009", "5891276e"], ["JOURNEY-010", "b1352862"], ["JOURNEY-011", "ae03cb76"], ["JOURNEY-012", "d93f5265"], ["JOURNEY-013", "0b212995"], ["JOURNEY-014", "094dc466"], ["JOURNEY-015", "b447e298"], ["JOURNEY-016", "45a4418e"],
  ["RECOVERY-001", "7880f548"], ["RECOVERY-002", "69c167b4"], ["RECOVERY-003", "b3f40c0c"], ["RECOVERY-004", "4910460b"], ["RECOVERY-005", "7dde59d1"], ["RECOVERY-006", "755dc715"], ["RECOVERY-007", "ea981d62"], ["RECOVERY-008", "cc25c7d4"], ["RECOVERY-009", "77d17353"], ["RECOVERY-010", "d6bc8568"], ["RECOVERY-011", "867633d5"], ["RECOVERY-012", "6be21b37"], ["RECOVERY-013", "c0df2fbf"], ["RECOVERY-014", "0668bbf8"], ["RECOVERY-015", "dbf4059f"], ["RECOVERY-016", "3cc538ee"], ["RECOVERY-017", "893ff2bc"], ["RECOVERY-018", "7ad886e2"], ["RECOVERY-019", "6678f544"], ["RECOVERY-020", "bcba5358"],
  ["INTEGRITY-001", "636dcbdc"], ["INTEGRITY-002", "6aea6ef7"], ["INTEGRITY-003", "4be51a6a"], ["INTEGRITY-004", "1a2a3df8"], ["INTEGRITY-005", "e488a56c"], ["INTEGRITY-006", "ad290ee6"], ["INTEGRITY-007", "188e00dd"], ["INTEGRITY-008", "ffa2af3e"], ["INTEGRITY-009", "36a23e11"], ["INTEGRITY-010", "eae51ea2"], ["INTEGRITY-011", "9f5e0107"], ["INTEGRITY-012", "01fdfdaf"], ["INTEGRITY-013", "f8454705"], ["INTEGRITY-014", "3ab016e5"], ["INTEGRITY-015", "ebc2a40b"], ["INTEGRITY-016", "b97c9596"],
  ["ARCHIVE-001", "19ef16d2"], ["ARCHIVE-002", "692f4d05"], ["ARCHIVE-003", "e8358728"], ["ARCHIVE-004", "54cb9a97"], ["ARCHIVE-005", "74aea74c"], ["ARCHIVE-006", "34ee542f"], ["ARCHIVE-007", "9c4dcb67"], ["ARCHIVE-008", "e8555b50"], ["ARCHIVE-009", "fb9f0228"], ["ARCHIVE-010", "303f22e2"], ["ARCHIVE-011", "8dbd7a29"], ["ARCHIVE-012", "d9a6e925"], ["ARCHIVE-013", "0d334b72"], ["ARCHIVE-014", "77b396c5"], ["ARCHIVE-015", "d2d996b7"], ["ARCHIVE-016", "ec28424d"]
];
// Independent second guard covering the accepted B4-1/B4-2 baseline (JOURNEY..CAPTURE, 92 records) at commit
// 9180aac5fb1b3301489598a99c398bcb1f40f419. Frozen separately from FROZEN_B4_1_BASELINE and excludes CONTINUITY.
const FROZEN_B4_1_B4_2_BASELINE: ReadonlyArray<readonly [string, string]> = [
  ...FROZEN_B4_1_BASELINE,
  ["CAPTURE-001", "827eb5dc"], ["CAPTURE-002", "367700e3"], ["CAPTURE-003", "29d4cf7a"], ["CAPTURE-004", "322709e1"], ["CAPTURE-005", "0f455ac2"], ["CAPTURE-006", "87a59f8c"], ["CAPTURE-007", "65a5857b"], ["CAPTURE-008", "67e210ef"], ["CAPTURE-009", "dc51e8d9"], ["CAPTURE-010", "93d43d02"], ["CAPTURE-011", "52d3ccec"], ["CAPTURE-012", "5a94e6b8"], ["CAPTURE-013", "7af2383d"], ["CAPTURE-014", "df4e67ea"], ["CAPTURE-015", "f445af67"], ["CAPTURE-016", "a2a04121"], ["CAPTURE-017", "d8ee51c6"], ["CAPTURE-018", "bc3f650b"], ["CAPTURE-019", "6c45931e"], ["CAPTURE-020", "8f7ec08b"], ["CAPTURE-021", "cc899274"], ["CAPTURE-022", "6a655d9d"], ["CAPTURE-023", "86019a2f"], ["CAPTURE-024", "fe68e290"],
];
const predecessorProjection = (entry: AcceptanceEntry) => ({ id: entry.id, family: entry.family, friendlyTitle: entry.friendlyTitle, userMeaning: entry.userMeaning, authoritativeRequirement: entry.authoritativeRequirement, contractStatus: entry.contractStatus, runtimeStatus: entry.runtimeStatus, uiStatus: entry.uiStatus, contractLocation: entry.contractLocation, plannedImplementationLocation: entry.plannedImplementationLocation, plannedTestMapping: entry.plannedTestMapping, plannedEvidenceMapping: entry.plannedEvidenceMapping, dependencies: entry.dependencies, deferredCapabilities: entry.deferredCapabilities, failClosedRequirement: entry.failClosedRequirement, ownerOnly: entry.ownerOnly, createsAuthority: entry.createsAuthority, technicalInformation: entry.technicalInformation });
const stableFingerprint = (value: unknown): string => {
  let hash = 2166136261;
  for (const character of JSON.stringify(value)) { hash ^= character.codePointAt(0) ?? 0; hash = Math.imul(hash, 16777619); }
  return (hash >>> 0).toString(16).padStart(8, "0");
};
const FROZEN_B4_1_B4_3_BASELINE: ReadonlyArray<readonly [string, string]> = [
  ...FROZEN_B4_1_B4_2_BASELINE,
  ["CONTINUITY-001", "da00006d"], ["CONTINUITY-002", "3d9b405f"], ["CONTINUITY-003", "d8c13475"], ["CONTINUITY-004", "48b73c8b"], ["CONTINUITY-005", "b4ff94ec"],
  ["CONTINUITY-006", "ca4d90f8"], ["CONTINUITY-007", "1a851331"], ["CONTINUITY-008", "fb37c8e5"], ["CONTINUITY-009", "da037a94"], ["CONTINUITY-010", "be185057"],
  ["CONTINUITY-011", "f10225a6"], ["CONTINUITY-012", "7a6ce416"], ["CONTINUITY-013", "c8759615"], ["CONTINUITY-014", "aa3ef613"], ["CONTINUITY-015", "d1e5398c"],
  ["CONTINUITY-016", "cc0a978c"], ["CONTINUITY-017", "96cc1322"], ["CONTINUITY-018", "b8eaff92"], ["CONTINUITY-019", "32e14c14"], ["CONTINUITY-020", "6fc04b8d"],
];
const FROZEN_B4_1_B4_4A1_BASELINE: ReadonlyArray<readonly [string, string]> = [
  ...FROZEN_B4_1_B4_3_BASELINE,
  ["COMPLETENESS-001", "7d557a2e"], ["COMPLETENESS-002", "3e134acb"], ["COMPLETENESS-003", "aa2a43fb"], ["COMPLETENESS-004", "afd01b33"],
];

describe("B4-1 acceptance registry", () => {
  it("contains the exact ordered 68-entry contract", () => {
    const result = validateAcceptanceRegistry(ACCEPTANCE_REGISTRY);
    expect(result.valid).toBe(true);
    expect(result.totalCount).toBe(128);
    expect(result.familyCounts).toEqual({ JOURNEY: 16, RECOVERY: 20, INTEGRITY: 16, ARCHIVE: 16, CAPTURE: 24, CONTINUITY: 20, COMPLETENESS: 16 });
    expect(result.duplicateIds).toEqual([]);
    expect(result.missingIds).toEqual([]);
    expect(result.unexpectedIds).toEqual([]);
    expect(result.invalidOrder).toEqual([]);
    expect(ACCEPTANCE_REGISTRY.every((entry) => entry.createsAuthority === false)).toBe(true);
    expect(ACCEPTANCE_REGISTRY.every((entry) => entry.runtimeStatus === "RUNTIME_DEFERRED" || ["RECOVERY-018", "ARCHIVE-016"].includes(entry.id))).toBe(true);
    expect(ACCEPTANCE_REGISTRY.every((entry) => entry.uiStatus === "UI_DEFERRED")).toBe(true);
    expect(ACCEPTANCE_REGISTRY.find((entry) => entry.id === "RECOVERY-018")?.runtimeStatus).toBe("NOT_IMPLEMENTED");
    expect(ACCEPTANCE_REGISTRY.find((entry) => entry.id === "ARCHIVE-016")?.runtimeStatus).toBe("NOT_IMPLEMENTED");
  });
  it("guards every authoritative field of each frozen predecessor record", () => {
    const predecessors = ACCEPTANCE_REGISTRY.slice(0, FROZEN_B4_1_BASELINE.length);
    const actual = predecessors.map((entry) => [entry.id, stableFingerprint(predecessorProjection(entry))] as const);
    const mismatches = actual.filter(([id, digest], index) => id !== FROZEN_B4_1_BASELINE[index]?.[0] || digest !== FROZEN_B4_1_BASELINE[index]?.[1]);
    expect(mismatches, `Frozen B4-1 baseline differs for records ${mismatches.map(([id]) => id).join(", ")}.`).toEqual([]);
  });

  it("guards every authoritative field of each frozen B4-1/B4-2 predecessor record (first 92)", () => {
    expect(FROZEN_B4_1_B4_2_BASELINE).toHaveLength(92);
    const predecessors = ACCEPTANCE_REGISTRY.slice(0, FROZEN_B4_1_B4_2_BASELINE.length);
    expect(predecessors.some((entry) => entry.family === "CONTINUITY")).toBe(false);
    const actual = predecessors.map((entry) => [entry.id, stableFingerprint(predecessorProjection(entry))] as const);
    const mismatches = actual.filter(([id, digest], index) => id !== FROZEN_B4_1_B4_2_BASELINE[index]?.[0] || digest !== FROZEN_B4_1_B4_2_BASELINE[index]?.[1]);
    expect(mismatches, `Frozen B4-1/B4-2 predecessor baseline changed for records ${mismatches.map(([id]) => id).join(", ")}.`).toEqual([]);
  });
  it("guards every authoritative field of each frozen B4-1/B4-2/B4-3 predecessor record (first 112)", () => {
    expect(FROZEN_B4_1_B4_3_BASELINE).toHaveLength(112);
    const predecessors = ACCEPTANCE_REGISTRY.slice(0, 112);
    const actual = predecessors.map((entry) => [entry.id, stableFingerprint(predecessorProjection(entry))] as const);
    expect(actual).toEqual(FROZEN_B4_1_B4_3_BASELINE);
    expect(stableFingerprint(actual)).toBe("d6b37a0f");
    expect(stableFingerprint(predecessors.map(predecessorProjection))).toBe("c6ff4f1a");
  });
  it("guards every authoritative field of each frozen B4-1/B4-2/B4-3/B4-4A.1 predecessor record (first 116)", () => {
    expect(FROZEN_B4_1_B4_4A1_BASELINE).toHaveLength(116);
    const predecessors = ACCEPTANCE_REGISTRY.slice(0, 116);
    const actual = predecessors.map((entry) => [entry.id, stableFingerprint(predecessorProjection(entry))] as const);
    expect(actual).toEqual(FROZEN_B4_1_B4_4A1_BASELINE);
    expect(stableFingerprint(actual)).toBe("2ac7ac01");
    expect(stableFingerprint(predecessors.map(predecessorProjection))).toBe("d60d3d21");
  });

  it("contains exact COMPLETENESS-001..010 ordering and exact B4-4A.2 additions", () => {
    const completeness = ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "COMPLETENESS");
    expect(completeness.slice(0, 10).map((entry) => entry.id)).toEqual([
      "COMPLETENESS-001", "COMPLETENESS-002", "COMPLETENESS-003", "COMPLETENESS-004", "COMPLETENESS-005",
      "COMPLETENESS-006", "COMPLETENESS-007", "COMPLETENESS-008", "COMPLETENESS-009", "COMPLETENESS-010",
    ]);
    expect(ACCEPTANCE_REGISTRY.some((entry) => entry.id === "COMPLETENESS-011")).toBe(true);

    const added = completeness.slice(10);
    expect(added).toHaveLength(6);
    expect(added.every((entry) => entry.contractStatus === "CONTRACT_DEFINED")).toBe(true);
    expect(added.every((entry) => entry.runtimeStatus === "RUNTIME_DEFERRED")).toBe(true);
    expect(added.every((entry) => entry.uiStatus === "UI_DEFERRED")).toBe(true);
    expect(added.every((entry) => entry.createsAuthority === false)).toBe(true);
    expect(added.every((entry) => typeof entry.failClosedRequirement === "string" && entry.failClosedRequirement.trim().length > 0)).toBe(true);
    expect(new Set(added.map((entry) => entry.friendlyTitle)).size).toBe(6);
    expect(new Set(added.map((entry) => entry.userMeaning)).size).toBe(6);
    expect(new Set(added.map((entry) => entry.authoritativeRequirement)).size).toBe(6);

    expect(added.map((entry) => entry.id)).toEqual(["COMPLETENESS-011", "COMPLETENESS-012", "COMPLETENESS-013", "COMPLETENESS-014", "COMPLETENESS-015", "COMPLETENESS-016"]);
    expect(added.map((entry) => entry.contractLocation)).toEqual([
      "src/recovery-dependency-readiness-policy.ts#RecoveryDependencyArtifactClass",
      "src/recovery-dependency-readiness-policy.ts#RecoveryDependencyArtifactPrerequisite",
      "src/recovery-dependency-readiness-policy.ts#RecoveryDependencyReadinessResult",
      "src/recovery-dependency-readiness-policy.ts#RecoveryDependencyReadinessResult",
      "src/recovery-dependency-readiness-policy.ts#RecoveryDependencyReadinessResult",
      "src/recovery-dependency-readiness-policy.ts#assessRecoveryDependencyReadiness",
    ]);
    expect(added.map((entry) => entry.plannedTestMapping)).toEqual([
      "tests/recovery-dependency-readiness-policy.test.ts#completeness-011-contract",
      "tests/recovery-dependency-readiness-policy.test.ts#completeness-012-contract",
      "tests/recovery-dependency-readiness-policy.test.ts#completeness-013-contract",
      "tests/recovery-dependency-readiness-policy.test.ts#completeness-014-contract",
      "tests/recovery-dependency-readiness-policy.test.ts#completeness-015-contract",
      "tests/recovery-dependency-readiness-policy.test.ts#completeness-016-contract",
    ]);
  });

  it("reports identity and ordering defects", () => {
    expectDiagnostic([...ACCEPTANCE_REGISTRY.slice(0, -1), ACCEPTANCE_REGISTRY[0]], "duplicateIds");
    expectDiagnostic(ACCEPTANCE_REGISTRY.slice(0, -1), "missingIds");
    expectDiagnostic([...ACCEPTANCE_REGISTRY, { ...ACCEPTANCE_REGISTRY[0], id: "JOURNEY-999" }], "unexpectedIds");
    expectDiagnostic([ACCEPTANCE_REGISTRY[1], ACCEPTANCE_REGISTRY[0], ...ACCEPTANCE_REGISTRY.slice(2)], "invalidOrder");
    expectDiagnostic(change(0, { family: "RECOVERY" }), "invalidEntries");
    expectDiagnostic(change(0, { id: "JOURNEY-010" }), "invalidOrder");
  });

  it.each([
    ["status", { uiStatus: "UNSUPPORTED_STATUS" }, "statusViolations"],
    ["title", { friendlyTitle: "" }, "invalidEntries"],
    ["meaning", { userMeaning: "" }, "invalidEntries"],
    ["requirement", { authoritativeRequirement: "" }, "invalidEntries"],
    ["contract mapping", { contractLocation: "invalid" }, "invalidEntries"],
    ["implementation mapping", { plannedImplementationLocation: "invalid" }, "invalidEntries"],
    ["test mapping", { plannedTestMapping: "invalid" }, "invalidEntries"],
    ["evidence mapping", { plannedEvidenceMapping: "invalid" }, "invalidEntries"],
    ["dependencies", { dependencies: ["JOURNEY-002", "JOURNEY-001"] }, "invalidEntries"],
    ["duplicate dependencies", { dependencies: ["JOURNEY-001", "JOURNEY-001"] }, "invalidEntries"],
    ["deferred capabilities", { deferredCapabilities: ["visual presentation", "runtime evaluator"] }, "invalidEntries"],
    ["duplicate deferred capabilities", { deferredCapabilities: ["runtime evaluator", "runtime evaluator"] }, "invalidEntries"],
    ["technical information", { technicalInformation: undefined }, "invalidEntries"],
    ["owner-only classification", { ownerOnly: undefined }, "invalidEntries"],
    ["authority", { createsAuthority: true }, "authorityViolations"],
    ["runtime", { runtimeStatus: "CONTRACT_DEFINED" }, "runtimeViolations"],
    ["visual UI", { uiStatus: "CONTRACT_DEFINED" }, "uiViolations"],
    ["secret restoration", { id: "RECOVERY-018", runtimeStatus: "RUNTIME_DEFERRED" }, "prohibitedImplementationViolations"],
    ["destructive cleanup", { id: "ARCHIVE-016", runtimeStatus: "RUNTIME_DEFERRED" }, "prohibitedImplementationViolations"]
  ])("reports %s defects", (_name, values, diagnostic) => expectDiagnostic(change(0, values), diagnostic as keyof ReturnType<typeof validateAcceptanceRegistry>));

  it("fails closed for malformed records and input while reporting multiple defects", () => {
    expectDiagnostic([null], "invalidEntries");
    expectDiagnostic({ invalid: true }, "missingIds");
    const input = ACCEPTANCE_REGISTRY.map((entry) => ({ ...entry, dependencies: [...entry.dependencies] }));
    const before = JSON.stringify(input);
    const result = validateAcceptanceRegistry(input);
    expect(result.valid).toBe(true);
    expect(JSON.stringify(input)).toBe(before);
    const multiple = change(0, { friendlyTitle: "", userMeaning: "", createsAuthority: true, uiStatus: "CONTRACT_DEFINED" });
    const defects = validateAcceptanceRegistry(multiple);
    expect(defects.invalidEntries.length).toBeGreaterThan(0);
    expect(defects.authorityViolations.length).toBeGreaterThan(0);
    expect(defects.uiViolations.length).toBeGreaterThan(0);
  });

  it("enforces category-specific mapping grammars", () => {
    const mappingCases: Array<[keyof AcceptanceEntry, string, keyof ReturnType<typeof validateAcceptanceRegistry>]> = [
      ["contractLocation", "random:value", "invalidContractLocations"],
      ["contractLocation", "../../private.ts#secret", "invalidContractLocations"],
      ["contractLocation", "src/model.ts", "invalidContractLocations"],
      ["contractLocation", "src/model.ts#", "invalidContractLocations"],
      ["contractLocation", "src/model.ts#bad-name", "invalidContractLocations"],
      ["contractLocation", "src/model.ts#JourneyRecordDescriptor#extra", "invalidContractLocations"],
      ["contractLocation", "/private/model.ts#Symbol", "invalidContractLocations"],
      ["contractLocation", "file://model.ts#Symbol", "invalidContractLocations"],
      ["contractLocation", "https://example.test#Symbol", "invalidContractLocations"],
      ["contractLocation", "src/model.ts#Journey RecordDescriptor", "invalidContractLocations"],
      ["plannedImplementationLocation", "B4-invalid", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-7:anything", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-2", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-2:", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-2:Invalid_Name", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-2:invalid:name", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-2:CAPABILITY", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-2:../restore", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "random:value", "invalidImplementationMappings"],
      ["plannedImplementationLocation", ":", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "free text", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-2:valid key", "invalidImplementationMappings"],
      ["plannedImplementationLocation", "B4-2:valid:key", "invalidImplementationMappings"],
      ["plannedTestMapping", "tests/unsupported.ts#case", "invalidTestMappings"],
      ["plannedTestMapping", "future:B4-2#bad key", "invalidTestMappings"],
      ["plannedTestMapping", "future:B4-7#key", "invalidTestMappings"],
      ["plannedTestMapping", "future:B4-2", "invalidTestMappings"],
      ["plannedTestMapping", "future:B4-2#Invalid_Key", "invalidTestMappings"],
      ["plannedTestMapping", "/private/test.ts#key", "invalidTestMappings"],
      ["plannedTestMapping", "../test.ts#key", "invalidTestMappings"],
      ["plannedTestMapping", "https://example.test#key", "invalidTestMappings"],
      ["plannedTestMapping", "free text", "invalidTestMappings"],
      ["plannedTestMapping", "future:B4-2#key:extra", "invalidTestMappings"],
      ["plannedEvidenceMapping", "unsupported:claim", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", ":", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", "future-runtime:B4-7#key", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", "future-runtime:B4-2", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", "contract-test:", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", "contract-test:Invalid_Key", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", "../../private#key", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", "file://evidence#key", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", "free text", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", "contract-test:key:extra", "invalidEvidenceMappings"],
      ["plannedEvidenceMapping", "typecheck:invalid key", "invalidEvidenceMappings"]
    ];
    for (const [field, value, diagnostic] of mappingCases) expectDiagnostic(change(0, { [field]: value }), diagnostic);
    for (const stage of ["B4-1", "B4-2", "B4-3", "B4-4", "B4-5", "B4-6"]) expect(validateAcceptanceRegistry(change(0, { plannedImplementationLocation: `${stage}:valid-lowercase-kebab-case-capability` })).valid).toBe(true);
    for (const stage of ["B4-2", "B4-3", "B4-4", "B4-5", "B4-6"]) expect(validateAcceptanceRegistry(change(0, { plannedTestMapping: `future:${stage}#valid-key` })).valid).toBe(true);
    for (const stage of ["B4-2", "B4-3", "B4-4", "B4-5", "B4-6"]) expect(validateAcceptanceRegistry(change(0, { plannedEvidenceMapping: `future-runtime:${stage}#valid-key` })).valid).toBe(true);
    for (const location of ["src/model.ts#AuthoritativeEvidenceReference", "src/model.ts#JourneyRecordDescriptor", "src/model.ts#RecoveryPackageDescriptor", "src/model.ts#IntegrityManifestDescriptor", "src/model.ts#ArchiveSetDescriptor", "src/acceptance-registry.ts#ACCEPTANCE_REGISTRY", "src/labels.ts#CONTINUITY_EVIDENCE_LABELS", "src/recovery-completeness-policy.ts#RecoveryCompletenessGap", "src/recovery-completeness-policy.ts#RecoveryRestorationDependency", "src/recovery-completeness-policy.ts#RecoveryProhibitedContentDescriptor", "src/recovery-completeness-policy.ts#RecoveryPortabilityEvidence", "src/recovery-completeness-policy.ts#RecoveryCryptoMigrationEvidence", "src/recovery-completeness-policy.ts#RecoveryDeviceLifecycleEvidence", "src/recovery-completeness-policy.ts#RecoveryCompletenessAssessmentInput", "src/recovery-completeness-policy.ts#assessRecoveryCompleteness"]) expect(validateAcceptanceRegistry(change(0, { contractLocation: location })).valid).toBe(true);
    expect(validateAcceptanceRegistry(change(0, { plannedImplementationLocation: "B4-1:journey-contract", plannedTestMapping: "tests/acceptance-registry.test.ts#valid-key", plannedEvidenceMapping: "typecheck:valid-key" })).valid).toBe(true);
  });

  it("validates controlled dependencies and deferred capabilities", () => {
    expect(validateAcceptanceRegistry(change(1, { dependencies: ["PRIMARY-OWNER-AUTHORITY"] })).valid).toBe(true);
    expect(validateAcceptanceRegistry(change(1, { dependencies: ["not-a-dependency"] })).invalidDependencyIdentifiers.length).toBeGreaterThan(0);
    expect(validateAcceptanceRegistry(change(1, { dependencies: ["JOURNEY-002", "JOURNEY-001"] })).nondeterministicDependencies.length).toBeGreaterThan(0);
    expect(validateAcceptanceRegistry(change(1, { dependencies: ["JOURNEY-002", "JOURNEY-002"] })).duplicateDependencies.length).toBeGreaterThan(0);
    expect(validateAcceptanceRegistry(change(1, { dependencies: ["JOURNEY-001"] })).valid).toBe(true);
    expect(validateAcceptanceRegistry(change(1, { dependencies: ["JOURNEY-002"] })).selfDependencies.length).toBeGreaterThan(0);
    expect(validateAcceptanceRegistry(change(0, { deferredCapabilities: [] })).valid).toBe(true);
    expect(validateAcceptanceRegistry(change(0, { deferredCapabilities: ["made-up-runtime"] })).invalidDeferredCapabilities.length).toBeGreaterThan(0);
    expect(validateAcceptanceRegistry(change(0, { deferredCapabilities: ["REAL_HASHING", "LIVE_JOURNEY_CAPTURE"] })).nondeterministicDeferredCapabilities.length).toBeGreaterThan(0);
    expect(validateAcceptanceRegistry(change(0, { deferredCapabilities: ["LIVE_JOURNEY_CAPTURE", "LIVE_JOURNEY_CAPTURE"] })).duplicateDeferredCapabilities.length).toBeGreaterThan(0);
  });

  it("keeps DependencyIdentifier closed at compile time", () => {
    const validAcceptance: DependencyIdentifier = "JOURNEY-001";
    const validExternal: DependencyIdentifier = "DIGITAL-CONTINUITY-POLICY";
    expect([validAcceptance, validExternal]).toHaveLength(2);
    // @ts-expect-error family-prefixed free text is not an acceptance ID
    const invalidJourney: DependencyIdentifier = "JOURNEY-anything";
    // @ts-expect-error malformed recovery ID is not controlled
    const invalidRecovery: DependencyIdentifier = "RECOVERY-free-text";
    // @ts-expect-error unknown numeric ID is not controlled
    const invalidIntegrity: DependencyIdentifier = "INTEGRITY-999";
    // @ts-expect-error unsupported archive ID is not controlled
    const invalidArchive: DependencyIdentifier = "ARCHIVE-invalid";
    // @ts-expect-error arbitrary external tokens are not controlled
    const invalidExternal: DependencyIdentifier = "UNKNOWN-FOUNDATION";
    expect(invalidJourney || invalidRecovery || invalidIntegrity || invalidArchive || invalidExternal).toBeTruthy();
  });

  it("keeps authored semantic content diverse across the registry", () => {
    const titleGroups = new Map<string, string[]>();
    const meaningGroups = new Map<string, string[]>();
    for (const entry of ACCEPTANCE_REGISTRY) {
      if (!titleGroups.has(entry.friendlyTitle)) titleGroups.set(entry.friendlyTitle, []);
      titleGroups.get(entry.friendlyTitle)!.push(entry.id);
      if (!meaningGroups.has(entry.userMeaning)) meaningGroups.set(entry.userMeaning, []);
      meaningGroups.get(entry.userMeaning)!.push(entry.id);
    }
    const duplicateTitleGroups = [...titleGroups.entries()].filter(([, ids]) => ids.length > 1).map(([value, ids]) => ({ value, ids }));
    const duplicateMeaningGroups = [...meaningGroups.entries()].filter(([, ids]) => ids.length > 1).map(([value, ids]) => ({ value, ids }));
    const predecessorTitleSet = new Set(ACCEPTANCE_REGISTRY.filter((entry) => entry.family !== "CONTINUITY").map((entry) => entry.friendlyTitle));
    const predecessorMeaningSet = new Set(ACCEPTANCE_REGISTRY.filter((entry) => entry.family !== "CONTINUITY").map((entry) => entry.userMeaning));
    const continuityEntries = ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "CONTINUITY");

    expect(ACCEPTANCE_REGISTRY).toHaveLength(128);
    expect(new Set(ACCEPTANCE_REGISTRY.map((entry) => entry.friendlyTitle)).size).toBe(128);
    expect(new Set(ACCEPTANCE_REGISTRY.map((entry) => entry.userMeaning)).size).toBe(128);
    expect(duplicateTitleGroups).toEqual([]);
    expect(duplicateMeaningGroups).toEqual([]);
    expect(continuityEntries).toHaveLength(20);
    expect(new Set(continuityEntries.map((entry) => entry.friendlyTitle)).size).toBe(20);
    expect(new Set(continuityEntries.map((entry) => entry.userMeaning)).size).toBe(20);
    expect(continuityEntries.every((entry) => entry.friendlyTitle.trim().length > 0)).toBe(true);
    expect(continuityEntries.every((entry) => entry.userMeaning.trim().length > 0)).toBe(true);
    for (const entry of continuityEntries) {
      expect(predecessorTitleSet.has(entry.friendlyTitle)).toBe(false);
      expect(predecessorMeaningSet.has(entry.userMeaning)).toBe(false);
      expect(entry.friendlyTitle).not.toMatch(/TBD|placeholder|to be defined|generic requirement/i);
      expect(entry.userMeaning).not.toMatch(/TBD|placeholder|to be defined|generic requirement/i);
    }
    expect(ACCEPTANCE_REGISTRY.every((entry) => entry.technicalInformation.notes.trim().length > 20)).toBe(true);
    expect(ACCEPTANCE_REGISTRY.every((entry) => entry.failClosedRequirement.trim().length > 20)).toBe(true);
    expect(ACCEPTANCE_REGISTRY.every((entry) => !/TBD|same as above|future requirement|generic requirement|placeholder|to be defined/i.test(`${entry.userMeaning} ${entry.authoritativeRequirement}`))).toBe(true);
  });

  it("freezes the accepted first-122 aggregate fingerprints", () => {
    const first122 = ACCEPTANCE_REGISTRY.slice(0, 122);
    const tuples = first122.map((entry) => [entry.id, stableFingerprint(predecessorProjection(entry))] as const);
    expect(stableFingerprint(tuples)).toBe("de821225");
    expect(stableFingerprint(first122.map(predecessorProjection))).toBe("a51a1118");
  });

  it("freezes the six B4-4A.2 individual fingerprints", () => {
    const expected = ["24cd7de4", "712b30bb", "16c899a6", "9de42ddb", "4ac078b8", "778f36ef"];
    expect(ACCEPTANCE_REGISTRY.slice(116, 122).map((entry) => stableFingerprint(predecessorProjection(entry)))).toEqual(expected);
  });

  it("requires canonical lexical deferred-capability ordering", () => {
    const current = ACCEPTANCE_REGISTRY.find((entry) => entry.id === "COMPLETENESS-016");
    if (!current) throw new Error("COMPLETENESS-016 is missing");
    expect(current?.deferredCapabilities).toEqual(["REAL_RESTORATION", "RECOVERY_DASHBOARD", "RESTORE_PLAN_EXECUTION"]);
    expect(stableFingerprint(predecessorProjection(current))).toBe("51c31e7a");
    expect(validateAcceptanceRegistry(ACCEPTANCE_REGISTRY).valid).toBe(true);
    const oldOrder = ["REAL_RESTORATION", "RESTORE_PLAN_EXECUTION", "RECOVERY_DASHBOARD"];
    const oldOrderOnCompleteness = ACCEPTANCE_REGISTRY.map((entry) => entry.id === "COMPLETENESS-016" ? { ...entry, deferredCapabilities: oldOrder } : entry);
    const oldOrderOnOtherRecord = ACCEPTANCE_REGISTRY.map((entry) => entry.id === "COMPLETENESS-015" ? { ...entry, deferredCapabilities: oldOrder } : entry);
    expect(validateAcceptanceRegistry(oldOrderOnCompleteness).nondeterministicDeferredCapabilities).toEqual(["COMPLETENESS-016: deferred capabilities are not deterministically ordered"]);
    expect(validateAcceptanceRegistry(oldOrderOnOtherRecord).nondeterministicDeferredCapabilities).toEqual(["COMPLETENESS-015: deferred capabilities are not deterministically ordered"]);
    expect(validateAcceptanceRegistry(ACCEPTANCE_REGISTRY.map((entry) => entry.id === "COMPLETENESS-016" ? { ...entry, deferredCapabilities: ["RECOVERY_DASHBOARD", "REAL_RESTORATION", "RESTORE_PLAN_EXECUTION"] } : entry)).valid).toBe(false);
    expect(validateAcceptanceRegistry(ACCEPTANCE_REGISTRY.map((entry) => entry.id === "COMPLETENESS-016" ? { ...entry, deferredCapabilities: ["REAL_RESTORATION", "REAL_RESTORATION", "RESTORE_PLAN_EXECUTION"] } : entry)).valid).toBe(false);
    expect(validateAcceptanceRegistry(ACCEPTANCE_REGISTRY.map((entry) => entry.id === "COMPLETENESS-016" ? { ...entry, deferredCapabilities: ["UNKNOWN_CAPABILITY", "RESTORE_PLAN_EXECUTION"] } : entry)).valid).toBe(false);
  });

  it.each(["COMPLETENESS-011", "COMPLETENESS-012", "COMPLETENESS-013", "COMPLETENESS-014", "COMPLETENESS-015", "COMPLETENESS-016"])("records %s with non-authorizing metadata", (id) => {
    const entry = ACCEPTANCE_REGISTRY.find((candidate) => candidate.id === id);
    expect(entry).toMatchObject({ family: "COMPLETENESS", contractStatus: "CONTRACT_DEFINED", runtimeStatus: "RUNTIME_DEFERRED", uiStatus: "UI_DEFERRED", createsAuthority: false, ownerOnly: false });
  });
});