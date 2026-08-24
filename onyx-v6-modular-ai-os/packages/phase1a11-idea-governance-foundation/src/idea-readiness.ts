/**
 * Implementation Readiness
 *
 * Readiness is short-lived, advisory, scope-bound.
 * Stale and invalidated readiness deny operations.
 * Material change invalidates readiness.
 * Mode restoration does not reactivate readiness.
 */

import type {
  ImplementationReadinessRecord,
  IdeaId,
  IdeaVersion,
} from "./idea-model.js";

export interface ReadinessValidationContext {
  readonly ideaIdMatches: boolean;
  readonly ideaVersionMatches: boolean;
  readonly preflightValid: boolean;
  readonly repositoryCommitMatches: boolean;
  readonly branchMatches: boolean;
  readonly phaseStable: boolean;
  readonly architectureVersionCompatible: boolean;
  readonly policyVersionCompatible: boolean;
  readonly dependenciesStable: boolean;
  readonly securityStatusClean: boolean;
  readonly acceptanceRequirementsStable: boolean;
  readonly validUntilNotReached: boolean;
  readonly noMaterialChangesSinceReadiness: boolean;
  readonly ownerAuthorityHeld: boolean;
}

/**
 * Validate if readiness record is still valid
 * @param readiness Readiness record to validate
 * @param context Validation context
 * @returns True if readiness is still valid
 */
export function isReadinessValid(
  readiness: ImplementationReadinessRecord,
  context: ReadinessValidationContext,
): boolean {
  return (
    context.ideaIdMatches &&
    context.ideaVersionMatches &&
    context.preflightValid &&
    context.repositoryCommitMatches &&
    context.branchMatches &&
    context.phaseStable &&
    context.architectureVersionCompatible &&
    context.policyVersionCompatible &&
    context.dependenciesStable &&
    context.securityStatusClean &&
    context.acceptanceRequirementsStable &&
    context.validUntilNotReached &&
    context.noMaterialChangesSinceReadiness &&
    context.ownerAuthorityHeld
  );
}

/**
 * Determine why readiness is invalid
 * @param context Validation context
 * @returns List of reasons readiness is invalid
 */
export function getReadinessInvalidationReasons(context: ReadinessValidationContext): readonly string[] {
  const reasons: string[] = [];

  if (!context.ideaIdMatches) reasons.push("Idea ID does not match readiness record");
  if (!context.ideaVersionMatches) reasons.push("Idea version does not match readiness record");
  if (!context.preflightValid) reasons.push("Original preflight is no longer valid");
  if (!context.repositoryCommitMatches) reasons.push("Repository commit has changed");
  if (!context.branchMatches) reasons.push("Branch has changed");
  if (!context.phaseStable) reasons.push("Current phase has changed");
  if (!context.architectureVersionCompatible) reasons.push("Architecture version is no longer compatible");
  if (!context.policyVersionCompatible) reasons.push("Policy version is no longer compatible");
  if (!context.dependenciesStable) reasons.push("Dependencies have changed");
  if (!context.securityStatusClean) reasons.push("Security findings have been discovered");
  if (!context.acceptanceRequirementsStable) reasons.push("Acceptance requirements have changed");
  if (!context.validUntilNotReached) reasons.push("Readiness has expired");
  if (!context.noMaterialChangesSinceReadiness) reasons.push("Material changes have occurred since readiness");
  if (!context.ownerAuthorityHeld) reasons.push("Owner authority has changed");

  return reasons;
}

/**
 * Mode restoration cannot revive stale or invalidated readiness
 * @param readinessFreshness Current freshness state
 * @returns False (readiness cannot be revived by mode restoration)
 */
export function canModeRestorationReviveReadiness(readinessFreshness: "CURRENT" | "REVIEW_RECOMMENDED" | "STALE" | "INVALIDATED"): boolean {
  if (readinessFreshness === "STALE" || readinessFreshness === "INVALIDATED") {
    return false;
  }
  // Even REVIEW_RECOMMENDED cannot be revived by mode restoration alone
  // Full preflight revalidation is required
  return false;
}

/**
 * Create readiness scope hash
 * @param ideaId Idea ID
 * @param ideaVersion Idea version
 * @param repositoryCommit Repository commit
 * @param branch Branch name
 * @param phaseWave Phase and wave
 * @param policyVersion Policy version
 * @returns Deterministic scope hash
 */
export function createReadinessScopeHash(
  ideaId: IdeaId,
  ideaVersion: IdeaVersion,
  repositoryCommit: string,
  branch: string,
  phaseWave: string,
  policyVersion: string,
): string {
  const scopeString = `${ideaId}|${ideaVersion}|${repositoryCommit}|${branch}|${phaseWave}|${policyVersion}`;
  // Simple deterministic hash for scope binding
  let hash = 0;
  for (let i = 0; i < scopeString.length; i++) {
    const char = scopeString.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Validate readiness scope hash
 * @param readiness Readiness record
 * @param ideaId Current idea ID
 * @param ideaVersion Current idea version
 * @param repositoryCommit Current repository commit
 * @param branch Current branch
 * @param phaseWave Current phase and wave
 * @param policyVersion Current policy version
 * @returns True if scope is still valid
 */
export function isReadinessScopeValid(
  readiness: ImplementationReadinessRecord,
  ideaId: IdeaId,
  ideaVersion: IdeaVersion,
  repositoryCommit: string,
  branch: string,
  phaseWave: string,
  policyVersion: string,
): boolean {
  const currentHash = createReadinessScopeHash(
    ideaId,
    ideaVersion,
    repositoryCommit,
    branch,
    phaseWave,
    policyVersion,
  );

  return readiness.canonicalScopeHash === currentHash;
}

/**
 * Get readiness expiration window in hours
 * @param riskLevel Risk level of the idea
 * @returns Hours until readiness expires
 */
export function getReadinessExpirationHours(riskLevel: "low" | "moderate" | "high"): number {
  if (riskLevel === "low") return 336; // 14 days
  if (riskLevel === "high") return 72; // 3 days
  return 168; // 7 days (moderate)
}

/**
 * Create readiness authorization statement
 * @returns Statement that readiness authorizes nothing
 */
export function createReadinessAuthorizationStatement(): string {
  return "This readiness record is advisory and does not authorize: file changes, branch creation, staging, commit, push, PR creation or modification, merge, deployment, permissions, secrets, connectors, budget elevation, cloud infrastructure changes, or external actions.";
}

/**
 * List all readiness invalidation triggers
 * @returns Array of conditions that invalidate readiness
 */
export function listReadinessInvalidationTriggers(): readonly string[] {
  return [
    "material_change",
    "schedule",
    "phase_transition",
    "architecture_change",
    "policy_change",
    "security_finding",
    "provider_fact_change",
    "cost_budget_change",
    "recovery_readiness_change",
    "user_request",
  ];
}
