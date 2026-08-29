import { inspectRecordSnapshot } from "../factory-constitution";

export const P1_ACCEPTANCE_IDS = Object.freeze([
  ...Array.from({ length: 8 }, (_, index) => `POSTH1-P1-REGISTRY-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 10 }, (_, index) => `POSTH1-P1-VERIFY-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 6 }, (_, index) => `POSTH1-P1-STATE-${String(index + 1).padStart(3, "0")}`),
  ...Array.from({ length: 6 }, (_, index) => `POSTH1-P1-REPORT-${String(index + 1).padStart(3, "0")}`),
] as const);

export const LIFECYCLE_STATES = Object.freeze(["PLANNED", "AUTHORIZED", "IN_PROGRESS", "LOCALLY_ACCEPTED", "COMMITTED", "PUSHED", "PR_OPEN_DRAFT", "PR_OPEN_READY", "REVIEW_BLOCKED", "MERGE_READY", "MERGED", "MAIN_CLOSED", "REOPENED", "NOT_ASSESSABLE"] as const);
export type LifecycleState = (typeof LIFECYCLE_STATES)[number];
export type LifecycleTarget = Readonly<{ baseSha: string; headSha: string; branchName: string }>;
export type LifecycleLineage = Readonly<{ commits: readonly string[]; pullRequests: readonly string[] }>;
export type LifecycleGateState = Readonly<{ currentGateId: string; state: LifecycleState }>;
export type AcceptedMarkerRecord = Readonly<{ id: string }>;
export type AcceptanceDefinition = Readonly<{ id: string }>;
export type AcceptanceCoverageRecord = Readonly<{ id: string; covered: boolean }>;
export type FindingRecord = Readonly<{ id: string; blocked: boolean; closed: boolean }>;
export type EvidenceReference = Readonly<{ id: string; freshness: "FRESH" | "STALE" | "MISSING" }>;
export type EvidenceFreshnessState = EvidenceReference["freshness"];
export type AuthorityBoundary = string;
export type ResidualRiskRecord = string;
export type KnownLimitationRecord = string;
export type ReopeningTrigger = string;
export type NextGateProjection = string;
export type LifecycleRecord = Readonly<Record<string, unknown>>;
export type RegistryResult = Readonly<{ outcome: "PASS" | "FAIL" | "NOT_ASSESSABLE"; reasonCodes: readonly string[]; authority: "NON_AUTHORIZING" }>;

const id = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u.test(value);
const branch = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 255 && /^[A-Za-z0-9][A-Za-z0-9._/-]*$/u.test(value) && !value.includes("..") && !value.endsWith("/");
const sha = (value: unknown): value is string => typeof value === "string" && /^[a-f0-9]{40}$/u.test(value);
const bounded = (value: unknown): value is readonly unknown[] => Array.isArray(value) && value.length <= 64;
const result = (outcome: RegistryResult["outcome"], reasonCodes: readonly string[]): RegistryResult => Object.freeze({ outcome, reasonCodes: Object.freeze([...reasonCodes]), authority: "NON_AUTHORIZING" });

export const validateLifecycleRegistry = (input: unknown): RegistryResult => {
  const inspection = inspectRecordSnapshot(input);
  if (!inspection.valid) return result("NOT_ASSESSABLE", ["SAFE_INSPECTION_FAILED"]);
  const record = inspection.snapshot as Record<string, unknown>;
  const required = ["schemaVersion", "id", "projectId", "phaseId", "workstreamId", "currentGateId", "state", "baseSha", "headSha", "branchName", "commitLineage", "pullRequestLineage", "acceptedMarkers", "acceptanceDefinitions", "acceptanceCoverage", "findings", "evidence", "knownLimitations", "residualRisks", "authorityBoundaries", "nextGate", "reopeningTriggers", "observedAt"];
  if (required.some((key) => !(key in record))) return result("FAIL", ["REQUIRED_FIELD_MISSING"]);
  if (record.schemaVersion !== "1.0.0" || !id(record.id) || !id(record.projectId) || !id(record.phaseId) || !id(record.workstreamId) || !id(record.currentGateId) || !LIFECYCLE_STATES.includes(record.state as LifecycleState)) return result("FAIL", ["VOCABULARY_OR_ID_INVALID"]);
  if (!sha(record.baseSha) || !sha(record.headSha) || record.baseSha !== record.headSha || !branch(record.branchName)) return result("FAIL", ["TARGET_LOCK_INVALID"]);
  for (const key of ["commitLineage", "pullRequestLineage", "acceptedMarkers", "acceptanceDefinitions", "acceptanceCoverage", "findings", "evidence", "knownLimitations", "residualRisks", "authorityBoundaries", "reopeningTriggers"] as const) if (!bounded(record[key])) return result("FAIL", ["COLLECTION_BOUND_EXCEEDED"]);
  const markers = record.acceptedMarkers as readonly unknown[];
  if (markers.some((value) => !id(value)) || new Set(markers).size !== markers.length) return result("FAIL", ["MARKER_INVALID"]);
  const definitions = record.acceptanceDefinitions as readonly Record<string, unknown>[];
  const coverage = record.acceptanceCoverage as readonly Record<string, unknown>[];
  if (definitions.some((value) => !id(value.id)) || new Set(definitions.map((value) => value.id)).size !== definitions.length || coverage.length !== definitions.length || coverage.some((value) => !id(value.id) || value.covered !== true) || new Set(coverage.map((value) => value.id)).size !== coverage.length || coverage.some((value) => !definitions.some((definition) => definition.id === value.id))) return result("FAIL", ["ACCEPTANCE_COVERAGE_INCOMPLETE"]);
  if ((record.evidence as readonly Record<string, unknown>[]).some((value) => !id(value.id) || value.freshness !== "FRESH")) return result("FAIL", ["EVIDENCE_NOT_FRESH"]);
  if ((record.findings as readonly Record<string, unknown>[]).some((value) => value.blocked === true && value.closed !== true)) return result("FAIL", ["BLOCKING_FINDING_OPEN"]);
  if (!(record.authorityBoundaries as readonly unknown[]).some((value) => typeof value === "string" && value.length > 0) || !id(record.nextGate)) return result("FAIL", ["AUTHORITY_OR_NEXT_GATE_MISSING"]);
  return result("PASS", []);
};