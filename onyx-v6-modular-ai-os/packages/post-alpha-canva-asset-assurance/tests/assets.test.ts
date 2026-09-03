import { describe, expect, it } from "vitest";
import { buildRegistryCandidate, classifyAsset, detectDuplicates } from "../src/index";

const good = {
  id: "a",
  sha256: "a".repeat(64),
  disclosure: true,
  provenance: "board",
  license: "owned",
  width: 10,
  height: 10,
  format: "webp",
};

describe("local Canva asset assurance", () => {
  it("accepts disclosed, licensed, hashed candidates", () => {
    expect(classifyAsset({ id: "a", sha256: "a".repeat(64), disclosure: true, provenance: "board", license: "owned", width: 10, height: 10, format: "webp" }).classification).toBe("RUNTIME_CANDIDATE");
  });
  it("rejects missing governance facts", () => {
    expect(classifyAsset({ id: "a", sha256: "bad", disclosure: false, provenance: "", license: "", width: 0, height: 0, format: "" }).classification).toBe("REJECTED");
  });
});

describe("T2-CANVA-ASSET-001 governance classification", () => {
  it("T2-CANVA-ASSET-001-POS: classifications follow license, format, and restriction facts", () => {
    expect(classifyAsset(good).classification).toBe("RUNTIME_CANDIDATE");
    expect(classifyAsset({ ...good, license: "reference" }).classification).toBe("EXPORT_CANDIDATE");
    expect(classifyAsset({ ...good, format: "psd" }).classification).toBe("DESIGN_ACCEPTED");
    expect(classifyAsset({ ...good, restrictions: ["NO_RUNTIME"] }).classification).toBe("EXPORT_CANDIDATE");
    expect(classifyAsset({ ...good, restrictions: ["REFERENCE_ONLY"] }).classification).toBe("REFERENCE_ONLY");
    expect(classifyAsset({ ...good, supersededBy: "b" }).classification).toBe("SUPERSEDED");
    expect(classifyAsset({ ...good, revoked: true }).classification).toBe("REJECTED");
  });

  it("T2-CANVA-ASSET-001-NEG: every missing governance fact fails closed with a reason", () => {
    expect(classifyAsset({ ...good, sha256: "nope" }).reasons).toContain("HASH_INVALID");
    expect(classifyAsset({ ...good, disclosure: "yes" }).reasons).toContain("DISCLOSURE_MISSING");
    expect(classifyAsset({ ...good, provenance: "" }).reasons).toContain("PROVENANCE_MISSING");
    expect(classifyAsset({ ...good, license: "" }).reasons).toContain("LICENSE_MISSING");
    expect(classifyAsset({ ...good, width: 0 }).reasons).toContain("WIDTH_INVALID");
    expect(classifyAsset({ ...good, height: -5 }).reasons).toContain("HEIGHT_INVALID");
    expect(classifyAsset({ ...good, format: "" }).reasons).toContain("FORMAT_MISSING");
    expect(classifyAsset(null).classification).toBe("REJECTED");
    expect(classifyAsset({ sha256: "a".repeat(64) }).reasons).toContain("MALFORMED_INPUT");
  });

  it("records AI disclosure without changing authority", () => {
    expect(classifyAsset({ ...good, disclosure: false }).aiDisclosed).toBe(false);
    expect(classifyAsset(good).aiDisclosed).toBe(true);
    expect(classifyAsset(good).immutableCandidateId).toBe(`a@${"a".repeat(12)}`);
  });
});

describe("T2-CANVA-ASSET-002 duplicates and registry candidates", () => {
  it("T2-CANVA-ASSET-002-POS: detects exact, near, and functional duplicate groups", () => {
    const duplicates = detectDuplicates([
      { id: "a", sha256: "a".repeat(64), perceptualHash: "p1", intendedUse: "avatar" },
      { id: "b", sha256: "a".repeat(64), perceptualHash: "p1", intendedUse: "avatar" },
      { id: "c", sha256: "c".repeat(64), perceptualHash: "p9", intendedUse: "world" },
    ]);
    expect(duplicates.exactGroups).toEqual([["a", "b"]]);
    expect(duplicates.nearDuplicates).toEqual([["a", "b"]]);
    expect(duplicates.functionalDuplicates).toEqual([["a", "b"]]);
    expect(duplicates.bounded).toBe(true);
  });

  it("T2-CANVA-ASSET-002-NEG: only runtime candidates may become registry candidates", () => {
    expect(detectDuplicates("nope" as unknown as unknown[]).exactGroups).toEqual([]);
    const accepted = buildRegistryCandidate(classifyAsset(good), "AVATAR");
    expect(accepted).toMatchObject({ accepted: true, kind: "AVATAR", immutable: true });

    const rejected = buildRegistryCandidate(classifyAsset({ ...good, format: "psd" }), "DESIGN");
    expect(rejected.accepted).toBe(false);
    expect(rejected.candidateId).toBeNull();
    expect(rejected.reason).toContain("NOT_RUNTIME_CANDIDATE");
  });
});