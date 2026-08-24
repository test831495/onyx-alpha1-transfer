/**
 * UI Labels for Idea Governance
 *
 * Friendly labels for presentation in UI and documentation
 */

export const IDEA_GOVERNANCE_LABELS = {
  // Lifecycle state labels
  lifecycle: {
    DRAFT: { friendly: "Draft", description: "Idea is being prepared" },
    READY_FOR_REVIEW: { friendly: "Ready for Review", description: "Idea is prepared and waiting" },
    UNDER_REVIEW: { friendly: "Under Review", description: "Idea is being reviewed" },
    REVIEWED: { friendly: "Reviewed", description: "Review is complete" },
    NEEDS_CLARIFICATION: { friendly: "Needs Clarification", description: "More info needed" },
    RESEARCH_REQUIRED: { friendly: "Research Required", description: "Further research needed" },
    SAFE_TO_IMPLEMENT: { friendly: "Ready to Implement", description: "Approved, no restrictions" },
    SAFE_WITH_SAFEGUARDS: { friendly: "Needs Safeguards", description: "Approved with requirements" },
    FOUNDATION_ONLY: { friendly: "Foundation Only", description: "Only prep work approved" },
    PLANNED_FOR_FUTURE_PHASE: { friendly: "Future Phase", description: "Scheduled for later" },
    PARKED: { friendly: "Parked", description: "Set aside without target" },
    IMPLEMENTATION_PREFLIGHT_REQUIRED: { friendly: "Preflight Needed", description: "Validation required" },
    READY_FOR_IMPLEMENTATION: { friendly: "Ready to Start", description: "Can begin work" },
    IMPLEMENTATION_IN_PROGRESS: { friendly: "In Progress", description: "Work is underway" },
    IMPLEMENTED: { friendly: "Done", description: "Successfully implemented" },
    BLOCKED: { friendly: "Blocked", description: "Currently blocked" },
    REJECTED: { friendly: "Not Approved", description: "Cannot be implemented" },
    ARCHIVED: { friendly: "Archived", description: "Archived for history" },
    DELETED: { friendly: "Deleted", description: "Removed from system" },
    SUPERSEDED: { friendly: "Superseded", description: "Replaced by another" },
  },

  // Disposition labels
  disposition: {
    IMPLEMENT_NOW: { friendly: "Ready to Implement", emoji: "✅" },
    IMPLEMENT_WITH_CONTROLS: { friendly: "Implement with Safeguards", emoji: "⚠️" },
    PREPARE_FOUNDATION_ONLY: { friendly: "Foundation Work Only", emoji: "🏗️" },
    DEFER_TO_ROADMAP: { friendly: "Planned for Future Phase", emoji: "📅" },
    RESEARCH_REQUIRED: { friendly: "Research Needed", emoji: "🔍" },
    ARCHITECTURE_REVIEW_REQUIRED: { friendly: "Architecture Review Needed", emoji: "🏛️" },
    PARK: { friendly: "Parked for Later", emoji: "🛑" },
    REJECT: { friendly: "Not Approved", emoji: "❌" },
  },

  // Freshness labels
  freshness: {
    CURRENT: { friendly: "Current", description: "Assessment is current and valid" },
    REVIEW_RECOMMENDED: { friendly: "Review Recommended", description: "Consider updating soon" },
    STALE: { friendly: "Stale", description: "Assessment is outdated" },
    INVALIDATED: { friendly: "Invalidated", description: "Assessment is no longer valid" },
  },

  // Mode labels
  mode: {
    ACTIVE: { friendly: "Active", description: "Full assessment and features available" },
    LIGHT: { friendly: "Light", description: "Simplified operations" },
    VACATION: { friendly: "Vacation", description: "Limited operations" },
    HIBERNATION: { friendly: "Hibernation", description: "System suspended" },
  },
};

export interface LocalizedLabel {
  friendly: string;
  description?: string;
  emoji?: string;
}

export function getLifecycleLabel(state: string): LocalizedLabel | undefined {
  return (IDEA_GOVERNANCE_LABELS.lifecycle as Record<string, LocalizedLabel>)[state];
}

export function getDispositionLabel(disposition: string): LocalizedLabel | undefined {
  return (IDEA_GOVERNANCE_LABELS.disposition as Record<string, LocalizedLabel>)[disposition];
}

export function getFreshnessLabel(freshness: string): LocalizedLabel | undefined {
  return (IDEA_GOVERNANCE_LABELS.freshness as Record<string, LocalizedLabel>)[freshness];
}

export function getModeLabel(mode: string): LocalizedLabel | undefined {
  return (IDEA_GOVERNANCE_LABELS.mode as Record<string, LocalizedLabel>)[mode];
}
