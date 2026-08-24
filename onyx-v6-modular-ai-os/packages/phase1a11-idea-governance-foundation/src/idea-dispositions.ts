/**
 * Idea Dispositions
 *
 * All eight valid disposition types with friendly details.
 * No disposition authorizes implementation.
 */

import { IdeaDisposition, type IdeaDispositionDetail } from "./idea-model.js";

export const DISPOSITION_DETAILS: Record<IdeaDisposition, IdeaDispositionDetail> = {
  [IdeaDisposition.IMPLEMENT_NOW]: {
    disposition: IdeaDisposition.IMPLEMENT_NOW,
    friendlyTitle: "Ready to Implement",
    explanation: "This idea is approved and can be implemented immediately without restrictions.",
    reasons: [
      "Aligns with current phase roadmap",
      "Architecture and security review complete",
      "Dependencies are available",
      "No critical risks identified",
    ],
    benefits: [
      "Addresses a current need",
      "High confidence implementation",
      "Minimal prerequisites required",
      "Positive impact anticipated",
    ],
    risks: [
      "Standard implementation risks apply",
    ],
    recommendedPhase: "current",
    confidence: "high" as const,
    missingInformation: [],
    safeNextAction: "Request implementation planning and schedule work",
  },

  [IdeaDisposition.IMPLEMENT_WITH_CONTROLS]: {
    disposition: IdeaDisposition.IMPLEMENT_WITH_CONTROLS,
    friendlyTitle: "Implement with Safeguards",
    explanation: "This idea can be implemented but requires specific safeguards to ensure safety and compliance.",
    reasons: [
      "Additional controls reduce identified risks",
      "Safeguards enable safe implementation",
      "Value outweighs controlled risks",
    ],
    benefits: [
      "Enables valuable feature delivery",
      "Safeguards protect privacy and security",
      "Risk-controlled implementation",
    ],
    risks: [
      "Implementation complexity increases",
      "Safeguard compliance required",
      "Additional testing overhead",
    ],
    safeguards: [
      "Safeguards will be defined in the implementation plan",
      "Preflight validation required before work begins",
      "Regular risk reviews during implementation",
    ],
    recommendedPhase: "current",
    confidence: "medium" as const,
    missingInformation: [],
    safeNextAction: "Review safeguards in the detailed plan, then schedule implementation with control oversight",
  },

  [IdeaDisposition.PREPARE_FOUNDATION_ONLY]: {
    disposition: IdeaDisposition.PREPARE_FOUNDATION_ONLY,
    friendlyTitle: "Foundation Work Only",
    explanation: "Only preparatory foundation work is approved at this time. Implementation is deferred to a later phase.",
    reasons: [
      "Architecture not yet fully evolved",
      "Dependent systems still in development",
      "Full implementation requires later phase prerequisites",
      "Foundation work provides immediate value",
    ],
    benefits: [
      "Early value from foundation work",
      "Reduces risk for full implementation",
      "Aligns with phase progression",
      "Builds future capabilities",
    ],
    risks: [
      "Partial implementation only",
      "Future work required for full feature",
      "Timeline extends beyond current phase",
    ],
    recommendedPhase: "current phase for foundation; future phase for full implementation",
    confidence: "medium" as const,
    missingInformation: [],
    safeNextAction: "Define foundation work scope and schedule for preparation",
  },

  [IdeaDisposition.DEFER_TO_ROADMAP]: {
    disposition: IdeaDisposition.DEFER_TO_ROADMAP,
    friendlyTitle: "Planned for Future Phase",
    explanation: "This idea is approved but scheduled for a specific phase when prerequisites are met.",
    reasons: [
      "Aligns with planned phase roadmap",
      "Prerequisites not yet available",
      "Capacity planning indicates future phase fit",
    ],
    benefits: [
      "Clear timeline and expectations",
      "Phase alignment maximizes value",
      "Prerequisites will be ready",
    ],
    risks: [
      "Implementation is delayed",
      "Roadmap changes may affect timing",
      "Requirements may need reassessment",
    ],
    recommendedPhase: "Will be specified in the roadmap",
    confidence: "medium" as const,
    missingInformation: [
      "Exact target phase may need confirmation",
    ],
    safeNextAction: "Place on roadmap for target phase and monitor for material changes",
  },

  [IdeaDisposition.RESEARCH_REQUIRED]: {
    disposition: IdeaDisposition.RESEARCH_REQUIRED,
    friendlyTitle: "Research Needed",
    explanation: "Before a decision can be made, additional research is needed to understand feasibility, impact, or architecture implications.",
    reasons: [
      "Key information is unavailable",
      "Provider capabilities need verification",
      "Architecture impact unclear",
      "Cost or complexity assessment incomplete",
    ],
    benefits: [
      "Research will enable informed decision",
      "Reduces implementation risk",
      "Clarifies hidden dependencies",
    ],
    risks: [
      "Timeline extends while research proceeds",
      "Research findings may change recommendation",
    ],
    recommendedPhase: "Research phase will be determined",
    confidence: "low" as const,
    missingInformation: [
      "Provider capability facts",
      "Architecture compatibility assessment",
      "Cost and resource estimates",
      "Migration or integration requirements",
    ],
    safeNextAction: "Define research scope, assign researcher, and schedule work",
  },

  [IdeaDisposition.ARCHITECTURE_REVIEW_REQUIRED]: {
    disposition: IdeaDisposition.ARCHITECTURE_REVIEW_REQUIRED,
    friendlyTitle: "Architecture Review Needed",
    explanation: "This idea requires formal architecture review before a decision can be made. It may have implications for system design or governance.",
    reasons: [
      "Potential architecture implications detected",
      "Policy or authority scope is involved",
      "Cross-system integration required",
      "Household or account boundary issues possible",
    ],
    benefits: [
      "Ensures architecture compatibility",
      "Prevents future rework",
      "Validates governance compliance",
    ],
    risks: [
      "Review process requires time",
      "Architecture decision may constrain implementation",
      "Review findings may require significant changes",
    ],
    recommendedPhase: "After architecture review",
    confidence: "medium" as const,
    missingInformation: [
      "Formal architecture assessment",
      "Policy compatibility review",
      "Rahul's architecture decision",
    ],
    safeNextAction: "Schedule architecture review with the Primary Owner",
  },

  [IdeaDisposition.PARK]: {
    disposition: IdeaDisposition.PARK,
    friendlyTitle: "Parked for Future Consideration",
    explanation: "This idea has merit but is set aside for now without a specific target phase. It can be revisited if circumstances change.",
    reasons: [
      "Timing is not right in the current roadmap",
      "Priorities shift and this can be reconsidered",
      "Valuable but not urgent",
      "Better implementation opportunity may arise",
    ],
    benefits: [
      "Idea is preserved for future",
      "No commitment blocks other priorities",
      "Can be reassessed when conditions change",
    ],
    risks: [
      "Idea may be forgotten",
      "Technology or requirements may evolve",
      "Opportunity window may close",
    ],
    recommendedPhase: "Unscheduled",
    confidence: "medium" as const,
    missingInformation: [],
    safeNextAction: "File idea for future consideration and monitor for condition changes",
  },

  [IdeaDisposition.REJECT]: {
    disposition: IdeaDisposition.REJECT,
    friendlyTitle: "Not Approved",
    explanation: "This idea is not approved for implementation. However, there may be safe alternatives or prerequisites that could enable future reconsideration.",
    reasons: [
      "Conflicts with current policy or architecture",
      "Risk-benefit ratio is unfavorable",
      "Prerequisites are not met and unlikely to be",
      "Alternative approaches are better",
    ],
    benefits: [
      "Avoids unnecessary complexity",
      "Protects against identified risks",
      "Preserves resources for better opportunities",
    ],
    risks: [
      "Proposed capability will not be delivered",
      "Workarounds may be necessary",
    ],
    recommendedPhase: "Not applicable",
    confidence: "high" as const,
    missingInformation: [],
    safeNextAction: "Consider safe alternatives or prerequisites if available",
  },
};

/**
 * Get disposition detail
 * @param disposition The disposition type
 * @returns Full details including friendly names, risks, benefits, etc.
 */
export function getDispositionDetail(disposition: unknown): IdeaDispositionDetail | null {
  if (!Object.values(IdeaDisposition).includes(disposition as IdeaDisposition)) {
    return null;
  }
  return DISPOSITION_DETAILS[disposition as IdeaDisposition];
}

/**
 * Validate if disposition is valid
 * @param disposition The value to validate
 * @returns True if disposition is one of the eight valid types
 */
export function isValidDisposition(disposition: unknown): disposition is IdeaDisposition {
  return Object.values(IdeaDisposition).includes(disposition as IdeaDisposition);
}

/**
 * Get all valid disposition values
 * @returns Array of all valid disposition values
 */
export function getAllDispositions(): readonly IdeaDisposition[] {
  return Object.values(IdeaDisposition);
}
