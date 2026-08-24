/**
 * Idea Lifecycle Management
 *
 * Deterministic allowed-transition policy. Unknown or prohibited transitions deny.
 * Protected or terminal states must not silently return to active implementation states.
 */

import { IdeaLifecycleState } from "./idea-model.js";

export const LIFECYCLE_LABELS: Record<IdeaLifecycleState, { friendlyName: string; explanation: string }> = {
  [IdeaLifecycleState.DRAFT]: {
    friendlyName: "Draft",
    explanation: "Idea is being prepared for submission",
  },
  [IdeaLifecycleState.READY_FOR_REVIEW]: {
    friendlyName: "Ready for Review",
    explanation: "Idea is prepared and waiting for review",
  },
  [IdeaLifecycleState.UNDER_REVIEW]: {
    friendlyName: "Under Review",
    explanation: "Idea is being actively reviewed",
  },
  [IdeaLifecycleState.REVIEWED]: {
    friendlyName: "Reviewed",
    explanation: "Initial review is complete, awaiting decision",
  },
  [IdeaLifecycleState.NEEDS_CLARIFICATION]: {
    friendlyName: "Needs Clarification",
    explanation: "Reviewer needs additional information from the owner",
  },
  [IdeaLifecycleState.RESEARCH_REQUIRED]: {
    friendlyName: "Research Required",
    explanation: "Idea requires further research before proceeding",
  },
  [IdeaLifecycleState.SAFE_TO_IMPLEMENT]: {
    friendlyName: "Safe to Implement",
    explanation: "Idea has been approved for implementation without restrictions",
  },
  [IdeaLifecycleState.SAFE_WITH_SAFEGUARDS]: {
    friendlyName: "Safe with Safeguards",
    explanation: "Idea can be implemented with specific required safeguards",
  },
  [IdeaLifecycleState.FOUNDATION_ONLY]: {
    friendlyName: "Foundation Only",
    explanation: "Only preparatory foundation work is approved for this idea",
  },
  [IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE]: {
    friendlyName: "Planned for Future Phase",
    explanation: "Idea is approved but scheduled for implementation in a future phase",
  },
  [IdeaLifecycleState.PARKED]: {
    friendlyName: "Parked",
    explanation: "Idea is set aside without a target phase for future consideration",
  },
  [IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED]: {
    friendlyName: "Preflight Required",
    explanation: "Idea is ready but requires fresh implementation preflight validation",
  },
  [IdeaLifecycleState.READY_FOR_IMPLEMENTATION]: {
    friendlyName: "Ready for Implementation",
    explanation: "Fresh preflight has passed; implementation can proceed",
  },
  [IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS]: {
    friendlyName: "Implementation in Progress",
    explanation: "Work on this idea is currently underway",
  },
  [IdeaLifecycleState.IMPLEMENTED]: {
    friendlyName: "Implemented",
    explanation: "Idea has been successfully implemented",
  },
  [IdeaLifecycleState.BLOCKED]: {
    friendlyName: "Blocked",
    explanation: "Implementation is currently blocked by external constraints",
  },
  [IdeaLifecycleState.REJECTED]: {
    friendlyName: "Rejected",
    explanation: "Idea has been rejected and will not be implemented",
  },
  [IdeaLifecycleState.ARCHIVED]: {
    friendlyName: "Archived",
    explanation: "Idea has been archived and is not under active consideration",
  },
  [IdeaLifecycleState.DELETED]: {
    friendlyName: "Deleted",
    explanation: "Idea has been deleted from the active system",
  },
  [IdeaLifecycleState.SUPERSEDED]: {
    friendlyName: "Superseded",
    explanation: "Idea has been superseded by another idea",
  },
};

