import { CAPABILITY_COST_CLASSES, CAPABILITY_OPERATIONS, type CapabilityDefinition, type CapabilityRegistrySnapshot } from "./capability-model";
import type { CapabilityGraph } from "./capability-graph";
import { containsProviderReference } from "./validators";

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
  readonly region?: string | { readonly value?: string };
  readonly cost?: { readonly maxClass: string | number };
  readonly operations?: readonly string[] | string;
  readonly rawPrompt?: never;
  readonly secrets?: never;
  readonly memory?: never;
}

export interface UnifiedQueryRequirement {
  readonly capabilityId: string;
  readonly minCoverage?: number;
  readonly required?: boolean;
  readonly reason?: string;
  readonly freshness?: FreshnessConstraint;
  readonly privacy?: PrivacyConstraint;
  readonly attribution?: AttributionConstraint;
  readonly cost?: CostConstraint;
  readonly region?: RegionConstraint;
  readonly accountScope?: AccountScopeReference | string | null;
  readonly trustedTime?: QueryTimeReference;
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

const VALID_FRESHNESS_REQUIREMENTS = new Set(["CURRENT", "STALE_OK", "NOT_ASSESSABLE"] as const);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object";
}

export function validateUnifiedQueryRequest(request: UnifiedQueryRequest): UnifiedQueryValidationResult {
  const errors: string[] = [];
  if (!isRecord(request)) {
    return { valid: false, errors: Object.freeze(["request must be an object"]) };
  }
  if (!Array.isArray(request.requirements) || request.requirements.length === 0) errors.push("requirements are required");
  if (!Array.isArray(request.accountScope) || request.accountScope.length === 0) errors.push("account scope references are required");
  if (typeof request.purpose !== "string" || request.purpose.length === 0) errors.push("purpose is required");
  if (!isRecord(request.freshness) || typeof request.freshness.required !== "string") {
    errors.push("freshness.required is required");
  } else if (!VALID_FRESHNESS_REQUIREMENTS.has(request.freshness.required as (typeof VALID_FRESHNESS_REQUIREMENTS extends Set<infer T> ? T : never))) {
    errors.push("freshness.required is not in the allowed vocabulary");
  }
  if (!isRecord(request.privacy) || request.privacy.allowed !== true && request.privacy.allowed !== false) {
    errors.push("privacy.allowed must be a boolean");
  }
  if (request.region !== undefined) {
    if (typeof request.region === "string") {
      if (request.region.length > 32) errors.push("region exceeds the allowed bound");
    } else if (!isRecord(request.region) || typeof request.region.value !== "string") {
      errors.push("region must be a string or a valid object with a value");
    }
  }
  if (request.cost !== undefined && (!isRecord(request.cost) || typeof request.cost.maxClass !== "string" || !CAPABILITY_COST_CLASSES.includes(request.cost.maxClass as (typeof CAPABILITY_COST_CLASSES)[number]))) {
    errors.push("cost.maxClass must be a valid cost-class string");
  }
  if (request.operations !== undefined) {
    if (!Array.isArray(request.operations)) {
      errors.push("operations must be an array");
    } else {
      if (request.operations.length === 0) errors.push("operations must not be empty");
      if (request.operations.some((operation) => typeof operation !== "string")) errors.push("every operation must be a string");
      if (request.operations.some((operation) => !CAPABILITY_OPERATIONS.includes(operation as (typeof CAPABILITY_OPERATIONS)[number]))) {
        errors.push("operations must use only the closed capability operation vocabulary");
      }
      if (request.operations.includes("READ") && request.operations.some((operation) => operation !== "READ" && operation !== "WRITE" && operation !== "PROPOSAL" && operation !== "EXECUTION")) {
        errors.push("operations must be exact closed values and cannot use substring or disguised variants");
      }
    }
  }
  if (request.rawPrompt !== undefined || request.secrets !== undefined || request.memory !== undefined) {
    errors.push("raw prompts, secrets, and memory contents are prohibited");
  }
  if (Array.isArray(request.requirements) && request.requirements.length > 32) {
    errors.push("requirements exceed the maximum supported bound");
  }
  if (Array.isArray(request.requirements)) {
    for (const [index, requirement] of request.requirements.entries()) {
      if (!isRecord(requirement)) {
        errors.push(`requirements[${index}] must be an object`);
        continue;
      }
      const capabilityId = typeof requirement.capabilityId === "string" ? requirement.capabilityId : "";
      if (capabilityId.trim().length === 0) {
        errors.push(`requirements[${index}].capabilityId is required`);
      } else if (containsProviderReference(capabilityId) || !/^[a-z0-9._\-]+$/.test(capabilityId)) {
        errors.push(`requirements[${index}].capabilityId must be provider-neutral and use the canonical identifier format`);
      }

      if (requirement.freshness !== undefined) {
        if (!isRecord(requirement.freshness) || typeof requirement.freshness.required !== "string" || !VALID_FRESHNESS_REQUIREMENTS.has(requirement.freshness.required as (typeof VALID_FRESHNESS_REQUIREMENTS extends Set<infer T> ? T : never))) {
          errors.push(`requirements[${index}].freshness.required is not in the allowed vocabulary`);
        }
      }
      if (requirement.privacy !== undefined && (!isRecord(requirement.privacy) || typeof requirement.privacy.allowed !== "boolean")) {
        errors.push(`requirements[${index}].privacy.allowed must be a boolean`);
      }
      if (requirement.attribution !== undefined && (!isRecord(requirement.attribution) || typeof requirement.attribution.required !== "boolean")) {
        errors.push(`requirements[${index}].attribution.required must be a boolean`);
      }
      if (requirement.cost !== undefined && (!isRecord(requirement.cost) || typeof requirement.cost.maxClass !== "string" || !CAPABILITY_COST_CLASSES.includes(requirement.cost.maxClass as (typeof CAPABILITY_COST_CLASSES)[number]))) {
        errors.push(`requirements[${index}].cost.maxClass must be a valid cost-class string`);
      }
      if (requirement.region !== undefined && (!isRecord(requirement.region) || typeof requirement.region.value !== "string")) {
        errors.push(`requirements[${index}].region.value must be a string when present`);
      }
      if (requirement.accountScope !== undefined && requirement.accountScope !== null && typeof requirement.accountScope !== "object" && typeof requirement.accountScope !== "string") {
        errors.push(`requirements[${index}].accountScope must be a string or an object reference`);
      }
      if (isRecord(requirement.accountScope) && typeof requirement.accountScope.id !== "string") {
        errors.push(`requirements[${index}].accountScope.id must be a string when supplied as an object`);
      }
      if (requirement.trustedTime !== undefined && (!isRecord(requirement.trustedTime) || typeof requirement.trustedTime.trustedTime !== "string")) {
        errors.push(`requirements[${index}].trustedTime.trustedTime must be a string when supplied`);
      }
    }
  }
  return { valid: errors.length === 0, errors: Object.freeze([...errors]) };
}

