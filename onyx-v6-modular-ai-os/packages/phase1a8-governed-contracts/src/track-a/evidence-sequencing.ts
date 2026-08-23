import { createHash } from "node:crypto";
import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";

export const EVIDENCE_DECISION_VALUES = [
  "PERMITTED",
  "RESTRICTED",
  "BLOCKED",
  "READ_ONLY",
  "WRITE_ONLY",
  "APPROVED",
  "DENIED",
  "WITHIN_BUDGET",
  "EXCEEDED_BUDGET",
  "LOCAL_MODEL",
  "REMOTE_MODEL",
  "REQUIRE_APPROVAL",
  "READ_WRITE",
  "OBSERVED",
] as const;
export type EvidenceDecision = (typeof EVIDENCE_DECISION_VALUES)[number];

export const PROVIDER_CLASSIFICATIONS = [
  "DETERMINISTIC_SUCCESS",
  "COMPATIBLE_REUSE",
  "DETERMINISTIC_FAILURE",
  "UNCERTAIN_RESULT",
  "PROHIBITED_OPERATION",
] as const;
export type ProviderClassificationValue = (typeof PROVIDER_CLASSIFICATIONS)[number];

export const EVIDENCE_SEQUENCE_CONFLICT_RESULTS = ["ACCEPTED", "RECONCILIATION_REQUIRED"] as const;
export type EvidenceSequenceConflictResult = (typeof EVIDENCE_SEQUENCE_CONFLICT_RESULTS)[number];

export interface EvidenceSequenceRecord {
  evidenceId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  agentId: string;
  taskId: string;
  leaseId: string;
  agentLocalSequence: number;
  taskLocalSequence: number;
  workflowLogicalSequence: number;
  checkpointDigest: string;
  causalParentIds: readonly string[];
  capabilityId: string;
  providerClassification: ProviderClassificationValue;
  resourceReferences: readonly string[];
  permissionDecision: EvidenceDecision;
  memoryAccessDecision: EvidenceDecision;
  connectorScopeDecision: EvidenceDecision;
  budgetDecision: EvidenceDecision;
  modelRoutingDecision: EvidenceDecision;
  redactedDetail: string;
  createdAt: string;
  contractVersion: string;
  taskDependencyOrder: number;
  checkpointOrder: number;
  opportunityScope: string;
}

const SENSITIVE_PATTERNS = [
  "password",
  "passwd",
  "secret",
  "token",
  "apiKey",
  "apikey",
  "authorization",
  "bearer ",
  "private persona",
  "persona memory",
  "chain-of-thought",
  "think step by step",
  "connector credential",
  "oauth",
  "credential",
  "aws_secret",
  "sk_live",
];

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  return [...a].sort().every((value, index) => value === [...b].sort()[index]);
}

function assertNoSensitiveContent(value: string, fieldName: string): void {
  const text = normalizeText(value);
  for (const pattern of SENSITIVE_PATTERNS) {
    if (text.includes(pattern)) {
      throw new Error(`Evidence sequencing rejected: ${fieldName} contains prohibited sensitive content.`);
    }
  }
}

function assertAllowedDecision(decision: string, fieldName: string): asserts decision is EvidenceDecision {
  if (!(EVIDENCE_DECISION_VALUES as readonly string[]).includes(decision)) {
    throw new Error(`Unsupported evidence decision for ${fieldName}: ${decision}`);
  }
}

