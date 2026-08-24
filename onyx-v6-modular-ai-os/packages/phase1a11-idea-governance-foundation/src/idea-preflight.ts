/**
 * Implementation Preflight
 *
 * Every request to prepare an idea for implementation requires fresh preflight.
 * Previous assessment never replaces current preflight.
 * Preflight does not authorize Git or deployment.
 */

import type {
  IdeaPreflightRequest,
  IdeaPreflightResult,
} from "./idea-model.js";

export interface PreflightCheckResult {
  readonly checkName: string;
  readonly passed: boolean;
  readonly reason?: string;
}

export interface PreflightValidationContext {
  readonly ideaVersionMatches: boolean;
  readonly repositoryCommitValid: boolean;
  readonly branchValid: boolean;
  readonly phaseWaveValid?: boolean;
  readonly currentPhase: string;
  readonly currentWave: string;
  readonly architectureVersion: string;
  readonly policyVersion: string;
  readonly architectureVersionsCompatible?: boolean;
  readonly policyVersionsCompatible?: boolean;
  readonly hasOwnerAuthority: boolean;
  readonly privacyBoundariesIntact: boolean;
  readonly sessionValid: boolean;
  readonly memoryConnectorIsolationValid: boolean;
  readonly approvalRequirementsStatus: "met" | "not_met" | "unknown";
  readonly dependenciesResolvable: boolean;
  readonly securityFindingsPresent: boolean;
  readonly knownLimitationsAccepted: boolean;
  readonly providerCapabilityKnown: boolean;
  readonly operatingModeBudgetsAllow: boolean;
  readonly recoveryReadinessConfirmed: boolean;
  readonly acceptanceExpectationsMet: boolean;
}

/**
 * Determine preflight result based on validation context
 * @param context Preflight validation context
 * @returns Preflight result
 */
export function determinePreflightResult(context: PreflightValidationContext): "ready_for_implementation" | "ready_with_updated_safeguards" | "not_safe_in_current_wave" | "previously_safe_now_blocked" | "research_required" | "architecture_decision_required" | "should_not_implement" {
  // Blockers that prevent implementation
  const blockers: string[] = [];

  if (!context.ideaVersionMatches) {
    blockers.push("Idea version does not match preflight request");
  }

  if (!context.repositoryCommitValid) {
    blockers.push("Repository commit is no longer valid");
  }

  if (!context.branchValid) {
    blockers.push("Branch is no longer valid");
  }

  if (!context.hasOwnerAuthority) {
    blockers.push("Owner authority has changed");
  }

  if (!context.privacyBoundariesIntact) {
    blockers.push("Privacy boundaries have been violated");
  }

  if (!context.sessionValid) {
    blockers.push("Session validity has changed");
  }

  if (!context.memoryConnectorIsolationValid) {
    blockers.push("Memory or connector isolation has been compromised");
  }

  if (context.securityFindingsPresent) {
    blockers.push("Security findings have been discovered");
  }

  if (!context.dependenciesResolvable) {
    blockers.push("Dependencies can no longer be resolved");
  }

  if (!context.approvalRequirementsStatus || context.approvalRequirementsStatus === "not_met") {
    blockers.push("Approval Engine requirements are not met");
  }

  if (!context.operatingModeBudgetsAllow) {
    blockers.push("Operating mode budgets no longer permit implementation");
  }

  if (!context.recoveryReadinessConfirmed) {
    blockers.push("Recovery readiness can no longer be confirmed");
  }

  // If there are blockers, determine the best result type
  if (blockers.length > 0) {
    // Security findings and dependency changes are structural issues
    if (context.securityFindingsPresent || !context.dependenciesResolvable) {
      return "not_safe_in_current_wave";
    }
    // Check if this was previously safe but is now blocked (authority, privacy, or session changes)
    if (context.ideaVersionMatches && context.hasOwnerAuthority && context.privacyBoundariesIntact && !context.securityFindingsPresent) {
      return "previously_safe_now_blocked";
    }
    // Default to not_safe_in_current_wave for other blockers
    return "not_safe_in_current_wave";
  }

  // Check if research is needed
  if (context.approvalRequirementsStatus === "unknown" || !context.knownLimitationsAccepted) {
    return "research_required";
  }

  // Check if architecture review is needed
  if (!context.providerCapabilityKnown) {
    return "architecture_decision_required";
  }

  // Check if safeguards are needed
  if (!context.acceptanceExpectationsMet) {
    return "ready_with_updated_safeguards";
  }

  // All checks passed
  return "ready_for_implementation";
}

/**
 * Create blocker explanation
 * @param result Preflight result
 * @param blockers List of blockers
 * @returns Friendly explanation
 */
export function createBlockerExplanation(
  result: "previously_safe_now_blocked" | "not_safe_in_current_wave" | "research_required" | "architecture_decision_required" | "should_not_implement",
  blockers: readonly string[],
): string {
  if (result === "previously_safe_now_blocked") {
    return `This idea was previously approved for implementation, but conditions have changed:\n- ${blockers.join("\n- ")}`;
  }

  if (result === "not_safe_in_current_wave") {
    return `This idea is not safe to implement in the current wave:\n- ${blockers.join("\n- ")}`;
  }

  if (result === "research_required") {
    return `Additional research is required before preflight can be completed:\n- ${blockers.join("\n- ")}`;
  }

  if (result === "architecture_decision_required") {
    return `An architecture decision is required before preflight can be completed:\n- ${blockers.join("\n- ")}`;
  }

  return `Implementation should not proceed:\n- ${blockers.join("\n- ")}`;
}

/**
 * Validate that preflight does not authorize prohibited actions
 * @returns True (preflight never authorizes these actions)
 */
export function preflightNeverAuthorizes(): {
  readonly gitOperations: boolean;
  readonly deployment: boolean;
  readonly permissions: boolean;
  readonly secrets: boolean;
  readonly connectors: boolean;
  readonly budgets: boolean;
  readonly cloud: boolean;
  readonly external: boolean;
} {
  return {
    gitOperations: false,
    deployment: false,
    permissions: false,
    secrets: false,
    connectors: false,
    budgets: false,
    cloud: false,
    external: false,
  };
}

/**
 * Create preflight clear statement
 * @returns Statement that preflight authorizes nothing prohibited
 */
export function createPreflightClearStatement(): string {
  return "This preflight validation does not authorize: file changes, branch creation, staging, commit, push, PR creation or modification, merge, deployment, permissions, secrets, connectors, budget elevation, cloud infrastructure changes, or external actions.";
}
