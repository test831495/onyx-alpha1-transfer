import { boundedFreeze } from "./capture-policy";
import { MAX_EVIDENCE_REFERENCES, RECOVERY_RESTORATION_STAGES } from "./recovery-completeness-policy";
import type { RecoveryRestorationStage } from "./model";

export const MAX_RECOVERY_ARTIFACT_DECLARATIONS = 32;
export const MAX_RECOVERY_ARTIFACT_PREREQUISITES = 64;
export const MAX_PREREQUISITES_PER_RECOVERY_ARTIFACT = 16;
export const MAX_RECOVERY_DEPENDENCY_CONTINUITY_GAPS = 64;

export const RECOVERY_DEPENDENCY_ARTIFACT_CLASSES = boundedFreeze([
  "TRUST_ANCHOR_METADATA", "CRYPTOGRAPHIC_POLICY_METADATA", "HOUSEHOLD_IDENTITY_METADATA", "HOUSEHOLD_MEMBERSHIP_METADATA",
  "REVOCATION_METADATA", "INCIDENT_METADATA", "ROLE_METADATA", "AUTHORIZATION_POLICY_METADATA", "DEVICE_REGISTRY_METADATA",
  "SUPPORTED_CLIENT_POLICY_METADATA", "INVALIDATED_SESSION_HISTORY", "APPROVAL_CONSUMPTION_STATE", "DELETION_TOMBSTONE_METADATA",
  "MEMORY_METADATA", "SYNCHRONIZATION_METADATA", "CONNECTOR_METADATA", "OPTIONAL_RUNTIME_SERVICE_METADATA",
] as const);
export type RecoveryDependencyArtifactClass = (typeof RECOVERY_DEPENDENCY_ARTIFACT_CLASSES)[number];

export const RECOVERY_DEPENDENCY_ARTIFACT_STAGE_BY_CLASS: Readonly<Record<RecoveryDependencyArtifactClass, RecoveryRestorationStage>> = boundedFreeze({
  TRUST_ANCHOR_METADATA: "TRUST_ANCHORS_AND_CRYPTO_POLICY",
  CRYPTOGRAPHIC_POLICY_METADATA: "TRUST_ANCHORS_AND_CRYPTO_POLICY",
  HOUSEHOLD_IDENTITY_METADATA: "HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS",
  HOUSEHOLD_MEMBERSHIP_METADATA: "HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS",
  REVOCATION_METADATA: "REVOCATIONS_AND_INCIDENTS",
  INCIDENT_METADATA: "REVOCATIONS_AND_INCIDENTS",
  ROLE_METADATA: "ROLES_AND_CURRENT_AUTHORIZATION_POLICIES",
  AUTHORIZATION_POLICY_METADATA: "ROLES_AND_CURRENT_AUTHORIZATION_POLICIES",
  DEVICE_REGISTRY_METADATA: "DEVICE_REGISTRY_AND_SUPPORTED_CLIENT_POLICY",
  SUPPORTED_CLIENT_POLICY_METADATA: "DEVICE_REGISTRY_AND_SUPPORTED_CLIENT_POLICY",
  INVALIDATED_SESSION_HISTORY: "SESSIONS_INVALIDATED_HISTORY_ONLY",
  APPROVAL_CONSUMPTION_STATE: "APPROVAL_AND_CONSUMPTION_STATE",
  DELETION_TOMBSTONE_METADATA: "DELETION_TOMBSTONES",
  MEMORY_METADATA: "MEMORY_AND_SYNCHRONIZATION_METADATA",
  SYNCHRONIZATION_METADATA: "MEMORY_AND_SYNCHRONIZATION_METADATA",
  CONNECTOR_METADATA: "CONNECTORS_OPTIONAL_RUNTIME_SERVICES_LAST",
  OPTIONAL_RUNTIME_SERVICE_METADATA: "CONNECTORS_OPTIONAL_RUNTIME_SERVICES_LAST",
});

