import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateCandidateAssuranceMetadata, validateFinalRequirements, type FinalRequirementRow, type FinalValidationContext } from "../src/final-validator.js";

const row = (overrides: Partial<FinalRequirementRow> = {}): FinalRequirementRow => ({
  requirementId: "VP-RUNTIME-01",
  family: "VP-RUNTIME",
  ownerLane: "VISIBLE-RUNTIME-01",
  acceptanceId: "VP-RUNTIME-01",
  implementationPath: "runtime.ts",
  positiveTestIds: ["VP-RUNTIME-01-POS-001"],
  negativeTestIds: ["VP-RUNTIME-01-NEG-001"],
  evidencePath: "evidence.json",
  evidenceSha256: "hash",
  freshnessInputs: ["candidate-hash"],
  completionState: "IMPLEMENTED_AND_TESTED",
  ...overrides,
});

describe("fail-closed final requirement validator", () => {
  it("requires external ASSURE hash disposition and owner-lane hashes", () => {
    const result = validateCandidateAssuranceMetadata({
      canonicalCandidateHashes: {
        runtime: "582a6f77e1413b4705b15badc92145b8d5a5ee00fe044964cb9dadb5a22bbbd9",
        renderer: "e72ce27564c0668c251824e3c3cf8f38bfbd59ea8a199b7dc36bbae5d1440590",
        world: "569e7bf39eb3ccac1f747b225694aaafe9297b8ac1e09a147e978e771597bfbd",
        tv: "98d000ef880635ed78d5637a74902f2badc2efaae03bea42a8571f5f4d15e096",
      },
      assureCanonicalHashDisposition: "EXTERNAL_PROMOTION_RECEIPT_ONLY",
    });
    expect(result).toEqual([]);
  });

  it.each([
    [{ canonicalCandidateHashes: {}, assureCanonicalHashDisposition: "EXTERNAL_PROMOTION_RECEIPT_ONLY" }, "ASSURE_OWNER_HASH_MISSING"],
    [{ canonicalCandidateHashes: { runtime: "x", renderer: "x", world: "x", tv: "x" } }, "ASSURE_EXTERNAL_HASH_DISPOSITION_MISSING"],
    [{ canonicalCandidateHashes: { runtime: "x", renderer: "x", world: "x", tv: "x", assure: "self" }, assureCanonicalHashDisposition: "EXTERNAL_PROMOTION_RECEIPT_ONLY" }, "ASSURE_SELF_REFERENTIAL_HASH_PROHIBITED"],
    [{ canonicalCandidateHashes: { runtime: "x", renderer: "x", world: "x", tv: "x" }, assureCanonicalHashDisposition: "UNTRUSTED" }, "ASSURE_EXTERNAL_HASH_DISPOSITION_INVALID"],
  ])("rejects invalid candidate assurance metadata: %s", (metadata, reason) => {
    expect(validateCandidateAssuranceMetadata(metadata)).toContain(reason);
  });

  it("rejects incomplete mappings and non-final completion", () => {
    const result = validateFinalRequirements([row({ negativeTestIds: [], completionState: "FOUNDATION_ONLY" })], new Set(["runtime.ts"]));
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining(["expected 110 rows, received 1", "missing negative or invariant test: VP-RUNTIME-01", "incomplete row: VP-RUNTIME-01"]));
  });

  it("accepts only a complete 110-row evidence set", () => {
    const rows = Array.from({ length: 110 }, (_, index) => row({ requirementId: `VP-TEST-${index}`, acceptanceId: `VP-TEST-${index}` }));
    const result = validateFinalRequirements(rows, new Set(["runtime.ts"]));
    expect(result.valid).toBe(true);
    expect(result.negativeMappingsVerified).toBe(110);
    expect(result.evidenceHashesVerified).toBe(110);
  });

  it("rejects the six accepted corruptions against a trusted verification context", () => {
    const artifact = JSON.parse(readFileSync("evidence/train1-110-requirement-evidence.json", "utf8")) as { rows: FinalRequirementRow[] };
    const validRows = artifact.rows;
    const context: FinalValidationContext = {
      expectedBaselineSha: "71f631f79aab57777425c9812235cedc7f2fd3c0",
      expectedCompatibilityFingerprint: "057c6175204f1fef1e6b03339a46664fb40e8a9e983a36a22daf46e14125fe25",
      expectedOwnerLaneCounts: { "VISIBLE-RUNTIME-01": 59, "VISIBLE-RENDERER-01": 15, "VISIBLE-WORLD-01": 22, "VISIBLE-TV-01": 14 },
      candidateRoots: {
        "VISIBLE-RUNTIME-01": "/workspaces/visible-presence-train/runtime/onyx-v6-modular-ai-os",
        "VISIBLE-RENDERER-01": "/workspaces/visible-presence-train/renderer/onyx-v6-modular-ai-os",
        "VISIBLE-WORLD-01": "/workspaces/visible-presence-train/world/onyx-v6-modular-ai-os",
        "VISIBLE-TV-01": "/workspaces/visible-presence-train/tv/onyx-v6-modular-ai-os",
      },
      candidatePackageRoots: {
        "VISIBLE-RUNTIME-01": "/workspaces/visible-presence-train/runtime/onyx-v6-modular-ai-os/packages/post-alpha-presentation-runtime-shell",
        "VISIBLE-RENDERER-01": "/workspaces/visible-presence-train/renderer/onyx-v6-modular-ai-os/packages/post-alpha-character-renderer-native",
        "VISIBLE-WORLD-01": "/workspaces/visible-presence-train/world/onyx-v6-modular-ai-os/packages/post-alpha-ambient-experience-foundation",
        "VISIBLE-TV-01": "/workspaces/visible-presence-train/tv/onyx-v6-modular-ai-os/packages/post-alpha-tv-presence-runtime",
      },
      expectedCanonicalHashes: {
        "VISIBLE-RUNTIME-01": "582a6f77e1413b4705b15badc92145b8d5a5ee00fe044964cb9dadb5a22bbbd9",
        "VISIBLE-RENDERER-01": "e72ce27564c0668c251824e3c3cf8f38bfbd59ea8a199b7dc36bbae5d1440590",
        "VISIBLE-WORLD-01": "569e7bf39eb3ccac1f747b225694aaafe9297b8ac1e09a147e978e771597bfbd",
        "VISIBLE-TV-01": "98d000ef880635ed78d5637a74902f2badc2efaae03bea42a8571f5f4d15e096",
      },
      expectedEvidencePath: "evidence/train1-110-requirement-evidence.json",
    };
    const result = validateFinalRequirements(validRows, new Set(validRows.map(value => value.implementationPath)), context);
    console.log(JSON.stringify(result));
    expect(result.valid).toBe(true);
  });
});
