import { createHash } from "node:crypto";
import type { Alpha0Profile, Alpha0PermanentBlocker } from "./alpha0-validation-contracts";
import type { Alpha0TestRecord } from "./alpha0-test-registry";

export type Alpha0EvidenceItem = Readonly<{
  id: string;
  evidenceClass: string;
  hash: string;
  fresh: boolean;
  valid: boolean;
}>;

export type Alpha0EvidenceManifestInput = Readonly<{
  candidate: Readonly<{ repository: string; branch: string; baseSha: string; headSha: string; changedPaths: readonly string[]; profiles: readonly string[] }>;
  selectedIds: readonly string[];
  registryFingerprint: string;
  profileFingerprint: string;
  evaluationEpochMilliseconds: number;
  evidence: readonly Alpha0EvidenceItem[];
  candidateBinding?: Readonly<{ repository: string; branch: string; baseSha: string; headSha: string }>;
}>;

export type Alpha0EvidenceManifest = Readonly<{
  authority: "NON_AUTHORIZING";
  manifestHash: string;
  selectedIds: readonly string[];
  invalidated: boolean;
  reasons: readonly string[];
}>;

export const projectAlpha0EvidenceManifest = (input: Alpha0EvidenceManifestInput): Alpha0EvidenceManifest => {
  const candidateBinding = input.candidateBinding ?? input.candidate;
  const evidenceIds = input.evidence.map((entry) => entry.id);
  const hasDuplicateEvidenceIds = new Set(evidenceIds).size !== evidenceIds.length;
  const invalidated =
    candidateBinding.repository !== input.candidate.repository ||
    candidateBinding.branch !== input.candidate.branch ||
    candidateBinding.baseSha !== input.candidate.baseSha ||
    candidateBinding.headSha !== input.candidate.headSha ||
    input.evidence.some((entry) => !entry.valid || !entry.fresh) ||
    hasDuplicateEvidenceIds ||
    input.selectedIds.length === 0;

  const canonical = JSON.stringify({
    candidate: {
      repository: input.candidate.repository,
      branch: input.candidate.branch,
      baseSha: input.candidate.baseSha,
      headSha: input.candidate.headSha,
      changedPaths: [...input.candidate.changedPaths].sort(),
      profiles: [...input.candidate.profiles].sort(),
    },
    selectedIds: [...input.selectedIds].sort(),
    registryFingerprint: input.registryFingerprint,
    profileFingerprint: input.profileFingerprint,
    evaluationEpochMilliseconds: input.evaluationEpochMilliseconds,
    evidence: [...input.evidence].map((item) => ({
      id: item.id,
      evidenceClass: item.evidenceClass,
      hash: item.hash,
      fresh: item.fresh,
      valid: item.valid,
    })).sort((left, right) => left.id.localeCompare(right.id)),
  });

  return Object.freeze({
    authority: "NON_AUTHORIZING",
    manifestHash: createHash("sha256").update(canonical, "utf8").digest("hex"),
    selectedIds: Object.freeze([...input.selectedIds].sort()),
    invalidated,
    reasons: Object.freeze(invalidated ? ["EVIDENCE_INVALIDATED_OR_STALE"] : ["EVIDENCE_VALID"]),
  });
};

export type Alpha0ReadinessInput = Readonly<{
  candidate: Readonly<{ repository: string; branch: string; baseSha: string; headSha: string; changedPaths: readonly string[]; profiles: readonly string[] }>;
  profiles: readonly Alpha0Profile[];
  registry: readonly Alpha0TestRecord[];
  blockers: readonly Alpha0PermanentBlocker[];
  evidence: readonly Alpha0EvidenceItem[];
  instanceEpochMilliseconds: number;
  selectedIds: readonly string[];
}>;

export type Alpha0ReadinessResult = Readonly<{
  authority: "NON_AUTHORIZING";
  readinessAssessmentEligible: boolean;
  blockers: readonly Alpha0PermanentBlocker[];
  outputClaims: readonly string[];
  selectedIds: readonly string[];
}>;

export const projectAlpha0ReadinessFoundation = (input: Alpha0ReadinessInput): Alpha0ReadinessResult => {
  const blockers = [...input.blockers];
  const evidencePresent = input.evidence.length > 0;
  const readinessAssessmentEligible = blockers.length === 0 && evidencePresent && input.selectedIds.length > 0;

  return Object.freeze({
    authority: "NON_AUTHORIZING",
    readinessAssessmentEligible: false,
    blockers: Object.freeze(blockers),
    outputClaims: Object.freeze([]),
    selectedIds: Object.freeze([...input.selectedIds].sort()),
  });
};
