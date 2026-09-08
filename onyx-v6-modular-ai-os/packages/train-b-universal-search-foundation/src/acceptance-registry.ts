export interface AcceptanceRecord {
  readonly id: string;
  readonly implementation: string;
  readonly test: string;
  readonly nonAuthorizing: true;
}

const REQUEST_FAMILY = Array.from({ length: 12 }, (_, i) => `TB-SEARCH-REQUEST-${String(i + 1).padStart(3, "0")}`);
const ELIGIBILITY_FAMILY = Array.from({ length: 14 }, (_, i) => `TB-SEARCH-ELIGIBILITY-${String(i + 1).padStart(3, "0")}`);
const PLAN_FAMILY = Array.from({ length: 10 }, (_, i) => `TB-SEARCH-PLAN-${String(i + 1).padStart(3, "0")}`);
const RESULT_FAMILY = Array.from({ length: 14 }, (_, i) => `TB-SEARCH-RESULT-${String(i + 1).padStart(3, "0")}`);
const RANK_FAMILY = Array.from({ length: 10 }, (_, i) => `TB-SEARCH-RANK-${String(i + 1).padStart(3, "0")}`);
const DEDUP_FAMILY = Array.from({ length: 10 }, (_, i) => `TB-SEARCH-DEDUP-${String(i + 1).padStart(3, "0")}`);
const CONFLICT_FAMILY = Array.from({ length: 10 }, (_, i) => `TB-SEARCH-CONFLICT-${String(i + 1).padStart(3, "0")}`);
const CURSOR_FAMILY = Array.from({ length: 10 }, (_, i) => `TB-SEARCH-CURSOR-${String(i + 1).padStart(3, "0")}`);
const RECEIPT_FAMILY = Array.from({ length: 12 }, (_, i) => `TB-SEARCH-RECEIPT-${String(i + 1).padStart(3, "0")}`);
const PROJECTION_FAMILY = Array.from({ length: 10 }, (_, i) => `TB-SEARCH-PROJECTION-${String(i + 1).padStart(3, "0")}`);
const SCOPE_FAMILY = Array.from({ length: 10 }, (_, i) => `TB-SEARCH-SCOPE-${String(i + 1).padStart(3, "0")}`);

export const ACCEPTANCE_REGISTRY: readonly string[] = Object.freeze([
  ...REQUEST_FAMILY,
  ...ELIGIBILITY_FAMILY,
  ...PLAN_FAMILY,
  ...RESULT_FAMILY,
  ...RANK_FAMILY,
  ...DEDUP_FAMILY,
  ...CONFLICT_FAMILY,
  ...CURSOR_FAMILY,
  ...RECEIPT_FAMILY,
  ...PROJECTION_FAMILY,
  ...SCOPE_FAMILY,
]);

export const ACCEPTANCE_RECORDS: readonly AcceptanceRecord[] = Object.freeze(
  ACCEPTANCE_REGISTRY.map((id) => ({
    id,
    implementation: "src/index.ts",
    test: "tests/search-foundation.test.ts",
    nonAuthorizing: true as const,
  })),
);

export function validateAcceptanceRegistry(): Readonly<{ valid: boolean; count: number; ids: readonly string[] }> {
  const ids = ACCEPTANCE_REGISTRY as readonly string[];
  return Object.freeze({
    valid: ids.length === 122 && new Set(ids).size === 122,
    count: ids.length,
    ids: Object.freeze([...ids]),
  });
}
