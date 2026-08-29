import { inspectRecordSnapshot } from "../factory-constitution";
import { ACCEPTANCE_IDS, BOUNDS, DURABLE_READBACK_CLASSES, EVIDENCE_FRESHNESS_POLICIES, PARTIAL_DURABLE_STATES, SENSITIVITY_CLASSES, ValidationOutcome } from "./lifecycle-vocabulary";

export type LifecycleRecord = Readonly<Record<string, unknown>>;
export type ValidationResult = Readonly<{ outcome: ValidationOutcome; reasonCodes: readonly string[]; authority: "NON_AUTHORIZING" }>;

const result = (outcome: ValidationOutcome, reasonCodes: readonly string[] = []): ValidationResult => Object.freeze({ outcome, reasonCodes: Object.freeze([...reasonCodes]), authority: "NON_AUTHORIZING" });
const sha = (value: unknown, length: number): boolean => typeof value === "string" && new RegExp(`^[a-f0-9]{${length}}$`, "u").test(value);
const timestamp = (value: unknown): boolean => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u.test(value) && !Number.isNaN(Date.parse(value));
const boundedArray = (value: unknown, maximum: number): boolean => Array.isArray(value) && value.length <= maximum;
const RECORD_KEYS = ["schemaVersion", "projectId", "lifecycleRecordId", "parentRecordId", "supersedesRecordId", "currentPhase", "workstreamId", "bundleId", "gateId", "gateStatus", "lifecycleStatus", "acceptedMarkers", "baselineSha", "candidateSha", "committedHeadSha", "remoteHeadSha", "mainSha", "branchLineage", "commitLineage", "pullRequestLineage", "reviewLineage", "acceptanceRegistryDefinitions", "acceptanceCoverage", "evidenceReferences", "evidenceFreshness", "ownerDecisionReferences", "knownLimitations", "residualRisks", "authorityBoundary", "gitMutationBoundary", "allowedActions", "prohibitedActions", "stopConditions", "nextGate", "reopeningTriggers", "closureState", "provenance", "createdAt", "observedAt", "expiresAt", "canonicalContentHash", "recordIntegrityHash"];
const PROJECTION_KEYS = ["sourceId", "sourceHash", "generatorVersion", "generatedAt", "targetLockId", "authority", "inputHash"];
const validId = (value: unknown): value is string => typeof value === "string" && value.length <= BOUNDS.ID_MAX_LENGTH && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value);
const canonicalValue = (value: unknown, omit: ReadonlySet<string> = new Set(), depth = 0): string => {
  if (depth > BOUNDS.MAX_NESTING_DEPTH) throw new Error("MAX_NESTING_DEPTH_EXCEEDED");
  if (value === null || typeof value === "boolean" || typeof value === "number") return JSON.stringify(value);
  if (typeof value === "string") return JSON.stringify(value.normalize("NFC"));
  if (Array.isArray(value)) return `[${value.map((entry) => canonicalValue(entry, new Set(), depth + 1)).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object).filter((key) => !omit.has(key)).sort().map((key) => `${JSON.stringify(key)}:${canonicalValue(object[key], new Set(), depth + 1)}`).join(",")}}`;
};
const validateShape = (input: unknown, keys: readonly string[]): Record<string, unknown> | undefined => {
  const inspection = inspectRecordSnapshot(input);
  if (!inspection.valid) return undefined;
  const safe = inspection.snapshot as Record<string, unknown>;
  return Object.keys(safe).some((key) => !keys.includes(key)) ? undefined : safe;
};

export const canonicalizeLifecycleRecord = (input: unknown): string => {
  const inspection = inspectRecordSnapshot(input);
  return inspection.valid ? `ONYX_P0_LIFECYCLE_RECORD_V1:${canonicalValue(inspection.snapshot, new Set(["canonicalContentHash", "recordIntegrityHash"]))}` : "";
};

