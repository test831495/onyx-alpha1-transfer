/**
 * LANE_F local Canva asset assurance.
 * Deterministic, local-first, provider-neutral. No Canva API, Azure, or network access.
 */

import {
  ASSET_CLASSIFICATIONS,
  MAX_COLLECTION_SIZE,
  REGISTRY_KINDS,
  deepFreeze,
  isBoundedString,
  isPlainObject,
  isSha256Hex,
} from "../../post-alpha-visible-presence-integration-contracts/src/index";

export type AssetClassification = (typeof ASSET_CLASSIFICATIONS)[number];
export type RegistryKind = (typeof REGISTRY_KINDS)[number];

const RUNTIME_FORMATS = ["webp", "png", "svg", "riv", "lottie", "webm"] as const;
const RUNTIME_LICENSES = ["owned", "licensed-runtime"] as const;

function isNonDummySha256(value: unknown): boolean {
  return isSha256Hex(value) && !/^(.)\1{63}$/.test(value);
}

export type AssetFacts = Readonly<{
  id: string;
  sha256: string;
  disclosure: boolean;
  provenance: string;
  license: string;
  width: number;
  height: number;
  format: string;
  restrictions?: readonly string[];
  supersededBy?: string;
  revoked?: boolean;
}>;

export type AssetAssuranceRecord = Readonly<{
  id: string;
  classification: AssetClassification;
  reasons: readonly string[];
  aiDisclosed: boolean;
  immutableCandidateId: string | null;
}>;

export type PromotionValidationResult = Readonly<{ valid: boolean; reasons: readonly string[] }>;
export type SelectedVisualReadinessClass = "FULL_VISUAL_ASSET_SET_RUNTIME_READY" | "PARTIAL_VISUAL_ASSET_SET_RUNTIME_READY_WITH_NATIVE_FALLBACK" | "NATIVE_FALLBACK_RUNTIME_READINESS_ONLY" | "ASSET_CREATION_OR_EXPORT_REQUIRED";
const PROMOTABLE_CLASSIFICATIONS = ["RUNTIME_CANDIDATE", "RUNTIME_READY"] as const;

function isGitSha1(value: unknown): boolean {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value) && !/^(.)\1{39}$/.test(value);
}

