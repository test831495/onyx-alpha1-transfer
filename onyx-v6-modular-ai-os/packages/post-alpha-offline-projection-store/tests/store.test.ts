import { describe, expect, it } from "vitest";
import {
  JOURNAL_MIGRATION_VERSION,
  accountIsolationCheck,
  appendEvent,
  compact,
  quarantineStaleDevice,
  reconcileOnReconnect,
  replay,
  verifySnapshot,
} from "../src/index";

const event = (sequence: number, value: string, extra: Record<string, unknown> = {}) => ({
  accountId: "a",
  deviceId: "d",
  sequence,
  kind: "STATE",
  value,
  ...extra,
});

describe("offline projection journal", () => {
  it("replays idempotently and rejects account mismatches", () => {
    const events = appendEvent([], { accountId: "a", deviceId: "d", sequence: 1, kind: "STATE", value: "THINKING" });
    expect(replay(events.concat(events), "a", "d").state).toBe("THINKING");
    expect(replay(events, "b", "d").status).toBe("REJECTED");
  });
  it("compacts only a valid bounded journal", () => {
    const events = appendEvent([], { accountId: "a", deviceId: "d", sequence: 1, kind: "STATE", value: "IDLE" });
    expect(compact(events).cursor).toBe(1);
  });
});

describe("T2-OFFLINE-001 replay determinism", () => {
  it("T2-OFFLINE-001-POS: applies ordered events and reports a non-authoritative result", () => {
    const journal = [event(2, "SPEAKING"), event(1, "THINKING")];
    const result = replay(journal, "a", "d");
    expect(result).toMatchObject({ status: "OK", state: "SPEAKING", cursor: 2, appliedCount: 2, authoritative: false });
  });

  it("T2-OFFLINE-001-NEG: duplicates, gaps, corruption, and isolation failures fail closed", () => {
    const journal = [event(1, "THINKING")];
    expect(replay([...journal, ...journal], "a", "d").duplicatesIgnored).toBe(1);
    expect(replay(journal, "a", "other").status).toBe("REJECTED");
    expect(replay([{ bogus: true }], "a", "d").status).toBe("CORRUPT");
    expect(replay([], "a", "d").status).toBe("EMPTY");
    expect(replay([event(1, "THINKING"), event(2, "X", { tombstone: true })], "a", "d").state).toBe("UNKNOWN");
    expect(replay([event(1, "THINKING"), event(2, "X", { revoked: true })], "a", "d").state).toBe("UNKNOWN");
  });

  it("rejects privileged and over-bound appends", () => {
    expect(appendEvent([], event(1, "X", { privileged: true })).length).toBe(0);
    expect(appendEvent([], { nope: true }).length).toBe(0);
    expect(appendEvent([], event(-1, "X")).length).toBe(0);
    let journal: readonly unknown[] = [];
    for (let index = 1; index <= 70; index += 1) journal = appendEvent(journal, event(index, "S"));
    expect(journal.length).toBe(64);
  });
});

describe("T2-OFFLINE-002 compaction and integrity", () => {
  it("T2-OFFLINE-002-POS: compaction removes duplicates and keeps the highest cursor", () => {
    const journal = [event(1, "A"), event(1, "A"), event(3, "B")];
    const compacted = compact(journal);
    expect(compacted.cursor).toBe(3);
    expect(compacted.events.length).toBe(2);
    expect(compacted.compactedCount).toBe(1);
  });

  it("T2-OFFLINE-002-NEG: corrupt snapshots and migration drift are unusable", () => {
    expect(verifySnapshot({ migrationVersion: JOURNAL_MIGRATION_VERSION, integrityHash: "h" }, "h").usable).toBe(true);
    expect(verifySnapshot({ migrationVersion: JOURNAL_MIGRATION_VERSION, integrityHash: "bad" }, "h").reason).toBe("INTEGRITY_MISMATCH");
    expect(verifySnapshot({ migrationVersion: 99, integrityHash: "h" }, "h").reason).toBe("MIGRATION_MISMATCH");
    expect(verifySnapshot(null, "h").reason).toBe("MALFORMED");
    expect(compact("nope" as unknown as unknown[]).cursor).toBe(0);
  });
});

describe("T2-OFFLINE-003 reconnect never grants authority", () => {
  it("T2-OFFLINE-003-POS: revalidated reconnect adopts the authoritative cursor", () => {
    const result = reconcileOnReconnect([event(1, "A")], { revalidated: true, authoritativeCursor: 7 });
    expect(result).toMatchObject({ accepted: 1, cursor: 7, requiresRevalidation: false, authorityGranted: false });
  });

  it("T2-OFFLINE-003-NEG: privileged queues are dropped and unvalidated reconnects accept nothing", () => {
    const queued = [event(1, "A"), { ...event(2, "APPROVE"), privileged: true }];
    const result = reconcileOnReconnect(queued, { revalidated: true, authoritativeCursor: 2 });
    expect(result.droppedPrivileged).toBe(1);
    expect(result.accepted).toBe(1);

    const unvalidated = reconcileOnReconnect(queued, { revalidated: false, authoritativeCursor: 2 });
    expect(unvalidated.accepted).toBe(0);
    expect(unvalidated.requiresRevalidation).toBe(true);
  });

  it("quarantines stale and revoked devices and enforces account isolation", () => {
    expect(quarantineStaleDevice(5, 9, false).quarantined).toBe(false);
    expect(quarantineStaleDevice(12, 9, false).reason).toBe("IMPOSSIBLE_CURSOR");
    expect(quarantineStaleDevice(1, 9, true).reason).toBe("REVOKED");
    expect(accountIsolationCheck([event(1, "A")], "a")).toBe(true);
    expect(accountIsolationCheck([{ ...event(1, "A"), accountId: "b" }], "a")).toBe(false);
  });
});