export const ACCEPTANCE_FAMILIES = Object.freeze({
  PA_INVENTORY: {
    family: "PA-INVENTORY",
    idRange: [1, 10],
    totalIds: 10,
    owningPackage: "@onyx/post-alpha-foundation-inventory",
  },
  PA_AVATAR_REGISTRY_PREVIEW: {
    family: "PA-AVATAR-REGISTRY-PREVIEW",
    idRange: [1, 16],
    totalIds: 16,
    owningPackage: "@onyx/post-alpha-avatar-runtime-preview",
  },
  PA_AVATAR_RESOLVER: {
    family: "PA-AVATAR-RESOLVER",
    idRange: [1, 20],
    totalIds: 20,
    owningPackage: "@onyx/post-alpha-avatar-runtime-preview",
  },
  PA_AVATAR_COMPOSITION: {
    family: "PA-AVATAR-COMPOSITION",
    idRange: [1, 20],
    totalIds: 20,
    owningPackage: "@onyx/post-alpha-avatar-runtime-preview",
  },
  PA_AVATAR_PREVIEW_FIXTURE: {
    family: "PA-AVATAR-PREVIEW-FIXTURE",
    idRange: [1, 18],
    totalIds: 18,
    owningPackage: "@onyx/post-alpha-avatar-runtime-preview",
  },
  PA_AVATAR_PREVIEW_EVIDENCE: {
    family: "PA-AVATAR-PREVIEW-EVIDENCE",
    idRange: [1, 10],
    totalIds: 10,
    owningPackage: "@onyx/post-alpha-avatar-runtime-preview",
  },
  PA_AVATAR_LEGACY_BRIDGE: {
    family: "PA-AVATAR-LEGACY-BRIDGE",
    idRange: [1, 6],
    totalIds: 6,
    owningPackage: "@onyx/post-alpha-avatar-runtime-preview",
  },
});

export const ACCEPTANCE_DISPOSITIONS = Object.freeze({
  EXECUTABLE_TEST: "EXECUTABLE_TEST" as const,
  EVIDENCE_VALIDATION: "EVIDENCE_VALIDATION" as const,
  CONDITIONAL_NOT_APPLICABLE: "CONDITIONAL_NOT_APPLICABLE" as const,
  DEFERRED_FUTURE_EVIDENCE: "DEFERRED_FUTURE_EVIDENCE" as const,
});

export const ACCEPTANCE_COVERAGE_SUMMARY = Object.freeze({
  totalFamilies: 7,
  totalIds: 100,
  executableTest: 87,
  evidenceValidation: 11,
  conditionalNotApplicable: 2,
  deferredFutureEvidence: 0,
});

type AcceptanceDisposition =
  (typeof ACCEPTANCE_DISPOSITIONS)[keyof typeof ACCEPTANCE_DISPOSITIONS];

export interface AcceptanceMappingEntry {
  acceptanceId: string;
  disposition: AcceptanceDisposition;
  verificationId: string;
  verificationName: string;
}

function addFamilyMappings(
  entries: AcceptanceMappingEntry[],
  family: string,
  start: number,
  end: number,
  disposition: AcceptanceDisposition,
  verificationId: string,
  verificationName: string
) {
  for (let number = start; number <= end; number += 1) {
    entries.push({
      acceptanceId: `${family}-${String(number).padStart(3, "0")}`,
      disposition,
      verificationId,
      verificationName,
    });
  }
}

