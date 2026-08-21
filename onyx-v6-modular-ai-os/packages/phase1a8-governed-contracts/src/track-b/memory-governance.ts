import { MEMORY_CONTRACT_VERSION } from "../shared/versions";
import { type RiskClass } from "../shared/risk-classes";
import { assertMemoryTier, type MemorySourceType, type MemoryTier, type MemoryTrustClassification, type M2SourceAuthorityClass } from "./memory-tiers";

const required = (value: string | undefined, name: string): void => { if (!value) throw new Error(`${name} is required.`); };
const validDate = (value: string, name: string): void => { required(value, name); if (Number.isNaN(Date.parse(value))) throw new Error(`${name} must be an ISO date.`); };

export interface MemoryRecord {
  memoryRecordId: string; memoryTier: MemoryTier; canonicalSourceId: string; sourceType: MemorySourceType;
  sourceReference: string; sourceAttribution: string; trustClassification: MemoryTrustClassification;
  permissionProfileId: string; memoryAccessProfileId: string; ownerScope: string; projectScope: string;
  characterScope: string; createdAt: string; updatedAt: string; retentionPolicyId: string;
  correctionState: CorrectionState; supersessionState: SupersessionState; deletionState: DeletionState;
  tombstoneId: string | null; derivedArtifactIds: string[]; auditReferences: string[]; contractVersion: string;
  expiresAt?: string; sourceAuthorityClass?: M2SourceAuthorityClass; contentDigest?: string;
}

export function assertValidMemoryRecord(record: Partial<MemoryRecord>): asserts record is MemoryRecord {
  for (const [name, value] of Object.entries(record)) if (value === "") throw new Error(`${name} must not be empty.`);
  const fields: (keyof MemoryRecord)[] = ["memoryRecordId", "canonicalSourceId", "sourceType", "sourceReference", "sourceAttribution", "trustClassification", "permissionProfileId", "memoryAccessProfileId", "ownerScope", "projectScope", "characterScope", "retentionPolicyId", "correctionState", "supersessionState", "deletionState", "contractVersion"];
  for (const field of fields) required(record[field] as string | undefined, field);
  assertMemoryTier(record.memoryTier);
  validDate(record.createdAt as string, "createdAt"); validDate(record.updatedAt as string, "updatedAt");
  if (record.memoryTier === "M0") { validDate(record.expiresAt as string, "M0 expiresAt"); }
  if (record.memoryTier === "P0") throw new Error("P0 is exposed only through read-only persona metadata.");
}

export const RETENTION_CLASSES = ["EPHEMERAL", "SESSION", "SHORT_TERM", "DURABLE", "OPERATIONAL", "ARCHIVAL", "IMMUTABLE_PERSONA"] as const;
export type RetentionClass = (typeof RETENTION_CLASSES)[number];
export interface MemoryRetentionContract { retentionPolicyId: string; memoryTier: MemoryTier; retentionClass: RetentionClass; retentionDuration: string; expiresAt: string | null; archiveEligible: boolean; deletionEligible: boolean; legalHold: boolean; reviewRequired: boolean; createdAt: string; contractVersion: string; }
export function assertRetentionCompatible(policy: MemoryRetentionContract): void {
  const allowed: Record<MemoryTier, RetentionClass[]> = { M0: ["EPHEMERAL"], M1: ["SESSION", "SHORT_TERM"], M2: ["DURABLE"], M3: ["SHORT_TERM", "DURABLE"], M4: ["OPERATIONAL"], M5: ["ARCHIVAL"], P0: ["IMMUTABLE_PERSONA"] };
  assertMemoryTier(policy.memoryTier); if (!allowed[policy.memoryTier].includes(policy.retentionClass)) throw new Error("Retention class is incompatible with memory tier.");
  validDate(policy.createdAt, "createdAt"); if (policy.expiresAt) validDate(policy.expiresAt, "expiresAt");
}

