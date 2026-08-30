import { P4_BOUNDS } from "./p4-governance-assurance-contracts";

export { P4_BOUNDS };

export type P4AcceptanceFamily = "BIND" | "EVIDENCE" | "ASSURE" | "INVALIDATION" | "SAFE";

export type P4AcceptanceDefinition = Readonly<{
  id: string;
  family: P4AcceptanceFamily;
  invariant: string;
  rationale: string;
  predecessorDependency: string;
  implementationWave: "P4-A" | "P4-B" | "P4-C" | "P4-D";
  testTitles: readonly string[];
  blocking: true;
  evidenceRequirement: string;
  testFiles: readonly string[];
}>;

const definition = (
  id: string,
  family: P4AcceptanceFamily,
  invariant: string,
  predecessorDependency: string,
  implementationWave: P4AcceptanceDefinition["implementationWave"],
  testTitles: string | readonly string[],
  testFiles: string | readonly string[]
): P4AcceptanceDefinition =>
  Object.freeze({
    id,
    family,
    invariant,
    rationale: invariant,
    predecessorDependency,
    implementationWave,
    testTitles: Object.freeze(typeof testTitles === "string" ? [testTitles] : [...testTitles]),
    blocking: true,
    evidenceRequirement: "Focused Vitest coverage and local validation evidence are required.",
    testFiles: Object.freeze(typeof testFiles === "string" ? [testFiles] : [...testFiles]),
  });

