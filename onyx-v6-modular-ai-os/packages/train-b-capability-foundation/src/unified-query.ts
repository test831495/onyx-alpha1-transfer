import type { CapabilityDefinition, CapabilityRegistrySnapshot } from "./capability-model";
import type { CapabilityGraph } from "./capability-graph";

export const QUERY_DISPOSITIONS = [
  "PLAN_READY",
  "PARTIAL_PLAN",
  "CLARIFICATION_REQUIRED",
  "NO_ELIGIBLE_CAPABILITY",
  "CONFLICTING_REQUIREMENTS",
  "INVALID_REQUEST",
  "NOT_ASSESSABLE",
] as const;
export type UnifiedQueryDisposition = (typeof QUERY_DISPOSITIONS)[number];

export interface UnifiedQueryRequest {
  readonly accountScope: readonly string[];
  readonly purpose: string;
  readonly requirements: readonly UnifiedQueryRequirement[];
  readonly freshness: { readonly trustedTime?: string; readonly required: string };
  readonly privacy: { readonly allowed: boolean; readonly sensitivity?: string };
  readonly region?: string;
  readonly cost?: { readonly maxClass: string };
  readonly rawPrompt?: never;
  readonly secrets?: never;
  readonly memory?: never;
}

export interface UnifiedQueryRequirement {
  readonly capabilityId: string;
  readonly minCoverage?: number;
  readonly required?: boolean;
  readonly reason?: string;
 }

export interface CapabilityRequirement extends UnifiedQueryRequirement {}

export interface FreshnessConstraint { readonly required: string; readonly supplied?: string; }
export interface AttributionConstraint { readonly required: boolean; }
export interface CostConstraint { readonly maxClass: string; }
export interface PrivacyConstraint { readonly allowed: boolean; readonly sensitivity?: string; }
export interface RegionConstraint { readonly value?: string; }
export interface AccountScopeReference { readonly id: string; }
export interface QueryTimeReference { readonly trustedTime?: string; }

export interface UnifiedQueryPlanStep {
  readonly capabilityId: string;
  readonly required: boolean;
  readonly sourceAttributionRequired: boolean;
  readonly freshnessRequirement: string;
  readonly gap?: string;
}

export interface UnifiedQueryPlan {
  readonly disposition: UnifiedQueryDisposition;
  readonly steps: readonly UnifiedQueryPlanStep[];
  readonly gaps: readonly string[];
}

export interface UnifiedQueryCoverage {
  readonly capabilityId: string;
  readonly eligible: boolean;
  readonly gaps: readonly string[];
}

export interface UnifiedQueryGap {
  readonly capabilityId: string;
  readonly reason: string;
}

export interface UnifiedQueryValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

export function validateUnifiedQueryRequest(request: UnifiedQueryRequest): UnifiedQueryValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(request.requirements) || request.requirements.length === 0) errors.push("requirements are required");
  if (!Array.isArray(request.accountScope) || request.accountScope.length === 0) errors.push("account scope references are required");
  if (typeof request.purpose !== "string" || request.purpose.length === 0) errors.push("purpose is required");
  if (request.freshness && typeof request.freshness.required !== "string") errors.push("freshness.required is required");
  if (request.privacy && request.privacy.allowed !== true && request.privacy.allowed !== false) errors.push("privacy.allowed must be a boolean");
  if (typeof request.region === "string" && request.region.length > 32) errors.push("region exceeds the allowed bound");
  if (request.rawPrompt !== undefined || request.secrets !== undefined || request.memory !== undefined) {
    errors.push("raw prompts, secrets, and memory contents are prohibited");
  }
  return { valid: errors.length === 0, errors: Object.freeze([...errors]) };
}

export function planUnifiedQuery(
  request: UnifiedQueryRequest,
  snapshot: CapabilityRegistrySnapshot,
  graph: CapabilityGraph,
): UnifiedQueryPlan {
  const validation = validateUnifiedQueryRequest(request);
  if (!validation.valid) {
    return { disposition: "INVALID_REQUEST", steps: Object.freeze([]), gaps: Object.freeze(validation.errors) };
  }

  const steps: UnifiedQueryPlanStep[] = [];
  const gaps: string[] = [];

  for (const requirement of request.requirements) {
    const capability = snapshot.byId[requirement.capabilityId];
    if (!capability) {
      gaps.push(`${requirement.capabilityId}: missing capability`);
      continue;
    }
    if (capability.lifecycleState !== "ACTIVE" || capability.runtimeEnabled !== true) {
      gaps.push(`${requirement.capabilityId}: disabled or ineligible capability`);
      continue;
    }
    const closure = graph.dependencyClosure[requirement.capabilityId] ?? [];
    for (const dependency of closure) {
      const dependencyDef = snapshot.byId[dependency];
      if (!dependencyDef) {
        gaps.push(`${requirement.capabilityId}: missing dependency ${dependency}`);
      } else if (dependencyDef.lifecycleState !== "ACTIVE" || dependencyDef.runtimeEnabled !== true) {
        gaps.push(`${requirement.capabilityId}: disabled dependency ${dependency}`);
      }
    }
    steps.push({
      capabilityId: requirement.capabilityId,
      required: requirement.required !== false,
      sourceAttributionRequired: capability.sourceAttributionRequired,
      freshnessRequirement: capability.freshnessRequirement,
    });
  }

  if (steps.length === 0) {
    return { disposition: "NO_ELIGIBLE_CAPABILITY", steps: Object.freeze([]), gaps: Object.freeze([...gaps]) };
  }

  const disposition: UnifiedQueryDisposition = gaps.length > 0 ? "PARTIAL_PLAN" : "PLAN_READY";
  return Object.freeze({
    disposition,
    steps: Object.freeze(steps),
    gaps: Object.freeze([...gaps]),
  });
}

export function assessQueryCoverage(plans: readonly UnifiedQueryPlan[], _snapshot: CapabilityRegistrySnapshot): readonly UnifiedQueryCoverage[] {
  return Object.freeze(plans.map((plan) => ({
    capabilityId: "coverage",
    eligible: plan.disposition === "PLAN_READY" || plan.disposition === "PARTIAL_PLAN",
    gaps: [...plan.gaps],
  })));
}