export interface RecoveryDependencyArtifactDeclaration { readonly artifactClass: RecoveryDependencyArtifactClass; readonly stage: RecoveryRestorationStage; readonly evidenceStatus: RecoveryDependencyArtifactEvidenceStatus; readonly evidenceReferences: readonly string[]; readonly createsAuthority: false; }
export interface RecoveryDependencyArtifactPrerequisite { readonly artifactClass: RecoveryDependencyArtifactClass; readonly prerequisiteClass: RecoveryDependencyArtifactClass; readonly createsAuthority: false; }
export interface RecoveryDependencyArtifactPeerRequirement { readonly artifactClass: RecoveryDependencyArtifactClass; readonly peerArtifactClass: RecoveryDependencyArtifactClass; readonly evidenceStatus: RecoveryDependencyArtifactEvidenceStatus; readonly evidenceReferences: readonly string[]; readonly createsAuthority: false; }
export const RECOVERY_DEPENDENCY_ARTIFACT_EVIDENCE_STATUSES = boundedFreeze(["VERIFIED", "MISSING", "CONFLICTING", "UNVERIFIED"] as const);
export type RecoveryDependencyArtifactEvidenceStatus = (typeof RECOVERY_DEPENDENCY_ARTIFACT_EVIDENCE_STATUSES)[number];

