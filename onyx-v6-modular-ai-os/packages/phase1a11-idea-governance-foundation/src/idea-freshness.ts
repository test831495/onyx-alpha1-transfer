/**
 * Idea Freshness Management
 *
 * Freshness depends on material changes and current facts, not time alone.
 * Mode restoration never revives stale or invalidated readiness.
 */

import { IdeaFreshness, type IdeaFreshnessPolicy } from "./idea-model.js";

export interface FreshnessPolicy {
  readonly freshness: IdeaFreshness;
  readonly reviewWindowDays: number;
  readonly reason: string;
  readonly invalidationTriggers: readonly string[];
}

/**
 * Default freshness review windows by change type
 */
const FRESHNESS_WINDOWS: Record<string, number> = {
  // Low-risk: Presentation change
  "presentation_change": 30,

  // Moderate: Internal feature
  "moderate_internal_feature": 14,

  // High-risk: Session, role, memory, connector, privacy, household change
  "session_change": 7,
  "role_change": 7,
  "memory_change": 7,
  "connector_change": 7,
  "privacy_change": 7,
  "household_change": 7,

  // Immediate: Approval, break-glass, deployment, deletion, permission, secret, external write, high-risk
  "approval_change": 0,
  "break_glass_change": 0,
  "deployment_change": 0,
  "deletion_change": 0,
  "permission_change": 0,
  "secret_change": 0,
  "external_write_change": 0,
  "high_risk_change": 0,
};

/**
 * Determine freshness based on assessment age and context
 * @param assessmentTime When the assessment was performed
 * @param currentTime Current time
 * @param riskLevel Risk level of the idea
 * @param hasRepoChanges Whether repository or architecture changed
 * @param hasSecurityFindings Whether security findings exist
 * @returns Freshness policy
 */
export function determineAssessmentFreshness(
  assessmentTime: Date,
  currentTime: Date,
  riskLevel: "low" | "moderate" | "high",
  hasRepoChanges: boolean,
  hasSecurityFindings: boolean,
): IdeaFreshnessPolicy {
  const daysSinceAssessment = (currentTime.getTime() - assessmentTime.getTime()) / (1000 * 60 * 60 * 24);

  // Security findings invalidate immediately
  if (hasSecurityFindings) {
    return {
      freshness: IdeaFreshness.INVALIDATED,
      reason: "Security findings have been discovered",
      invalidatedAt: currentTime,
      invalidationReason: "Security findings invalidate prior assessment",
    };
  }

  // Repository or architecture changes invalidate immediately
  if (hasRepoChanges) {
    return {
      freshness: IdeaFreshness.INVALIDATED,
      reason: "Repository or architecture has changed significantly",
      invalidatedAt: currentTime,
      invalidationReason: "Repository or architecture change invalidates prior assessment",
    };
  }

  // Determine window based on risk level
  const defaultWindow = FRESHNESS_WINDOWS["moderate_internal_feature"] ?? 14;
  let reviewWindowDays: number = defaultWindow;
  if (riskLevel === "low") {
    reviewWindowDays = FRESHNESS_WINDOWS["presentation_change"] ?? 30;
  } else if (riskLevel === "high") {
    reviewWindowDays = FRESHNESS_WINDOWS["session_change"] ?? 7;
  }

  if (daysSinceAssessment > reviewWindowDays) {
    if (daysSinceAssessment > reviewWindowDays * 2) {
      return {
        freshness: IdeaFreshness.STALE,
        reason: `Assessment is stale (${Math.floor(daysSinceAssessment)} days old, window is ${reviewWindowDays} days)`,
        reviewWindowDays,
      };
    } else {
      return {
        freshness: IdeaFreshness.REVIEW_RECOMMENDED,
        reason: `Review recommended (${Math.floor(daysSinceAssessment)} days old, window is ${reviewWindowDays} days)`,
        reviewWindowDays,
      };
    }
  }

  return {
    freshness: IdeaFreshness.CURRENT,
    reason: `Assessment is current (${Math.floor(daysSinceAssessment)} days old, window is ${reviewWindowDays} days)`,
    reviewWindowDays,
  };
}

/**
 * Determine freshness for preflight validation
 * @param preflightTime When the preflight was performed
 * @param currentTime Current time
 * @param hasMaterialChanges Whether material changes occurred
 * @param hasDependencyChanges Whether dependencies changed
 * @param hasSecurityFindings Whether security findings exist
 * @param hasProviderChanges Whether provider facts changed
 * @returns Freshness policy
 */