export function createEvidenceSequenceRecord(input: Omit<EvidenceSequenceRecord, "contractVersion"> & { contractVersion?: string }): EvidenceSequenceRecord {
  if (!input.evidenceId || !input.workflowId || !input.runtimeId || !input.runtimeSessionId || !input.agentId || !input.taskId || !input.leaseId) {
    throw new Error("Evidence sequence requires identity fields for evidenceId, workflowId, runtimeId, runtimeSessionId, agentId, taskId, and leaseId.");
  }
  if (!Number.isFinite(input.agentLocalSequence) || !Number.isFinite(input.taskLocalSequence) || !Number.isFinite(input.workflowLogicalSequence)) {
    throw new Error("Evidence sequence local and logical sequence fields must be numeric.");
  }
  if (!input.checkpointDigest || !input.capabilityId || !input.opportunityScope) {
    throw new Error("Evidence sequence requires checkpointDigest, capabilityId, and opportunityScope.");
  }
  if (!Array.isArray(input.causalParentIds)) {
    throw new Error("Evidence sequence requires causalParentIds to be an array.");
  }
  if (input.causalParentIds.includes(input.evidenceId)) {
    throw new Error("Evidence sequence rejected: evidence cannot reference itself as a causal parent.");
  }
  assertAllowedDecision(input.permissionDecision, "permissionDecision");
  assertAllowedDecision(input.memoryAccessDecision, "memoryAccessDecision");
  assertAllowedDecision(input.connectorScopeDecision, "connectorScopeDecision");
  assertAllowedDecision(input.budgetDecision, "budgetDecision");
  assertAllowedDecision(input.modelRoutingDecision, "modelRoutingDecision");
  if (!(PROVIDER_CLASSIFICATIONS as readonly string[]).includes(input.providerClassification)) {
    throw new Error(`Unsupported provider classification: ${input.providerClassification}`);
  }
  if (!input.redactedDetail || input.redactedDetail.trim().length === 0) {
    throw new Error("Evidence redactedDetail must be present.");
  }
  assertNoSensitiveContent(input.redactedDetail, "redactedDetail");
  assertNoSensitiveContent(input.leaseId, "leaseId");
  assertNoSensitiveContent(input.taskId, "taskId");
  assertNoSensitiveContent(input.runtimeSessionId, "runtimeSessionId");
  assertNoSensitiveContent(input.resourceReferences.join(" "), "resourceReferences");

  return {
    ...input,
    contractVersion: input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
    taskDependencyOrder: input.taskDependencyOrder ?? input.workflowLogicalSequence,
    checkpointOrder: input.checkpointOrder ?? input.workflowLogicalSequence,
    resourceReferences: [...input.resourceReferences],
    causalParentIds: [...input.causalParentIds],
  };
}

export function assertValidEvidenceSequenceRecord(record: EvidenceSequenceRecord): void {
  if (!record || !record.evidenceId) throw new Error("Evidence record missing evidenceId.");
  if (!record.workflowId || !record.runtimeId || !record.runtimeSessionId || !record.agentId || !record.taskId || !record.leaseId) {
    throw new Error("Evidence record missing required identity fields.");
  }
  if (record.causalParentIds.includes(record.evidenceId)) {
    throw new Error("Evidence sequence rejected: evidence cannot reference itself as a causal parent.");
  }
  if (record.causalParentIds.length > 0 && new Set(record.causalParentIds).size !== record.causalParentIds.length) {
    throw new Error("Evidence sequence rejected: duplicate causal parent references are not allowed.");
  }
  assertNoSensitiveContent(record.redactedDetail, "redactedDetail");
  assertNoSensitiveContent(record.resourceReferences.join(" "), "resourceReferences");
  if (record.providerClassification === "PROHIBITED_OPERATION") {
    throw new Error("Evidence sequence rejected: prohibited provider classification is not accepted.");
  }
}

