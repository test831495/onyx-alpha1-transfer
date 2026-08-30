import { describe, expect, it } from "vitest";
import {
  P4_ACCEPTANCE_IDS,
  P4_ACCEPTANCE_REGISTRY,
  validateP4AcceptanceRegistry,
} from "../src/post-h1/p4-acceptance-registry";
import {
  computeAcceptanceRegistryFingerprint,
} from "../src/post-h1/p4-governance-assurance";
import {
  P4_ASSURANCE_PROFILES,
  P4_BOUNDS,
  P4_EVIDENCE_CLASSIFICATIONS,
  validateP4GovernanceAssuranceInput,
  type P4GovernanceAssuranceInput,
} from "../src/post-h1/p4-governance-assurance-contracts";

describe("Post-H1 P4 Governance Assurance Foundation (Wave P4-A Contracts & Registry)", () => {
  const canonicalFingerprint = computeAcceptanceRegistryFingerprint(P4_ACCEPTANCE_REGISTRY);
  it("defines exact frozen P4 bounds", () => {
    expect(P4_BOUNDS.MAX_DEPTH).toBe(10);
    expect(P4_BOUNDS.MAX_OBJECT_KEYS).toBe(64);
    expect(P4_BOUNDS.MAX_COLLECTION_ITEMS).toBe(64);
    expect(P4_BOUNDS.MAX_EVIDENCE_ITEMS).toBe(64);
    expect(P4_BOUNDS.MAX_CHANGED_PATHS).toBe(128);
    expect(P4_BOUNDS.MAX_COMMITS).toBe(64);
    expect(P4_BOUNDS.MAX_ACCEPTANCE_IDS).toBe(64);
    expect(P4_BOUNDS.MAX_FINDINGS).toBe(32);
    expect(P4_BOUNDS.MAX_REVIEW_THREADS).toBe(32);
    expect(P4_BOUNDS.MAX_BLOCKERS).toBe(32);
    expect(P4_BOUNDS.MAX_WARNINGS).toBe(32);
    expect(P4_BOUNDS.MAX_GAPS).toBe(32);
    expect(P4_BOUNDS.MAX_CONTRADICTIONS).toBe(32);
    expect(P4_BOUNDS.MAX_HUMAN_ACTIONS).toBe(16);
    expect(P4_BOUNDS.MAX_OWNER_DECISIONS).toBe(16);
    expect(P4_BOUNDS.MAX_INVALIDATION_TRIGGERS).toBe(32);
    expect(P4_BOUNDS.MAX_RESIDUAL_RISKS).toBe(16);
    expect(P4_BOUNDS.MAX_PROVENANCE_ENTRIES).toBe(32);
    expect(P4_BOUNDS.MAX_STRING_LENGTH).toBe(1024);
    expect(P4_BOUNDS.MAX_REPORT_SECTION_LENGTH).toBe(2048);
    expect(P4_BOUNDS.MAX_CERTIFICATE_SERIALIZATION_LENGTH).toBe(8192);
  });

  it("defines exact frozen P4 assurance profiles and evidence classifications", () => {
    expect(P4_ASSURANCE_PROFILES).toEqual([
      "LOCAL_IMPLEMENTATION_ASSURANCE",
      "PR_MERGE_READINESS_ASSURANCE",
      "MAIN_CLOSURE_ASSURANCE",
    ]);
    expect(P4_EVIDENCE_CLASSIFICATIONS).toEqual([
      "PRESENT",
      "MISSING",
      "STALE",
      "CONTRADICTORY",
      "TARGET_MISMATCHED",
      "SCOPE_MISMATCHED",
      "INVALIDATED",
      "NOT_APPLICABLE",
    ]);
  });

  it("validates closed acceptance registry count and family counts", () => {
    expect(P4_ACCEPTANCE_REGISTRY.length).toBe(20);
    expect(P4_ACCEPTANCE_IDS.length).toBe(20);
    const validation = validateP4AcceptanceRegistry(P4_ACCEPTANCE_REGISTRY);
    expect(validation.valid).toBe(true);
    expect(validation.missingIds).toEqual([]);

    const bind = P4_ACCEPTANCE_REGISTRY.filter((e) => e.family === "BIND");
    const evidence = P4_ACCEPTANCE_REGISTRY.filter((e) => e.family === "EVIDENCE");
    const assure = P4_ACCEPTANCE_REGISTRY.filter((e) => e.family === "ASSURE");
    const invalidation = P4_ACCEPTANCE_REGISTRY.filter((e) => e.family === "INVALIDATION");
    const safe = P4_ACCEPTANCE_REGISTRY.filter((e) => e.family === "SAFE");

    expect(bind.length).toBe(4);
    expect(evidence.length).toBe(4);
    expect(assure.length).toBe(5);
    expect(invalidation.length).toBe(3);
    expect(safe.length).toBe(4);
  });

  it("rejects tampered or incomplete acceptance registry in validator", () => {
    const incomplete = P4_ACCEPTANCE_REGISTRY.slice(0, 19);
    const check = validateP4AcceptanceRegistry(incomplete);
    expect(check.valid).toBe(false);
    expect(check.missingIds.length).toBe(1);
  });

  it("validates input contract closed-schema and non-authorizing marker", () => {
    const validCandidate = {
      repository: "test831495/onyx-alpha1-transfer",
      baseBranch: "main",
      baseSha: "05155a33209de25ba7805d61bf337366b82ff730",
      headBranch: "feature/post-h1-p4-governance-assurance-foundation",
      headSha: "05155a33209de25ba7805d61bf337366b82ff730",
      commits: ["05155a33209de25ba7805d61bf337366b82ff730"],
      changedPaths: ["packages/ai-development-factory-foundation/src/index.ts"],
    };

    const validInput: P4GovernanceAssuranceInput = {
      evaluationEpochMilliseconds: 1756512000000,
      profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
      candidate: validCandidate,
      acceptanceRegistry: { id: "P4_ACCEPTANCE_REGISTRY", count: 20, fingerprint: "p4-fingerprint-test" },
      evidenceItems: [{ id: "ev-1", evidenceClass: "FOCUSED_TESTS", hash: "abc", provenance: "local", observedAtEpochMilliseconds: 1756512000000, fresh: true }],
      provenance: [{ id: "prov-1", source: "local-run" }],
    };

    const result = validateP4GovernanceAssuranceInput(validInput);
    expect(result.outcome).toBe("PASS");
    expect(result.authority).toBe("NON_AUTHORIZING");
    expect(result.reasons).toEqual([]);
  });

  it("rejects invalid input schema or unknown properties", () => {
    const invalidInput = {
      evaluationEpochMilliseconds: 1756512000000,
      profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
      candidate: {
        repository: "test831495/onyx-alpha1-transfer",
        baseBranch: "main",
        baseSha: "05155a33209de25ba7805d61bf337366b82ff730",
        headBranch: "feature/post-h1-p4-governance-assurance-foundation",
        headSha: "05155a33209de25ba7805d61bf337366b82ff730",
        commits: [],
        changedPaths: [],
      },
      acceptanceRegistry: {},
      evidenceItems: [],
      provenance: [],
      unknownProperty: "malicious",
    };

    const result = validateP4GovernanceAssuranceInput(invalidInput);
    expect(result.outcome).toBe("NOT_ASSESSABLE");
    expect(result.authority).toBe("NON_AUTHORIZING");
    expect(result.reasons).toContain("P4_INPUT_UNEXPECTED_FIELD");

    const nonObject = validateP4GovernanceAssuranceInput("not-an-object");
    expect(nonObject.outcome).toBe("NOT_ASSESSABLE");
    expect(nonObject.authority).toBe("NON_AUTHORIZING");
    expect(nonObject.reasons).toContain("P4_INPUT_UNVERIFIABLE");
  });

  describe("Wave P4-B: Candidate Binding, Evidence Completeness, Bundling & Invalidation", () => {
    const baseCandidate = Object.freeze({
      repository: "test831495/onyx-alpha1-transfer",
      baseBranch: "main",
      baseSha: "05155a33209de25ba7805d61bf337366b82ff730",
      headBranch: "feature/post-h1-p4-governance-assurance-foundation",
      headSha: "05155a33209de25ba7805d61bf337366b82ff730",
      prNumber: 30,
      commits: ["05155a33209de25ba7805d61bf337366b82ff730"],
      changedPaths: [
        "packages/ai-development-factory-foundation/src/post-h1/p4-governance-assurance.ts",
      ],
      targetLockFingerprint: "lock-fingerprint-001",
    });

    it("POSTH1-P4-BIND-001: binds assurance evidence and certificates to exact candidate identity and target lock", async () => {
      const { evaluateP4GovernanceAssurance, computeAcceptanceRegistryFingerprint } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const derivedFingerprint = computeAcceptanceRegistryFingerprint(P4_ACCEPTANCE_REGISTRY);

      const input: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: derivedFingerprint,
        },
        evidenceItems: [
          {
            id: "ev-test-1",
            evidenceClass: "FOCUSED_TESTS",
            hash: "hash-test-1",
            provenance: "vitest",
            observedAtEpochMilliseconds: 1756512000000,
            fresh: true,
          },
        ],
        provenance: [{ id: "prov-1", tool: "local-evaluator" }],
      };

      const result = evaluateP4GovernanceAssurance(input);
      expect(result.authority).toBe("NON_AUTHORIZING");
      expect(result.candidate.repository).toBe("test831495/onyx-alpha1-transfer");
      expect(result.candidate.headSha).toBe("05155a33209de25ba7805d61bf337366b82ff730");
      expect(result.candidateHash).toBeDefined();
      expect(typeof result.candidateHash).toBe("string");
    });

    it("P4-PR30-FINDING-001: provider-neutral candidate repository validation with targetLock", async () => {
      const { evaluateP4GovernanceAssurance, computeAcceptanceRegistryFingerprint } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const customRepoCandidate = {
        ...baseCandidate,
        repository: "custom-org/custom-repo",
      };

      const derivedFingerprint = computeAcceptanceRegistryFingerprint(P4_ACCEPTANCE_REGISTRY);

      const input: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: customRepoCandidate,
        targetLock: {
          repository: "custom-org/custom-repo",
          baseBranch: "main",
          headSha: "05155a33209de25ba7805d61bf337366b82ff730",
        },
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: derivedFingerprint,
        },
        evidenceItems: [],
        provenance: [],
      };

      const result = evaluateP4GovernanceAssurance(input);
      expect(result.blockers).not.toContain("CROSS_CANDIDATE_OR_TARGET_MISMATCH");

      const mismatchedLockInput = {
        ...input,
        targetLock: {
          repository: "different-org/different-repo",
          baseBranch: "main",
          headSha: "05155a33209de25ba7805d61bf337366b82ff730",
        },
      };
      const mismatchResult = evaluateP4GovernanceAssurance(mismatchedLockInput);
      expect(mismatchResult.blockers).toContain("CROSS_CANDIDATE_OR_TARGET_MISMATCH");
    });

    it("POSTH1-P4-BIND-002: rejects cross-candidate and cross-target evidence fail-closed", async () => {
      const { evaluateP4GovernanceAssurance } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const mismatchedTargetCandidate = {
        ...baseCandidate,
        repository: "other-org/other-repo",
      };

      const input: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "PR_MERGE_READINESS_ASSURANCE",
        candidate: mismatchedTargetCandidate,
        targetLock: {
          repository: "test831495/onyx-alpha1-transfer",
          baseBranch: "main",
          headSha: "05155a33209de25ba7805d61bf337366b82ff730",
        },
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: canonicalFingerprint,
        },
        evidenceItems: [],
        provenance: [],
      };

      const result = evaluateP4GovernanceAssurance(input);
      expect(result.authority).toBe("NON_AUTHORIZING");
      expect(result.disposition).toBe("NOT_ASSESSABLE");
      expect(result.blockers).toContain("CROSS_CANDIDATE_OR_TARGET_MISMATCH");
    });

    it("POSTH1-P4-BIND-003: binds evaluation to exact acceptance registry ID and fingerprint", async () => {
      const { evaluateP4GovernanceAssurance } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const tamperedRegistryInput: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "TAMPERED_REGISTRY",
          count: 5,
          fingerprint: "tampered-fingerprint",
        },
        evidenceItems: [],
        provenance: [],
      };

      const result = evaluateP4GovernanceAssurance(tamperedRegistryInput);
      expect(result.disposition).toBe("NOT_ASSESSABLE");
      expect(result.blockers).toContain("ACCEPTANCE_REGISTRY_UNVERIFIED");
    });

    it("POSTH1-P4-BIND-004: produces a stable candidate identity hash invariant under equivalent ordering", async () => {
      const { computeCandidateIdentityHash } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const cand1 = {
        ...baseCandidate,
        changedPaths: ["b.ts", "a.ts"],
        commits: ["sha2", "sha1"],
      };

      const cand2 = {
        ...baseCandidate,
        changedPaths: ["a.ts", "b.ts"],
        commits: ["sha1", "sha2"],
      };

      const hash1 = computeCandidateIdentityHash(cand1);
      const hash2 = computeCandidateIdentityHash(cand2);
      expect(hash1).toBe(hash2);
    });

    it("POSTH1-P4-EVIDENCE-001: projects deterministic evidence completeness matrix without inventing evidence", async () => {
      const { projectEvidenceCompletenessMatrix } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const matrix = projectEvidenceCompletenessMatrix(
        "LOCAL_IMPLEMENTATION_ASSURANCE",
        baseCandidate,
        [
          {
            id: "ev-1",
            evidenceClass: "FOCUSED_TESTS",
            hash: "f-hash",
            provenance: "vitest",
            observedAtEpochMilliseconds: 1756512000000,
            fresh: true,
          },
        ]
      );

      expect(matrix.authority).toBe("NON_AUTHORIZING");
      expect(matrix.totalClasses).toBe(20);
      expect(matrix.presentCount).toBeGreaterThanOrEqual(1);
      expect(matrix.missingCount).toBeGreaterThanOrEqual(1);

      const focused = matrix.entries.find((e) => e.evidenceClass === "FOCUSED_TESTS");
      expect(focused?.classification).toBe("PRESENT");

      const mergeTopology = matrix.entries.find(
        (e) => e.evidenceClass === "MERGE_TOPOLOGY"
      );
      // For local implementation assurance, merge topology is not applicable
      expect(mergeTopology?.classification).toBe("NOT_APPLICABLE");
    });

    it("POSTH1-P4-EVIDENCE-002: canonicalizes evidence item ordering and rejects duplicate evidence IDs", async () => {
      const { projectP4EvidenceBundle } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const items = [
        {
          id: "ev-z",
          evidenceClass: "PACKAGE_TYPECHECK" as const,
          hash: "h-z",
          provenance: "tsc",
          observedAtEpochMilliseconds: 1756512000000,
          fresh: true,
        },
        {
          id: "ev-a",
          evidenceClass: "FOCUSED_TESTS" as const,
          hash: "h-a",
          provenance: "vitest",
          observedAtEpochMilliseconds: 1756512000000,
          fresh: true,
        },
      ];

      const input: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: canonicalFingerprint,
        },
        evidenceItems: items,
        provenance: [],
      };

      const bundle = projectP4EvidenceBundle(input);
      expect(bundle.items.map((i) => i.id)).toEqual(["ev-a", "ev-z"]);

      const duplicateInput = {
        ...input,
        evidenceItems: [items[0], items[0]],
      };
      const duplicateBundle = projectP4EvidenceBundle(duplicateInput);
      expect(duplicateBundle.contradictions).toContain("DUPLICATE_EVIDENCE_ID");
    });

    it("POSTH1-P4-EVIDENCE-003: projects cryptographically bound evidence bundle with evidence-set hash", async () => {
      const { projectP4EvidenceBundle } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const input: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: canonicalFingerprint,
        },
        evidenceItems: [
          {
            id: "ev-1",
            evidenceClass: "FOCUSED_TESTS",
            hash: "h1",
            provenance: "vitest",
            observedAtEpochMilliseconds: 1756512000000,
            fresh: true,
          },
        ],
        provenance: [],
      };

      const bundle = projectP4EvidenceBundle(input);
      expect(bundle.authority).toBe("NON_AUTHORIZING");
      expect(bundle.evidenceSetHash).toBeDefined();
      expect(bundle.evidenceSetHash.length).toBe(64);
    });

    it("POSTH1-P4-EVIDENCE-004: fails closed on contradictory supplied facts and marks them in completeness matrix", async () => {
      const { evaluateP4GovernanceAssurance } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const input: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "PR_MERGE_READINESS_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: canonicalFingerprint,
        },
        evidenceItems: [
          {
            id: "ev-1",
            evidenceClass: "REVIEW_FINDINGS",
            hash: "h-open",
            provenance: "review",
            observedAtEpochMilliseconds: 1756512000000,
            fresh: true,
          },
        ],
        suppliedFacts: {
          findingsClosed: true,
          unresolvedFindingCount: 2, // Contradiction: findingsClosed=true but count=2
        },
        provenance: [],
      };

      const result = evaluateP4GovernanceAssurance(input);
      expect(result.disposition).toBe("NOT_ASSESSABLE");
      expect(result.blockers).toContain("CONTRADICTORY_SUPPLIED_FACTS");
    });

    it("POSTH1-P4-INVALIDATION-001: reuses P2 freshness assessment semantics directly", async () => {
      const { evaluateP4GovernanceAssurance } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const staleEpoch = 1756512000000 - 100000000; // Older than maxAge (24h)
      const input: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: canonicalFingerprint,
        },
        evidenceItems: [
          {
            id: "ev-stale",
            evidenceClass: "FOCUSED_TESTS",
            hash: "h-stale",
            provenance: "vitest",
            observedAtEpochMilliseconds: staleEpoch,
            fresh: false,
          },
        ],
        provenance: [],
      };

      const result = evaluateP4GovernanceAssurance(input);
      expect(result.invalidationTriggers).toContain("EVIDENCE_STALE");
    });

    it("POSTH1-P4-INVALIDATION-002: projects fail-closed invalidation triggers when candidate or governance facts drift", async () => {
      const { projectP4AssuranceInvalidation } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const input: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "PR_MERGE_READINESS_ASSURANCE",
        candidate: {
          ...baseCandidate,
          headSha: "0000000000000000000000000000000000000000",
        },
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: "drifted-fingerprint",
        },
        evidenceItems: [],
        provenance: [],
      };

      const triggers = projectP4AssuranceInvalidation(input, {
        authority: "NON_AUTHORIZING",
        totalClasses: 20,
        presentCount: 0,
        missingCount: 20,
        staleCount: 0,
        contradictoryCount: 0,
        mismatchedCount: 0,
        invalidatedCount: 0,
        notApplicableCount: 0,
        entries: [],
      });

      expect(triggers).toContain("ACCEPTANCE_REGISTRY_FINGERPRINT_CHANGED");
      expect(triggers).toContain("MANDATORY_EVIDENCE_MISSING");
    });

    it("P4-PR30-FINDING-002: rejects malformed residual risk IDs and prevents undefined interpolation", async () => {
      const { evaluateP4GovernanceAssurance, computeAcceptanceRegistryFingerprint } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const derivedFingerprint = computeAcceptanceRegistryFingerprint(P4_ACCEPTANCE_REGISTRY);

      const invalidRiskInput: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "PR_MERGE_READINESS_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: derivedFingerprint,
        },
        evidenceItems: [],
        residualRisks: [
          {
            description: "No riskId provided",
            ownerDecisionRequired: true,
          },
        ],
        provenance: [],
      };

      const result = evaluateP4GovernanceAssurance(invalidRiskInput);
      expect(result.disposition).toBe("NOT_ASSESSABLE");
      expect(result.ownerDecisions.some((d) => d.includes("undefined"))).toBe(false);
      expect(result.ownerDecisions.length).toBe(0);
    });

    it("P4-PR30-FINDING-003: acceptance registry fingerprint is derived from canonical registry definitions", async () => {
      const { computeAcceptanceRegistryFingerprint, evaluateP4GovernanceAssurance } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const canonicalFingerprint = computeAcceptanceRegistryFingerprint(P4_ACCEPTANCE_REGISTRY);
      expect(typeof canonicalFingerprint).toBe("string");
      expect(canonicalFingerprint.length).toBe(64);

      // Equivalent ordering produces identical fingerprint
      const reorderedRegistry = [...P4_ACCEPTANCE_REGISTRY].reverse();
      const reorderedFingerprint = computeAcceptanceRegistryFingerprint(reorderedRegistry);
      expect(reorderedFingerprint).toBe(canonicalFingerprint);

      // Semantic modification produces different fingerprint
      const modifiedRegistry = [
        ...P4_ACCEPTANCE_REGISTRY.slice(1),
        {
          ...P4_ACCEPTANCE_REGISTRY[0],
          id: "POSTH1-P4-BIND-001",
          invariant: "Modified invariant text",
        },
      ];
      const modifiedFingerprint = computeAcceptanceRegistryFingerprint(modifiedRegistry as any);
      expect(modifiedFingerprint).not.toBe(canonicalFingerprint);

      // Hardcoded test literal should now fail if not matching derived fingerprint
      const staleFingerprintInput: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: "stale-literal-not-derived",
        },
        evidenceItems: [],
        provenance: [],
      };
      const checkResult = evaluateP4GovernanceAssurance(staleFingerprintInput);
      expect(checkResult.invalidationTriggers).toContain("ACCEPTANCE_REGISTRY_FINGERPRINT_CHANGED");
    });

    it("P4-PR30-FINDING-004: supports up to 128 changedPaths at top-level but caps nested arrays at 64", () => {
      const paths128 = Array.from({ length: 128 }, (_, i) => `src/file-${i}.ts`);
      const candidate128 = {
        repository: "test831495/onyx-alpha1-transfer",
        baseBranch: "main",
        baseSha: "05155a33209de25ba7805d61bf337366b82ff730",
        headBranch: "feature/post-h1-p4-governance-assurance-foundation",
        headSha: "05155a33209de25ba7805d61bf337366b82ff730",
        commits: ["05155a33209de25ba7805d61bf337366b82ff730"],
        changedPaths: paths128,
      };

      const input128: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: candidate128,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: "derived",
        },
        evidenceItems: [],
        provenance: [],
      };

      const validCheck = validateP4GovernanceAssuranceInput(input128);
      expect(validCheck.reasons).not.toContain("P4_INPUT_BOUND_EXCEEDED");

      // 129 changed paths exceeds bound
      const paths129 = Array.from({ length: 129 }, (_, i) => `src/file-${i}.ts`);
      const candidate129 = { ...candidate128, changedPaths: paths129 };
      const invalidCheck = validateP4GovernanceAssuranceInput({ ...input128, candidate: candidate129 });
      expect(invalidCheck.outcome).toBe("NOT_ASSESSABLE");

      // Nested array in candidate or other object with 65 items must be rejected
      const candidateNestedOverbound = {
        ...candidate128,
        commits: Array.from({ length: 65 }, () => "05155a33209de25ba7805d61bf337366b82ff730"),
      };
      const nestedCheck = validateP4GovernanceAssuranceInput({ ...input128, candidate: candidateNestedOverbound });
      expect(nestedCheck.outcome).toBe("NOT_ASSESSABLE");
    });

    it("P4-PR30-FINDING-005: candidate validation strictly enforces string types and member schemas", () => {
      const invalidCandidates = [
        { ...baseCandidate, repository: "" },
        { ...baseCandidate, baseSha: "short-sha" },
        { ...baseCandidate, commits: [123 as any] },
        { ...baseCandidate, commits: [{ obj: "malformed" } as any] },
        { ...baseCandidate, changedPaths: [null as any] },
        { ...baseCandidate, changedPaths: [["nested-array"] as any] },
        { ...baseCandidate, prNumber: -5 },
      ];

      for (const cand of invalidCandidates) {
        const input: P4GovernanceAssuranceInput = {
          evaluationEpochMilliseconds: 1756512000000,
          profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
          candidate: cand,
          acceptanceRegistry: {
            id: "P4_ACCEPTANCE_REGISTRY",
            count: 20,
            fingerprint: "derived",
          },
          evidenceItems: [],
          provenance: [],
        };
        const validation = validateP4GovernanceAssuranceInput(input);
        expect(validation.outcome).toBe("NOT_ASSESSABLE");
      }
    });

    it("P4-PR30-FINDING-007: projectEvidenceCompletenessMatrix fails closed on duplicate evidenceClass", async () => {
      const { projectEvidenceCompletenessMatrix, evaluateP4GovernanceAssurance, computeAcceptanceRegistryFingerprint } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const itemsWithDuplicate = [
        {
          id: "ev-1",
          evidenceClass: "FOCUSED_TESTS",
          hash: "hash-1",
          provenance: "vitest",
          observedAtEpochMilliseconds: 1756512000000,
          fresh: true,
        },
        {
          id: "ev-2",
          evidenceClass: "FOCUSED_TESTS",
          hash: "hash-2-conflicting",
          provenance: "vitest",
          observedAtEpochMilliseconds: 1756512000000,
          fresh: false,
        },
      ];

      const matrix = projectEvidenceCompletenessMatrix(
        "LOCAL_IMPLEMENTATION_ASSURANCE",
        baseCandidate,
        itemsWithDuplicate
      );

      const focusedEntry = matrix.entries.find((e) => e.evidenceClass === "FOCUSED_TESTS");
      expect(focusedEntry?.classification).toBe("CONTRADICTORY");

      const derivedFingerprint = computeAcceptanceRegistryFingerprint(P4_ACCEPTANCE_REGISTRY);

      const input: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: derivedFingerprint,
        },
        evidenceItems: itemsWithDuplicate,
        provenance: [],
      };

      const result = evaluateP4GovernanceAssurance(input);
      expect(result.disposition).toBe("NOT_ASSESSABLE");
      expect(result.blockers).toContain("CONTRADICTORY_SUPPLIED_FACTS");
    });

    it("POSTH1-P4-ASSURE-001: evaluates distinct requirements for each P4-local assurance profile", async () => {
      const { projectEvidenceCompletenessMatrix } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      const localMatrix = projectEvidenceCompletenessMatrix(
        "LOCAL_IMPLEMENTATION_ASSURANCE",
        baseCandidate,
        []
      );
      const prMatrix = projectEvidenceCompletenessMatrix(
        "PR_MERGE_READINESS_ASSURANCE",
        baseCandidate,
        []
      );
      const closureMatrix = projectEvidenceCompletenessMatrix(
        "MAIN_CLOSURE_ASSURANCE",
        baseCandidate,
        []
      );

      // Local implementation assurance requires 13 classes (7 not applicable)
      expect(localMatrix.notApplicableCount).toBe(7);
      expect(localMatrix.missingCount).toBe(13);

      // PR merge readiness requires 16 classes (4 not applicable: MERGE_TOPOLOGY, MAIN_SYNCHRONIZATION, POST_MERGE_VALIDATION, CLOSURE_EVIDENCE)
      expect(prMatrix.notApplicableCount).toBe(4);
      expect(prMatrix.missingCount).toBe(16);

      // Main closure assurance requires all 20 classes (0 not applicable)
      expect(closureMatrix.notApplicableCount).toBe(0);
      expect(closureMatrix.missingCount).toBe(20);
    });

    it("POSTH1-P4-SAFE-002: rejects unknown keys unsafe prototypes revoked proxies and throwing accessors", async () => {
      const { evaluateP4GovernanceAssurance } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      // Null-prototype object should be handled safely
      const nullProtoInput = Object.create(null);
      nullProtoInput.evaluationEpochMilliseconds = 1756512000000;
      nullProtoInput.profile = "LOCAL_IMPLEMENTATION_ASSURANCE";
      nullProtoInput.candidate = baseCandidate;
      nullProtoInput.acceptanceRegistry = {
        id: "P4_ACCEPTANCE_REGISTRY",
        count: 20,
        fingerprint: canonicalFingerprint,
      };
      nullProtoInput.evidenceItems = [];
      nullProtoInput.provenance = [];

      const nullResult = evaluateP4GovernanceAssurance(nullProtoInput);
      expect(nullResult.authority).toBe("NON_AUTHORIZING");

      // Hostile throwing accessor
      const throwingObj: Record<string, unknown> = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: baseCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: canonicalFingerprint,
        },
        evidenceItems: [],
        provenance: [],
      };
      Object.defineProperty(throwingObj, "hostileProp", {
        get() {
          throw new Error("HOSTILE_ACCESSOR_DETONATION");
        },
        enumerable: true,
      });

      const throwingResult = evaluateP4GovernanceAssurance(throwingObj);
      expect(throwingResult.disposition).toBe("NOT_ASSESSABLE");

      // Revoked proxy
      const { proxy, revoke } = Proxy.revocable(
        { ...nullProtoInput },
        {}
      );
      revoke();
      const revokedResult = evaluateP4GovernanceAssurance(proxy);
      expect(revokedResult.disposition).toBe("NOT_ASSESSABLE");
    });

    it("POSTH1-P4-SAFE-003: rejects over-bound input without silent or favorable truncation", async () => {
      const { evaluateP4GovernanceAssurance } = await import(
        "../src/post-h1/p4-governance-assurance"
      );

      // Exceed MAX_STRING_LENGTH
      const oversizedCandidate = {
        ...baseCandidate,
        repository: "a".repeat(P4_BOUNDS.MAX_STRING_LENGTH + 1),
      };

      const oversizedInput: P4GovernanceAssuranceInput = {
        evaluationEpochMilliseconds: 1756512000000,
        profile: "LOCAL_IMPLEMENTATION_ASSURANCE",
        candidate: oversizedCandidate,
        acceptanceRegistry: {
          id: "P4_ACCEPTANCE_REGISTRY",
          count: 20,
          fingerprint: "p4-fingerprint-test",
        },
        evidenceItems: [],
        provenance: [],
      };

      const result = evaluateP4GovernanceAssurance(oversizedInput);
      expect(result.disposition).toBe("NOT_ASSESSABLE");
      expect(result.blockers).toContain("P4_INPUT_UNVERIFIABLE");

      // Exceed MAX_EVIDENCE_ITEMS
      const tooManyItems = Array.from({ length: P4_BOUNDS.MAX_EVIDENCE_ITEMS + 1 }, (_, i) => ({
        id: `ev-${i}`,
        evidenceClass: "FOCUSED_TESTS",
        hash: `hash-${i}`,
        provenance: "vitest",
        observedAtEpochMilliseconds: 1756512000000,
        fresh: true,
      }));

      const tooManyInput = {
        ...oversizedInput,
        candidate: baseCandidate,
        evidenceItems: tooManyItems,
      };

      const tooManyResult = evaluateP4GovernanceAssurance(tooManyInput);
      expect(tooManyResult.disposition).toBe("NOT_ASSESSABLE");
    });
  });
});
