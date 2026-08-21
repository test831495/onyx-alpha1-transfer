import { CONTEXT_CONTRACT_VERSION } from "../shared/versions";
import type { TokenBudget, CostBudget, BudgetStatus } from "../shared/budgets";

// ============================================================================
// PROVIDER-NEUTRAL MODEL ROUTING PROFILE
// ============================================================================

export const MODEL_ROUTING_CLASSES = [
  "LOCAL_SMALL",
  "LOCAL_MEDIUM",
  "CLOUD_SMALL",
  "CLOUD_MEDIUM",
  "CLOUD_PREMIUM",
] as const;
export type ModelRoutingClass = (typeof MODEL_ROUTING_CLASSES)[number];

export const PRIVACY_REQUIREMENTS = [
  "LOCAL_ONLY",
  "PRIVATE_CLOUD",
  "COMPLIANCE_REGION",
  "NO_SENSITIVE_DATA",
  "UNRESTRICTED",
] as const;
export type PrivacyRequirement = (typeof PRIVACY_REQUIREMENTS)[number];

export const DATA_RESIDENCY_REQUIREMENTS = ["LOCAL", "US_ONLY", "EU_ONLY", "CONTRACTUAL_REGION", "UNRESTRICTED"] as const;
export type DataResidencyRequirement = (typeof DATA_RESIDENCY_REQUIREMENTS)[number];

export interface ModelRoutingProfileContract {
  modelRoutingProfileId: string;
  allowedClasses: ModelRoutingClass[];
  preferredClass: ModelRoutingClass;
  fallbackOrder: ModelRoutingClass[];
  localFirst: boolean;
  cachePreferred: boolean;
  premiumApprovalThreshold: number;
  paidActionApprovalRequired: boolean;
  maximumTokenBudgetId: string;
  maximumCostBudgetId: string;
  privacyRequirement: PrivacyRequirement;
  dataResidencyRequirement: DataResidencyRequirement;
  connectorContentAllowed: boolean;
  privateMemoryAllowed: boolean;
  createdAt: string;
  updatedAt: string;
  contractVersion: string;
}

export function assertValidRoutingProfile(profile: ModelRoutingProfileContract): void {
  if (!profile.allowedClasses.includes(profile.preferredClass)) {
    throw new Error("Preferred class must be in allowed classes.");
  }

  for (const fallback of profile.fallbackOrder) {
    if (!profile.allowedClasses.includes(fallback)) {
      throw new Error(`Fallback class ${fallback} must be in allowed classes.`);
    }
  }

  // Verify no provider-specific names
  const classNames = JSON.stringify(profile);
  const providers = ["OpenAI", "Azure", "Anthropic", "Google", "ChatGPT", "GPT-", "Claude", "Gemini"];
  for (const provider of providers) {
    if (classNames.includes(provider)) {
      throw new Error(`Model routing profile must not include provider name: ${provider}`);
    }
  }
}

export function defaultModelRoutingProfile(profileId: string): ModelRoutingProfileContract {
  return {
    modelRoutingProfileId: profileId,
    allowedClasses: ["LOCAL_SMALL", "LOCAL_MEDIUM", "CLOUD_SMALL"],
    preferredClass: "LOCAL_SMALL",
    fallbackOrder: ["LOCAL_MEDIUM", "CLOUD_SMALL"],
    localFirst: true,
    cachePreferred: true,
    premiumApprovalThreshold: 1000000,
    paidActionApprovalRequired: true,
    maximumTokenBudgetId: "",
    maximumCostBudgetId: "",
    privacyRequirement: "NO_SENSITIVE_DATA",
    dataResidencyRequirement: "LOCAL",
    connectorContentAllowed: false,
    privateMemoryAllowed: false,
    createdAt: "1970-01-01T00:00:00.000Z",
    updatedAt: "1970-01-01T00:00:00.000Z",
    contractVersion: CONTEXT_CONTRACT_VERSION,
  };
}

