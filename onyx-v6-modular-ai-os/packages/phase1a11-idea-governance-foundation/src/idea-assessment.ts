/**
 * Idea Assessment
 *
 * Assessment is deterministic and local only.
 * Assessment never creates authority.
 * Distinguish: verified fact, repository fact, policy fact, assumption, missing information.
 */

import type {
  IdeaAssessment,
  IdeaId,
  IdeaVersion,
} from "./idea-model.js";

export type FactStatus = "verified_fact" | "repository_fact" | "policy_fact" | "assumption" | "missing" | "disagreement";

export interface AssessmentDimension {
  readonly status: FactStatus;
  readonly value: string;
}

/**
 * Validate an assessment dimension
 * @param dimension Dimension to validate
 * @returns True if dimension has valid status
 */
export function isValidDimension(dimension: AssessmentDimension): boolean {
  const validStatuses: readonly FactStatus[] = [
    "verified_fact",
    "repository_fact",
    "policy_fact",
    "assumption",
    "missing",
    "disagreement",
  ];
  return validStatuses.includes(dimension.status) && typeof dimension.value === "string" && dimension.value.length > 0;
}

/**
 * Validate a complete assessment
 * @param assessment Assessment to validate
 * @returns True if all required fields are present
 */
export function isValidAssessment(assessment: IdeaAssessment): boolean {
  if (!assessment.assessmentId || !assessment.ideaId || !assessment.ideaVersion) {
    return false;
  }

  if (!assessment.assessmentTime || typeof assessment.assessmentTime !== "object") {
    return false;
  }

  if (assessment.assessmentMethod !== "deterministic_local") {
    return false;
  }

  // Check all required dimensions
  const dimensions = [
    assessment.roadmapFit,
    assessment.currentPhaseFit,
    assessment.architecture,
    assessment.dependencies,
    assessment.securityThreats,
    assessment.householdPrivacy,
    assessment.authorizationRoles,
    assessment.sessionBehavior,
    assessment.memoryNamespaces,
    assessment.connectorOwnership,
    assessment.characterScope,
    assessment.councilBoundaries,
    assessment.approvalEngineCompat,
    assessment.costOperatingModes,
    assessment.uxAccessibility,
    assessment.recoveryRollback,
    assessment.deploymentPhase,
  ];

  for (const dimension of dimensions) {
    if (!isValidDimension(dimension)) {
      return false;
    }
  }

  if (!Array.isArray(assessment.missingInformation)) {
    return false;
  }

  return true;
}

/**
 * Count verified facts in assessment
 * @param assessment Assessment to analyze
 * @returns Number of verified facts
 */
export function countVerifiedFacts(assessment: IdeaAssessment): number {
  const dimensions = [
    assessment.roadmapFit,
    assessment.currentPhaseFit,
    assessment.architecture,
    assessment.dependencies,
    assessment.securityThreats,
    assessment.householdPrivacy,
    assessment.authorizationRoles,
    assessment.sessionBehavior,
    assessment.memoryNamespaces,
    assessment.connectorOwnership,
    assessment.characterScope,
    assessment.councilBoundaries,
    assessment.approvalEngineCompat,
    assessment.costOperatingModes,
    assessment.uxAccessibility,
    assessment.recoveryRollback,
    assessment.deploymentPhase,
  ];

  return dimensions.filter((d) => d.status === "verified_fact").length;
}

/**
 * Count missing information in assessment
 * @param assessment Assessment to analyze
 * @returns Number of dimensions with missing information
 */
export function countMissingDimensions(assessment: IdeaAssessment): number {
  const dimensions = [
    assessment.roadmapFit,
    assessment.currentPhaseFit,
    assessment.architecture,
    assessment.dependencies,
    assessment.securityThreats,
    assessment.householdPrivacy,
    assessment.authorizationRoles,
    assessment.sessionBehavior,
    assessment.memoryNamespaces,
    assessment.connectorOwnership,
    assessment.characterScope,
    assessment.councilBoundaries,
    assessment.approvalEngineCompat,
    assessment.costOperatingModes,
    assessment.uxAccessibility,
    assessment.recoveryRollback,
    assessment.deploymentPhase,
  ];

  return dimensions.filter((d) => d.status === "missing").length;
}

/**
 * Get dimensions with missing information
 * @param assessment Assessment to analyze
 * @returns Array of dimension names with missing information
 */
export function getMissingDimensions(assessment: IdeaAssessment): readonly string[] {
  const missing: string[] = [];

  if (assessment.roadmapFit.status === "missing") missing.push("Roadmap Fit");
  if (assessment.currentPhaseFit.status === "missing") missing.push("Current Phase Fit");
  if (assessment.architecture.status === "missing") missing.push("Architecture");
  if (assessment.dependencies.status === "missing") missing.push("Dependencies");
  if (assessment.securityThreats.status === "missing") missing.push("Security Threats");
  if (assessment.householdPrivacy.status === "missing") missing.push("Household Privacy");
  if (assessment.authorizationRoles.status === "missing") missing.push("Authorization & Roles");
  if (assessment.sessionBehavior.status === "missing") missing.push("Session Behavior");
  if (assessment.memoryNamespaces.status === "missing") missing.push("Memory Namespaces");
  if (assessment.connectorOwnership.status === "missing") missing.push("Connector Ownership");
  if (assessment.characterScope.status === "missing") missing.push("Character Scope");
  if (assessment.councilBoundaries.status === "missing") missing.push("Council Boundaries");
  if (assessment.approvalEngineCompat.status === "missing") missing.push("Approval Engine Compatibility");
  if (assessment.costOperatingModes.status === "missing") missing.push("Cost & Operating Modes");
  if (assessment.uxAccessibility.status === "missing") missing.push("UX & Accessibility");
  if (assessment.recoveryRollback.status === "missing") missing.push("Recovery & Rollback");
  if (assessment.deploymentPhase.status === "missing") missing.push("Deployment Phase");

  return missing;
}

/**
 * Check if assessment has high confidence
 * @param assessment Assessment to check
 * @returns True if confidence is high
 */
export function hasHighConfidence(assessment: IdeaAssessment): boolean {
  return assessment.confidence === "high";
}

/**
 * Create an assessment summary
 * @param assessment Assessment to summarize
 * @returns Human-readable summary
 */
export function createAssessmentSummary(assessment: IdeaAssessment): string {
  const verifiedCount = countVerifiedFacts(assessment);
  const missingCount = countMissingDimensions(assessment);
  const totalDimensions = 17;

  return `Assessment performed at ${assessment.assessmentTime.toISOString()}: ${verifiedCount}/${totalDimensions} dimensions verified, ${missingCount} missing information, confidence: ${assessment.confidence}`;
}

/**
 * Determine if assessment should trigger research requirement
 * @param assessment Assessment to evaluate
 * @returns True if research is needed
 */
export function shouldRequestResearch(assessment: IdeaAssessment): boolean {
  const missingCount = countMissingDimensions(assessment);
  return missingCount > 3 || assessment.confidence === "low" || assessment.missingInformation.length > 0;
}

/**
 * Determine if assessment should trigger architecture review
 * @param assessment Assessment to evaluate
 * @returns True if architecture review is needed
 */
export function shouldRequestArchitectureReview(assessment: IdeaAssessment): boolean {
  return (
    assessment.architecture.status === "missing" ||
    assessment.authorizationRoles.status === "missing" ||
    assessment.councilBoundaries.status === "missing" ||
    assessment.approvalEngineCompat.status === "missing"
  );
}