export interface RecoveryDependencyReadinessInput {
  readonly artifactDeclarations: readonly RecoveryDependencyArtifactDeclaration[];
  readonly prerequisites: readonly RecoveryDependencyArtifactPrerequisite[];
  readonly peerRequirements: readonly RecoveryDependencyArtifactPeerRequirement[];
  readonly policyVersion: string;
  readonly prohibitedReactivation: boolean;
  readonly createsAuthority: false;
}
export interface RecoveryDependencyContinuityGap { readonly artifactClass: RecoveryDependencyArtifactClass; readonly kind: "MISSING_ARTIFACT" | "MISSING_PREREQUISITE_EVIDENCE" | "UNVERIFIED_PREREQUISITE_EVIDENCE" | "MISSING_PEER_EVIDENCE" | "UNVERIFIED_PEER_EVIDENCE"; readonly relatedArtifactClass?: RecoveryDependencyArtifactClass; readonly createsAuthority: false; }
export const RECOVERY_DEPENDENCY_READINESS_STATES = boundedFreeze(["READY_FOR_METADATA_REVIEW", "BLOCKED_MISSING_PREREQUISITE", "BLOCKED_CONFLICTING_PREREQUISITE", "BLOCKED_UNVERIFIED_EVIDENCE", "BLOCKED_PROHIBITED_REACTIVATION", "NOT_ASSESSABLE"] as const);
export type RecoveryDependencyReadinessState = (typeof RECOVERY_DEPENDENCY_READINESS_STATES)[number];
export interface RecoveryDependencyReadinessResult {
  readonly state: RecoveryDependencyReadinessState;
  readonly reason?: "CONTINUITY_GAPS_EXCEED_REPRESENTATION_BOUND";
  readonly gaps: readonly RecoveryDependencyContinuityGap[];
  readonly evidenceReferences: readonly string[];
  readonly restorationOrder: readonly RecoveryDependencyArtifactClass[];
  readonly metadataOnly: true;
  readonly executionTarget?: undefined;
  readonly actionCommand?: undefined;
  readonly activationMode?: undefined;
  readonly createsAuthority: false;
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const ownKeys = (value: object): PropertyKey[] => Reflect.ownKeys(value);
const hasExactKeys = (value: object, keys: readonly string[]): boolean => ownKeys(value).every((key) => typeof key === "string" && keys.includes(key));
const isDenseArray = (value: unknown): value is readonly unknown[] => {
  if (!Array.isArray(value)) return false;
  const names = Object.getOwnPropertyNames(value);
  return Object.getOwnPropertySymbols(value).length === 0 && names.every((name) => name === "length" || /^\d+$/.test(name)) && names.filter((name) => name !== "length").length === value.length && value.every((_, index) => Object.prototype.hasOwnProperty.call(value, index));
};
const isOpaqueReference = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) && !/^(?:command|execute|restore)(?:[-_.]|$)/i.test(value);
const isClass = (value: unknown): value is RecoveryDependencyArtifactClass => typeof value === "string" && (RECOVERY_DEPENDENCY_ARTIFACT_CLASSES as readonly string[]).includes(value);
const isStage = (value: unknown): value is RecoveryRestorationStage => typeof value === "string" && (RECOVERY_RESTORATION_STAGES as readonly string[]).includes(value);
const isStatus = (value: unknown): value is RecoveryDependencyArtifactEvidenceStatus => typeof value === "string" && (RECOVERY_DEPENDENCY_ARTIFACT_EVIDENCE_STATUSES as readonly string[]).includes(value);
const stageIndex = (stage: RecoveryRestorationStage): number => RECOVERY_RESTORATION_STAGES.indexOf(stage);
const relationKey = (item: { artifactClass: RecoveryDependencyArtifactClass; prerequisiteClass?: RecoveryDependencyArtifactClass; peerArtifactClass?: RecoveryDependencyArtifactClass }): string => `${item.artifactClass}|${item.prerequisiteClass ?? item.peerArtifactClass ?? ""}`;
const PEER_RELATIONS = new Set([
  "CRYPTOGRAPHIC_POLICY_METADATA|TRUST_ANCHOR_METADATA",
  "HOUSEHOLD_MEMBERSHIP_METADATA|HOUSEHOLD_IDENTITY_METADATA",
  "AUTHORIZATION_POLICY_METADATA|ROLE_METADATA",
  "SUPPORTED_CLIENT_POLICY_METADATA|DEVICE_REGISTRY_METADATA",
  "SYNCHRONIZATION_METADATA|MEMORY_METADATA",
  "OPTIONAL_RUNTIME_SERVICE_METADATA|CONNECTOR_METADATA",
]);
const CROSS_STAGE_RELATIONS = new Set([
  "HOUSEHOLD_IDENTITY_METADATA|TRUST_ANCHOR_METADATA", "HOUSEHOLD_IDENTITY_METADATA|CRYPTOGRAPHIC_POLICY_METADATA",
  "REVOCATION_METADATA|HOUSEHOLD_IDENTITY_METADATA", "INCIDENT_METADATA|HOUSEHOLD_IDENTITY_METADATA",
  "ROLE_METADATA|HOUSEHOLD_IDENTITY_METADATA", "ROLE_METADATA|HOUSEHOLD_MEMBERSHIP_METADATA", "ROLE_METADATA|REVOCATION_METADATA", "ROLE_METADATA|INCIDENT_METADATA",
  "AUTHORIZATION_POLICY_METADATA|HOUSEHOLD_IDENTITY_METADATA", "AUTHORIZATION_POLICY_METADATA|HOUSEHOLD_MEMBERSHIP_METADATA", "AUTHORIZATION_POLICY_METADATA|REVOCATION_METADATA", "AUTHORIZATION_POLICY_METADATA|INCIDENT_METADATA",
  "DEVICE_REGISTRY_METADATA|AUTHORIZATION_POLICY_METADATA", "DEVICE_REGISTRY_METADATA|REVOCATION_METADATA", "DEVICE_REGISTRY_METADATA|INCIDENT_METADATA",
  "SUPPORTED_CLIENT_POLICY_METADATA|AUTHORIZATION_POLICY_METADATA", "SUPPORTED_CLIENT_POLICY_METADATA|REVOCATION_METADATA",
  "INVALIDATED_SESSION_HISTORY|HOUSEHOLD_IDENTITY_METADATA", "INVALIDATED_SESSION_HISTORY|AUTHORIZATION_POLICY_METADATA", "INVALIDATED_SESSION_HISTORY|DEVICE_REGISTRY_METADATA", "INVALIDATED_SESSION_HISTORY|REVOCATION_METADATA",
  "APPROVAL_CONSUMPTION_STATE|HOUSEHOLD_IDENTITY_METADATA", "APPROVAL_CONSUMPTION_STATE|AUTHORIZATION_POLICY_METADATA", "APPROVAL_CONSUMPTION_STATE|REVOCATION_METADATA", "APPROVAL_CONSUMPTION_STATE|INVALIDATED_SESSION_HISTORY",
  "DELETION_TOMBSTONE_METADATA|HOUSEHOLD_IDENTITY_METADATA", "DELETION_TOMBSTONE_METADATA|AUTHORIZATION_POLICY_METADATA", "DELETION_TOMBSTONE_METADATA|REVOCATION_METADATA",
  "MEMORY_METADATA|HOUSEHOLD_IDENTITY_METADATA", "MEMORY_METADATA|AUTHORIZATION_POLICY_METADATA", "MEMORY_METADATA|DEVICE_REGISTRY_METADATA", "MEMORY_METADATA|REVOCATION_METADATA", "MEMORY_METADATA|DELETION_TOMBSTONE_METADATA",
  "SYNCHRONIZATION_METADATA|DEVICE_REGISTRY_METADATA", "SYNCHRONIZATION_METADATA|REVOCATION_METADATA", "SYNCHRONIZATION_METADATA|DELETION_TOMBSTONE_METADATA",
  "CONNECTOR_METADATA|HOUSEHOLD_IDENTITY_METADATA", "CONNECTOR_METADATA|AUTHORIZATION_POLICY_METADATA", "CONNECTOR_METADATA|DEVICE_REGISTRY_METADATA", "CONNECTOR_METADATA|REVOCATION_METADATA", "CONNECTOR_METADATA|DELETION_TOMBSTONE_METADATA",
  "OPTIONAL_RUNTIME_SERVICE_METADATA|AUTHORIZATION_POLICY_METADATA", "OPTIONAL_RUNTIME_SERVICE_METADATA|DEVICE_REGISTRY_METADATA", "OPTIONAL_RUNTIME_SERVICE_METADATA|REVOCATION_METADATA", "OPTIONAL_RUNTIME_SERVICE_METADATA|DELETION_TOMBSTONE_METADATA",
]);
const copyRefs = (value: unknown, reasons: string[]): readonly string[] => {
  if (!isDenseArray(value)) { reasons.push("evidenceReferences must be a dense array"); return []; }
  if (value.length > MAX_EVIDENCE_REFERENCES) reasons.push("evidenceReferences exceed maximum bound");
  if (value.some((item) => !isOpaqueReference(item))) reasons.push("evidenceReferences contain an invalid opaque identifier");
  if (new Set(value).size !== value.length) reasons.push("evidenceReferences contain duplicates");
  return value as readonly string[];
};