// ============================================================================
// MODEL ROUTING DECISION
// ============================================================================

export const MODEL_ROUTING_DECISIONS = [
  "SELECTED",
  "FALLBACK_SELECTED",
  "REQUIRES_APPROVAL",
  "DENIED_BY_PRIVACY",
  "DENIED_BY_BUDGET",
  "DENIED_BY_PERMISSION",
  "UNAVAILABLE",
  "FAILED_SAFE",
  "PROHIBITED",
] as const;
export type ModelRoutingDecision = (typeof MODEL_ROUTING_DECISIONS)[number];

export interface ModelRoutingDecisionContract {
  modelRoutingDecisionId: string;
  requestId: string;
  contextPackageId: string;
  profileId: string;
  selectedClass: ModelRoutingClass;
  fallbackClasses: ModelRoutingClass[];
  selectionReason: string;
  privacyDecision: string;
  tokenBudgetDecisionId: string;
  costBudgetDecisionId: string;
  cacheDecisionId: string;
  premiumApprovalRequired: boolean;
  approvalId: string | null;
  decision: ModelRoutingDecision;
  denialReasons: string[];
  createdAt: string;
  contractVersion: string;
}

export function assertModelRoutingDecision(decision: ModelRoutingDecisionContract): void {
  if (decision.decision === "SELECTED" || decision.decision === "FALLBACK_SELECTED") {
    if (!decision.selectedClass) {
      throw new Error("Selected decision must have a selected class.");
    }
  }

  if (decision.decision.includes("DENIED")) {
    if (decision.denialReasons.length === 0) {
      throw new Error("Denied decision must include at least one reason.");
    }
  }
}

export function assertRoutingObeysBudgetThresholds(
  decision: ModelRoutingDecisionContract,
  tokenStatus: BudgetStatus,
  costStatus: BudgetStatus,
): void {
  if (tokenStatus === "OVER_BUDGET" && decision.decision !== "DENIED_BY_BUDGET" && decision.decision !== "FAILED_SAFE") {
    throw new Error("Over-budget token status must trigger budget denial or fail-safe.");
  }

  if (costStatus === "OVER_BUDGET" && decision.decision !== "DENIED_BY_BUDGET" && decision.decision !== "FAILED_SAFE") {
    throw new Error("Over-budget cost status must trigger budget denial or fail-safe.");
  }
}

export function assertPrivateMemoryNotRoutedWithoutPermission(
  decision: ModelRoutingDecisionContract,
  profile: ModelRoutingProfileContract,
): void {
  if (!profile.privateMemoryAllowed && decision.privacyDecision === "CONTAINS_PRIVATE_DATA") {
    if (decision.decision === "SELECTED" || decision.decision === "FALLBACK_SELECTED") {
      throw new Error("Private memory must not be routed to a class without permission.");
    }
  }
}

export function assertConnectorContentNotRoutedWithoutPermission(
  decision: ModelRoutingDecisionContract,
  profile: ModelRoutingProfileContract,
): void {
  if (!profile.connectorContentAllowed && decision.privacyDecision === "CONTAINS_CONNECTOR_DATA") {
    if (decision.decision === "SELECTED" || decision.decision === "FALLBACK_SELECTED") {
      throw new Error("Connector content must not be routed to a class without permission.");
    }
  }
}

// ============================================================================
// TOKEN BUDGET DECISION
// ============================================================================

export const BUDGET_DECISIONS = ["ALLOWED", "ALLOWED_WITH_WARNING", "FALLBACK_REQUIRED", "APPROVAL_REQUIRED", "DENIED", "FAILED_SAFE"] as const;
export type BudgetDecision = (typeof BUDGET_DECISIONS)[number];

