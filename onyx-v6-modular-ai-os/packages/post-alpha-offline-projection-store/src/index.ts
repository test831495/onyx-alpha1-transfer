/**
 * LANE_D offline snapshot and event journal.
 * A rebuildable local projection cache. It is never an authority source.
 */

import {
  MAX_COLLECTION_SIZE,
  MAX_SEQUENCE,
  deepFreeze,
  isBoundedString,
  isPlainObject,
} from "../../post-alpha-visible-presence-integration-contracts/src/index";

export const JOURNAL_MIGRATION_VERSION = 1;

export type JournalEvent = Readonly<{
  accountId: string;
  deviceId: string;
  sequence: number;
  kind: string;
  value: string;
  tombstone?: boolean;
  revoked?: boolean;
  privileged?: boolean;
  migrationVersion?: number;
}>;

export type ReplayStatus = "OK" | "REJECTED" | "EMPTY" | "CORRUPT" | "QUARANTINED";

export type ReplayResult = Readonly<{
  status: ReplayStatus;
  state: string;
  cursor: number;
  appliedCount: number;
  duplicatesIgnored: number;
  authoritative: false;
}>;

function isEvent(value: unknown): value is JournalEvent {
  if (!isPlainObject(value)) return false;
  const sequence = value["sequence"];
  return (
    isBoundedString(value["accountId"]) &&
    isBoundedString(value["deviceId"]) &&
    isBoundedString(value["kind"]) &&
    typeof value["value"] === "string" &&
    typeof sequence === "number" &&
    Number.isInteger(sequence) &&
    sequence > 0 &&
    sequence <= MAX_SEQUENCE
  );
}

/** Append-only. A privileged event is never accepted from an offline journal. */
export function appendEvent(journal: readonly unknown[], event: unknown): readonly JournalEvent[] {
  const existing = Array.isArray(journal) ? journal.filter(isEvent) : [];
  if (!isEvent(event)) return deepFreeze([...existing]);
  if (event.privileged === true) return deepFreeze([...existing]);
  if (existing.length >= MAX_COLLECTION_SIZE) return deepFreeze([...existing]);
  return deepFreeze([...existing, { ...event }]);
}

/**
 * Deterministic replay bound to one account and device. Duplicate sequences are
 * ignored rather than reapplied, and tombstones/revocations always win.
 */
export function replay(journal: readonly unknown[], accountId: string, deviceId: string): ReplayResult {
  const empty: ReplayResult = deepFreeze({
    status: "EMPTY",
    state: "UNKNOWN",
    cursor: 0,
    appliedCount: 0,
    duplicatesIgnored: 0,
    authoritative: false as const,
  });

  if (!Array.isArray(journal) || journal.length === 0) return empty;
  if (!journal.every(isEvent)) {
    return deepFreeze({ ...empty, status: "CORRUPT", state: "UNKNOWN" });
  }

  const events = journal as readonly JournalEvent[];
  const mismatched = events.some((event) => event.accountId !== accountId || event.deviceId !== deviceId);
  if (mismatched) {
    return deepFreeze({ ...empty, status: "REJECTED", state: "UNKNOWN" });
  }

  const seen = new Set<number>();
  let duplicatesIgnored = 0;
  let cursor = 0;
  let state = "UNKNOWN";
  let applied = 0;

  for (const event of [...events].sort((a, b) => a.sequence - b.sequence)) {
    if (seen.has(event.sequence)) {
      duplicatesIgnored += 1;
      continue;
    }
    seen.add(event.sequence);

    if (event.tombstone === true || event.revoked === true) {
      state = "UNKNOWN";
      cursor = Math.max(cursor, event.sequence);
      applied += 1;
      continue;
    }

    state = event.value;
    cursor = Math.max(cursor, event.sequence);
    applied += 1;
  }

  return deepFreeze({
    status: "OK",
    state,
    cursor,
    appliedCount: applied,
    duplicatesIgnored,
    authoritative: false as const,
  });
}

export function compact(journal: readonly unknown[]): Readonly<{
  cursor: number;
  events: readonly JournalEvent[];
  compactedCount: number;
}> {
  const events = (Array.isArray(journal) ? journal : []).filter(isEvent);
  const bySequence = new Map<number, JournalEvent>();
  for (const event of events) bySequence.set(event.sequence, event);
  const retained = [...bySequence.values()].sort((a, b) => a.sequence - b.sequence);
  const cursor = retained.reduce((max, event) => Math.max(max, event.sequence), 0);
  return deepFreeze({ cursor, events: retained, compactedCount: events.length - retained.length });
}

export function verifySnapshot(snapshot: unknown, expectedHash: string): Readonly<{
  valid: boolean;
  reason: string;
  usable: boolean;
}> {
  if (!isPlainObject(snapshot)) return deepFreeze({ valid: false, reason: "MALFORMED", usable: false });
  if (snapshot["migrationVersion"] !== JOURNAL_MIGRATION_VERSION) {
    return deepFreeze({ valid: false, reason: "MIGRATION_MISMATCH", usable: false });
  }
  if (snapshot["integrityHash"] !== expectedHash) {
    return deepFreeze({ valid: false, reason: "INTEGRITY_MISMATCH", usable: false });
  }
  return deepFreeze({ valid: true, reason: "OK", usable: true });
}

/** A device that has been revoked or superseded may not resurrect its cached state. */
export function quarantineStaleDevice(
  deviceCursor: number,
  authoritativeCursor: number,
  revoked: boolean,
): Readonly<{ quarantined: boolean; reason: string }> {
  if (revoked) return deepFreeze({ quarantined: true, reason: "REVOKED" });
  if (deviceCursor > authoritativeCursor) return deepFreeze({ quarantined: true, reason: "IMPOSSIBLE_CURSOR" });
  return deepFreeze({ quarantined: false, reason: "OK" });
}

/**
 * Reconnect never promotes queued local work. Privileged operations are dropped and
 * must be revalidated against server-authoritative facts.
 */
export function reconcileOnReconnect(
  queued: readonly unknown[],
  serverFacts: Readonly<{ revalidated: boolean; authoritativeCursor: number }>,
): Readonly<{
  accepted: number;
  droppedPrivileged: number;
  requiresRevalidation: boolean;
  cursor: number;
  authorityGranted: false;
}> {
  const events = (Array.isArray(queued) ? queued : []).filter(isEvent);
  const privileged = events.filter((event) => event.privileged === true).length;
  const accepted = serverFacts.revalidated ? events.length - privileged : 0;
  return deepFreeze({
    accepted,
    droppedPrivileged: privileged,
    requiresRevalidation: !serverFacts.revalidated,
    cursor: serverFacts.authoritativeCursor,
    authorityGranted: false as const,
  });
}

export function accountIsolationCheck(journal: readonly unknown[], accountId: string): boolean {
  return (Array.isArray(journal) ? journal : []).filter(isEvent).every((event) => event.accountId === accountId);
}