const validateDeclaration = (value: unknown, reasons: string[]): value is RecoveryDependencyArtifactDeclaration => {
  if (!isPlainRecord(value) || !hasExactKeys(value, ["artifactClass", "stage", "evidenceStatus", "evidenceReferences", "createsAuthority"])) { reasons.push("artifact declaration is malformed"); return false; }
  if (!isClass(value.artifactClass)) reasons.push("artifact declaration has an unknown class");
  if (!isStage(value.stage)) reasons.push("artifact declaration has an unknown stage");
  if (isClass(value.artifactClass) && value.stage !== RECOVERY_DEPENDENCY_ARTIFACT_STAGE_BY_CLASS[value.artifactClass]) reasons.push("artifact declaration conflicts with static stage mapping");
  if (!isStatus(value.evidenceStatus)) reasons.push("artifact declaration has an invalid evidence status");
  copyRefs(value.evidenceReferences, reasons);
  if (value.createsAuthority !== false) reasons.push("createsAuthority must be false");
  return reasons.length === 0;
};
const validateRelation = (value: unknown, reasons: string[], peer: boolean): value is RecoveryDependencyArtifactPrerequisite | RecoveryDependencyArtifactPeerRequirement => {
  const keys = peer ? ["artifactClass", "peerArtifactClass", "evidenceStatus", "evidenceReferences", "createsAuthority"] : ["artifactClass", "prerequisiteClass", "createsAuthority"];
  if (!isPlainRecord(value) || !hasExactKeys(value, keys)) { reasons.push("artifact relation is malformed"); return false; }
  const related = peer ? value.peerArtifactClass : value.prerequisiteClass;
  if (!isClass(value.artifactClass) || !isClass(related)) reasons.push("artifact relation has an unknown class");
  if (value.createsAuthority !== false) reasons.push("createsAuthority must be false");
  if (peer) { if (!isStatus(value.evidenceStatus)) reasons.push("peer evidence status is invalid"); copyRefs(value.evidenceReferences, reasons); if (value.artifactClass === value.peerArtifactClass) reasons.push("peer relation cannot self-reference"); }
  else if (value.artifactClass === value.prerequisiteClass) reasons.push("prerequisite cannot self-reference");
  return reasons.length === 0;
};

