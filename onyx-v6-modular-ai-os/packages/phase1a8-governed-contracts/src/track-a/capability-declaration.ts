import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";
import { PARALLEL_SAFETY_CLASSES, type ParallelSafetyClass } from "../shared/parallel-safety";
import type { RiskClass } from "../shared/risk-classes";

export const OPERATION_CLASSES = [
  "READ",
  "LOCAL_WRITE",
  "ANALYSIS",
  "DOCUMENTATION",
  "TEST_GENERATION",
  "SECURITY_REVIEW",
  "EVIDENCE_GENERATION",
  "CONTEXT_RETRIEVAL",
  "CONNECTOR_READ",
  "CONNECTOR_MUTATION",
  "GITHUB_MUTATION",
  "MEMORY_WRITE",
  "APPROVAL_CONSUMPTION",
  "CHECKPOINT_WRITE",
  "PROMOTION",
] as const;
export type OperationClass = (typeof OPERATION_CLASSES)[number];

/** Closed capability allowlist. Missing and unknown capabilities are rejected; no arbitrary command/shell surface exists. */
export const GOVERNED_CAPABILITY_IDS = [
  "READ_EVIDENCE",
  "READ_CONTEXT_PACKAGE",
  "GENERATE_DOCUMENTATION",
  "GENERATE_TESTS",
  "REVIEW_SECURITY",
  "GENERATE_EVIDENCE_RECORD",
  "READ_CONNECTOR_CONTENT",
  "MUTATE_CONNECTOR_ACCOUNT",
  "MUTATE_GITHUB_RESOURCE",
  "WRITE_MEMORY_RECORD",
  "CONSUME_APPROVAL",
  "WRITE_CHECKPOINT",
  "EXECUTE_PROTECTED_PROMOTION",
] as const;
export type GovernedCapabilityId = (typeof GOVERNED_CAPABILITY_IDS)[number];

export interface CapabilityCatalogEntry {
  operationClass: OperationClass;
  riskClass: RiskClass;
  parallelSafetyClass: ParallelSafetyClass;
  readOnly: boolean;
  localReversible: boolean;
  remoteMutation: boolean;
}