/** Allowed state transitions */
const ALLOWED_TRANSITIONS: Record<IdeaLifecycleState, readonly IdeaLifecycleState[]> = {
  [IdeaLifecycleState.DRAFT]: [
    IdeaLifecycleState.READY_FOR_REVIEW,
    IdeaLifecycleState.DELETED,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.READY_FOR_REVIEW]: [
    IdeaLifecycleState.UNDER_REVIEW,
    IdeaLifecycleState.DRAFT,
    IdeaLifecycleState.DELETED,
  ],
  [IdeaLifecycleState.UNDER_REVIEW]: [
    IdeaLifecycleState.REVIEWED,
    IdeaLifecycleState.NEEDS_CLARIFICATION,
    IdeaLifecycleState.RESEARCH_REQUIRED,
    IdeaLifecycleState.DRAFT,
  ],
  [IdeaLifecycleState.REVIEWED]: [
    IdeaLifecycleState.NEEDS_CLARIFICATION,
    IdeaLifecycleState.RESEARCH_REQUIRED,
    IdeaLifecycleState.SAFE_TO_IMPLEMENT,
    IdeaLifecycleState.SAFE_WITH_SAFEGUARDS,
    IdeaLifecycleState.FOUNDATION_ONLY,
    IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE,
    IdeaLifecycleState.PARKED,
    IdeaLifecycleState.REJECTED,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.NEEDS_CLARIFICATION]: [
    IdeaLifecycleState.UNDER_REVIEW,
    IdeaLifecycleState.DRAFT,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.RESEARCH_REQUIRED]: [
    IdeaLifecycleState.REVIEWED,
    IdeaLifecycleState.UNDER_REVIEW,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.SAFE_TO_IMPLEMENT]: [
    IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED,
    IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS,
    IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.SAFE_WITH_SAFEGUARDS]: [
    IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED,
    IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS,
    IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.FOUNDATION_ONLY]: [
    IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED,
    IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS,
    IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE]: [
    IdeaLifecycleState.SAFE_TO_IMPLEMENT,
    IdeaLifecycleState.SAFE_WITH_SAFEGUARDS,
    IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED,
    IdeaLifecycleState.PARKED,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.PARKED]: [
    IdeaLifecycleState.SAFE_TO_IMPLEMENT,
    IdeaLifecycleState.SAFE_WITH_SAFEGUARDS,
    IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED]: [
    IdeaLifecycleState.READY_FOR_IMPLEMENTATION,
    IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS,
    IdeaLifecycleState.BLOCKED,
    IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE,
  ],
  [IdeaLifecycleState.READY_FOR_IMPLEMENTATION]: [
    IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS,
    IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED,
    IdeaLifecycleState.BLOCKED,
  ],
  [IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS]: [
    IdeaLifecycleState.IMPLEMENTED,
    IdeaLifecycleState.BLOCKED,
    IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED,
  ],
  [IdeaLifecycleState.IMPLEMENTED]: [],
  [IdeaLifecycleState.BLOCKED]: [
    IdeaLifecycleState.READY_FOR_IMPLEMENTATION,
    IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED,
    IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE,
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.REJECTED]: [
    IdeaLifecycleState.ARCHIVED,
  ],
  [IdeaLifecycleState.ARCHIVED]: [],
  [IdeaLifecycleState.DELETED]: [],
  [IdeaLifecycleState.SUPERSEDED]: [],
};

/** Terminal (non-reversible) states */
const TERMINAL_STATES = new Set<IdeaLifecycleState>([
  IdeaLifecycleState.ARCHIVED,
  IdeaLifecycleState.DELETED,
  IdeaLifecycleState.IMPLEMENTED,
  IdeaLifecycleState.SUPERSEDED,
]);

/** Protected states that should not return to active implementation */
const PROTECTED_STATES = new Set<IdeaLifecycleState>([
  IdeaLifecycleState.REJECTED,
  IdeaLifecycleState.ARCHIVED,
  IdeaLifecycleState.DELETED,
  IdeaLifecycleState.SUPERSEDED,
]);

export interface LifecycleTransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validate if transition is allowed
 * @param fromState Current lifecycle state
 * @param toState Target lifecycle state
 * @returns Validation result with reason if transition is denied
 */
export function isTransitionAllowed(
  fromState: IdeaLifecycleState,
  toState: IdeaLifecycleState,
): LifecycleTransitionResult {
  // Unknown states deny
  if (!Object.values(IdeaLifecycleState).includes(fromState)) {
    return { allowed: false, reason: `Unknown current state: ${fromState}` };
  }
  if (!Object.values(IdeaLifecycleState).includes(toState)) {
    return { allowed: false, reason: `Unknown target state: ${toState}` };
  }

  // Same state is allowed (idempotent)
  if (fromState === toState) {
    return { allowed: true };
  }

  // Check against allowed transitions
  const allowedTargets = ALLOWED_TRANSITIONS[fromState];
  if (!allowedTargets.includes(toState)) {
    return {
      allowed: false,
      reason: `Transition from ${fromState} to ${toState} is not allowed`,
    };
  }

  // Protected states should not return to active implementation
  if (
    PROTECTED_STATES.has(fromState) &&
    !PROTECTED_STATES.has(toState)
  ) {
    return {
      allowed: false,
      reason: `Cannot exit protected state ${fromState} to ${toState}`,
    };
  }

  return { allowed: true };
}

/**
 * Validate if state is terminal
 * @param state Lifecycle state to check
 * @returns True if state is terminal
 */
export function isTerminalState(state: IdeaLifecycleState): boolean {
  return TERMINAL_STATES.has(state);
}

/**
 * Validate if state is protected
 * @param state Lifecycle state to check
 * @returns True if state is protected
 */
export function isProtectedState(state: IdeaLifecycleState): boolean {
  return PROTECTED_STATES.has(state);
}

/**
 * Get allowed transitions from a state
 * @param state Current lifecycle state
 * @returns Array of allowed target states
 */
export function getAllowedTransitions(state: IdeaLifecycleState): readonly IdeaLifecycleState[] {
  return ALLOWED_TRANSITIONS[state] || [];
}