export const validateRecoveryDependencyReadinessInput = (value: RecoveryDependencyReadinessInput): { readonly valid: boolean; readonly reasons: readonly string[]; readonly createsAuthority: false; readonly value?: Readonly<RecoveryDependencyReadinessInput> } => {
  const input = value as unknown;
  const reasons: string[] = [];
  if (!isPlainRecord(input) || !hasExactKeys(input, ["artifactDeclarations", "prerequisites", "peerRequirements", "policyVersion", "prohibitedReactivation", "createsAuthority"])) { reasons.push("input must be an exact plain record"); return boundedFreeze({ valid: false, reasons, createsAuthority: false }); }
  if (!isOpaqueReference(input.policyVersion)) reasons.push("policyVersion must be an opaque identifier");
  if (input.prohibitedReactivation !== true && input.prohibitedReactivation !== false) reasons.push("prohibitedReactivation must be boolean");
  if (input.createsAuthority !== false) reasons.push("createsAuthority must be false");
  const declarations = input.artifactDeclarations;
  if (!isDenseArray(declarations)) reasons.push("artifactDeclarations must be a dense array");
  else { if (declarations.length > MAX_RECOVERY_ARTIFACT_DECLARATIONS) reasons.push("artifactDeclarations exceed maximum bound"); declarations.forEach((item) => validateDeclaration(item, reasons)); if (new Set(declarations.filter(isPlainRecord).map((item) => item.artifactClass)).size !== declarations.length) reasons.push("artifactDeclarations contain duplicates"); }
  const prerequisites = input.prerequisites;
  if (!isDenseArray(prerequisites)) reasons.push("prerequisites must be a dense array");
  else { if (prerequisites.length > MAX_RECOVERY_ARTIFACT_PREREQUISITES) reasons.push("prerequisites exceed maximum bound"); prerequisites.forEach((item) => validateRelation(item, reasons, false)); const keys = prerequisites.filter(isPlainRecord).map((item) => relationKey(item as unknown as RecoveryDependencyArtifactPrerequisite)); if (new Set(keys).size !== keys.length) reasons.push("prerequisites contain duplicates"); if (keys.some((key) => !CROSS_STAGE_RELATIONS.has(key))) reasons.push("prerequisite is outside the closed matrix"); const counts = new Map<string, number>(); for (const item of prerequisites.filter(isPlainRecord) as unknown as RecoveryDependencyArtifactPrerequisite[]) counts.set(item.artifactClass, (counts.get(item.artifactClass) ?? 0) + 1); if ([...counts.values()].some((count) => count > MAX_PREREQUISITES_PER_RECOVERY_ARTIFACT)) reasons.push("artifact prerequisites exceed per-artifact bound"); for (const item of prerequisites.filter(isPlainRecord) as unknown as RecoveryDependencyArtifactPrerequisite[]) if (isClass(item.artifactClass) && isClass(item.prerequisiteClass) && stageIndex(RECOVERY_DEPENDENCY_ARTIFACT_STAGE_BY_CLASS[item.prerequisiteClass]) >= stageIndex(RECOVERY_DEPENDENCY_ARTIFACT_STAGE_BY_CLASS[item.artifactClass])) reasons.push("prerequisite must target a strictly earlier stage"); }
  const peers = input.peerRequirements;
  if (!isDenseArray(peers)) reasons.push("peerRequirements must be a dense array");
  else { if (peers.length > MAX_RECOVERY_ARTIFACT_PREREQUISITES) reasons.push("peerRequirements exceed maximum bound"); peers.forEach((item) => validateRelation(item, reasons, true)); const keys = peers.filter(isPlainRecord).map((item) => relationKey(item as unknown as RecoveryDependencyArtifactPeerRequirement)); if (new Set(keys).size !== keys.length) reasons.push("peerRequirements contain duplicates"); if (keys.some((key) => !PEER_RELATIONS.has(key))) reasons.push("peer relation is outside the closed matrix"); }
  if (reasons.length > 0) return boundedFreeze({ valid: false, reasons, createsAuthority: false });
  const copied = boundedFreeze({ artifactDeclarations: boundedFreeze((input.artifactDeclarations as readonly RecoveryDependencyArtifactDeclaration[]).map((item) => boundedFreeze({ ...item, evidenceReferences: boundedFreeze([...item.evidenceReferences]) }))), prerequisites: boundedFreeze((input.prerequisites as readonly RecoveryDependencyArtifactPrerequisite[]).map((item) => boundedFreeze({ ...item }))), peerRequirements: boundedFreeze((input.peerRequirements as readonly RecoveryDependencyArtifactPeerRequirement[]).map((item) => boundedFreeze({ ...item, evidenceReferences: boundedFreeze([...item.evidenceReferences]) }))), policyVersion: input.policyVersion, prohibitedReactivation: input.prohibitedReactivation, createsAuthority: false as const });
  return boundedFreeze({ valid: true, reasons: boundedFreeze([]), value: copied as Readonly<RecoveryDependencyReadinessInput>, createsAuthority: false });
};

