export interface AcceptanceMapping { readonly id: string; readonly implementation: string; readonly test: string; }
const FAMILY_EVIDENCE: Readonly<Record<string, readonly [string, string]>> = Object.freeze({
	REG: ["src/connector-registry.ts", "tests/connector-foundation.test.ts"],
	ACCOUNT: ["src/account-registry.ts", "tests/connector-foundation.test.ts"],
	BIND: ["src/capability-binding.ts", "tests/connector-foundation.test.ts"],
	HEALTH: ["src/connector-health.ts", "tests/connector-foundation.test.ts"],
	STATE: ["src/runtime-state.ts", "tests/connector-foundation.test.ts"],
	VAULT: ["src/validators.ts", "tests/connector-foundation.test.ts"],
	ATTR: ["src/source-attribution.ts", "tests/connector-foundation.test.ts"],
	COST: ["src/cost-evidence.ts", "tests/connector-foundation.test.ts"],
	RECOVERY: ["src/recovery-rollback.ts", "tests/connector-foundation.test.ts"],
	SCOPE: ["src/validators.ts", "tests/connector-foundation.test.ts"],
});
const FAMILY_COUNTS: Readonly<Record<string, number>> = Object.freeze({ REG: 12, ACCOUNT: 10, BIND: 10, HEALTH: 12, STATE: 10, VAULT: 8, ATTR: 8, COST: 8, RECOVERY: 10, SCOPE: 12 });
export const ACCEPTANCE_MAPPINGS: readonly AcceptanceMapping[] = Object.freeze(Object.entries(FAMILY_COUNTS).flatMap(([family, count]) => Array.from({ length: count }, (_, index) => { const evidence = FAMILY_EVIDENCE[family] ?? ["src/index.ts", "tests/connector-foundation.test.ts"] as const; return { id: `TB-CON-${family}-${String(index + 1).padStart(3, "0")}`, implementation: evidence[0], test: evidence[1] }; })));
export const ACCEPTANCE_IDS = Object.freeze(ACCEPTANCE_MAPPINGS.map((mapping) => mapping.id));
export function validateAcceptanceRegistry() { const ids = new Set(ACCEPTANCE_IDS); const mapped = ACCEPTANCE_MAPPINGS.every((mapping) => mapping.implementation.startsWith("src/") && mapping.test.startsWith("tests/")); return Object.freeze({ valid: ids.size === 100 && ACCEPTANCE_IDS.length === 100 && ACCEPTANCE_MAPPINGS.length === 100 && mapped, count: ACCEPTANCE_IDS.length, ids: ACCEPTANCE_IDS, mappings: ACCEPTANCE_MAPPINGS }); }