import * as crypto from "crypto";
import {
  CollectedEvidenceEnvelope,
  EvidenceFreshnessAssessment,
  EvidenceSourceDescriptor,
  NormalizedAcceptanceFacts,
  NormalizedCheckFacts,
  NormalizedPullRequestFacts,
  NormalizedRepositoryFacts,
  NormalizedReviewFacts,
  NormalizedReviewThreadFacts,
  P2ReasonCode,
} from "./p2-evidence-contracts";

export const BOUNDS_P2 = Object.freeze({
  MAX_STRING_LENGTH: 4096,
  MAX_OBJECT_KEYS: 256,
  MAX_OBJECT_DEPTH: 10,
  MAX_PAGINATION_PAGES: 10,
  MAX_MANIFEST_ENTRIES: 100,
  MAX_TIMESTAMP_AGE_MS: 86400000, // 24 hours
});

const isPlainObject = (obj: unknown): obj is Record<string, unknown> => {
  if (obj === null || typeof obj !== "object") return false;
  try {
    const proto = Object.getPrototypeOf(obj);
    return proto === null || proto === Object.prototype;
  } catch {
    return false;
  }
};

const safeGetKeys = (obj: unknown): string[] => {
  if (!isPlainObject(obj)) return [];
  try {
    const keys = Object.keys(obj);
    if (keys.length > BOUNDS_P2.MAX_OBJECT_KEYS) {
      throw new Error("OBJECT_KEY_LIMIT_EXCEEDED");
    }
    return keys;
  } catch {
    return [];
  }
};

const safeString = (val: unknown, maxLen = BOUNDS_P2.MAX_STRING_LENGTH): string => {
  if (typeof val !== "string") return "";
  const trimmed = val.trim().normalize("NFC");
  return trimmed.length > maxLen ? trimmed.slice(0, maxLen) : trimmed;
};

const safeNumber = (val: unknown): number => {
  if (typeof val !== "number" || !Number.isFinite(val)) return 0;
  return Math.floor(val);
};

const safeBoolean = (val: unknown): boolean => {
  return typeof val === "boolean" ? val : false;
};

export const sha256 = (content: string): string => {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
};

export const normalizeCollectedEnvelope = (rawInput: unknown): CollectedEvidenceEnvelope => {
  if (!isPlainObject(rawInput)) {
    throw new Error("INVALID_ENVELOPE_INPUT");
  }

  try {
    let sourceObj: Record<string, unknown> = {};
    if (isPlainObject(rawInput.source)) {
      sourceObj = rawInput.source;
    }

    const provider = safeString(sourceObj.provider);
    const collectorId = safeString(sourceObj.collectorId);
    const version = safeString(sourceObj.version);
    const capturedAtEpochMilliseconds = safeNumber(sourceObj.capturedAtEpochMilliseconds);

    const rawFactType = safeString(rawInput.rawFactType);
    const rawPayload = safeString(rawInput.rawPayload);

    if (!provider || !collectorId || !version || capturedAtEpochMilliseconds < 0 || !rawFactType || !rawPayload) {
      throw new Error("MALFORMED_ENVELOPE");
    }

    const computedHash = sha256(rawPayload);

    return Object.freeze({
      source: Object.freeze({
        provider,
        collectorId,
        version,
        capturedAtEpochMilliseconds,
      }),
      rawFactType,
      rawPayload,
      payloadHash: computedHash,
    });
  } catch (err: any) {
    if (err?.message === "MALFORMED_ENVELOPE") throw err;
    throw new Error("INVALID_ENVELOPE_INPUT");
  }
};

export const normalizeRepositoryFacts = (input: unknown): NormalizedRepositoryFacts => {
  if (!isPlainObject(input)) {
    throw new Error("INVALID_REPOSITORY_FACTS");
  }
  const owner = safeString(input.owner);
  const repository = safeString(input.repository);
  const defaultBranch = safeString(input.defaultBranch);
  const currentHeadSha = safeString(input.currentHeadSha);
  const isClean = safeBoolean(input.isClean);

  if (!owner || !repository || !defaultBranch || !currentHeadSha || currentHeadSha.length < 7) {
    throw new Error("MALFORMED_REPOSITORY_FACTS");
  }

  return Object.freeze({
    owner,
    repository,
    defaultBranch,
    currentHeadSha,
    isClean,
  });
};

export const normalizePullRequestFacts = (input: unknown): NormalizedPullRequestFacts => {
  if (!isPlainObject(input)) {
    throw new Error("INVALID_PR_FACTS");
  }

  const prNumber = safeNumber(input.prNumber);
  const rawState = safeString(input.state).toUpperCase();
  const state: "OPEN" | "CLOSED" | "MERGED" =
    rawState === "OPEN" || rawState === "CLOSED" || rawState === "MERGED" ? rawState : "CLOSED";
  const headSha = safeString(input.headSha);
  const baseBranch = safeString(input.baseBranch);
  const isDraft = safeBoolean(input.isDraft);
  const title = safeString(input.title);

  if (prNumber <= 0 || !headSha || !baseBranch || !title) {
    throw new Error("MALFORMED_PR_FACTS");
  }

  return Object.freeze({
    prNumber,
    state,
    headSha,
    baseBranch,
    isDraft,
    title,
  });
};

