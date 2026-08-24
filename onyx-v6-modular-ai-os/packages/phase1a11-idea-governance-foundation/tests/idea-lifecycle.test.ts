/**
 * Idea Lifecycle Tests
 *
 * Tests for lifecycle state transitions, allowed transitions, and terminal/protected states
 */

import { describe, it, expect } from "vitest";
import {
  IdeaLifecycleState,
  LIFECYCLE_LABELS,
  isTransitionAllowed,
  getAllowedTransitions,
  isTerminalState,
  isProtectedState,
} from "../src/index.js";

describe("Idea Lifecycle Transitions", () => {
  describe("Draft transitions", () => {
    it("should allow DRAFT -> READY_FOR_REVIEW", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.DRAFT,
        IdeaLifecycleState.READY_FOR_REVIEW,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow DRAFT -> DELETED", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.DRAFT,
        IdeaLifecycleState.DELETED,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow DRAFT -> ARCHIVED", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.DRAFT,
        IdeaLifecycleState.ARCHIVED,
      );
      expect(result.allowed).toBe(true);
    });

    it("should deny DRAFT -> IMPLEMENTED", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.DRAFT,
        IdeaLifecycleState.IMPLEMENTED,
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe("Review workflow transitions", () => {
    it("should allow READY_FOR_REVIEW -> UNDER_REVIEW", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.READY_FOR_REVIEW,
        IdeaLifecycleState.UNDER_REVIEW,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow UNDER_REVIEW -> REVIEWED", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.UNDER_REVIEW,
        IdeaLifecycleState.REVIEWED,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow UNDER_REVIEW -> NEEDS_CLARIFICATION", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.UNDER_REVIEW,
        IdeaLifecycleState.NEEDS_CLARIFICATION,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("Approval transitions", () => {
    it("should allow REVIEWED -> SAFE_TO_IMPLEMENT", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.REVIEWED,
        IdeaLifecycleState.SAFE_TO_IMPLEMENT,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow REVIEWED -> SAFE_WITH_SAFEGUARDS", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.REVIEWED,
        IdeaLifecycleState.SAFE_WITH_SAFEGUARDS,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow REVIEWED -> REJECTED", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.REVIEWED,
        IdeaLifecycleState.REJECTED,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow REVIEWED -> DEFER_TO_ROADMAP", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.REVIEWED,
        IdeaLifecycleState.PLANNED_FOR_FUTURE_PHASE,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("Implementation workflow", () => {
    it("should allow SAFE_TO_IMPLEMENT -> IMPLEMENTATION_PREFLIGHT_REQUIRED", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.SAFE_TO_IMPLEMENT,
        IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow SAFE_TO_IMPLEMENT -> IMPLEMENTATION_IN_PROGRESS", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.SAFE_TO_IMPLEMENT,
        IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow IMPLEMENTATION_PREFLIGHT_REQUIRED -> READY_FOR_IMPLEMENTATION", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED,
        IdeaLifecycleState.READY_FOR_IMPLEMENTATION,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow READY_FOR_IMPLEMENTATION -> IMPLEMENTATION_IN_PROGRESS", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.READY_FOR_IMPLEMENTATION,
        IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow IMPLEMENTATION_IN_PROGRESS -> IMPLEMENTED", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS,
        IdeaLifecycleState.IMPLEMENTED,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("Blocked workflow", () => {
    it("should allow IMPLEMENTATION_IN_PROGRESS -> BLOCKED", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.IMPLEMENTATION_IN_PROGRESS,
        IdeaLifecycleState.BLOCKED,
      );
      expect(result.allowed).toBe(true);
    });

    it("should allow BLOCKED -> READY_FOR_IMPLEMENTATION", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.BLOCKED,
        IdeaLifecycleState.READY_FOR_IMPLEMENTATION,
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe("Protected transitions", () => {
    it("should deny REJECTED -> DRAFT", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.REJECTED,
        IdeaLifecycleState.DRAFT,
      );
      expect(result.allowed).toBe(false);
    });

    it("should allow REJECTED -> ARCHIVED", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.REJECTED,
        IdeaLifecycleState.ARCHIVED,
      );
      expect(result.allowed).toBe(true);
    });

    it("should deny ARCHIVED -> any active state", () => {
      expect(
        isTransitionAllowed(
          IdeaLifecycleState.ARCHIVED,
          IdeaLifecycleState.DRAFT,
        ).allowed,
      ).toBe(false);
      expect(
        isTransitionAllowed(
          IdeaLifecycleState.ARCHIVED,
          IdeaLifecycleState.UNDER_REVIEW,
        ).allowed,
      ).toBe(false);
    });
  });

  describe("Terminal states", () => {
    it("should identify ARCHIVED as terminal", () => {
      expect(isTerminalState(IdeaLifecycleState.ARCHIVED)).toBe(true);
    });

    it("should identify DELETED as terminal", () => {
      expect(isTerminalState(IdeaLifecycleState.DELETED)).toBe(true);
    });

    it("should identify IMPLEMENTED as terminal", () => {
      expect(isTerminalState(IdeaLifecycleState.IMPLEMENTED)).toBe(true);
    });

    it("should identify SUPERSEDED as terminal", () => {
      expect(isTerminalState(IdeaLifecycleState.SUPERSEDED)).toBe(true);
    });

    it("should have no outgoing transitions from terminal states", () => {
      const terminalStates = [
        IdeaLifecycleState.ARCHIVED,
        IdeaLifecycleState.DELETED,
        IdeaLifecycleState.IMPLEMENTED,
        IdeaLifecycleState.SUPERSEDED,
      ];

      terminalStates.forEach((state) => {
        const allowed = getAllowedTransitions(state);
        expect(allowed.length).toBe(0);
      });
    });
  });

  describe("Protected states", () => {
    it("should identify REJECTED as protected", () => {
      expect(isProtectedState(IdeaLifecycleState.REJECTED)).toBe(true);
    });

    it("should identify ARCHIVED as protected", () => {
      expect(isProtectedState(IdeaLifecycleState.ARCHIVED)).toBe(true);
    });

    it("should identify DELETED as protected", () => {
      expect(isProtectedState(IdeaLifecycleState.DELETED)).toBe(true);
    });

    it("should only allow protected-to-protected or protected-to-terminal transitions", () => {
      // REJECTED should only go to ARCHIVED (protected/terminal)
      const rejected = getAllowedTransitions(IdeaLifecycleState.REJECTED);
      expect(rejected).toEqual([IdeaLifecycleState.ARCHIVED]);
    });
  });

  describe("Friendly lifecycle labels", () => {
    it("should have friendly names for all states", () => {
      const states = Object.values(IdeaLifecycleState);
      states.forEach((state) => {
        expect(LIFECYCLE_LABELS[state]).toBeDefined();
        expect(LIFECYCLE_LABELS[state].friendlyName).toBeDefined();
        expect(LIFECYCLE_LABELS[state].explanation).toBeDefined();
      });
    });

    it("should have meaningful friendly names", () => {
      expect(LIFECYCLE_LABELS[IdeaLifecycleState.DRAFT].friendlyName).toMatch(/[A-Z]/);
      expect(LIFECYCLE_LABELS[IdeaLifecycleState.DRAFT].explanation.length).toBeGreaterThan(0);
    });
  });

  describe("Transition error messages", () => {
    it("should provide reason when transition is denied", () => {
      const result = isTransitionAllowed(
        IdeaLifecycleState.ARCHIVED,
        IdeaLifecycleState.DRAFT,
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toBeDefined();
    });
  });
});

describe("Acceptance assertion identifiers - lifecycle", () => {
  it("friendly_lifecycle_labels", () => {
    expect(LIFECYCLE_LABELS[IdeaLifecycleState.DRAFT].friendlyName).toBeTruthy();
  });

  it("twenty_lifecycle_states", () => {
    expect(Object.values(IdeaLifecycleState).length).toBe(20);
  });

  it("unknown_state_denies", () => {
    expect(isTransitionAllowed("UNKNOWN" as IdeaLifecycleState, IdeaLifecycleState.DRAFT).allowed).toBe(false);
  });

  it("allowed_transitions_pass", () => {
    expect(isTransitionAllowed(IdeaLifecycleState.DRAFT, IdeaLifecycleState.READY_FOR_REVIEW).allowed).toBe(true);
  });

  it("invalid_transitions_deny", () => {
    expect(isTransitionAllowed(IdeaLifecycleState.ARCHIVED, IdeaLifecycleState.DRAFT).allowed).toBe(false);
  });

  it("terminal_states_protected", () => {
    expect(isTerminalState(IdeaLifecycleState.ARCHIVED)).toBe(true);
  });

  it("protected_states_controlled", () => {
    expect(isProtectedState(IdeaLifecycleState.REJECTED)).toBe(true);
  });

  it("state_has_friendly_label", () => {
    expect(LIFECYCLE_LABELS[IdeaLifecycleState.REVIEWED].explanation.length).toBeGreaterThan(0);
  });

  it("draft_to_submission_flow", () => {
    expect(getAllowedTransitions(IdeaLifecycleState.DRAFT)).toContain(IdeaLifecycleState.READY_FOR_REVIEW);
  });

  it("preflight_requirement", () => {
    expect(getAllowedTransitions(IdeaLifecycleState.SAFE_TO_IMPLEMENT)).toContain(IdeaLifecycleState.IMPLEMENTATION_PREFLIGHT_REQUIRED);
  });
});