function detectConflictingRequirements(snapshot: CapabilityRegistrySnapshot, requirements: readonly UnifiedQueryRequirement[]): string[] {
  const conflicts: string[] = [];
  const seen = new Map<string, string>();
  for (const requirement of requirements) {
    const capability = snapshot.byId[requirement.capabilityId];
    if (!capability) continue;
    for (const otherId of capability.conflicts) {
      if (seen.has(otherId) || otherId === requirement.capabilityId) {
        conflicts.push(`${requirement.capabilityId} conflicts with ${otherId}`);
      }
    }
    seen.set(requirement.capabilityId, requirement.capabilityId);
  }
  return conflicts;
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
  if (typeof request.purpose !== "string" || request.purpose.trim().length === 0) {
    return {
      disposition: "CLARIFICATION_REQUIRED",
      steps: Object.freeze([]),
      gaps: Object.freeze(["purpose is required to plan a capability query"]),
    };
  }
  if (request.freshness && request.freshness.required === "NOT_ASSESSABLE") {
    return {
      disposition: "NOT_ASSESSABLE",
      steps: Object.freeze([]),
      gaps: Object.freeze(["freshness requirement is not assessable without additional evidence"]),
    };
  }

  const conflicts = detectConflictingRequirements(snapshot, request.requirements);
  if (conflicts.length > 0) {
    return {
      disposition: "CONFLICTING_REQUIREMENTS",
      steps: Object.freeze([]),
      gaps: Object.freeze([...conflicts]),
    };
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