function hasText(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateGitCommitSha(value: unknown): PromotionValidationResult {
  const reasons: string[] = [];
  if (!isGitSha1(value)) reasons.push("GIT_SHA_INVALID");
  return deepFreeze({ valid: reasons.length === 0, reasons });
}

export function validatePromotionRecord(input: unknown): PromotionValidationResult {
  const reasons: string[] = [];
  if (!isPlainObject(input)) return deepFreeze({ valid: false, reasons: ["MALFORMED_INPUT"] });

  if (!isBoundedString(input["id"])) reasons.push("ASSET_ID_MISSING");
  if (!hasText(input["canonicalPath"])) reasons.push("PATH_MISSING");
  if (input["fileExists"] !== true) reasons.push("FILE_MISSING");
  if (input["tracked"] !== true) reasons.push("FILE_UNTRACKED");
  if (!isGitSha1(input["gitBlobId"])) reasons.push("GIT_BLOB_INVALID");
  if (!isNonDummySha256(input["sha256"])) reasons.push("HASH_INVALID");
  if (!isNonDummySha256(input["sha256Recheck"])) reasons.push("HASH_RECHECK_INVALID");
  if (isNonDummySha256(input["sha256"]) && isNonDummySha256(input["sha256Recheck"]) && input["sha256"] !== input["sha256Recheck"]) reasons.push("HASH_MISMATCH");
  if (typeof input["byteSize"] !== "number" || input["byteSize"] <= 0) reasons.push("BYTE_SIZE_INVALID");
  if (!hasText(input["mediaType"])) reasons.push("MEDIA_TYPE_MISSING");
  if (input["signatureValid"] !== true) reasons.push("FILE_SIGNATURE_INVALID");
  if (!hasText(input["sourceProvenance"])) reasons.push("PROVENANCE_MISSING");
  if (!hasText(input["creatorSource"])) reasons.push("CREATOR_SOURCE_MISSING");
  if (!hasText(input["licenseRuntimePermission"])) reasons.push("LICENSE_RUNTIME_PERMISSION_MISSING");
  if (!hasText(input["aiGenerationDisclosure"])) reasons.push("AI_GENERATION_DISCLOSURE_MISSING");
  if (!hasText(input["intendedUse"])) reasons.push("INTENDED_USE_MISSING");
  if (!Array.isArray(input["restrictions"])) reasons.push("RESTRICTIONS_MISSING");
  if (!hasText(input["version"])) reasons.push("VERSION_MISSING");
  if (!(PROMOTABLE_CLASSIFICATIONS as readonly string[]).includes(String(input["classification"]))) reasons.push("CLASSIFICATION_INVALID");
  if (!hasText(input["status"])) reasons.push("STATUS_MISSING");
  if (!hasText(input["fallbackAssetOrNativeFallbackId"]) && !hasText(input["disablement"])) reasons.push("FALLBACK_OR_DISABLEMENT_MISSING");
  if (!hasText(input["performanceGovernor"])) reasons.push("PERFORMANCE_GOVERNOR_MISSING");
  if (!hasText(input["accessibility"])) reasons.push("ACCESSIBILITY_MISSING");
  if (!hasText(input["rollbackVersion"])) reasons.push("ROLLBACK_MISSING");
  if (!Array.isArray(input["revocationReasonCodes"]) || input["revocationReasonCodes"].length === 0) reasons.push("REVOCATION_MISSING");
  if (input["externalRuntimeDependency"] !== false) reasons.push("EXTERNAL_RUNTIME_DEPENDENCY");
  if (input["privacySensitive"] !== false) reasons.push("PRIVACY_RISK");
  if (input["nonAuthorizing"] !== true) reasons.push("NON_AUTHORITY_DECLARATION_MISSING");

  return deepFreeze({ valid: reasons.length === 0, reasons });
}

export function selectVisualReadinessClass(input: unknown): Readonly<{ selectedClass: SelectedVisualReadinessClass; reasons: readonly string[] }> {
  const reasons: string[] = [];
  if (!isPlainObject(input)) return deepFreeze({ selectedClass: "ASSET_CREATION_OR_EXPORT_REQUIRED", reasons: ["MALFORMED_INPUT"] });
  const rawPromotedFinalAssetCount = input["promotedFinalAssetCount"];
  if (rawPromotedFinalAssetCount !== undefined && (typeof rawPromotedFinalAssetCount !== "number" || !Number.isFinite(rawPromotedFinalAssetCount) || !Number.isInteger(rawPromotedFinalAssetCount) || rawPromotedFinalAssetCount < 0)) {
    reasons.push("PROMOTED_FINAL_ASSET_COUNT_INVALID");
  }
  const promotedFinalAssetCount = typeof rawPromotedFinalAssetCount === "number" && Number.isFinite(rawPromotedFinalAssetCount) && Number.isInteger(rawPromotedFinalAssetCount) && rawPromotedFinalAssetCount >= 0 ? rawPromotedFinalAssetCount : 0;
  const nativeFallbackReady = input["nativeFallbackReady"] === true;
  const duplicateAssetIds = Array.isArray(input["duplicateAssetIds"]) ? input["duplicateAssetIds"] : [];
  if (duplicateAssetIds.length > 0) reasons.push("DUPLICATE_ASSET_ID");
  if (reasons.length > 0) return deepFreeze({ selectedClass: "ASSET_CREATION_OR_EXPORT_REQUIRED", reasons });
  if (promotedFinalAssetCount >= 4) return deepFreeze({ selectedClass: "FULL_VISUAL_ASSET_SET_RUNTIME_READY", reasons: ["FINAL_ASSET_SET_COMPLETE"] });
  if (promotedFinalAssetCount > 0 && nativeFallbackReady) return deepFreeze({ selectedClass: "PARTIAL_VISUAL_ASSET_SET_RUNTIME_READY_WITH_NATIVE_FALLBACK", reasons: ["PARTIAL_FINAL_ASSETS_WITH_NATIVE_FALLBACK"] });
  if (nativeFallbackReady) return deepFreeze({ selectedClass: "NATIVE_FALLBACK_RUNTIME_READINESS_ONLY", reasons: ["FINAL_ASSETS_NOT_PRESENT_NATIVE_FALLBACK_READY"] });
  return deepFreeze({ selectedClass: "ASSET_CREATION_OR_EXPORT_REQUIRED", reasons: ["FINAL_ASSETS_NOT_PRESENT_NATIVE_FALLBACK_NOT_READY"] });
}

/**
 * Fail-closed classification. Any missing provenance, licensing, hash, disclosure, or
 * dimension fact rejects the asset rather than downgrading it silently.
 */
export function classifyAsset(input: unknown): AssetAssuranceRecord {
  const reasons: string[] = [];
  if (!isPlainObject(input) || !isBoundedString(input["id"])) {
    return deepFreeze({
      id: "",
      classification: "REJECTED",
      reasons: ["MALFORMED_INPUT"],
      aiDisclosed: false,
      immutableCandidateId: null,
    });
  }

  const id = input["id"] as string;
  if (!isNonDummySha256(input["sha256"])) reasons.push("HASH_INVALID");
  if (typeof input["disclosure"] !== "boolean") reasons.push("DISCLOSURE_MISSING");
  if (!isBoundedString(input["provenance"])) reasons.push("PROVENANCE_MISSING");
  if (!isBoundedString(input["license"])) reasons.push("LICENSE_MISSING");
  if (typeof input["width"] !== "number" || (input["width"] as number) <= 0) reasons.push("WIDTH_INVALID");
  if (typeof input["height"] !== "number" || (input["height"] as number) <= 0) reasons.push("HEIGHT_INVALID");
  if (!isBoundedString(input["format"])) reasons.push("FORMAT_MISSING");

  if (reasons.length > 0) {
    return deepFreeze({
      id,
      classification: "REJECTED",
      reasons,
      aiDisclosed: input["disclosure"] === true,
      immutableCandidateId: null,
    });
  }

  const facts = input as unknown as AssetFacts;
  const candidateId = `${facts.id}@${facts.sha256.slice(0, 12)}`;

  if (facts.revoked === true) {
    return deepFreeze({
      id,
      classification: "REJECTED",
      reasons: ["REVOKED"],
      aiDisclosed: facts.disclosure,
      immutableCandidateId: null,
    });
  }
  if (isBoundedString(facts.supersededBy)) {
    return deepFreeze({
      id,
      classification: "SUPERSEDED",
      reasons: ["SUPERSEDED_BY_NEWER_CANDIDATE"],
      aiDisclosed: facts.disclosure,
      immutableCandidateId: candidateId,
    });
  }

  const restrictions = Array.isArray(facts.restrictions) ? facts.restrictions : [];
  if (restrictions.includes("NO_RUNTIME")) {
    return deepFreeze({
      id,
      classification: "EXPORT_CANDIDATE",
      reasons: ["RUNTIME_RESTRICTED"],
      aiDisclosed: facts.disclosure,
      immutableCandidateId: candidateId,
    });
  }
  if (restrictions.includes("REFERENCE_ONLY")) {
    return deepFreeze({
      id,
      classification: "REFERENCE_ONLY",
      reasons: ["REFERENCE_RESTRICTED"],
      aiDisclosed: facts.disclosure,
      immutableCandidateId: candidateId,
    });
  }

  const runtimeFormat = (RUNTIME_FORMATS as readonly string[]).includes(facts.format);
  const runtimeLicense = (RUNTIME_LICENSES as readonly string[]).includes(facts.license);

  if (runtimeFormat && runtimeLicense) {
    return deepFreeze({
      id,
      classification: "RUNTIME_CANDIDATE",
      reasons: ["GOVERNANCE_FACTS_COMPLETE"],
      aiDisclosed: facts.disclosure,
      immutableCandidateId: candidateId,
    });
  }
  if (runtimeFormat) {
    return deepFreeze({
      id,
      classification: "EXPORT_CANDIDATE",
      reasons: ["LICENSE_NOT_RUNTIME_CLEARED"],
      aiDisclosed: facts.disclosure,
      immutableCandidateId: candidateId,
    });
  }
  return deepFreeze({
    id,
    classification: "DESIGN_ACCEPTED",
    reasons: ["NON_RUNTIME_FORMAT"],
    aiDisclosed: facts.disclosure,
    immutableCandidateId: candidateId,
  });
}

export function detectDuplicates(assets: readonly unknown[]): Readonly<{
  exactGroups: readonly (readonly string[])[];
  nearDuplicates: readonly (readonly string[])[];
  functionalDuplicates: readonly (readonly string[])[];
  bounded: boolean;
}> {
  const input = Array.isArray(assets) ? assets : [];
  const bounded = input.length <= MAX_COLLECTION_SIZE;
  const valid = input.slice(0, MAX_COLLECTION_SIZE).filter(
    (asset): asset is Record<string, unknown> => isPlainObject(asset) && isBoundedString(asset["id"]),
  );

  const byHash = new Map<string, string[]>();
  const byPerceptual = new Map<string, string[]>();
  const byPurpose = new Map<string, string[]>();

  for (const asset of valid) {
    const id = asset["id"] as string;
    const hash = typeof asset["sha256"] === "string" ? asset["sha256"] : "";
    if (isNonDummySha256(hash)) {
      const group = byHash.get(hash) ?? [];
      group.push(id);
      byHash.set(hash, group);
    }

    const perceptual = typeof asset["perceptualHash"] === "string" ? asset["perceptualHash"] : "";
    if (perceptual.length > 0) {
      const group = byPerceptual.get(perceptual) ?? [];
      group.push(id);
      byPerceptual.set(perceptual, group);
    }

    const purpose = typeof asset["intendedUse"] === "string" ? asset["intendedUse"] : "";
    if (purpose.length > 0) {
      const group = byPurpose.get(purpose) ?? [];
      group.push(id);
      byPurpose.set(purpose, group);
    }
  }

  const groupsOf = (map: Map<string, string[]>): readonly (readonly string[])[] =>
    [...map.values()].filter((group) => group.length > 1);

  return deepFreeze({
    exactGroups: groupsOf(byHash),
    nearDuplicates: groupsOf(byPerceptual),
    functionalDuplicates: groupsOf(byPurpose),
    bounded,
  });
}

/** Registry candidates are immutable and never cross registry kinds. */
export function buildRegistryCandidate(
  record: AssetAssuranceRecord,
  kind: RegistryKind,
): Readonly<{
  accepted: boolean;
  kind: RegistryKind;
  candidateId: string | null;
  immutable: true;
  reason: string;
}> {
  const accepted = record.classification === "RUNTIME_CANDIDATE" && record.immutableCandidateId !== null;
  return deepFreeze({
    accepted,
    kind,
    candidateId: accepted ? record.immutableCandidateId : null,
    immutable: true as const,
    reason: accepted ? "ACCEPTED" : `NOT_RUNTIME_CANDIDATE:${record.classification}`,
  });
}