export function orderEvidenceSequenceRecords(records: readonly EvidenceSequenceRecord[]): string[] {
  if (!Array.isArray(records) || records.length === 0) {
    return [];
  }

  const byId = new Map<string, EvidenceSequenceRecord>();
  for (const record of records) {
    assertValidEvidenceSequenceRecord(record);
    if (byId.has(record.evidenceId)) {
      throw new Error(`Duplicate evidence ID rejected: ${record.evidenceId}`);
    }
    byId.set(record.evidenceId, record);
  }

  for (const record of records) {
    for (const parentId of record.causalParentIds) {
      if (!byId.has(parentId)) {
        throw new Error(`Evidence sequence rejected: missing causal parent ${parentId} for ${record.evidenceId}.`);
      }
    }
  }

  const ordered = [...records].sort((left, right) => {
    const leftParentCount = left.causalParentIds.length;
    const rightParentCount = right.causalParentIds.length;
    if (leftParentCount !== rightParentCount) return leftParentCount - rightParentCount;
    if (left.taskDependencyOrder !== right.taskDependencyOrder) return left.taskDependencyOrder - right.taskDependencyOrder;
    if (left.checkpointOrder !== right.checkpointOrder) return left.checkpointOrder - right.checkpointOrder;
    if (left.workflowLogicalSequence !== right.workflowLogicalSequence) return left.workflowLogicalSequence - right.workflowLogicalSequence;
    const agentOrder = left.agentId.localeCompare(right.agentId);
    if (agentOrder !== 0) return agentOrder;
    return left.agentLocalSequence - right.agentLocalSequence;
  });

  for (let index = 1; index < ordered.length; index += 1) {
    const current = ordered[index];
    const previous = ordered[index - 1];
    if (current.causalParentIds.includes(previous.evidenceId) && current.workflowLogicalSequence < previous.workflowLogicalSequence) {
      continue;
    }
    if (current.workflowLogicalSequence === previous.workflowLogicalSequence && current.agentId === previous.agentId && current.agentLocalSequence === previous.agentLocalSequence) {
      throw new Error(`Duplicate local sequence rejected for ${current.agentId}.`);
    }
  }

  const seen = new Set<string>();
  for (const record of ordered) {
    if (seen.has(record.evidenceId)) {
      throw new Error(`Duplicate evidence ID rejected: ${record.evidenceId}`);
    }
    seen.add(record.evidenceId);
    for (const parentId of record.causalParentIds) {
      if (!seen.has(parentId) && parentId !== record.evidenceId) {
        const parent = byId.get(parentId);
        if (!parent) {
          throw new Error(`Evidence sequence rejected: missing causal parent ${parentId}.`);
        }
        if (parent.workflowLogicalSequence > record.workflowLogicalSequence) {
          throw new Error(`Causal ordering conflict for evidence ${record.evidenceId}.`);
        }
      }
    }
  }

  return ordered.map((record) => record.evidenceId);
}

export function evaluateEvidenceSequence(records: readonly EvidenceSequenceRecord[]): EvidenceSequenceConflictResult {
  try {
    orderEvidenceSequenceRecords(records);
    return "ACCEPTED";
  } catch {
    return "RECONCILIATION_REQUIRED";
  }
}

export function deriveEvidenceDigest(record: EvidenceSequenceRecord): string {
  const canonical = JSON.stringify({
    evidenceId: record.evidenceId,
    workflowId: record.workflowId,
    runtimeId: record.runtimeId,
    taskId: record.taskId,
    leaseId: record.leaseId,
    workflowLogicalSequence: record.workflowLogicalSequence,
    checkpointDigest: record.checkpointDigest,
    causalParentIds: [...record.causalParentIds].sort(),
    resourceReferences: [...record.resourceReferences].sort(),
    redactedDetail: record.redactedDetail,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function assertEvidenceLogicalSequence(record: EvidenceSequenceRecord, prior: EvidenceSequenceRecord): void {
  if (record.workflowLogicalSequence < prior.workflowLogicalSequence) {
    throw new Error(`Logical sequence conflict: ${record.evidenceId} is older than ${prior.evidenceId}.`);
  }
  if (record.workflowLogicalSequence === prior.workflowLogicalSequence && record.agentId === prior.agentId && record.agentLocalSequence === prior.agentLocalSequence) {
    throw new Error(`Duplicate local sequence rejected for ${record.agentId}.`);
  }
}

export function assertEvidenceGovernance(record: EvidenceSequenceRecord): void {
  if (record.permissionDecision === "BLOCKED") {
    throw new Error(`Evidence sequence rejected: blocked permission decision for ${record.evidenceId}.`);
  }
  if (record.memoryAccessDecision === "BLOCKED") {
    throw new Error(`Evidence sequence rejected: blocked memory decision for ${record.evidenceId}.`);
  }
  if (record.connectorScopeDecision === "BLOCKED") {
    throw new Error(`Evidence sequence rejected: blocked connector scope decision for ${record.evidenceId}.`);
  }
  if (record.budgetDecision === "BLOCKED") {
    throw new Error(`Evidence sequence rejected: blocked budget decision for ${record.evidenceId}.`);
  }
  if (record.modelRoutingDecision === "BLOCKED") {
    throw new Error(`Evidence sequence rejected: blocked model routing decision for ${record.evidenceId}.`);
  }
  if (record.providerClassification === "UNCERTAIN_RESULT") {
    throw new Error(`Evidence sequence rejected: uncertain provider outcome is not accepted for ${record.evidenceId}.`);
  }
}