export const validateLifecycleRecord = (input: unknown, now: Date): ValidationResult => {
  const record = validateShape(input, RECORD_KEYS);
  if (!record) return result("NOT_ASSESSABLE", ["SAFE_INSPECTION_FAILED"]);
  const required = ["schemaVersion", "projectId", "lifecycleRecordId", "acceptedMarkers", "baselineSha", "authorityBoundary", "provenance", "createdAt", "observedAt", "expiresAt", "canonicalContentHash", "recordIntegrityHash"];
  if (required.some((key) => !(key in record))) return result("FAIL", ["REQUIRED_FIELD_MISSING"]);
  if (typeof record.schemaVersion !== "string" || !/^1\.[0-9]+\.[0-9]+$/u.test(record.schemaVersion)) return result("FAIL", ["SCHEMA_VERSION_UNSUPPORTED"]);
  if (!validId(record.projectId) || !validId(record.lifecycleRecordId)) return result("FAIL", ["ID_GRAMMAR_INVALID"]);
  if (!boundedArray(record.acceptedMarkers, BOUNDS.MARKER_MAX_COUNT) || new Set(record.acceptedMarkers as unknown[]).size !== (record.acceptedMarkers as unknown[]).length || (record.acceptedMarkers as unknown[]).some((marker) => !validId(marker))) return result("FAIL", ["MARKER_BOUND_OR_DUPLICATE"]);
  for (const key of ["baselineSha", "candidateSha", "committedHeadSha", "remoteHeadSha", "mainSha"] as const) if (record[key] !== undefined && !sha(record[key], 40)) return result("FAIL", ["SHA_GRAMMAR_INVALID"]);
  for (const key of ["canonicalContentHash", "recordIntegrityHash"] as const) if (!sha(record[key], 64)) return result("FAIL", ["HASH_GRAMMAR_INVALID"]);
  if (!timestamp(record.createdAt) || !timestamp(record.observedAt) || !timestamp(record.expiresAt) || !(now instanceof Date) || Number.isNaN(now.valueOf()) || Date.parse(record.expiresAt as string) <= now.valueOf()) return result("FAIL", ["TIME_INVALID_OR_EXPIRED"]);
  if (record.authorityBoundary !== "NON_AUTHORIZING") return result("FAIL", ["AUTHORITY_BOUNDARY_INVALID"]);
  if (!boundedArray(record.evidenceReferences, BOUNDS.EVIDENCE_REFERENCE_MAX_COUNT) || !boundedArray(record.branchLineage, BOUNDS.LINEAGE_MAX_COUNT) || !boundedArray(record.commitLineage, BOUNDS.LINEAGE_MAX_COUNT) || !boundedArray(record.pullRequestLineage, BOUNDS.LINEAGE_MAX_COUNT) || !boundedArray(record.reviewLineage, BOUNDS.LINEAGE_MAX_COUNT) || !boundedArray(record.knownLimitations, BOUNDS.LIMITATION_MAX_COUNT) || !boundedArray(record.residualRisks, BOUNDS.RISK_MAX_COUNT) || !boundedArray(record.reopeningTriggers, BOUNDS.TRIGGER_MAX_COUNT) || !boundedArray(record.allowedActions, BOUNDS.ACTION_MAX_COUNT) || !boundedArray(record.prohibitedActions, BOUNDS.ACTION_MAX_COUNT) || !boundedArray(record.stopConditions, BOUNDS.ACTION_MAX_COUNT)) return result("FAIL", ["COLLECTION_BOUND_EXCEEDED"]);
  if (record.lifecycleRecordId === record.parentRecordId || record.lifecycleRecordId === record.supersedesRecordId) return result("FAIL", ["LINEAGE_CYCLE"]);
  if (record.acceptanceCoverage !== undefined && (!Array.isArray(record.acceptanceCoverage) || (record.acceptanceCoverage as Array<Record<string, unknown>>).some((entry) => !ACCEPTANCE_IDS.includes(String(entry.id))))) return result("FAIL", ["ACCEPTANCE_ID_INVALID"]);
  return result("PASS");
};