export const CAPABILITY_CATALOG: Record<GovernedCapabilityId, CapabilityCatalogEntry> = {
  READ_EVIDENCE: { operationClass: "READ", riskClass: "R0", parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE", readOnly: true, localReversible: true, remoteMutation: false },
  READ_CONTEXT_PACKAGE: { operationClass: "CONTEXT_RETRIEVAL", riskClass: "R0", parallelSafetyClass: "CONTEXT_RETRIEVAL_PARALLEL_CONDITIONAL", readOnly: true, localReversible: true, remoteMutation: false },
  GENERATE_DOCUMENTATION: { operationClass: "DOCUMENTATION", riskClass: "R1", parallelSafetyClass: "DOCUMENTATION_PARALLEL_SAFE", readOnly: false, localReversible: true, remoteMutation: false },
  GENERATE_TESTS: { operationClass: "TEST_GENERATION", riskClass: "R1", parallelSafetyClass: "TEST_GENERATION_PARALLEL_SAFE", readOnly: false, localReversible: true, remoteMutation: false },
  REVIEW_SECURITY: { operationClass: "SECURITY_REVIEW", riskClass: "R0", parallelSafetyClass: "SECURITY_REVIEW_PARALLEL_SAFE", readOnly: true, localReversible: true, remoteMutation: false },
  GENERATE_EVIDENCE_RECORD: { operationClass: "EVIDENCE_GENERATION", riskClass: "R1", parallelSafetyClass: "EVIDENCE_GENERATION_PARALLEL_SAFE", readOnly: false, localReversible: true, remoteMutation: false },
  READ_CONNECTOR_CONTENT: { operationClass: "CONNECTOR_READ", riskClass: "R1", parallelSafetyClass: "CONNECTOR_READ_PARALLEL_CONDITIONAL", readOnly: true, localReversible: true, remoteMutation: false },
  MUTATE_CONNECTOR_ACCOUNT: { operationClass: "CONNECTOR_MUTATION", riskClass: "R3", parallelSafetyClass: "SEQUENTIAL_CONNECTOR_MUTATION", readOnly: false, localReversible: false, remoteMutation: true },
  MUTATE_GITHUB_RESOURCE: { operationClass: "GITHUB_MUTATION", riskClass: "R2", parallelSafetyClass: "SEQUENTIAL_GITHUB_MUTATION", readOnly: false, localReversible: false, remoteMutation: true },
  WRITE_MEMORY_RECORD: { operationClass: "MEMORY_WRITE", riskClass: "R2", parallelSafetyClass: "SEQUENTIAL_MEMORY_WRITE_REQUIRED", readOnly: false, localReversible: true, remoteMutation: false },
  CONSUME_APPROVAL: { operationClass: "APPROVAL_CONSUMPTION", riskClass: "R2", parallelSafetyClass: "SEQUENTIAL_APPROVAL_REQUIRED", readOnly: false, localReversible: false, remoteMutation: false },
  WRITE_CHECKPOINT: { operationClass: "CHECKPOINT_WRITE", riskClass: "R1", parallelSafetyClass: "SEQUENTIAL_CHECKPOINT_REQUIRED", readOnly: false, localReversible: true, remoteMutation: false },
  EXECUTE_PROTECTED_PROMOTION: { operationClass: "PROMOTION", riskClass: "R4", parallelSafetyClass: "PROTECTED_PROMOTION_ONLY", readOnly: false, localReversible: false, remoteMutation: true },
};

const PROHIBITED_CAPABILITY_ID_SUBSTRINGS = ["COMMAND", "SHELL", "CHILD_PROCESS", "EVAL"] as const;

/** Rejects missing capabilities, unknown capabilities, and any id resembling an arbitrary command/shell surface. */
export function assertGovernedCapabilityId(value: string): asserts value is GovernedCapabilityId {
  const upper = value.toUpperCase();
  for (const substring of PROHIBITED_CAPABILITY_ID_SUBSTRINGS) {
    if (upper.includes(substring)) {
      throw new Error(`Capability id "${value}" resembles an arbitrary command/shell surface and is rejected.`);
    }
  }
  if (!value || !(GOVERNED_CAPABILITY_IDS as readonly string[]).includes(value)) {
    throw new Error(`Unknown or missing capability id: "${value}".`);
  }
}

export interface CapabilityDeclaration {
  capabilityId: GovernedCapabilityId;
  capabilityVersion: string;
  agentId: string;
  operationClass: OperationClass;
  riskClass: RiskClass;
  parallelSafetyClass: ParallelSafetyClass;
  readOnly: boolean;
  localReversible: boolean;
  remoteMutation: boolean;
  requiresApproval: boolean;
  requiresFreshApproval: boolean;
  requiredPermissions: string[];
  requiredConnectorScopes: string[];
  requiredMemoryScopes: string[];
  requiredTools: string[];
  requiredModelRoutingClass: string;
  estimatedTokenCost: number;
  estimatedFinancialCost: number;
  supportsIdempotency: boolean;
  supportsRecovery: boolean;
  supportsCancellation: boolean;
  supportsParallelExecution: boolean;
  supportsCompensation: boolean;
  promotionRequired: boolean;
  contractVersion: string;
  evidenceReferences: string[];
}

/** A declaration authorizes only its exact catalog boundary: every security-relevant field must match. */
export function classifyCapabilityDeclarationViolations(declaration: CapabilityDeclaration): string[] {
  const violations: string[] = [];
  if (!(GOVERNED_CAPABILITY_IDS as readonly string[]).includes(declaration.capabilityId)) {
    violations.push("unknown capability id");
    return violations;
  }
  const catalogEntry = CAPABILITY_CATALOG[declaration.capabilityId];
  if (declaration.operationClass !== catalogEntry.operationClass) violations.push("operationClass does not match the capability catalog");
  if (declaration.riskClass !== catalogEntry.riskClass) violations.push("riskClass does not match the capability catalog");
  if (declaration.parallelSafetyClass !== catalogEntry.parallelSafetyClass) violations.push("parallelSafetyClass does not match the capability catalog");
  if (declaration.readOnly !== catalogEntry.readOnly) violations.push("readOnly does not match the capability catalog");
  if (declaration.localReversible !== catalogEntry.localReversible) violations.push("localReversible does not match the capability catalog");
  if (declaration.remoteMutation !== catalogEntry.remoteMutation) violations.push("remoteMutation does not match the capability catalog");
  if (declaration.riskClass === "R4" && !declaration.requiresFreshApproval) violations.push("R4 requires requiresFreshApproval to be true");
  if (declaration.riskClass === "R5") violations.push("R5 is always prohibited");
  if (!declaration.parallelSafetyClass) violations.push("missing parallelSafetyClass");
  else if (!(PARALLEL_SAFETY_CLASSES as readonly string[]).includes(declaration.parallelSafetyClass)) violations.push("unknown parallelSafetyClass");
  return violations;
}

export function assertValidCapabilityDeclaration(declaration: CapabilityDeclaration): void {
  assertGovernedCapabilityId(declaration.capabilityId);
  const violations = classifyCapabilityDeclarationViolations(declaration);
  if (violations.length > 0) {
    throw new Error(`Invalid capability declaration for "${declaration.capabilityId}": ${violations.join("; ")}`);
  }
}

export interface CreateCapabilityDeclarationFields {
  capabilityVersion?: string;
  requiredPermissions?: string[];
  requiredConnectorScopes?: string[];
  requiredMemoryScopes?: string[];
  requiredTools?: string[];
  requiredModelRoutingClass?: string;
  estimatedTokenCost?: number;
  estimatedFinancialCost?: number;
  supportsIdempotency?: boolean;
  supportsRecovery?: boolean;
  supportsCancellation?: boolean;
  supportsParallelExecution?: boolean;
  supportsCompensation?: boolean;
  promotionRequired?: boolean;
  evidenceReferences?: string[];
}

/** Builds a declaration directly from the closed catalog so its exact boundary can never drift from policy. */
export function createCapabilityDeclaration(capabilityId: GovernedCapabilityId, agentId: string, fields: CreateCapabilityDeclarationFields = {}): CapabilityDeclaration {
  assertGovernedCapabilityId(capabilityId);
  const catalogEntry = CAPABILITY_CATALOG[capabilityId];
  const declaration: CapabilityDeclaration = {
    capabilityId,
    capabilityVersion: fields.capabilityVersion ?? "1.0.0",
    agentId,
    operationClass: catalogEntry.operationClass,
    riskClass: catalogEntry.riskClass,
    parallelSafetyClass: catalogEntry.parallelSafetyClass,
    readOnly: catalogEntry.readOnly,
    localReversible: catalogEntry.localReversible,
    remoteMutation: catalogEntry.remoteMutation,
    requiresApproval: catalogEntry.riskClass !== "R0",
    requiresFreshApproval: catalogEntry.riskClass === "R4",
    requiredPermissions: fields.requiredPermissions ?? [],
    requiredConnectorScopes: fields.requiredConnectorScopes ?? [],
    requiredMemoryScopes: fields.requiredMemoryScopes ?? [],
    requiredTools: fields.requiredTools ?? [],
    requiredModelRoutingClass: fields.requiredModelRoutingClass ?? "LOCAL_SMALL",
    estimatedTokenCost: fields.estimatedTokenCost ?? 0,
    estimatedFinancialCost: fields.estimatedFinancialCost ?? 0,
    supportsIdempotency: fields.supportsIdempotency ?? true,
    supportsRecovery: fields.supportsRecovery ?? true,
    supportsCancellation: fields.supportsCancellation ?? true,
    supportsParallelExecution: fields.supportsParallelExecution ?? false,
    supportsCompensation: fields.supportsCompensation ?? false,
    promotionRequired: fields.promotionRequired ?? capabilityId === "EXECUTE_PROTECTED_PROMOTION",
    contractVersion: AGENT_COORDINATION_CONTRACT_VERSION,
    evidenceReferences: fields.evidenceReferences ?? [],
  };
  assertValidCapabilityDeclaration(declaration);
  return declaration;
}
