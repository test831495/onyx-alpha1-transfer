export type EvidenceSequenceDecision =
  | "SEQUENCE_VALID"
  | "SEQUENCE_INVALID"
  | "DUPLICATE_COMPATIBLE"
  | "CONFLICTING_ARTIFACT"
  | "REQUIRES_RECONCILIATION"
  | "PROHIBITED";

export interface EvidenceSequenceValidationResult {
  valid: boolean;
  denialReasons: readonly string[];
  decision: EvidenceSequenceDecision;
  contractVersion: string;
}

export interface SequentialEvidenceEvent {
  evidenceEventId: string;
  schedulerRunId: string;
  workflowId: string;
  logicalSequence: number;
  causalParentEventIds: readonly string[];
}

export function validateEvidenceSequence(events: readonly SequentialEvidenceEvent[], contractVersion = "1.0.0"): EvidenceSequenceValidationResult {
  const denialReasons: string[] = [];
  const eventMap = new Map<string, SequentialEvidenceEvent>();
  const parentMap = new Map<string, readonly string[]>();

  for (const event of events) {
    if (!event.evidenceEventId) denialReasons.push("missing-event-id");
    if (event.logicalSequence < 0) denialReasons.push("negative-sequence");
    if (eventMap.has(event.evidenceEventId)) denialReasons.push(`duplicate-event-id:${event.evidenceEventId}`);
    eventMap.set(event.evidenceEventId, event);
    parentMap.set(event.evidenceEventId, event.causalParentEventIds);
  }

  for (const event of events) {
    for (const parentId of event.causalParentEventIds) {
      if (!eventMap.has(parentId)) denialReasons.push(`unknown-parent:${parentId}`);
      const parent = eventMap.get(parentId);
      if (parent && parent.workflowId !== event.workflowId) denialReasons.push(`unauthorized-cross-workflow-parent:${parentId}`);
    }
  }

  const sequenceDuplicates = new Map<number, number>();
  for (const event of events) {
    sequenceDuplicates.set(event.logicalSequence, (sequenceDuplicates.get(event.logicalSequence) ?? 0) + 1);
  }
  for (const [sequence, count] of sequenceDuplicates.entries()) {
    if (count > 1) denialReasons.push(`duplicate-sequence:${sequence}`);
  }

  for (let index = 1; index < events.length; index += 1) {
    const current = events[index];
    const previous = events[index - 1];
    if (current && previous && current.logicalSequence < previous.logicalSequence) denialReasons.push("non-monotonic-sequence");
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (eventId: string): void => {
    if (visiting.has(eventId)) {
      denialReasons.push(`causal-cycle:${eventId}`);
      return;
    }
    if (visited.has(eventId)) return;
    const event = eventMap.get(eventId);
    if (!event) {
      denialReasons.push(`unknown-parent:${eventId}`);
      return;
    }
    visiting.add(eventId);
    for (const parentId of parentMap.get(eventId) ?? []) {
      if (!eventMap.has(parentId)) {
        denialReasons.push(`unknown-parent:${parentId}`);
        continue;
      }
      visit(parentId);
    }
    visiting.delete(eventId);
    visited.add(eventId);
  };

  for (const eventId of eventMap.keys()) visit(eventId);

  return {
    valid: denialReasons.length === 0,
    denialReasons,
    decision: denialReasons.length === 0 ? "SEQUENCE_VALID" : "REQUIRES_RECONCILIATION",
    contractVersion,
  };
}
