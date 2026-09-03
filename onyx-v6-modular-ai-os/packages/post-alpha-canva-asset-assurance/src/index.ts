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
  if (!isSha256Hex(input["sha256"])) reasons.push("HASH_INVALID");
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
  const valid = (Array.isArray(assets) ? assets : []).filter(
    (asset): asset is Record<string, unknown> => isPlainObject(asset) && isBoundedString(asset["id"]),
  );

  const byHash = new Map<string, string[]>();
  const byPerceptual = new Map<string, string[]>();
  const byPurpose = new Map<string, string[]>();

  for (const asset of valid) {
    const id = asset["id"] as string;
    const hash = typeof asset["sha256"] === "string" ? asset["sha256"] : "";
    if (isSha256Hex(hash)) byHash.set(hash, [...(byHash.get(hash) ?? []), id]);

    const perceptual = typeof asset["perceptualHash"] === "string" ? asset["perceptualHash"] : "";
    if (perceptual.length > 0) byPerceptual.set(perceptual, [...(byPerceptual.get(perceptual) ?? []), id]);

    const purpose = typeof asset["intendedUse"] === "string" ? asset["intendedUse"] : "";
    if (purpose.length > 0) byPurpose.set(purpose, [...(byPurpose.get(purpose) ?? []), id]);
  }

  const groupsOf = (map: Map<string, string[]>): readonly (readonly string[])[] =>
    [...map.values()].filter((group) => group.length > 1);

  return deepFreeze({
    exactGroups: groupsOf(byHash),
    nearDuplicates: groupsOf(byPerceptual),
    functionalDuplicates: groupsOf(byPurpose),
    bounded: valid.length <= MAX_COLLECTION_SIZE,
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