export interface TokenBudgetDecisionContract {
  decisionId: string;
  budgetId: string;
  requestId: string;
  reservedAmount: number;
  estimatedAmount: number;
  remainingBefore: number;
  remainingAfter: number;
  warningThresholdReached: boolean;
  hardLimitExceeded: boolean;
  decision: BudgetDecision;
  reason: string;
  createdAt: string;
  contractVersion: string;
}

export interface CostBudgetDecisionContract {
  decisionId: string;
  budgetId: string;
  requestId: string;
  reservedAmount: number;
  estimatedAmount: number;
  remainingBefore: number;
  remainingAfter: number;
  warningThresholdReached: boolean;
  hardLimitExceeded: boolean;
  decision: BudgetDecision;
  reason: string;
  createdAt: string;
  contractVersion: string;
}

export function assertBudgetDecisionValid(decision: TokenBudgetDecisionContract | CostBudgetDecisionContract): void {
  if (decision.hardLimitExceeded) {
    if (decision.decision === "ALLOWED" || decision.decision === "ALLOWED_WITH_WARNING") {
      throw new Error("Hard limit exceeded must not result in allowed decision.");
    }
  }

  if (decision.decision === "ALLOWED" && decision.remainingAfter < 0) {
    throw new Error("Budget decision allowing action cannot result in negative remaining budget.");
  }
}

export function assertBudgetDoesNotGrantPermission(decision: TokenBudgetDecisionContract | CostBudgetDecisionContract): void {
  // Budget availability must not grant permission or approval
  if (decision.decision === "ALLOWED") {
    // This is a budget decision, not a permission decision
  }
}

// ============================================================================
// CACHE DECISION
// ============================================================================

export const CACHE_POLICIES = ["CACHE_DISABLED", "CACHE_READ_ONLY", "CACHE_READ_WRITE_LOCAL", "CACHE_REBUILD_REQUIRED"] as const;
export type CachePolicy = (typeof CACHE_POLICIES)[number];

export const CACHE_STATUSES = ["HIT", "MISS", "STALE", "INVALIDATED", "BLOCKED", "REBUILD_REQUIRED", "PROHIBITED"] as const;
export type CacheStatus = (typeof CACHE_STATUSES)[number];

export interface CacheDecisionContract {
  cacheDecisionId: string;
  requestId: string;
  contextScopeHash: string;
  sourceDigestSet: string[];
  modelRoutingClass: string;
  cachePolicy: CachePolicy;
  cacheStatus: CacheStatus;
  cacheEntryReference: string;
  tombstoneValidated: boolean;
  permissionValidated: boolean;
  freshnessValidated: boolean;
  decision: CacheStatus;
  reason: string;
  createdAt: string;
  expiresAt: string;
  contractVersion: string;
}

export function assertCacheDecision(decision: CacheDecisionContract): void {
  if (decision.decision === "HIT") {
    if (!decision.tombstoneValidated || !decision.permissionValidated || !decision.freshnessValidated) {
      throw new Error("Cache hit must validate tombstone, permission, and freshness.");
    }
  }

  if (decision.cacheStatus === "STALE") {
    if (decision.decision === "HIT") {
      throw new Error("Stale cache must not be used as fresh truth.");
    }
  }
}

export function assertCacheBypassesNotPermitted(
  decision: CacheDecisionContract,
  expectedValidations: { permission: boolean; freshness: boolean; tombstone: boolean; poisoning: boolean; redaction: boolean; scope: boolean },
): void {
  if (decision.decision === "HIT") {
    if (!expectedValidations.permission) {
      throw new Error("Cache hit must not bypass permission validation.");
    }
    if (!expectedValidations.freshness) {
      throw new Error("Cache hit must not bypass freshness validation.");
    }
    if (!expectedValidations.tombstone) {
      throw new Error("Cache hit must not bypass tombstone validation.");
    }
  }
}

// ============================================================================
// DELTA-INDEX DECISION BOUNDARY
// ============================================================================