export const P4_ACCEPTANCE_REGISTRY = Object.freeze([
  definition(
    "POSTH1-P4-BIND-001",
    "BIND",
    "Assurance evidence and certificates are strictly bound to exact repository, base branch/SHA, head branch/SHA, PR number, commit set, changed paths, and target lock.",
    "P0/P1/P2/P3",
    "P4-B",
    "binds assurance evidence and certificates to exact candidate identity and target lock",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-BIND-002",
    "BIND",
    "Cross-candidate evidence or supplied facts from another repository, base, head, PR, target, or profile are rejected and fail-closed.",
    "P0/P1/P2",
    "P4-B",
    "rejects cross-candidate and cross-target evidence fail-closed",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-BIND-003",
    "BIND",
    "Assurance evaluation strictly binds to the exact acceptance registry ID and registry fingerprint, rejecting mismatched or tampered registries.",
    "P0/P2",
    "P4-B",
    "binds evaluation to exact acceptance registry ID and fingerprint",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-BIND-004",
    "BIND",
    "Candidate identity produces a deterministic SHA-256 hash invariant under equivalent input ordering.",
    "P2",
    "P4-B",
    "produces a stable candidate identity hash invariant under equivalent ordering",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-EVIDENCE-001",
    "EVIDENCE",
    "Required evidence classes are deterministically classified (PRESENT, MISSING, STALE, CONTRADICTORY, TARGET_MISMATCHED, SCOPE_MISMATCHED, INVALIDATED, NOT_APPLICABLE) without inventing missing evidence.",
    "P1/P2",
    "P4-B",
    "projects deterministic evidence completeness matrix without inventing evidence",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-EVIDENCE-002",
    "EVIDENCE",
    "Evidence items are canonicalized by stable ID ordering ensuring duplicate rejection and hash stability.",
    "P2/P3",
    "P4-B",
    "canonicalizes evidence item ordering and rejects duplicate evidence IDs",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-EVIDENCE-003",
    "EVIDENCE",
    "Projects a machine-readable, cryptographically bound evidence bundle containing item hashes and evidence-set hash.",
    "P2",
    "P4-B",
    "projects cryptographically bound evidence bundle with evidence-set hash",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-EVIDENCE-004",
    "EVIDENCE",
    "Duplicate evidence IDs and contradictory supplied facts fail closed and are marked in the completeness matrix.",
    "P2",
    "P4-B",
    "fails closed on contradictory supplied facts and marks them in completeness matrix",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-ASSURE-001",
    "ASSURE",
    "Deterministically evaluates P4-local profiles (LOCAL_IMPLEMENTATION_ASSURANCE, PR_MERGE_READINESS_ASSURANCE, MAIN_CLOSURE_ASSURANCE) with distinct requirements.",
    "P1/P2/P3",
    "P4-A",
    "evaluates distinct requirements for each P4-local assurance profile",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-ASSURE-002",
    "ASSURE",
    "Projects a non-authorizing certificate summarizing sealed P1 readiness results, P2 freshness, P3 gates, evidence matrix, blockers, actions, and certificate hash.",
    "P1/P2/P3",
    "P4-C",
    "projects merge-readiness assurance certificate summarizing sealed predecessor results",
    "tests/post-h1-p4-assurance-certificate-projection.test.ts"
  ),
  definition(
    "POSTH1-P4-ASSURE-003",
    "ASSURE",
    "Projects a non-authorizing closure certificate summarizing sealed P1 closure outcomes, merge commit topology, synchronization, post-merge validation, and certificate hash.",
    "P1/P2/P3",
    "P4-C",
    "projects main-closure assurance certificate summarizing closure topology and sync",
    "tests/post-h1-p4-assurance-certificate-projection.test.ts"
  ),
  definition(
    "POSTH1-P4-ASSURE-004",
    "ASSURE",
    "Projects bounded residual risk records with Owner-decision requirements without accepting risk.",
    "P0/P3",
    "P4-C",
    "projects bounded residual risk records requiring Owner decisions without accepting risk",
    "tests/post-h1-p4-assurance-certificate-projection.test.ts"
  ),
  definition(
    "POSTH1-P4-ASSURE-005",
    "ASSURE",
    "Projects a deterministic, human-readable and machine-inspectable assurance report free of raw secrets.",
    "P1/P2/P3",
    "P4-C",
    "projects deterministic non-authorizing assurance report free of raw secrets",
    "tests/post-h1-p4-assurance-certificate-projection.test.ts"
  ),
  definition(
    "POSTH1-P4-INVALIDATION-001",
    "INVALIDATION",
    "Directly reuses P2 freshness assessment semantics without redefining predecessor behavior.",
    "P2",
    "P4-B",
    "reuses P2 freshness assessment semantics directly",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-INVALIDATION-002",
    "INVALIDATION",
    "Projects fail-closed invalidation when head/base SHAs, commits, changed paths, registry fingerprints, test matrix, findings, or approvals drift.",
    "P1/P2",
    "P4-B",
    "projects fail-closed invalidation triggers when candidate or governance facts drift",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-INVALIDATION-003",
    "INVALIDATION",
    "Invalidates closure assurance when main branch moves beyond assessed target, merge commit mismatches, or sync fails.",
    "P1/P2",
    "P4-B",
    "invalidates closure assurance when main moves beyond assessed closure target",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-SAFE-001",
    "SAFE",
    "Every public P4 output carries authority: 'NON_AUTHORIZING' and creates no execution or merge authority.",
    "Factory constitution",
    "P4-D",
    "attaches NON_AUTHORIZING authority marker to every public P4 output",
    "tests/post-h1-p4-assurance-certificate-projection.test.ts"
  ),
  definition(
    "POSTH1-P4-SAFE-002",
    "SAFE",
    "Rejects unknown keys, unsafe prototypes, revoked proxies, and throwing accessors.",
    "Factory constitution",
    "P4-D",
    "rejects unknown keys unsafe prototypes revoked proxies and throwing accessors",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-SAFE-003",
    "SAFE",
    "Strictly enforces P4 bounds and rejects over-bound inputs without silent truncation.",
    "P0/P2 bounds",
    "P4-D",
    "rejects over-bound input without silent or favorable truncation",
    "tests/post-h1-p4-governance-assurance.test.ts"
  ),
  definition(
    "POSTH1-P4-SAFE-004",
    "SAFE",
    "Uses caller-supplied epoch, executes no ambient time or runtime I/O, and freezes all returned outputs recursively.",
    "P0/P2 determinism",
    "P4-D",
    "uses caller-supplied epoch executes no ambient time or IO and returns recursively frozen output",
    "tests/post-h1-p4-assurance-certificate-projection.test.ts"
  ),
] as const);

export const P4_ACCEPTANCE_IDS = Object.freeze(P4_ACCEPTANCE_REGISTRY.map((entry) => entry.id));

export const validateP4AcceptanceRegistry = (
  registry: readonly P4AcceptanceDefinition[]
): Readonly<{ valid: boolean; missingIds: readonly string[] }> => {
  const expectedFamilyCounts = [4, 4, 5, 3, 4];
  const families: P4AcceptanceFamily[] = ["BIND", "EVIDENCE", "ASSURE", "INVALIDATION", "SAFE"];
  const actualCounts = families.map(
    (fam) => registry.filter((entry) => entry.family === fam).length
  );
  const ids = registry.map((entry) => entry.id);
  const valid =
    registry.length === 20 &&
    new Set(ids).size === 20 &&
    actualCounts.every((count, index) => count === expectedFamilyCounts[index]) &&
    registry.every((entry) => entry.testTitles.length > 0 && entry.testFiles.length > 0);
  return Object.freeze({
    valid,
    missingIds: Object.freeze(P4_ACCEPTANCE_IDS.filter((id) => !ids.includes(id))),
  });
};