export const validateLifecycleGraph = (inputs: readonly unknown[], now: Date): ValidationResult => {
  if (!Array.isArray(inputs) || inputs.length === 0 || inputs.length > BOUNDS.LINEAGE_MAX_COUNT) return result("FAIL", ["LINEAGE_COLLECTION_BOUND_EXCEEDED"]);
  const records: Record<string, unknown>[] = [];
  const ids = new Set<string>();
  for (const input of inputs) {
    const record = validateShape(input, RECORD_KEYS);
    if (!record || validateLifecycleRecord(record, now).outcome !== "PASS" || !validId(record.lifecycleRecordId)) return result("FAIL", ["GRAPH_RECORD_INVALID"]);
    if (ids.has(record.lifecycleRecordId)) return result("FAIL", ["DUPLICATE_RECORD_ID"]);
    ids.add(record.lifecycleRecordId); records.push(record);
  }
  const byId = new Map(records.map((record) => [record.lifecycleRecordId as string, record]));
  if (records.length > BOUNDS.LINEAGE_TRAVERSAL_LIMIT) return result("FAIL", ["LINEAGE_TRAVERSAL_LIMIT_EXCEEDED"]);
  for (const record of records) for (const field of ["parentRecordId", "supersedesRecordId"] as const) if (record[field] !== undefined && !byId.has(String(record[field]))) return result("FAIL", ["LINEAGE_REFERENCE_MISSING"]);
  for (const field of ["parentRecordId", "supersedesRecordId"] as const) for (const record of records) {
    const visited = new Set<string>(); let current: Record<string, unknown> | undefined = record; let steps = 0;
    while (current && current[field] !== undefined) {
      if (++steps > BOUNDS.LINEAGE_TRAVERSAL_LIMIT) return result("FAIL", ["LINEAGE_TRAVERSAL_LIMIT_EXCEEDED"]);
      const id = String(current[field]); if (visited.has(id) || id === record.lifecycleRecordId) return result("FAIL", ["LINEAGE_CYCLE"]);
      visited.add(id); current = byId.get(id);
    }
  }
  for (const record of records) {
    const walk = (current: Record<string, unknown>, path: Set<string>, steps: number): ValidationResult | undefined => {
      if (steps > BOUNDS.LINEAGE_TRAVERSAL_LIMIT) return result("FAIL", ["LINEAGE_TRAVERSAL_LIMIT_EXCEEDED"]);
      for (const field of ["parentRecordId", "supersedesRecordId"] as const) {
        const id = current[field];
        if (id === undefined) continue;
        const key = String(id);
        if (path.has(key) || key === record.lifecycleRecordId) return result("FAIL", ["LINEAGE_CYCLE"]);
        const nextPath = new Set(path); nextPath.add(key);
        const next = byId.get(key);
        if (next) { const failure = walk(next, nextPath, steps + 1); if (failure) return failure; }
      }
      return undefined;
    };
    const failure = walk(record, new Set(), 0);
    if (failure) return failure;
  }
  return result("PASS");
};

export const validateProjectionReference = (input: unknown): ValidationResult => {
  const value = validateShape(input, PROJECTION_KEYS);
  if (!value || value.authority !== "NON_AUTHORIZING" || !validId(value.sourceId) || !validId(value.targetLockId) || !sha(value.sourceHash, 64) || !timestamp(value.generatedAt) || typeof value.generatorVersion !== "string") return result("FAIL", ["PROJECTION_REFERENCE_INVALID"]);
  if (value.inputHash !== undefined && value.inputHash !== value.sourceHash) return result("FAIL", ["PROJECTION_STALE"]);
  return result("PASS");
};

export const validateEvidenceReference = (input: unknown): ValidationResult => {
  const value = validateShape(input, ["id", "hash", "sensitivity", "redacted"]);
  if (!value || !validId(value.id) || !sha(value.hash, 64) || !SENSITIVITY_CLASSES.includes(value.sensitivity as typeof SENSITIVITY_CLASSES[number])) return result("FAIL", ["EVIDENCE_REFERENCE_INVALID"]);
  if (value.sensitivity === "PROHIBITED_CONTENT" || (value.sensitivity === "SENSITIVE_REDACTED" && value.redacted !== true)) return result("FAIL", ["SENSITIVITY_PROHIBITED"]);
  return result("PASS");
};

export const validateEvidenceFreshness = (input: unknown, now: Date): ValidationResult => {
  const value = validateShape(input, ["policy", "observedAt", "expiresAt", "targetHash", "contentHash", "headSha", "baseSha", "stateHash", "rulesetHash"]);
  const nonAuthorizing = { authority: "NON_AUTHORIZING" as const };
  if (!value || !EVIDENCE_FRESHNESS_POLICIES.includes(value.policy as typeof EVIDENCE_FRESHNESS_POLICIES[number]) || !timestamp(value.observedAt) || !(now instanceof Date) || Number.isNaN(now.valueOf()) || Date.parse(value.observedAt as string) > now.valueOf()) return Object.freeze({ ...result("NOT_ASSESSABLE", ["EVIDENCE_UNAVAILABLE"]), status: "NOT_ASSESSABLE", ...nonAuthorizing });
  const required: Record<string, readonly string[]> = { IMMUTABLE_CONTENT_BOUND: ["contentHash"], HEAD_BOUND: ["headSha"], BASE_AND_HEAD_BOUND: ["baseSha", "headSha"], PR_STATE_BOUND: ["stateHash"], RULESET_BOUND: ["rulesetHash"], TIME_BOUND: ["expiresAt"], MANUAL_REASSESSMENT_REQUIRED: [] };
  const hashes = new Set(["contentHash", "stateHash", "rulesetHash", "targetHash"]);
  if ((required[String(value.policy)] ?? []).some((key) => value[key] === undefined || (hashes.has(key) ? !sha(value[key], 64) : key === "expiresAt" ? !timestamp(value[key]) : !sha(value[key], 40)))) return Object.freeze({ ...result("NOT_ASSESSABLE", ["EVIDENCE_UNAVAILABLE"]), status: "NOT_ASSESSABLE", ...nonAuthorizing });
  if (value.policy === "TIME_BOUND" || value.expiresAt !== undefined) if (!timestamp(value.expiresAt) || Date.parse(value.expiresAt as string) <= now.valueOf()) return Object.freeze({ ...result("FAIL", ["EVIDENCE_STALE"]), status: "STALE", ...nonAuthorizing });
  return Object.freeze({ ...result("PASS"), status: "FRESH", ...nonAuthorizing });
};

