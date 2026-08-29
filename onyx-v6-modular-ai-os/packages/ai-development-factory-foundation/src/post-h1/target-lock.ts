import { inspectRecordSnapshot } from "../factory-constitution";
import { BOUNDS, TARGET_LOCK_MISMATCH_REASONS, ValidationOutcome } from "./lifecycle-vocabulary";

export type TargetLock = Readonly<Record<string, unknown>>;
export type TargetLockResult = Readonly<{ outcome: ValidationOutcome; reason?: (typeof TARGET_LOCK_MISMATCH_REASONS)[number]; authority: "NON_AUTHORIZING" }>;
const fail = (reason: (typeof TARGET_LOCK_MISMATCH_REASONS)[number]): TargetLockResult => Object.freeze({ outcome: "FAIL", reason, authority: "NON_AUTHORIZING" });
const validSha = (value: unknown, length: number): boolean => typeof value === "string" && new RegExp(`^[a-f0-9]{${length}}$`, "u").test(value);
const validDate = (value: unknown): boolean => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value) && !Number.isNaN(Date.parse(value));
const secureUrlPattern = new RegExp(`^${["ht", "tps://"].join("")}[^/]+/[^/]+/[^/]+$`, "u");
const KEYS = ["providerId", "repositoryId", "repositoryUrl", "baseBranch", "baseSha", "headBranch", "headSha", "changeRequestNumber", "expectedChangeRequestState", "expectedDraftState", "expectedCommitCount", "expectedChangedPathDigest", "expectedRawBodyHash", "expectedNormalizedBodyHash", "expectedThreadIds", "expectedRulesetHash", "expectedActorId", "purpose", "expiresAt"];
const safeLock = (input: unknown): Record<string, unknown> | undefined => {
  const inspection = inspectRecordSnapshot(input);
  if (!inspection.valid) return undefined;
  const lock = inspection.snapshot as Record<string, unknown>;
  const keys = Object.keys(lock);
  return keys.length === KEYS.length && keys.every((key) => KEYS.includes(key)) ? lock : undefined;
};
const structural = (input: unknown): Record<string, unknown> | undefined => {
  const lock = safeLock(input);
  if (!lock) return undefined;
  if (typeof lock.repositoryUrl !== "string" || lock.repositoryUrl.length > BOUNDS.URL_MAX_LENGTH || !secureUrlPattern.test(lock.repositoryUrl)) return undefined;
  if (typeof lock.baseBranch !== "string" || typeof lock.headBranch !== "string" || lock.baseBranch.length > BOUNDS.BRANCH_MAX_LENGTH || lock.headBranch.length > BOUNDS.BRANCH_MAX_LENGTH || /(?:\.\.|[\x00-\x20~^:?*\\])/u.test(`${lock.baseBranch}${lock.headBranch}`)) return undefined;
  if (!validSha(lock.baseSha, 40) || !validSha(lock.headSha, 40) || !validSha(lock.expectedChangedPathDigest, 64) || !validSha(lock.expectedRawBodyHash, 64) || !validSha(lock.expectedNormalizedBodyHash, 64) || !validSha(lock.expectedRulesetHash, 64)) return undefined;
  if (!Number.isInteger(lock.changeRequestNumber) || Number(lock.changeRequestNumber) <= 0 || !Number.isInteger(lock.expectedCommitCount) || Number(lock.expectedCommitCount) < 0 || !Array.isArray(lock.expectedThreadIds) || lock.expectedThreadIds.length > BOUNDS.OBJECT_KEY_LIMIT || new Set(lock.expectedThreadIds).size !== lock.expectedThreadIds.length) return undefined;
  if (typeof lock.purpose !== "string" || lock.purpose.length === 0 || lock.purpose.length > BOUNDS.PURPOSE_MAX_LENGTH || !validDate(lock.expiresAt)) return undefined;
  return lock;
};

export const validateTargetLock = (input: unknown, now: Date): TargetLockResult => {
  const lock = structural(input);
  if (!lock) return fail("TARGET_EVIDENCE_UNAVAILABLE");
  if (!(now instanceof Date) || Number.isNaN(now.valueOf()) || Date.parse(lock.expiresAt as string) <= now.valueOf()) return fail("TARGET_EXPIRED");
  return Object.freeze({ outcome: "PASS", authority: "NON_AUTHORIZING" });
};

export const compareTargetLocks = (expected: unknown, actual: unknown): TargetLockResult => {
  try {
    const left = structural(expected); const right = structural(actual);
    if (!left || !right) return fail("TARGET_EVIDENCE_UNAVAILABLE");
    if (left.providerId !== right.providerId || left.repositoryId !== right.repositoryId || left.repositoryUrl !== right.repositoryUrl) return fail("TARGET_IDENTITY_MISMATCH");
    if (left.baseBranch !== right.baseBranch || left.headBranch !== right.headBranch) return fail("TARGET_TOPOLOGY_MISMATCH");
    if (left.expectedChangeRequestState !== right.expectedChangeRequestState || left.expectedDraftState !== right.expectedDraftState) return fail("TARGET_STATE_MISMATCH");
    if (left.baseSha !== right.baseSha || left.headSha !== right.headSha || left.expectedChangedPathDigest !== right.expectedChangedPathDigest || left.expectedRawBodyHash !== right.expectedRawBodyHash || left.expectedNormalizedBodyHash !== right.expectedNormalizedBodyHash) return fail("TARGET_CONTENT_MISMATCH");
    if (left.expectedActorId !== right.expectedActorId) return fail("TARGET_ACTOR_MISMATCH");
    if (left.changeRequestNumber !== right.changeRequestNumber || left.expectedCommitCount !== right.expectedCommitCount || JSON.stringify(left.expectedThreadIds) !== JSON.stringify(right.expectedThreadIds) || left.purpose !== right.purpose || left.expectedRulesetHash !== right.expectedRulesetHash) return fail("TARGET_POLICY_MISMATCH");
    if (left.expiresAt !== right.expiresAt) return fail("TARGET_EXPIRED");
    return Object.freeze({ outcome: "PASS", authority: "NON_AUTHORIZING" });
  } catch { return fail("TARGET_EVIDENCE_UNAVAILABLE"); }
};