export const ACCEPTANCE_MAPPING = Object.freeze((() => {
  const entries: AcceptanceMappingEntry[] = [];
  addFamilyMappings(entries, "PA-INVENTORY", 1, 9, "EXECUTABLE_TEST", "inventory.test.ts", "Inventory structure and sealed package tests");
  addFamilyMappings(entries, "PA-INVENTORY", 10, 10, "EVIDENCE_VALIDATION", "acceptance-inventory.json", "Acceptance inventory SHA-256 integrity");
  addFamilyMappings(entries, "PA-AVATAR-REGISTRY-PREVIEW", 1, 16, "EXECUTABLE_TEST", "registry-resolver.test.ts", "Registry fixture and character binding tests");
  addFamilyMappings(entries, "PA-AVATAR-RESOLVER", 1, 20, "EXECUTABLE_TEST", "registry-resolver.test.ts", "Resolver character and ACTIVE-only lifecycle tests");
  addFamilyMappings(entries, "PA-AVATAR-COMPOSITION", 1, 20, "EXECUTABLE_TEST", "composition-adapter.test.ts", "Desktop and TV composition adapter tests");
  addFamilyMappings(entries, "PA-AVATAR-PREVIEW-FIXTURE", 1, 18, "EXECUTABLE_TEST", "desktop-fixtures.test.ts", "ONYX and package-local NOVA fixture tests");
  addFamilyMappings(entries, "PA-AVATAR-PREVIEW-EVIDENCE", 1, 10, "EVIDENCE_VALIDATION", "evidence-sidecars", "Fixture, provenance, and coverage evidence integrity");
  addFamilyMappings(entries, "PA-AVATAR-LEGACY-BRIDGE", 1, 2, "CONDITIONAL_NOT_APPLICABLE", "no-bridge-boundary", "No bridge module, import, or input path exists");
  addFamilyMappings(entries, "PA-AVATAR-LEGACY-BRIDGE", 3, 6, "EXECUTABLE_TEST", "legacy-boundary.test.ts", "Legacy package, Command Center, and bridge coupling boundary checks");
  return entries;
})());

export function validateAcceptanceMapping(): boolean {
  if (ACCEPTANCE_MAPPING.length !== ACCEPTANCE_COVERAGE_SUMMARY.totalIds) {
    throw new Error("Acceptance mapping must contain exactly 100 IDs");
  }

  const counts = ACCEPTANCE_MAPPING.reduce<Record<string, number>>((result, entry) => {
    result[entry.disposition] = (result[entry.disposition] ?? 0) + 1;
    return result;
  }, {});

  if (
    counts.EXECUTABLE_TEST !== 87 ||
    counts.EVIDENCE_VALIDATION !== 11 ||
    counts.CONDITIONAL_NOT_APPLICABLE !== 2 ||
    (counts.DEFERRED_FUTURE_EVIDENCE ?? 0) !== 0
  ) {
    throw new Error("Acceptance mapping disposition counts do not match 87/11/2/0");
  }

  return validateNoDuplicateAcceptanceIds();
}

function validateNoDuplicateAcceptanceIds(): boolean {
  const identifiers = ACCEPTANCE_MAPPING.map((entry) => entry.acceptanceId);
  if (new Set(identifiers).size !== identifiers.length) {
    throw new Error("Acceptance mapping contains duplicate IDs");
  }
  return true;
}

export function validateAcceptanceFamilyArithmetic() {
  const sum =
    ACCEPTANCE_COVERAGE_SUMMARY.executableTest +
    ACCEPTANCE_COVERAGE_SUMMARY.evidenceValidation +
    ACCEPTANCE_COVERAGE_SUMMARY.conditionalNotApplicable +
    ACCEPTANCE_COVERAGE_SUMMARY.deferredFutureEvidence;

  if (sum !== ACCEPTANCE_COVERAGE_SUMMARY.totalIds) {
    throw new Error(
      `Acceptance count mismatch: ${sum} !== ${ACCEPTANCE_COVERAGE_SUMMARY.totalIds}`
    );
  }

  const familySum = Object.values(ACCEPTANCE_FAMILIES).reduce(
    (acc, fam) => acc + fam.totalIds,
    0
  );

  if (familySum !== ACCEPTANCE_COVERAGE_SUMMARY.totalIds) {
    throw new Error(
      `Family total mismatch: ${familySum} !== ${ACCEPTANCE_COVERAGE_SUMMARY.totalIds}`
    );
  }

  return true;
}