export const CORRECTION_STATES = ["REQUESTED", "AUTHORIZED", "APPLIED", "REJECTED", "EXPIRED", "RECONCILIATION_REQUIRED"] as const;
export type CorrectionState = (typeof CORRECTION_STATES)[number];
export interface MemoryCorrectionContract { correctionId: string; memoryRecordId: string; priorValueDigest: string; correctedValueDigest: string; reason: string; requestedBy: string; authorizedBy: string; requestedAt: string; authorizedAt: string; scopeHash: string; permissionDecision: string; status: CorrectionState; evidenceReferences: string[]; contractVersion: string; }
export function assertCorrectionAllowed(record: Pick<MemoryRecord, "memoryTier" | "sourceAuthorityClass">, correction: MemoryCorrectionContract): void { assertMemoryTier(record.memoryTier); if (record.memoryTier === "P0") throw new Error("P0 cannot be corrected."); if (record.sourceAuthorityClass === "DERIVED_INFERENCE" && correction.status === "APPLIED") throw new Error("Derived inference cannot be promoted to canonical fact."); }

export const SUPERSESSION_STATES = ["REQUESTED", "AUTHORIZED", "APPLIED", "REJECTED", "RECONCILIATION_REQUIRED"] as const;
export type SupersessionState = (typeof SUPERSESSION_STATES)[number];
export interface MemorySupersessionContract { supersessionId: string; priorMemoryRecordId: string; replacementMemoryRecordId: string; reason: string; authorizedBy: string; scopeHash: string; effectiveAt: string; status: SupersessionState; evidenceReferences: string[]; contractVersion: string; }
export function assertSupersessionAllowed(record: Pick<MemoryRecord, "memoryTier">): void { assertMemoryTier(record.memoryTier); if (record.memoryTier === "P0") throw new Error("P0 cannot be superseded."); }

export const DELETION_STATES = ["ACTIVE", "DELETION_REQUESTED", "DELETION_AUTHORIZED", "DELETION_PENDING_PROPAGATION", "DELETED", "DELETION_REJECTED", "RECONCILIATION_REQUIRED"] as const;
export type DeletionState = (typeof DELETION_STATES)[number];
export interface MemoryDeletionContract { deletionRequestId: string; memoryRecordId: string; requestedBy: string; authorizedBy: string; deletionScope: string; deletionReason: string; requestedAt: string; authorizedAt: string; status: DeletionState; requiresTombstone: boolean; derivedArtifactIds: string[]; evidenceReferences: string[]; contractVersion: string; }
export function assertDeletionAllowed(record: Pick<MemoryRecord, "memoryTier">, deletion: Pick<MemoryDeletionContract, "authorizedBy">): void { assertMemoryTier(record.memoryTier); required(deletion.authorizedBy, "authorizedBy"); if (record.memoryTier === "P0") throw new Error("P0 cannot be deleted."); }
export function isActiveMemoryRecord(record: Pick<MemoryRecord, "deletionState" | "supersessionState">): boolean { return record.deletionState === "ACTIVE" && record.supersessionState !== "APPLIED"; }

