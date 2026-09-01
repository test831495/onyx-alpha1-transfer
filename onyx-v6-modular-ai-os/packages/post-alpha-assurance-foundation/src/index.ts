import { createHash } from "node:crypto";

export const LIFECYCLE_STATES = ["PLANNED", "CONTRACT_FROZEN", "IMPLEMENTING", "LOCALLY_VALIDATED", "INTEGRATION_ELIGIBLE", "INTEGRATED", "OWNER_ACCEPTED"] as const;
export const FRESHNESS_STATES = ["CURRENT", "REUSABLE_CURRENT", "STALE", "EXPIRED", "INVALIDATED", "SUPERSEDED", "NOT_ASSESSABLE"] as const;
export const DRIFT_STATES = ["NO_DRIFT", "EXPECTED_ADDITIVE_DRIFT", "ACCEPTED_VERSIONED_CHANGE", "POTENTIAL_DRIFT", "MATERIAL_DRIFT", "BREAKING_DRIFT", "AUTHORITY_DRIFT", "SECURITY_DRIFT", "EXPERIENCE_DRIFT", "NOT_ASSESSABLE"] as const;
export const FLAG_MATURITY = ["OFF", "SYNTHETIC_ONLY", "OWNER_CANARY", "OWNER_ACTIVE", "GENERAL_ACTIVE"] as const;
export const ASSURANCE_ACCEPTANCE_FAMILIES = ["PA-ASSURE-WORKSTREAM", "PA-ASSURE-ACCEPTANCE", "PA-ASSURE-EVIDENCE", "PA-ASSURE-HASHING", "PA-ASSURE-FRESHNESS", "PA-ASSURE-DRIFT", "PA-ASSURE-COMPATIBILITY", "PA-ASSURE-BRIEFING", "PA-ASSURE-LIFECYCLE", "PA-ASSURE-INTEGRATION-ELIGIBILITY"] as const;

export type LifecycleState = typeof LIFECYCLE_STATES[number];
export type FreshnessState = typeof FRESHNESS_STATES[number];
export type DriftState = typeof DRIFT_STATES[number];
export type FlagMaturity = typeof FLAG_MATURITY[number];
export type Lane = "ASSURANCE" | "GOVERNANCE" | "INTELLIGENCE" | "AVATAR";
export type IntegrationEligibility = "INTEGRATION_ELIGIBLE" | "INTEGRATION_NOT_ELIGIBLE" | "INTEGRATION_NOT_ASSESSABLE";

export interface WorkstreamRecord {
  readonly id: string;
  readonly lane: Lane;
  readonly lifecycle: LifecycleState;
  readonly acceptanceFamilies: readonly string[];
  readonly ownedFlags: readonly string[];
  readonly allowedPaths: readonly string[];
  readonly rollback: string;
}

export interface AcceptanceRecord {
  readonly id: string;
  readonly family: string;
  readonly requirement: string;
  readonly testIds: readonly string[];
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, canonicalize(entry)]));
  }
  if (value === undefined || typeof value === "function" || typeof value === "symbol" || typeof value === "bigint") {
    throw new TypeError("Value is not canonical JSON");
  }
  return value;
}

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry);
    Object.freeze(value);
  }
  return value;
}

function assertExactKeys(value: object, expected: readonly string[]): void {
  const actual = Object.keys(value).sort();
  const permitted = [...expected].sort();
  if (actual.length !== permitted.length || actual.some((key, index) => key !== permitted[index])) {
    throw new TypeError("Unknown or missing contract field");
  }
}

export function canonicalHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex");
}

export const createContractFingerprint = canonicalHash;

export function validateWorkstream(record: WorkstreamRecord): Readonly<WorkstreamRecord> {
  assertExactKeys(record, ["id", "lane", "lifecycle", "acceptanceFamilies", "ownedFlags", "allowedPaths", "rollback"]);
  if (!LIFECYCLE_STATES.includes(record.lifecycle) || !record.id.startsWith("PA-") || record.rollback.length === 0) throw new TypeError("Invalid workstream");
  if (record.ownedFlags.length === 0 || record.allowedPaths.length === 0 || record.acceptanceFamilies.length === 0) throw new TypeError("Incomplete workstream");
  return deepFreeze(structuredClone(record));
}