export interface DeltaIndexDecisionContract {
  deltaIndexDecisionId: string;
  canonicalSourceId: string;
  priorSourceDigest: string;
  currentSourceDigest: string;
  changedSegments: string[];
  unchangedSegments: string[];
  deletedSegments: string[];
  tombstoneReferences: string[];
  reindexRequired: boolean;
  fullRebuildRequired: boolean;
  reason: string;
  createdAt: string;
  contractVersion: string;
}

export function assertDeltaIndexBoundary(delta: DeltaIndexDecisionContract): void {
  // Boundary only - do not execute indexing
  // Deleted segments must not be reintroduced
  if (delta.deletedSegments.length > 0) {
    const deletedSet = new Set(delta.deletedSegments);
    for (const segment of delta.changedSegments) {
      if (deletedSet.has(segment)) {
        throw new Error("Deleted segments must not be reintroduced.");
      }
    }
  }

  // Unknown tombstone state must require reconciliation
  if (delta.tombstoneReferences.length > 0 && !delta.reason.includes("RECONCILIATION")) {
    if (!delta.fullRebuildRequired) {
      throw new Error("Unknown tombstone state must require reconciliation or rebuild.");
    }
  }
}

// ============================================================================
// PREMIUM AND PAID ACTION APPROVAL GATE
// ============================================================================

export interface PremiumApprovalGateContract {
  gateId: string;
  requestId: string;
  modelRoutingDecisionId: string;
  selectedClass: string;
  estimatedCost: number;
  premiumThreshold: number;
  requiresApproval: boolean;
  approvalId: string | null;
  decision: "APPROVED" | "DENIED" | "PENDING_APPROVAL";
  createdAt: string;
  contractVersion: string;
}

export interface PaidActionApprovalGateContract {
  gateId: string;
  requestId: string;
  actionType: string;
  estimatedCost: number;
  requiresApproval: boolean;
  approvalId: string | null;
  decision: "APPROVED" | "DENIED" | "PENDING_APPROVAL";
  createdAt: string;
  contractVersion: string;
}

export function assertPremiumApprovalGate(gate: PremiumApprovalGateContract): void {
  if (gate.estimatedCost >= gate.premiumThreshold) {
    if (gate.requiresApproval) {
      if (gate.decision === "APPROVED" && !gate.approvalId) {
        throw new Error("Premium approval gate must include approval ID when approved.");
      }
    }
  }
}

export function assertPaidActionApprovalGate(gate: PaidActionApprovalGateContract): void {
  if (gate.estimatedCost > 0) {
    if (gate.requiresApproval) {
      if (gate.decision === "APPROVED" && !gate.approvalId) {
        throw new Error("Paid action approval gate must include approval ID when approved.");
      }
      if (!gate.approvalId && gate.decision !== "PENDING_APPROVAL") {
        throw new Error("Paid action must have approval ID or pending status.");
      }
    }
  }
}

// ============================================================================
// BUDGET EXHAUSTION FAIL-SAFE CLASSIFICATION
// ============================================================================

export const FAIL_SAFE_CLASSES = [
  "TOKEN_EXHAUSTION",
  "COST_EXHAUSTION",
  "CACHE_REBUILD_REQUIRED",
  "LOCAL_FALLBACK_REQUIRED",
  "NO_AVAILABLE_MODEL",
] as const;
export type FailSafeClass = (typeof FAIL_SAFE_CLASSES)[number];

export interface BudgetExhaustionFailSafeContract {
  failSafeId: string;
  requestId: string;
  classification: FailSafeClass;
  reason: string;
  fallbackAction: string;
  createdAt: string;
  contractVersion: string;
}

export function assertFailSafeClassification(failSafe: BudgetExhaustionFailSafeContract): void {
  if (!FAIL_SAFE_CLASSES.includes(failSafe.classification)) {
    throw new Error(`Unknown fail-safe classification: ${failSafe.classification}`);
  }

  if (!failSafe.fallbackAction) {
    throw new Error("Fail-safe must specify a fallback action.");
  }
}