export const projectRecoveryArtifactsInRestorationOrder = (input: RecoveryDependencyReadinessInput): readonly RecoveryDependencyArtifactClass[] => {
  const validated = validateRecoveryDependencyReadinessInput(input);
  if (!validated.valid || !validated.value) return boundedFreeze([]);
  const declarations = validated.value.artifactDeclarations;
  return boundedFreeze([...declarations].sort((left, right) => stageIndex(left.stage) - stageIndex(right.stage) || RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.indexOf(left.artifactClass) - RECOVERY_DEPENDENCY_ARTIFACT_CLASSES.indexOf(right.artifactClass)).map((item) => item.artifactClass));
};

export const assessRecoveryDependencyReadiness = (input: RecoveryDependencyReadinessInput): RecoveryDependencyReadinessResult => {
  const validated = validateRecoveryDependencyReadinessInput(input);
  if (!validated.valid || !validated.value) return boundedFreeze({ state: "NOT_ASSESSABLE", gaps: boundedFreeze([]), evidenceReferences: boundedFreeze([]), restorationOrder: boundedFreeze([]), metadataOnly: true, createsAuthority: false });
  const value = validated.value;
  const declarations = new Map(value.artifactDeclarations.map((item) => [item.artifactClass, item]));
  const gaps: RecoveryDependencyContinuityGap[] = [];
  for (const artifactClass of RECOVERY_DEPENDENCY_ARTIFACT_CLASSES) if (!declarations.has(artifactClass)) gaps.push({ artifactClass, kind: "MISSING_ARTIFACT", createsAuthority: false });
  for (const declaration of value.artifactDeclarations) { if (declaration.evidenceStatus === "MISSING") gaps.push({ artifactClass: declaration.artifactClass, kind: "MISSING_PREREQUISITE_EVIDENCE", createsAuthority: false }); if (declaration.evidenceStatus === "UNVERIFIED") gaps.push({ artifactClass: declaration.artifactClass, kind: "UNVERIFIED_PREREQUISITE_EVIDENCE", createsAuthority: false }); }
  for (const prerequisite of value.prerequisites) { const declaration = declarations.get(prerequisite.artifactClass); const required = declarations.get(prerequisite.prerequisiteClass); if (!declaration || !required) continue; if (required.evidenceStatus === "MISSING") gaps.push({ artifactClass: prerequisite.artifactClass, relatedArtifactClass: prerequisite.prerequisiteClass, kind: "MISSING_PREREQUISITE_EVIDENCE", createsAuthority: false }); if (required.evidenceStatus === "UNVERIFIED") gaps.push({ artifactClass: prerequisite.artifactClass, relatedArtifactClass: prerequisite.prerequisiteClass, kind: "UNVERIFIED_PREREQUISITE_EVIDENCE", createsAuthority: false }); }
  for (const peer of value.peerRequirements) { if (peer.evidenceStatus === "MISSING") gaps.push({ artifactClass: peer.artifactClass, relatedArtifactClass: peer.peerArtifactClass, kind: "MISSING_PEER_EVIDENCE", createsAuthority: false }); if (peer.evidenceStatus === "UNVERIFIED") gaps.push({ artifactClass: peer.artifactClass, relatedArtifactClass: peer.peerArtifactClass, kind: "UNVERIFIED_PEER_EVIDENCE", createsAuthority: false }); }
  const evidenceReferences = value.artifactDeclarations.flatMap((item) => item.evidenceReferences).concat(value.peerRequirements.flatMap((item) => item.evidenceReferences));
  const conflicting = value.artifactDeclarations.some((item) => item.evidenceStatus === "CONFLICTING") || value.peerRequirements.some((item) => item.evidenceStatus === "CONFLICTING");
  const missing = gaps.some((gap) => gap.kind === "MISSING_ARTIFACT" || gap.kind === "MISSING_PREREQUISITE_EVIDENCE" || gap.kind === "MISSING_PEER_EVIDENCE");
  const unverified = gaps.some((gap) => gap.kind === "UNVERIFIED_PREREQUISITE_EVIDENCE" || gap.kind === "UNVERIFIED_PEER_EVIDENCE");
  const state = value.prohibitedReactivation ? "BLOCKED_PROHIBITED_REACTIVATION" : conflicting ? "BLOCKED_CONFLICTING_PREREQUISITE" : missing ? "BLOCKED_MISSING_PREREQUISITE" : unverified ? "BLOCKED_UNVERIFIED_EVIDENCE" : "READY_FOR_METADATA_REVIEW";
  if (gaps.length > MAX_RECOVERY_DEPENDENCY_CONTINUITY_GAPS) return boundedFreeze({ state: state === "BLOCKED_PROHIBITED_REACTIVATION" ? state : state === "BLOCKED_CONFLICTING_PREREQUISITE" ? state : "NOT_ASSESSABLE", reason: "CONTINUITY_GAPS_EXCEED_REPRESENTATION_BOUND", gaps: boundedFreeze([]), evidenceReferences: boundedFreeze(evidenceReferences), restorationOrder: projectRecoveryArtifactsInRestorationOrder(value), metadataOnly: true, createsAuthority: false });
  return boundedFreeze({ state, gaps: boundedFreeze(gaps.map((gap) => boundedFreeze(gap))), evidenceReferences: boundedFreeze(evidenceReferences), restorationOrder: projectRecoveryArtifactsInRestorationOrder(value), metadataOnly: true, createsAuthority: false });
};