export function validateAcceptanceRecord(record: AcceptanceRecord): Readonly<AcceptanceRecord> {
  assertExactKeys(record, ["id", "family", "requirement", "testIds"]);
  const knownPrefix = ["PA-ASSURE-", "PA-GOV-", "PA-INTEL-", "PA-AVATAR-"];
  if (!record.id.startsWith("AC-") || !knownPrefix.some((prefix) => record.family.startsWith(prefix)) || record.testIds.length === 0) throw new TypeError("Invalid acceptance record");
  return deepFreeze(structuredClone(record));
}

export interface FreshnessEvidence {
  readonly candidateHead: string;
  readonly candidateTree: string;
  readonly artifactHashValid: boolean;
  readonly expiresAt?: string;
  readonly superseded?: boolean;
  readonly dependenciesChanged?: boolean;
  readonly conflictingCurrentEvidence?: boolean;
}

export function evaluateFreshness(evidence: FreshnessEvidence | undefined, current: { readonly head: string; readonly tree: string; readonly now: string }): FreshnessState {
  if (!evidence) return "NOT_ASSESSABLE";
  if (!evidence.artifactHashValid || evidence.dependenciesChanged || evidence.conflictingCurrentEvidence) return "INVALIDATED";
  if (evidence.superseded) return "SUPERSEDED";
  if (evidence.candidateHead !== current.head || evidence.candidateTree !== current.tree) return "STALE";
  if (evidence.expiresAt && Date.parse(evidence.expiresAt) <= Date.parse(current.now)) return "EXPIRED";
  return "CURRENT";
}

export interface DriftRecord {
  readonly subject: string;
  readonly classification: DriftState;
  readonly expectedFingerprint?: string;
  readonly actualFingerprint?: string;
  readonly evidenceReferences: readonly string[];
}

const BLOCKING_DRIFT: readonly DriftState[] = ["MATERIAL_DRIFT", "BREAKING_DRIFT", "AUTHORITY_DRIFT", "SECURITY_DRIFT", "EXPERIENCE_DRIFT", "NOT_ASSESSABLE"];

export function projectIntegrationEligibility(input: {
  readonly testsPass: boolean;
  readonly typecheckPass: boolean;
  readonly acceptanceComplete: boolean;
  readonly freshness: FreshnessState;
  readonly drift: readonly DriftState[];
  readonly flagsOff: boolean;
  readonly rollbackDefined: boolean;
  readonly authorityExpanded: boolean;
  readonly contractConflicts: readonly string[];
}): IntegrationEligibility {
  if (input.freshness === "NOT_ASSESSABLE") return "INTEGRATION_NOT_ASSESSABLE";
  if (!input.testsPass || !input.typecheckPass || !input.acceptanceComplete || !["CURRENT", "REUSABLE_CURRENT"].includes(input.freshness) || input.drift.some((state) => BLOCKING_DRIFT.includes(state)) || !input.flagsOff || !input.rollbackDefined || input.authorityExpanded || input.contractConflicts.length > 0) return "INTEGRATION_NOT_ELIGIBLE";
  return "INTEGRATION_ELIGIBLE";
}

export function reconcileWorkstreams(records: readonly WorkstreamRecord[]): Readonly<{ conflicts: readonly string[]; eligibleForStage2: boolean }> {
  const validated = records.map(validateWorkstream);
  const paths = new Set<string>();
  const flags = new Set<string>();
  const conflicts: string[] = [];
  for (const record of validated) {
    for (const path of record.allowedPaths) paths.has(path) ? conflicts.push(`PATH:${path}`) : paths.add(path);
    for (const flag of record.ownedFlags) flags.has(flag) ? conflicts.push(`FLAG:${flag}`) : flags.add(flag);
  }
  return deepFreeze({ conflicts, eligibleForStage2: conflicts.length === 0 });
}

