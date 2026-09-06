import { describe, expect, it } from "vitest";
import { selectVisualReadinessClass, validateGitCommitSha, validatePromotionRecord } from "../src/index";

const realAssetHash = "6f2226e9b95d7b027f84abe9fa50e18d8a9e27e7885f40ee9f85fb09b8ce6e2a";

const validPromotion = {
  id: "ASSET-NATIVE-SEMANTIC-FALLBACK",
  canonicalPath: "onyx-v6-modular-ai-os/packages/post-alpha-character-renderer-native/src/index.ts",
  tracked: true,
  fileExists: true,
  gitBlobId: "c5c7fc662ee86f9798e63ea7fce6c90f11e9d911",
  sha256: realAssetHash,
  sha256Recheck: realAssetHash,
  byteSize: 2048,
  mediaType: "repository-native-semantic-fallback",
  signatureValid: true,
  provenance: "repository-native implementation; no external asset",
  license: "owned",
  aiDisclosure: "not-applicable",
  intendedUse: "provider-free semantic visual fallback readiness",
  restrictions: ["NO_RUNTIME_ACTIVATION_IN_THIS_GATE"],
  version: "1.0.0",
  classification: "RUNTIME_CANDIDATE",
  adapterCompatible: true,
  fallbackId: "TEXT_SAFE_PRESENCE",
  performanceGovernor: true,
  accessibility: true,
  reducedMotion: true,
  rollbackVersion: "prior-main",
  revocationCodes: ["ASSET_REVOKED", "PROVENANCE_REVOKED", "HASH_MISMATCH"],
  externalRuntimeDependency: false,
  privacySensitive: false,
  nonAuthorizing: true,
};

describe("visual asset readiness validation", () => {
  it("rejects malformed, expanded, and repeated-character Git identities", () => {
    expect(validateGitCommitSha("263ccc23834e934cb279d1da755a0d617d81d7c8").valid).toBe(true);
    expect(validateGitCommitSha(realAssetHash).valid).toBe(false);
    expect(validateGitCommitSha("a".repeat(40)).valid).toBe(false);
    expect(validateGitCommitSha("not-a-sha").valid).toBe(false);
  });

  it("rejects missing, untracked, hash-mismatched, and governance-incomplete records", () => {
    expect(validatePromotionRecord({ ...validPromotion }).valid).toBe(true);
    expect(validatePromotionRecord({ ...validPromotion, fileExists: false }).reasons).toContain("FILE_MISSING");
    expect(validatePromotionRecord({ ...validPromotion, tracked: false }).reasons).toContain("FILE_UNTRACKED");
    expect(validatePromotionRecord({ ...validPromotion, sha256Recheck: "32e0dedc271a1812b345b85963dd12bbda727632bb5a0f7b1f43901b18e2716f" }).reasons).toContain("HASH_MISMATCH");
    expect(validatePromotionRecord({ ...validPromotion, provenance: "" }).reasons).toContain("PROVENANCE_MISSING");
    expect(validatePromotionRecord({ ...validPromotion, license: "" }).reasons).toContain("LICENSE_MISSING");
    expect(validatePromotionRecord({ ...validPromotion, aiDisclosure: "" }).reasons).toContain("AI_DISCLOSURE_MISSING");
  });

  it("rejects corrupted assets, duplicate IDs, unsupported adapters, missing fallback, and authority leakage", () => {
    expect(validatePromotionRecord({ ...validPromotion, signatureValid: false }).reasons).toContain("FILE_SIGNATURE_INVALID");
    expect(validatePromotionRecord({ ...validPromotion, adapterCompatible: false }).reasons).toContain("ADAPTER_UNSUPPORTED");
    expect(validatePromotionRecord({ ...validPromotion, fallbackId: "" }).reasons).toContain("FALLBACK_MISSING");
    expect(validatePromotionRecord({ ...validPromotion, nonAuthorizing: false }).reasons).toContain("AUTHORITY_LEAKAGE");
    expect(validatePromotionRecord({ ...validPromotion, classification: "REFERENCE_ONLY" }).reasons).toContain("CLASSIFICATION_NOT_PROMOTABLE");
  });

  it("selects native fallback readiness only when final assets are absent and fallback evidence is complete", () => {
    expect(selectVisualReadinessClass({ promotedFinalAssetCount: 0, nativeFallbackReady: true, duplicateAssetIds: [] }).selectedClass).toBe("NATIVE_FALLBACK_RUNTIME_READINESS_ONLY");
    expect(selectVisualReadinessClass({ promotedFinalAssetCount: 0, nativeFallbackReady: false, duplicateAssetIds: [] }).selectedClass).toBe("ASSET_CREATION_OR_EXPORT_REQUIRED");
    expect(selectVisualReadinessClass({ promotedFinalAssetCount: 0, nativeFallbackReady: true, duplicateAssetIds: ["ASSET-NATIVE-SEMANTIC-FALLBACK"] }).reasons).toContain("DUPLICATE_ASSET_ID");
  });
});