export function determinePreflightFreshness(
  preflightTime: Date,
  currentTime: Date,
  hasMaterialChanges: boolean,
  hasDependencyChanges: boolean,
  hasSecurityFindings: boolean,
  hasProviderChanges: boolean,
): IdeaFreshnessPolicy {
  const minutesSincePreflight = (currentTime.getTime() - preflightTime.getTime()) / (1000 * 60);
  const daysSincePreflight = minutesSincePreflight / (60 * 24);

  // Material changes invalidate immediately
  if (hasMaterialChanges) {
    return {
      freshness: IdeaFreshness.INVALIDATED,
      reason: "Material changes since preflight",
      invalidatedAt: currentTime,
      invalidationReason: "Material changes invalidate prior preflight",
    };
  }

  // Security findings invalidate immediately
  if (hasSecurityFindings) {
    return {
      freshness: IdeaFreshness.INVALIDATED,
      reason: "Security findings discovered since preflight",
      invalidatedAt: currentTime,
      invalidationReason: "Security findings invalidate prior preflight",
    };
  }

  // Dependency or provider changes invalidate immediately
  if (hasDependencyChanges || hasProviderChanges) {
    return {
      freshness: IdeaFreshness.INVALIDATED,
      reason: "Dependencies or provider facts changed",
      invalidatedAt: currentTime,
      invalidationReason: "Dependency or provider changes invalidate prior preflight",
    };
  }

  // Preflight expires after 24 hours
  if (daysSincePreflight > 1) {
    return {
      freshness: IdeaFreshness.STALE,
      reason: `Preflight is stale (${Math.floor(daysSincePreflight)} days old, preflight window is 24 hours)`,
    };
  }

  // Preflight becomes REVIEW_RECOMMENDED after 8 hours
  if (daysSincePreflight > 8 / 24) {
    return {
      freshness: IdeaFreshness.REVIEW_RECOMMENDED,
      reason: `Preflight review recommended (${Math.floor(minutesSincePreflight)} minutes old, recommendation window is 8 hours)`,
    };
  }

  return {
    freshness: IdeaFreshness.CURRENT,
    reason: `Preflight is current (${Math.floor(minutesSincePreflight)} minutes old)`,
  };
}

/**
 * Determine readiness expiration
 * @param readinessTime When readiness was created
 * @param currentTime Current time
 * @param riskLevel Risk level of the idea
 * @returns Freshness policy
 */
export function determineReadinessExpiration(
  readinessTime: Date,
  currentTime: Date,
  riskLevel: "low" | "moderate" | "high",
): IdeaFreshnessPolicy {
  const daysSinceReadiness = (currentTime.getTime() - readinessTime.getTime()) / (1000 * 60 * 60 * 24);

  // Readiness windows are short
  let maxValidDays = 7;
  if (riskLevel === "low") {
    maxValidDays = 14;
  } else if (riskLevel === "high") {
    maxValidDays = 3;
  }

  if (daysSinceReadiness > maxValidDays) {
    return {
      freshness: IdeaFreshness.INVALIDATED,
      reason: `Readiness has expired (${Math.floor(daysSinceReadiness)} days old, valid for ${maxValidDays} days)`,
      invalidatedAt: currentTime,
      invalidationReason: "Readiness validity window has expired",
    };
  }

  if (daysSinceReadiness > maxValidDays * 0.75) {
    return {
      freshness: IdeaFreshness.REVIEW_RECOMMENDED,
      reason: `Readiness expiration approaching (${Math.floor(daysSinceReadiness)} days old, valid for ${maxValidDays} days)`,
    };
  }

  return {
    freshness: IdeaFreshness.CURRENT,
    reason: `Readiness is valid (${Math.floor(daysSinceReadiness)} days old, valid for ${maxValidDays} days)`,
  };
}

/**
 * Check if freshness is stale or invalidated
 * @param freshness Freshness state
 * @returns True if stale or invalidated
 */
export function isStaleOrInvalidated(freshness: IdeaFreshness): boolean {
  return freshness === IdeaFreshness.STALE || freshness === IdeaFreshness.INVALIDATED;
}

/**
 * Check if readiness should be revived based on mode restoration
 * Mode restoration never revives stale or invalidated readiness
 * @param readinessFreshness Current freshness of readiness
 * @returns True if readiness can be revived, false if it should remain inactive
 */
export function canReadinessBeRevived(readinessFreshness: IdeaFreshness): boolean {
  // Mode restoration cannot revive stale or invalidated readiness
  return readinessFreshness === IdeaFreshness.CURRENT || readinessFreshness === IdeaFreshness.REVIEW_RECOMMENDED;
}
