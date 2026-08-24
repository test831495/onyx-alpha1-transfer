/**
 * Idea Deletion, Archival, and History
 *
 * Soft deletion, restoration, governed permanent deletion.
 * Deletion removes governed content references and derived retrieval entries.
 * Preserves minimum mandatory tombstone and audit evidence.
 * No private deleted content in tombstone.
 * Detailed Idea history remains Rahul-only.
 */

import type {
  IdeaDeletionTombstone,
  IdeaId,
  IdeaRecord,
  AccountId,
} from "./idea-model.js";
import { createAccountId } from "./idea-model.js";
import { IdeaDeletionState } from "./idea-model.js";

export interface DeletionRequest {
  readonly ideaId: IdeaId;
  readonly requestedBy: string;
  readonly reason: string;
  readonly requiresAuditPreservation: boolean;
  readonly timestamp: Date;
}

export interface DeletionValidationContext {
  readonly ownerAuthorityConfirmed: boolean;
  readonly auditAvailable: boolean;
  readonly otherAccountsDoNotOwnIdea: boolean;
  readonly noActiveDependencies: boolean;
  readonly noActiveImplementation: boolean;
}

/**
 * Validate if idea can be permanently deleted
 * @param context Deletion validation context
 * @returns True if deletion is permitted
 */
export function canPermanentlyDelete(context: DeletionValidationContext): boolean {
  return (
    context.ownerAuthorityConfirmed &&
    context.auditAvailable &&
    context.otherAccountsDoNotOwnIdea &&
    context.noActiveDependencies &&
    context.noActiveImplementation
  );
}

/**
 * Get reasons permanent deletion is blocked
 * @param context Deletion validation context
 * @returns Array of blocking reasons
 */
export function getPermanentDeletionBlockers(context: DeletionValidationContext): readonly string[] {
  const blockers: string[] = [];

  if (!context.ownerAuthorityConfirmed) {
    blockers.push("Owner authority not confirmed");
  }

  if (!context.auditAvailable) {
    blockers.push("Audit system is unavailable - deletion blocked for compliance");
  }

  if (!context.otherAccountsDoNotOwnIdea) {
    blockers.push("Other accounts may have contributed to this idea");
  }

  if (!context.noActiveDependencies) {
    blockers.push("Other ideas depend on this idea");
  }

  if (!context.noActiveImplementation) {
    blockers.push("Implementation is currently in progress");
  }

  return blockers;
}

/**
 * Create deletion tombstone
 * @param ideaId Idea ID being deleted
 * @param deleteReason Reason for deletion
 * @param deletedByAccountId Account ID requesting deletion
 * @param minimumAuditEventsToPreserve Minimum audit events required
 * @param shouldCreateSanitizedSummary Whether sanitized summary exists
 * @returns Deletion tombstone record
 */
export function createDeletionTombstone(
  ideaId: IdeaId,
  deleteReason: string,
  deletedByAccountId: string,
  minimumAuditEventsToPreserve: readonly string[],
  shouldCreateSanitizedSummary: boolean,
): IdeaDeletionTombstone {
  return {
    tombstoneId: `tomb_${ideaId}_${Date.now()}`,
    ideaId,
    deletedAt: new Date(),
    deleteReason,
    deletedByAccountId: createAccountId(deletedByAccountId),
    requiresAuditPreservation: true,
    sanitizedSummaryReference: shouldCreateSanitizedSummary ? `summary_${ideaId}` : undefined,
    minimumAuditEvents: [...minimumAuditEventsToPreserve],
  };
}

/**
 * Permanent deletion steps that must be followed
 * @param ideaId Idea ID to delete
 * @returns Steps to perform deletion
 */
export function getPermanentDeletionSteps(ideaId: IdeaId): readonly string[] {
  return [
    "1. Verify owner authority and audit availability",
    "2. Create deletion tombstone with minimum mandatory fields",
    "3. Preserve minimum mandatory audit events",
    "4. Remove governed resource references",
    "5. Remove derived retrieval index entries",
    "6. Exclude deleted private content from tombstone",
    "7. Record deletion event with evidence reference",
    "8. Verify deletion completion",
    "9. Confirm no private deleted content remains accessible",
  ];
}

/**
 * Soft deletion steps
 * @param ideaId Idea ID to soft-delete
 * @returns Steps to perform soft deletion
 */
export function getSoftDeletionSteps(ideaId: IdeaId): readonly string[] {
  return [
    "1. Mark idea deletion state as SOFT_DELETED",
    "2. Hide from active listings",
    "3. Remove from search indexes",
    "4. Preserve all data and history",
    "5. Allow restoration by owner",
    "6. Record soft deletion audit event",
  ];
}

/**
 * Restoration steps after soft deletion
 * @param ideaId Idea ID to restore
 * @returns Steps to perform restoration
 */
export function getRestorationSteps(ideaId: IdeaId): readonly string[] {
  return [
    "1. Verify owner authority",
    "2. Mark deletion state as ACTIVE",
    "3. Restore to previous lifecycle state or DRAFT",
    "4. Restore to search indexes",
    "5. Add to active listings",
    "6. Record restoration audit event",
  ];
}

/**
 * Minimum content that must be preserved in tombstone
 * @returns Array of required tombstone fields
 */
export function getMinimumTombstoneContent(): readonly string[] {
  return [
    "idea_id",
    "deleted_at",
    "delete_reason",
    "deleted_by_account_id",
    "audit_requirement_flag",
  ];
}

/**
 * Content that must NEVER be in tombstone
 * @returns Array of prohibited tombstone fields
 */
export function getProhibitedTombstoneContent(): readonly string[] {
  return [
    "raw_idea_text",
    "private_attachments",
    "private_voice_notes",
    "complete_attachment_content",
    "complete_voice_note_content",
    "connector_access_tokens",
    "private_conversation_data",
    "other_account_private_memory",
    "secrets",
    "credentials",
    "tokens",
  ];
}

/**
 * Verify no private content in tombstone
 * @param tombstone Tombstone to verify
 * @returns True if tombstone contains no private content
 */
export function verifyTombstonePrivacy(tombstone: IdeaDeletionTombstone): boolean {
  const content = JSON.stringify(tombstone).toLowerCase();
  const prohibitedTerms = [
    "attachment_content",
    "voice_note_content",
    "access_token",
    "credential",
    "password",
    "secret",
  ];

  for (const term of prohibitedTerms) {
    if (content.includes(term)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if idea is in a deletable state
 * @param deletionState Current deletion state
 * @returns True if idea can be deleted
 */
export function isInDeletableState(deletionState: IdeaDeletionState): boolean {
  return deletionState === IdeaDeletionState.ACTIVE || deletionState === IdeaDeletionState.SOFT_DELETED;
}

/**
 * Check if deletion is terminal
 * @param deletionState Current deletion state
 * @returns True if deletion cannot be reversed
 */
export function isDeletionTerminal(deletionState: IdeaDeletionState): boolean {
  return deletionState === IdeaDeletionState.PERMANENTLY_DELETED;
}
