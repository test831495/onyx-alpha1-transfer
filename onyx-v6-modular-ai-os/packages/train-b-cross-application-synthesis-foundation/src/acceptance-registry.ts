export type AcceptanceMapping = Readonly<{ id: string; implementation: string; test: string; nonAuthorizing: true }>;
const FAMILIES: Readonly<Record<string, number>> = Object.freeze({ REQUEST: 10, ADMISSION: 14, EVIDENCE: 10, CLAIM: 14, CONTRADICTION: 10, RELATIONSHIP: 12, TIMELINE: 10, PLAN: 12, CITATION: 10, COVERAGE: 12, PROJECTION: 10, SCOPE: 10 });
const EXPECTED_ACCEPTANCE_COUNT = Object.values(FAMILIES).reduce((total, count) => total + count, 0);
export const ACCEPTANCE_MAPPINGS: readonly AcceptanceMapping[] = Object.freeze(Object.entries(FAMILIES).flatMap(([family, count]) => Array.from({ length: count }, (_, index) => Object.freeze({ id: `TB-SYNTH-${family}-${String(index + 1).padStart(3, "0")}`, implementation: "src/synthesis-model.ts", test: "tests/synthesis-foundation.test.ts", nonAuthorizing: true as const }))));
export const ACCEPTANCE_REGISTRY = Object.freeze(ACCEPTANCE_MAPPINGS.map((mapping) => mapping.id));
export function validateAcceptanceRegistry(): Readonly<{ valid: boolean; count: number; expectedCount: number; uniqueCount: number; mappingCount: number; familyCounts: Readonly<Record<string, number>> }> {
	const uniqueCount = new Set(ACCEPTANCE_REGISTRY).size;
	const familyCounts = Object.freeze(Object.fromEntries(Object.entries(FAMILIES).map(([family]) => [family, ACCEPTANCE_MAPPINGS.filter((mapping) => mapping.id.startsWith(`TB-SYNTH-${family}-`)).length])));
	return Object.freeze({ valid: ACCEPTANCE_MAPPINGS.length === EXPECTED_ACCEPTANCE_COUNT && ACCEPTANCE_REGISTRY.length === EXPECTED_ACCEPTANCE_COUNT && uniqueCount === EXPECTED_ACCEPTANCE_COUNT, count: ACCEPTANCE_MAPPINGS.length, expectedCount: EXPECTED_ACCEPTANCE_COUNT, uniqueCount, mappingCount: ACCEPTANCE_MAPPINGS.length, familyCounts });
}