export interface EvidenceManifestInput {
  readonly workstream: WorkstreamRecord;
  readonly candidate: { readonly branch: string; readonly head: string; readonly tree: string };
  readonly changedPaths: readonly string[];
  readonly commands: readonly { readonly command: string; readonly exitCode: number; readonly tests?: number }[];
  readonly acceptanceCoverage: readonly string[];
  readonly contractFingerprints: Readonly<Record<string, string>>;
  readonly featureFlags: Readonly<Record<string, FlagMaturity>>;
  readonly artifacts: readonly { readonly path: string; readonly sha256: string }[];
  readonly limitations: readonly string[];
  readonly freshnessDependencies: readonly string[];
  readonly invalidationTriggers: readonly string[];
  readonly rollbackReady: boolean;
}

export function createEvidenceManifest(input: EvidenceManifestInput): Readonly<EvidenceManifestInput & { schemaVersion: "PA_EVIDENCE_V1"; manifestHash: string; allowedPathCompliance: boolean }> {
  validateWorkstream(input.workstream);
  if (Object.values(input.featureFlags).some((state) => state !== "OFF")) throw new TypeError("Feature flags must remain OFF in this gate");
  const allowedPathCompliance = input.changedPaths.every((path) => input.workstream.allowedPaths.some((allowed) => path.startsWith(allowed.replace(/\*\*$/, ""))));
  const body = { schemaVersion: "PA_EVIDENCE_V1" as const, ...structuredClone(input), allowedPathCompliance };
  return deepFreeze({ ...body, manifestHash: canonicalHash(body) });
}

export function createArtifactManifest(artifacts: readonly { readonly path: string; readonly content: unknown }[]) {
  return deepFreeze(artifacts.map(({ path, content }) => ({ path, sha256: canonicalHash(content) })));
}

export interface OwnerBriefingInput {
  readonly verifiedFacts: readonly string[];
  readonly blockers: readonly string[];
  readonly ownerDisposition: "NOT_RECORDED" | "ACCEPTED" | "REJECTED" | "DEFERRED";
  readonly novaAnalysis: readonly string[];
  readonly onyxRecommendation: readonly string[];
  readonly decisionsRequired: readonly string[];
}

export function projectOwnerBriefing(input: OwnerBriefingInput) {
  return deepFreeze({ ...structuredClone(input), authorization: "NOT_AUTHORIZED" as const, generatedBy: "DETERMINISTIC_SYNTHETIC_PROJECTION" as const });
}

export interface ValidationProfile {
  readonly packageTests: readonly string[];
  readonly typecheck: string;
  readonly mappedTests: readonly string[];
  readonly paidServicesAllowed: false;
}

export interface CompatibilityProjection {
  readonly source: string;
  readonly target: string;
  readonly compatible: boolean;
  readonly conflicts: readonly string[];
  readonly presenceIntegrationAuthorized: false;
}

// CORR-ASSURE-001: closed, immutable source-level flag registry for the sole PA-ASSURE-owned flag.
export const ASSURANCE_FLAGS = Object.freeze({ operations_center_runtime: "OFF" as const });

export interface FlagRegistryRecord {
  readonly flag: string;
  readonly owner: "PA-ASSURE-01";
  readonly state: FlagMaturity;
  readonly presenceOwns: false;
}

export function validateFlagRegistry(record: FlagRegistryRecord): Readonly<FlagRegistryRecord> {
  assertExactKeys(record, ["flag", "owner", "state", "presenceOwns"]);
  if (record.owner !== "PA-ASSURE-01" || record.flag !== "operations_center_runtime" || record.state !== "OFF" || record.presenceOwns !== false) {
    throw new TypeError("Invalid PA-ASSURE flag registry entry");
  }
  return deepFreeze(structuredClone(record));
}

export const OPERATIONS_CENTER_RUNTIME_FLAG_REGISTRY: Readonly<FlagRegistryRecord> = validateFlagRegistry({
  flag: "operations_center_runtime",
  owner: "PA-ASSURE-01",
  state: "OFF",
  presenceOwns: false,
});