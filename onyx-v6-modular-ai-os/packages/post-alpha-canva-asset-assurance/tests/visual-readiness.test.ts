import { describe, expect, it } from "vitest";
import { selectVisualReadinessClass, validateGitCommitSha, validatePromotionRecord } from "../src/index";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const realAssetHash = "6f2226e9b95d7b027f84abe9fa50e18d8a9e27e7885f40ee9f85fb09b8ce6e2a";

const testDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(testDirectory, "../../../..");
const evidencePath = resolve(testDirectory, "../evidence/native-fallback-readiness.json");

function git(args: readonly string[]): string {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

const readinessEvidence = JSON.parse(readFileSync(evidencePath, "utf8")) as {
  promotedReadinessRecords: readonly Record<string, unknown>[];
};
const canonicalPromotion = readinessEvidence.promotedReadinessRecords.find((record) => record.id === "ASSET-NATIVE-SEMANTIC-FALLBACK");
if (!canonicalPromotion) throw new Error("missing ASSET-NATIVE-SEMANTIC-FALLBACK evidence record");

function currentEvidenceFilePath(record: Record<string, unknown>): string {
  const canonicalPath = record.canonicalPath;
  if (typeof canonicalPath !== "string") throw new Error("canonicalPath missing");
  return resolve(repoRoot, canonicalPath);
}

function withOneField(record: Record<string, unknown>, field: string, value: unknown): Readonly<Record<string, unknown>> {
  return Object.freeze({ ...record, [field]: value });
}

describe("visual asset readiness validation", () => {
  it("rejects malformed, expanded, and repeated-character Git identities", () => {
    expect(validateGitCommitSha("263ccc23834e934cb279d1da755a0d617d81d7c8").valid).toBe(true);
    expect(validateGitCommitSha(realAssetHash).valid).toBe(false);
    expect(validateGitCommitSha("a".repeat(40)).valid).toBe(false);
    expect(validateGitCommitSha("not-a-sha").valid).toBe(false);
  });

  it("rejects missing, untracked, hash-mismatched, and governance-incomplete records", () => {
    expect(validatePromotionRecord(canonicalPromotion).valid).toBe(true);
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "fileExists", false)).reasons).toContain("FILE_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "tracked", false)).reasons).toContain("FILE_UNTRACKED");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "sha256Recheck", "32e0dedc271a1812b345b85963dd12bbda727632bb5a0f7b1f43901b18e2716f")).reasons).toContain("HASH_MISMATCH");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "sourceProvenance", "")).reasons).toContain("PROVENANCE_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "licenseRuntimePermission", "")).reasons).toContain("LICENSE_RUNTIME_PERMISSION_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "aiGenerationDisclosure", "")).reasons).toContain("AI_GENERATION_DISCLOSURE_MISSING");
  });

  it("rejects corrupted assets, duplicate IDs, unsupported adapters, missing fallback, and authority leakage", () => {
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "signatureValid", false)).reasons).toContain("FILE_SIGNATURE_INVALID");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "performanceGovernor", "")).reasons).toContain("PERFORMANCE_GOVERNOR_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "fallbackAssetOrNativeFallbackId", "")).reasons).toContain("FALLBACK_OR_DISABLEMENT_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "nonAuthorizing", false)).reasons).toContain("NON_AUTHORITY_DECLARATION_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "classification", "REFERENCE_ONLY")).reasons).toContain("CLASSIFICATION_INVALID");
  });

  it("selects native fallback readiness only when final assets are absent and fallback evidence is complete", () => {
    expect(selectVisualReadinessClass({ promotedFinalAssetCount: 0, nativeFallbackReady: true, duplicateAssetIds: [] }).selectedClass).toBe("NATIVE_FALLBACK_RUNTIME_READINESS_ONLY");
    expect(selectVisualReadinessClass({ promotedFinalAssetCount: 0, nativeFallbackReady: false, duplicateAssetIds: [] }).selectedClass).toBe("ASSET_CREATION_OR_EXPORT_REQUIRED");
    expect(selectVisualReadinessClass({ promotedFinalAssetCount: 0, nativeFallbackReady: true, duplicateAssetIds: ["ASSET-NATIVE-SEMANTIC-FALLBACK"] }).reasons).toContain("DUPLICATE_ASSET_ID");
  });

  it("validates the canonical evidence record against current repository bytes", () => {
    const evidenceFile = currentEvidenceFilePath(canonicalPromotion);
    const relativePath = String(canonicalPromotion.canonicalPath);
    const fileBytes = readFileSync(evidenceFile);
    const byteSize = statSync(evidenceFile).size;
    const sha256 = createHash("sha256").update(fileBytes).digest("hex");
    const gitBlobId = git(["ls-files", "-s", "--", relativePath]).split(/\s+/)[1];

    expect(git(["ls-files", "--error-unmatch", relativePath])).toBe(relativePath);
    expect(byteSize).toBe(canonicalPromotion.byteSize);
    expect(gitBlobId).toBe(canonicalPromotion.gitBlobId);
    expect(sha256).toBe(canonicalPromotion.sha256);
    expect(canonicalPromotion.sha256Recheck).toBe(canonicalPromotion.sha256);
    expect(validatePromotionRecord(canonicalPromotion).valid).toBe(true);
  });

  it("fails closed for canonical schema, governance, classification, fallback, and non-authority defects", () => {
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "sourceProvenance", "")).reasons).toContain("PROVENANCE_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "licenseRuntimePermission", "")).reasons).toContain("LICENSE_RUNTIME_PERMISSION_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "aiGenerationDisclosure", "")).reasons).toContain("AI_GENERATION_DISCLOSURE_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "classification", "REFERENCE_ONLY")).reasons).toContain("CLASSIFICATION_INVALID");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "fallbackAssetOrNativeFallbackId", "")).reasons).toContain("FALLBACK_OR_DISABLEMENT_MISSING");
    expect(validatePromotionRecord(withOneField(canonicalPromotion, "nonAuthorizing", false)).reasons).toContain("NON_AUTHORITY_DECLARATION_MISSING");
  });

  it("fails closed for invalid promoted final asset counts and accepts valid integers", () => {
    for (const promotedFinalAssetCount of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 1.5, "1"] as const) {
      expect(selectVisualReadinessClass({ promotedFinalAssetCount, nativeFallbackReady: true, duplicateAssetIds: [] }).reasons).toEqual(["PROMOTED_FINAL_ASSET_COUNT_INVALID"]);
    }

    expect(selectVisualReadinessClass({ promotedFinalAssetCount: 0, nativeFallbackReady: true, duplicateAssetIds: [] }).selectedClass).toBe("NATIVE_FALLBACK_RUNTIME_READINESS_ONLY");
    expect(selectVisualReadinessClass({ promotedFinalAssetCount: 1, nativeFallbackReady: true, duplicateAssetIds: [] }).selectedClass).toBe("PARTIAL_VISUAL_ASSET_SET_RUNTIME_READY_WITH_NATIVE_FALLBACK");
    expect(selectVisualReadinessClass({ promotedFinalAssetCount: 4, nativeFallbackReady: false, duplicateAssetIds: [] }).selectedClass).toBe("FULL_VISUAL_ASSET_SET_RUNTIME_READY");
  });
});