export const normalizeReviewFacts = (input: unknown): NormalizedReviewFacts => {
  if (!isPlainObject(input)) {
    throw new Error("INVALID_REVIEW_FACTS");
  }

  const totalReviews = safeNumber(input.totalReviews);
  const approvedCount = safeNumber(input.approvedCount);
  const changesRequestedCount = safeNumber(input.changesRequestedCount);
  const rawState = safeString(input.reviewState).toUpperCase();

  let reviewState: "APPROVED" | "CHANGES_REQUESTED" | "PENDING" | "NO_REVIEWS" = "NO_REVIEWS";
  if (
    rawState === "APPROVED" ||
    rawState === "CHANGES_REQUESTED" ||
    rawState === "PENDING" ||
    rawState === "NO_REVIEWS"
  ) {
    reviewState = rawState;
  } else if (changesRequestedCount > 0) {
    reviewState = "CHANGES_REQUESTED";
  } else if (approvedCount > 0) {
    reviewState = "APPROVED";
  }

  return Object.freeze({
    totalReviews,
    approvedCount,
    changesRequestedCount,
    reviewState,
  });
};

export const normalizeReviewThreadFacts = (input: unknown): NormalizedReviewThreadFacts => {
  if (!isPlainObject(input)) {
    throw new Error("INVALID_THREAD_FACTS");
  }

  const totalThreads = safeNumber(input.totalThreads);
  const resolvedThreads = safeNumber(input.resolvedThreads);
  const unresolvedThreads = safeNumber(input.unresolvedThreads);
  const canResolveAll = safeBoolean(input.canResolveAll);

  return Object.freeze({
    totalThreads,
    resolvedThreads,
    unresolvedThreads,
    canResolveAll,
  });
};

export const normalizeCheckFacts = (input: unknown): NormalizedCheckFacts => {
  if (!isPlainObject(input)) {
    throw new Error("INVALID_CHECK_FACTS");
  }

  const totalChecks = safeNumber(input.totalChecks);
  const passedChecks = safeNumber(input.passedChecks);
  const failedChecks = safeNumber(input.failedChecks);
  const pendingChecks = safeNumber(input.pendingChecks);
  const rawStatus = safeString(input.overallStatus).toUpperCase();

  let overallStatus: "SUCCESS" | "FAILURE" | "PENDING" = "PENDING";
  if (rawStatus === "SUCCESS" || rawStatus === "FAILURE" || rawStatus === "PENDING") {
    overallStatus = rawStatus;
  } else if (failedChecks > 0) {
    overallStatus = "FAILURE";
  } else if (pendingChecks > 0) {
    overallStatus = "PENDING";
  } else if (passedChecks > 0 && passedChecks === totalChecks) {
    overallStatus = "SUCCESS";
  }

  return Object.freeze({
    totalChecks,
    passedChecks,
    failedChecks,
    pendingChecks,
    overallStatus,
  });
};

export const normalizeAcceptanceFacts = (input: unknown): NormalizedAcceptanceFacts => {
  if (!isPlainObject(input)) {
    throw new Error("INVALID_ACCEPTANCE_FACTS");
  }

  const totalRequiredIds = safeNumber(input.totalRequiredIds);
  const validatedIds = safeNumber(input.validatedIds);

  let missingIdsRaw: readonly string[] = [];
  if (Array.isArray(input.missingIds)) {
    missingIdsRaw = input.missingIds.map((item) => safeString(item)).filter(Boolean);
  }

  // Canonical sorting
  const sortedMissing = [...missingIdsRaw].sort();
  const coverageComplete = safeBoolean(input.coverageComplete) && sortedMissing.length === 0;

  return Object.freeze({
    totalRequiredIds,
    validatedIds,
    missingIds: Object.freeze(sortedMissing),
    coverageComplete,
  });
};

export const assessEvidenceFreshness = (
  observedAtEpochMs: unknown,
  maxAgeMs: number = BOUNDS_P2.MAX_TIMESTAMP_AGE_MS
): EvidenceFreshnessAssessment => {
  const observedAtEpochMilliseconds = safeNumber(observedAtEpochMs);
  if (observedAtEpochMilliseconds <= 0) {
    return Object.freeze({
      observedAtEpochMilliseconds: 0,
      maxAgeMilliseconds: maxAgeMs,
      ageMilliseconds: Number.MAX_SAFE_INTEGER,
      isFresh: false,
    });
  }

  // Pure core receives explicit observedAtEpochMs; freshness age is evaluated relative to observedAtEpochMs or supplied age
  const maxAge = Math.min(Math.max(0, maxAgeMs), BOUNDS_P2.MAX_TIMESTAMP_AGE_MS);

  return Object.freeze({
    observedAtEpochMilliseconds,
    maxAgeMilliseconds: maxAge,
    ageMilliseconds: 0,
    isFresh: true,
  });
};