export interface MemoryAccessProfile { memoryAccessProfileId: string; subjectAgentId: string; allowedReadTiers: MemoryTier[]; allowedWriteTiers: MemoryTier[]; allowedOwnerScopes: string[]; allowedProjectScopes: string[]; allowedCharacterScopes: string[]; allowRelationshipMemory: boolean; allowTaskMemory: boolean; allowSessionMemory: boolean; allowDurableMemoryPromotion: boolean; allowOperationalLedgerAppend: boolean; allowColdArchiveRequest: boolean; allowPersonaMetadataRead: boolean; allowPersonaContentRead: boolean; allowPersonaWrite: false; requiresApprovalForPromotion: boolean; requiresApprovalForDeletion: boolean; riskClassLimit: RiskClass; createdAt: string; updatedAt: string; contractVersion: string; evidenceReferences: string[]; }
export function assertValidMemoryAccessProfile(profile: MemoryAccessProfile): void { if (profile.allowPersonaWrite || profile.allowedWriteTiers.includes("P0")) throw new Error("Memory profiles cannot write P0."); for (const tier of [...profile.allowedReadTiers, ...profile.allowedWriteTiers]) assertMemoryTier(tier); validDate(profile.createdAt, "createdAt"); validDate(profile.updatedAt, "updatedAt"); }
export function defaultDenyMemoryAccessProfile(subjectAgentId: string, memoryAccessProfileId: string): MemoryAccessProfile { return { memoryAccessProfileId, subjectAgentId, allowedReadTiers: [], allowedWriteTiers: [], allowedOwnerScopes: [], allowedProjectScopes: [], allowedCharacterScopes: [], allowRelationshipMemory: false, allowTaskMemory: false, allowSessionMemory: false, allowDurableMemoryPromotion: false, allowOperationalLedgerAppend: false, allowColdArchiveRequest: false, allowPersonaMetadataRead: false, allowPersonaContentRead: false, allowPersonaWrite: false, requiresApprovalForPromotion: true, requiresApprovalForDeletion: true, riskClassLimit: "R0", createdAt: "1970-01-01T00:00:00.000Z", updatedAt: "1970-01-01T00:00:00.000Z", contractVersion: MEMORY_CONTRACT_VERSION, evidenceReferences: [] }; }

export interface PromotionDecision { promotionDecisionId: string; sourceMemoryRecordId: string; targetTier: "M2"; requestedBy: string; approvedBy: string; scopeHash: string; permissionDecision: string; sourceAttribution: string; canonicalSourceId: string; promotionReason: string; issuedAt: string; expiresAt: string; status: string; contractVersion: string; evidenceReferences: string[]; }
export function assertPromotionDecision(decision: PromotionDecision, source: Pick<MemoryRecord, "memoryTier" | "sourceAttribution" | "canonicalSourceId">, now: string): void { if (decision.targetTier !== "M2") throw new Error("Promotion target must be M2."); if (source.memoryTier !== "M1") throw new Error("Only M1 session memory may use this promotion contract."); required(decision.approvedBy, "approvedBy"); required(decision.permissionDecision, "permissionDecision"); required(decision.sourceAttribution, "sourceAttribution"); if (decision.sourceAttribution !== source.sourceAttribution || decision.canonicalSourceId !== source.canonicalSourceId) throw new Error("Promotion source attribution does not match."); if (Date.parse(now) >= Date.parse(decision.expiresAt)) throw new Error("Promotion decision has expired."); }

export interface MemoryExportContract { exportRequestId: string; requestedBy: string; ownerScope: string; projectScope: string; memoryTierScope: MemoryTier[]; recordIds: string[]; format: string; requestedAt: string; expiresAt: string; permissionDecision: string; redactionRequired: boolean; status: string; evidenceReferences: string[]; contractVersion: string; }
export function assertExportPermitted(exportRequest: Pick<MemoryExportContract, "permissionDecision">): void { required(exportRequest.permissionDecision, "permissionDecision"); }
export interface MemoryAuditReference { auditReferenceId: string; memoryRecordId: string; operation: string; actorId: string; permissionDecision: string; scopeHash: string; occurredAt: string; priorDigest: string; resultDigest: string; evidenceReferences: string[]; contractVersion: string; }

export interface M4OperationalLedgerRecord { memoryTier: "M4"; workflowId: string; runtimeId: string; taskId: string; leaseId: string; checkpointId: string; evidenceReferences: string[]; approvalId?: string; operation: string; contractVersion: string; }
export function assertM4OperationalLedgerRecord(record: M4OperationalLedgerRecord): void { if (record.memoryTier !== "M4") throw new Error("Operational ledger records must use M4."); for (const key of ["workflowId", "runtimeId", "taskId", "leaseId", "checkpointId"]) required(record[key as keyof M4OperationalLedgerRecord] as string, key); }