export const validateTombstoneRecord = (input: unknown): ValidationResult => {
  const value = validateShape(input, ["tombstoneId", "reason", "provenance", "predecessorRecordId", "lifecycleStatus", "authority", "residualRiskReferences", "limitationReferences"]);
  if (!value || !validId(value.tombstoneId) || !validId(value.predecessorRecordId) || typeof value.reason !== "string" || value.reason.length === 0 || typeof value.provenance !== "string" || value.provenance.length === 0 || value.lifecycleStatus !== "TOMBSTONED" || value.authority !== "NON_AUTHORIZING" || !boundedArray(value.residualRiskReferences, BOUNDS.RISK_MAX_COUNT) || !boundedArray(value.limitationReferences, BOUNDS.LIMITATION_MAX_COUNT)) return result("FAIL", ["TOMBSTONE_INVALID"]);
  return result("PASS");
};
export const validateReopeningRecord = (input: unknown): ValidationResult => {
  const value = validateShape(input, ["successorRecordId", "predecessorRecordId", "reopeningTrigger", "evidenceBoundary", "authority", "residualRiskReferences", "limitationReferences"]);
  if (!value || !validId(value.successorRecordId) || !validId(value.predecessorRecordId) || value.successorRecordId === value.predecessorRecordId || !validId(value.reopeningTrigger) || !sha(value.evidenceBoundary, 64) || value.authority !== "NON_AUTHORIZING" || !boundedArray(value.residualRiskReferences, BOUNDS.RISK_MAX_COUNT) || !boundedArray(value.limitationReferences, BOUNDS.LIMITATION_MAX_COUNT)) return result("FAIL", ["REOPENING_INVALID"]);
  return result("PASS");
};

export const validatePartialDurableState = (state: unknown): Readonly<{ outcome: ValidationOutcome; readback: (typeof DURABLE_READBACK_CLASSES)[number]; retryAuthority: false }> => {
  const mapping: Record<string, (typeof DURABLE_READBACK_CLASSES)[number]> = { FILES_EDITED_UNSTAGED: "LOCAL_STATUS", STAGED_NOT_COMMITTED: "LOCAL_STATUS", COMMITTED_NOT_PUSHED: "REMOTE_HEAD", PUSH_RESULT_AMBIGUOUS: "REMOTE_HEAD", PUSHED_PR_NOT_REFRESHED: "PULL_REQUEST", PR_REFRESHED_BODY_STALE: "PULL_REQUEST", BODY_UPDATE_RESULT_AMBIGUOUS: "PULL_REQUEST", REPLY_RESULT_AMBIGUOUS: "THREAD", REPLY_POSTED_THREAD_UNRESOLVED: "THREAD", THREAD_RESOLUTION_RESULT_AMBIGUOUS: "THREAD", READY_REQUEST_AMBIGUOUS: "PULL_REQUEST", REVIEW_REQUEST_AMBIGUOUS: "PULL_REQUEST", MERGE_RESULT_AMBIGUOUS: "MAIN_LINEAGE", MERGED_MAIN_NOT_VERIFIED: "MAIN_LINEAGE" };
  return Object.freeze({ outcome: PARTIAL_DURABLE_STATES.includes(state as typeof PARTIAL_DURABLE_STATES[number]) ? "PASS" : "FAIL", readback: mapping[String(state)] ?? "NONE", retryAuthority: false });
};