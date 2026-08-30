import { P3_BOUNDS } from "./p3-governance-automation-contracts";

export { P3_BOUNDS };
export type P3AcceptanceFamily = "ORCH" | "REPORT" | "LIFECYCLE" | "PRBODY" | "SAFE";
export type P3AcceptanceDefinition = Readonly<{ id: string; family: P3AcceptanceFamily; invariant: string; rationale: string; predecessorDependency: string; implementationWave: "P3-A" | "P3-B" | "P3-C" | "P3-D"; testTitles: readonly string[]; blocking: true; evidenceRequirement: string; testFiles: readonly string[] }>;

const definition = (id: string, family: P3AcceptanceFamily, invariant: string, predecessorDependency: string, implementationWave: P3AcceptanceDefinition["implementationWave"], testTitles: string | readonly string[], testFiles: string | readonly string[]): P3AcceptanceDefinition => Object.freeze({ id, family, invariant, rationale: invariant, predecessorDependency, implementationWave, testTitles: Object.freeze(typeof testTitles === "string" ? [testTitles] : [...testTitles]), blocking: true, evidenceRequirement: "Focused Vitest coverage and local validation evidence are required.", testFiles: Object.freeze(typeof testFiles === "string" ? [testFiles] : [...testFiles]) });

export const P3_ACCEPTANCE_REGISTRY = Object.freeze([
  definition("POSTH1-P3-ORCH-001", "ORCH", "P3 composes sealed P0/P1/P2 outputs through direct reuse and does not duplicate predecessor engines.", "P0/P1/P2", "P3-B", ["composes sealed predecessor outputs without duplicating predecessor engines"], ["tests/post-h1-p3-governance-automation.test.ts"]),
  definition("POSTH1-P3-ORCH-002", "ORCH", "P3 preserves P1 merge-readiness and main-closure precedence.", "P1", "P3-B", "preserves sealed P1 readiness and closure precedence", "tests/post-h1-p3-governance-automation.test.ts"),
  definition("POSTH1-P3-ORCH-003", "ORCH", "Every projection is bound to exact repository, base, head, PR, and target facts.", "P0/P1/P2", "P3-B", "rejects cross-target and target-mismatched supplied facts", "tests/post-h1-p3-governance-automation.test.ts"),
  definition("POSTH1-P3-ORCH-004", "ORCH", "Missing or unverifiable required facts produce a fail-closed non-favorable result.", "P0/P1/P2", "P3-A", "returns a fail-closed result for incomplete or unverifiable input", "tests/post-h1-p3-governance-automation.test.ts"),
  definition("POSTH1-P3-REPORT-001", "REPORT", "Governance reports are deterministic, bounded, immutable, and non-authorizing.", "P1/P2", "P3-C", "projects a stable bounded immutable non-authorizing governance report", "tests/post-h1-p3-governance-report-projection.test.ts"),
  definition("POSTH1-P3-REPORT-002", "REPORT", "P3 preserves P2 evidence-manifest references and provenance without inventing evidence.", "P2", "P3-C", "preserves P2 evidence manifest references without inventing evidence", "tests/post-h1-p3-governance-report-projection.test.ts"),
  definition("POSTH1-P3-REPORT-003", "REPORT", "Semantically equivalent facts produce canonical ordering and stable hash inputs.", "P2", "P3-C", "canonicalizes governance report ordering and stable hash inputs", "tests/post-h1-p3-governance-report-projection.test.ts"),
  definition("POSTH1-P3-LIFECYCLE-001", "LIFECYCLE", "Lifecycle output is projection-only and never performs or implies an authoritative transition.", "P0/P1", "P3-B", "projects lifecycle state without performing an authoritative transition", "tests/post-h1-p3-governance-automation.test.ts"),
  definition("POSTH1-P3-LIFECYCLE-002", "LIFECYCLE", "Next-gate and reopening-trigger projections reflect validated governance facts.", "P0/P1/P2", "P3-B", "projects next gate and reopening triggers from validated governance facts", "tests/post-h1-p3-governance-automation.test.ts"),
  definition("POSTH1-P3-PRBODY-001", "PRBODY", "A PR-body proposal is bounded, factual, target-bound, deterministic, and non-authorizing.", "P1/P2", "P3-C", "produces a bounded target-bound factual non-authorizing PR body proposal", "tests/post-h1-p3-governance-report-projection.test.ts"),
  definition("POSTH1-P3-PRBODY-002", "PRBODY", "Unsafe, stale, missing, contradictory, mismatched, or over-bound facts suppress the PR-body proposal.", "P1/P2", "P3-C", "suppresses the PR body proposal when required facts are unsafe or invalid", "tests/post-h1-p3-governance-report-projection.test.ts"),
  definition("POSTH1-P3-SAFE-001", "SAFE", "Every public P3 result preserves the NON_AUTHORIZING authority marker.", "P0/P1/P2", "P3-D", "preserves the NON_AUTHORIZING marker on every public P3 result", "tests/post-h1-p3-governance-automation.test.ts"),
  definition("POSTH1-P3-SAFE-002", "SAFE", "Closed-schema and hostile-input inspection rejects unsafe input.", "Factory constitution", "P3-D", "rejects unknown keys unsafe prototypes and hostile reflective input", "tests/post-h1-p3-governance-automation.test.ts"),
  definition("POSTH1-P3-SAFE-003", "SAFE", "Over-bound values are rejected without favorable truncation.", "P0/P2 bounds", "P3-D", "rejects over-bound input without silent or favorable truncation", "tests/post-h1-p3-governance-automation.test.ts"),
  definition("POSTH1-P3-SAFE-004", "SAFE", "P3 uses only caller-supplied time and performs no ambient time or runtime I/O.", "P0/P2 freshness", "P3-D", "uses supplied time and performs no ambient time or runtime IO", "tests/post-h1-p3-governance-automation.test.ts"),
  definition("POSTH1-P3-SAFE-005", "SAFE", "Identical inputs produce identical recursively immutable outputs.", "P0/P2 determinism", "P3-D", "produces identical recursively immutable output for identical input", "tests/post-h1-p3-governance-report-projection.test.ts"),
] as const);

export const P3_ACCEPTANCE_IDS = Object.freeze(P3_ACCEPTANCE_REGISTRY.map((entry) => entry.id));
export const validateP3AcceptanceRegistry = (registry: readonly P3AcceptanceDefinition[]): Readonly<{ valid: boolean; missingIds: readonly string[] }> => {
  const expected = [4, 3, 2, 2, 5];
  const counts = ["ORCH", "REPORT", "LIFECYCLE", "PRBODY", "SAFE"].map((family) => registry.filter((entry) => entry.family === family).length);
  const ids = registry.map((entry) => entry.id);
  return Object.freeze({ valid: registry.length === 16 && new Set(ids).size === 16 && counts.every((count, index) => count === expected[index]) && registry.every((entry) => entry.testTitles.length > 0 && entry.testFiles.length > 0), missingIds: Object.freeze(P3_ACCEPTANCE_IDS.filter((id) => !ids.includes(id))) });
};