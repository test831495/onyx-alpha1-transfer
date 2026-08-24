/**
 * Idea Audit Events
 *
 * Complete audit event types and sensitive content exclusion.
 * Audit unavailability denies protected decisions and readiness creation.
 */

import type { IdeaAuditEvent } from "./idea-model.js";
import { IdeaAuditEventType } from "./idea-model.js";

export interface AuditEventMetadata {
  readonly eventType: IdeaAuditEventType;
  readonly friendlyDescription: string;
  readonly requiresAuditAvailability: boolean;
  readonly requiresOwnerAuthority: boolean;
  readonly isPolicyChanging: boolean;
  readonly affectsSecurity: boolean;
}

export const AUDIT_EVENT_METADATA: Record<IdeaAuditEventType, AuditEventMetadata> = {
  [IdeaAuditEventType.IDEA_DRAFT_CREATED]: {
    eventType: IdeaAuditEventType.IDEA_DRAFT_CREATED,
    friendlyDescription: "Draft idea created",
    requiresAuditAvailability: false,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_DRAFT_UPDATED]: {
    eventType: IdeaAuditEventType.IDEA_DRAFT_UPDATED,
    friendlyDescription: "Draft idea updated",
    requiresAuditAvailability: false,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_VERSION_CREATED]: {
    eventType: IdeaAuditEventType.IDEA_VERSION_CREATED,
    friendlyDescription: "New idea version created",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_SUBMITTED]: {
    eventType: IdeaAuditEventType.IDEA_SUBMITTED,
    friendlyDescription: "Idea submitted for review",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_ASSESSMENT_STARTED]: {
    eventType: IdeaAuditEventType.IDEA_ASSESSMENT_STARTED,
    friendlyDescription: "Assessment process started",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_ASSESSMENT_COMPLETED]: {
    eventType: IdeaAuditEventType.IDEA_ASSESSMENT_COMPLETED,
    friendlyDescription: "Assessment completed",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_OWNER_DECISION_REQUIRED]: {
    eventType: IdeaAuditEventType.IDEA_OWNER_DECISION_REQUIRED,
    friendlyDescription: "Owner decision needed on idea",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_APPROVED]: {
    eventType: IdeaAuditEventType.IDEA_APPROVED,
    friendlyDescription: "Idea approved for implementation",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: true,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_APPROVED_WITH_CONTROLS]: {
    eventType: IdeaAuditEventType.IDEA_APPROVED_WITH_CONTROLS,
    friendlyDescription: "Idea approved with safeguards required",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: true,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_FOUNDATION_ONLY]: {
    eventType: IdeaAuditEventType.IDEA_FOUNDATION_ONLY,
    friendlyDescription: "Only foundation work approved",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: true,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_DEFERRED]: {
    eventType: IdeaAuditEventType.IDEA_DEFERRED,
    friendlyDescription: "Idea deferred to future phase",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: true,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_PARKED]: {
    eventType: IdeaAuditEventType.IDEA_PARKED,
    friendlyDescription: "Idea parked for future consideration",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: true,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_REJECTED]: {
    eventType: IdeaAuditEventType.IDEA_REJECTED,
    friendlyDescription: "Idea rejected and not approved",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: true,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_ARCHIVED]: {
    eventType: IdeaAuditEventType.IDEA_ARCHIVED,
    friendlyDescription: "Idea archived",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_DELETE_REQUESTED]: {
    eventType: IdeaAuditEventType.IDEA_DELETE_REQUESTED,
    friendlyDescription: "Deletion requested",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_SOFT_DELETED]: {
    eventType: IdeaAuditEventType.IDEA_SOFT_DELETED,
    friendlyDescription: "Idea soft deleted (can be restored)",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_RESTORED]: {
    eventType: IdeaAuditEventType.IDEA_RESTORED,
    friendlyDescription: "Soft-deleted idea restored",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_PERMANENTLY_DELETED]: {
    eventType: IdeaAuditEventType.IDEA_PERMANENTLY_DELETED,
    friendlyDescription: "Idea permanently deleted",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_REASSESSMENT_TRIGGERED]: {
    eventType: IdeaAuditEventType.IDEA_REASSESSMENT_TRIGGERED,
    friendlyDescription: "Reassessment triggered by material change",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_PREFLIGHT_REQUESTED]: {
    eventType: IdeaAuditEventType.IDEA_PREFLIGHT_REQUESTED,
    friendlyDescription: "Implementation preflight requested",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_PREFLIGHT_STARTED]: {
    eventType: IdeaAuditEventType.IDEA_PREFLIGHT_STARTED,
    friendlyDescription: "Preflight validation started",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_PREFLIGHT_COMPLETED]: {
    eventType: IdeaAuditEventType.IDEA_PREFLIGHT_COMPLETED,
    friendlyDescription: "Preflight validation completed",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_PREFLIGHT_PASSED]: {
    eventType: IdeaAuditEventType.IDEA_PREFLIGHT_PASSED,
    friendlyDescription: "Preflight passed - ready for implementation",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_PREFLIGHT_PASSED_WITH_CONTROLS]: {
    eventType: IdeaAuditEventType.IDEA_PREFLIGHT_PASSED_WITH_CONTROLS,
    friendlyDescription: "Preflight passed with safeguards required",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_PREFLIGHT_BLOCKED]: {
    eventType: IdeaAuditEventType.IDEA_PREFLIGHT_BLOCKED,
    friendlyDescription: "Preflight blocked - implementation cannot proceed",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_PREFLIGHT_INVALIDATED]: {
    eventType: IdeaAuditEventType.IDEA_PREFLIGHT_INVALIDATED,
    friendlyDescription: "Prior preflight has been invalidated",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_PREFLIGHT_EXPIRED]: {
    eventType: IdeaAuditEventType.IDEA_PREFLIGHT_EXPIRED,
    friendlyDescription: "Preflight has expired",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_IMPLEMENTATION_PLAN_REQUESTED]: {
    eventType: IdeaAuditEventType.IDEA_IMPLEMENTATION_PLAN_REQUESTED,
    friendlyDescription: "Implementation plan requested",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_IMPLEMENTATION_STARTED]: {
    eventType: IdeaAuditEventType.IDEA_IMPLEMENTATION_STARTED,
    friendlyDescription: "Implementation work started",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_IMPLEMENTATION_SCOPE_CHANGED]: {
    eventType: IdeaAuditEventType.IDEA_IMPLEMENTATION_SCOPE_CHANGED,
    friendlyDescription: "Implementation scope changed during work",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: true,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_IMPLEMENTATION_REVALIDATION_REQUIRED]: {
    eventType: IdeaAuditEventType.IDEA_IMPLEMENTATION_REVALIDATION_REQUIRED,
    friendlyDescription: "Revalidation required during implementation",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: true,
  },
  [IdeaAuditEventType.IDEA_IMPLEMENTED]: {
    eventType: IdeaAuditEventType.IDEA_IMPLEMENTED,
    friendlyDescription: "Idea successfully implemented",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: false,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
  [IdeaAuditEventType.IDEA_SUPERSEDED]: {
    eventType: IdeaAuditEventType.IDEA_SUPERSEDED,
    friendlyDescription: "Idea superseded by another",
    requiresAuditAvailability: true,
    requiresOwnerAuthority: true,
    isPolicyChanging: false,
    affectsSecurity: false,
  },
};

/**
 * Check if audit event requires audit system availability
 * @param eventType Type of event
 * @returns True if audit availability is required
 */
export function auditAvailabilityRequired(eventType: IdeaAuditEventType): boolean {
  return AUDIT_EVENT_METADATA[eventType].requiresAuditAvailability;
}

/**
 * Check if audit event requires owner authority
 * @param eventType Type of event
 * @returns True if owner authority is required
 */
export function ownerAuthorityRequired(eventType: IdeaAuditEventType): boolean {
  return AUDIT_EVENT_METADATA[eventType].requiresOwnerAuthority;
}

/**
 * Get all event types that require audit availability
 * @returns Array of event types
 */
export function getEventsRequiringAuditAvailability(): readonly IdeaAuditEventType[] {
  return Object.keys(AUDIT_EVENT_METADATA)
    .filter((eventType) => AUDIT_EVENT_METADATA[eventType as IdeaAuditEventType].requiresAuditAvailability)
    .map((eventType) => eventType as IdeaAuditEventType);
}

/**
 * Get all event types that are security-affecting
 * @returns Array of event types
 */
export function getSecurityAffectingEvents(): readonly IdeaAuditEventType[] {
  return Object.keys(AUDIT_EVENT_METADATA)
    .filter((eventType) => AUDIT_EVENT_METADATA[eventType as IdeaAuditEventType].affectsSecurity)
    .map((eventType) => eventType as IdeaAuditEventType);
}

/**
 * Verify audit event contains no sensitive content
 * @param event Audit event to verify
 * @returns True if event contains no secrets or credentials
 */
export function verifyAuditEventSensitivity(event: IdeaAuditEvent): boolean {
  const content = JSON.stringify(event).toLowerCase();
  const sensitiveTerms = [
    "password",
    "token",
    "credential",
    "secret",
    "key",
    "api_key",
    "access_token",
    "private_key",
  ];

  for (const term of sensitiveTerms) {
    if (content.includes(term)) {
      return false;
    }
  }

  return true;
}
