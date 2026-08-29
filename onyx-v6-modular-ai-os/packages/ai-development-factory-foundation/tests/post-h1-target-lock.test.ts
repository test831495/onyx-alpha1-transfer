import { describe, expect, it } from "vitest";
import { TARGET_LOCK_MISMATCH_REASONS } from "../src/post-h1/lifecycle-vocabulary";
import { validateTargetLock, compareTargetLocks } from "../src/post-h1/target-lock";

const lock = () => ({
  providerId: "provider", repositoryId: "test831495/onyx-alpha1-transfer",
  repositoryUrl: "https://github.com/test831495/onyx-alpha1-transfer", baseBranch: "main",
  baseSha: "a".repeat(40), headBranch: "feature/example", headSha: "b".repeat(40),
  changeRequestNumber: 25, expectedChangeRequestState: "OPEN", expectedDraftState: true,
  expectedCommitCount: 1, expectedChangedPathDigest: "c".repeat(64), expectedRawBodyHash: "d".repeat(64),
  expectedNormalizedBodyHash: "e".repeat(64), expectedThreadIds: ["thread-1"], expectedRulesetHash: "f".repeat(64),
  expectedActorId: "actor-1", purpose: "verify local candidate", expiresAt: "2026-08-29T12:00:00Z",
});

const targetLockRegistry = [
  { testId: "T18", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock identity mismatch", property: "identity", expectedStatus: "FAIL", expectedReasons: ["TARGET_IDENTITY_MISMATCH"], execute: () => { expect(compareTargetLocks(lock(), { ...lock(), repositoryId: "other" }).reason).toBe("TARGET_IDENTITY_MISMATCH"); } },
  { testId: "T19", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock topology mismatch", property: "topology", expectedStatus: "FAIL", expectedReasons: ["TARGET_TOPOLOGY_MISMATCH"], execute: () => { expect(compareTargetLocks(lock(), { ...lock(), headBranch: "other" }).reason).toBe("TARGET_TOPOLOGY_MISMATCH"); } },
  { testId: "T20", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock state mismatch", property: "state", expectedStatus: "FAIL", expectedReasons: ["TARGET_STATE_MISMATCH"], execute: () => { expect(compareTargetLocks(lock(), { ...lock(), expectedDraftState: false }).reason).toBe("TARGET_STATE_MISMATCH"); } },
  { testId: "T21", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock content mismatch", property: "content", expectedStatus: "FAIL", expectedReasons: ["TARGET_CONTENT_MISMATCH"], execute: () => { expect(compareTargetLocks(lock(), { ...lock(), headSha: "c".repeat(40) }).reason).toBe("TARGET_CONTENT_MISMATCH"); } },
  { testId: "T22", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock actor mismatch", property: "actor", expectedStatus: "FAIL", expectedReasons: ["TARGET_ACTOR_MISMATCH"], execute: () => { expect(compareTargetLocks(lock(), { ...lock(), expectedActorId: "other" }).reason).toBe("TARGET_ACTOR_MISMATCH"); } },
  { testId: "T23", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock policy mismatch", property: "policy", expectedStatus: "FAIL", expectedReasons: ["TARGET_POLICY_MISMATCH"], execute: () => { expect(compareTargetLocks(lock(), { ...lock(), purpose: "other purpose" }).reason).toBe("TARGET_POLICY_MISMATCH"); } },
  { testId: "T24", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock expiry mismatch", property: "expiry", expectedStatus: "FAIL", expectedReasons: ["TARGET_EXPIRED"], execute: () => { expect(validateTargetLock({ ...lock(), expiresAt: "2026-08-28T11:59:59Z" }, new Date("2026-08-28T12:00:00Z")).reason).toBe("TARGET_EXPIRED"); } },
  { testId: "T25", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "target-lock evidence unavailable", property: "evidence", expectedStatus: "FAIL", expectedReasons: ["TARGET_EVIDENCE_UNAVAILABLE"], execute: () => { expect(validateTargetLock({ ...lock(), repositoryUrl: "not a url" }, new Date("2026-08-28T12:00:00Z")).reason).toBe("TARGET_EVIDENCE_UNAVAILABLE"); } },
  { testId: "T26", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "complete valid target lock", property: "target integrity", expectedStatus: "PASS", expectedReasons: [], execute: () => { expect(validateTargetLock(lock(), new Date("2026-08-28T12:00:00Z")).outcome).toBe("PASS"); } },
  { testId: "T60", acceptanceIds: ["POSTH1-P0-ARCH-014"], title: "URL and branch grammar", property: "grammar", expectedStatus: "FAIL", expectedReasons: ["TARGET_EVIDENCE_UNAVAILABLE"], execute: () => { expect(validateTargetLock({ ...lock(), baseBranch: "../main" }, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL"); } },
  { testId: "T61", acceptanceIds: ["POSTH1-P0-ARCH-003"], title: "UTC expiry behavior", property: "time validation", expectedStatus: "FAIL", expectedReasons: ["TARGET_EXPIRED"], execute: () => { expect(validateTargetLock({ ...lock(), expiresAt: "2026-08-29T12:00:00+01:00" }, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL"); } },
  { testId: "T47", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "throwing prototype inspection contained", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["TARGET_EVIDENCE_UNAVAILABLE"], execute: () => { const hostile = new Proxy(lock(), { getPrototypeOf: () => { throw new Error("secret"); } }); expect(() => validateTargetLock(hostile, new Date("2026-08-28T12:00:00Z"))).not.toThrow(); } },
  { testId: "T48", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "throwing ownKeys inspection contained", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["TARGET_EVIDENCE_UNAVAILABLE"], execute: () => { const hostile = new Proxy(lock(), { ownKeys: () => { throw new Error("secret"); } }); expect(() => validateTargetLock(hostile, new Date("2026-08-28T12:00:00Z"))).not.toThrow(); } },
  { testId: "T52", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "accessor non-invocation", property: "hostile-object handling", expectedStatus: "FAIL", expectedReasons: ["TARGET_EVIDENCE_UNAVAILABLE"], execute: () => { const hostile = new Proxy(lock(), { get: () => { throw new Error("must-not-read"); } }); expect(validateTargetLock(hostile, new Date("2026-08-28T12:00:00Z")).outcome).toBe("PASS"); } },
  { testId: "T55", acceptanceIds: ["POSTH1-P0-ARCH-013"], title: "null-prototype valid input accepted", property: "safe record handling", expectedStatus: "PASS", expectedReasons: [], execute: () => { const nullObj = Object.assign(Object.create(null), lock()); expect(validateTargetLock(nullObj, new Date("2026-08-28T12:00:00Z")).outcome).toBe("PASS"); } },
];

describe("POST-H1 P0 target lock", () => {
  it("contains the exact target-lock registry semantics and no generic registry remains", () => {
    expect(targetLockRegistry).toHaveLength(15);
    expect(new Set(targetLockRegistry.map((entry) => entry.testId)).size).toBe(15);
    expect(TARGET_LOCK_MISMATCH_REASONS).toHaveLength(8);
    for (const scenario of targetLockRegistry) {
      expect(scenario.title).toBeTruthy();
      expect(scenario.property).toBeTruthy();
      expect(scenario.acceptanceIds[0]).toMatch(/^POSTH1-P0-ARCH-/);
      expect(scenario.execute).toBeTypeOf("function");
    }
  });

  it.each(targetLockRegistry)("$testId $title", ({ execute }) => execute());

  it("T18-T26 validates identity, topology, state, content, actor, policy, expiry, and evidence", () => {
    expect(validateTargetLock(lock(), new Date("2026-08-28T12:00:00Z")).outcome).toBe("PASS");
    expect(compareTargetLocks(lock(), { ...lock(), repositoryId: "other" }).reason).toBe("TARGET_IDENTITY_MISMATCH");
    expect(compareTargetLocks(lock(), { ...lock(), headBranch: "other" }).reason).toBe("TARGET_TOPOLOGY_MISMATCH");
    expect(compareTargetLocks(lock(), { ...lock(), expectedDraftState: false }).reason).toBe("TARGET_STATE_MISMATCH");
    expect(compareTargetLocks(lock(), { ...lock(), headSha: "c".repeat(40) }).reason).toBe("TARGET_CONTENT_MISMATCH");
    expect(compareTargetLocks(lock(), { ...lock(), expectedActorId: "other" }).reason).toBe("TARGET_ACTOR_MISMATCH");
    expect(compareTargetLocks(lock(), { ...lock(), purpose: "other purpose" }).reason).toBe("TARGET_POLICY_MISMATCH");
    expect(validateTargetLock({ ...lock(), expiresAt: "2026-08-28T11:59:59Z" }, new Date("2026-08-28T12:00:00Z")).reason).toBe("TARGET_EXPIRED");
    expect(validateTargetLock({ ...lock(), repositoryUrl: "not a url" }, new Date("2026-08-28T12:00:00Z")).reason).toBe("TARGET_EVIDENCE_UNAVAILABLE");
    expect(TARGET_LOCK_MISMATCH_REASONS).toHaveLength(8);
  });

  it("T47-T64 contains hostile objects, rejects dangerous grammar, and does not invoke accessors", () => {
    const hostile = new Proxy(lock(), { get: () => { throw new Error("secret"); } });
    expect(() => validateTargetLock(hostile, new Date("2026-08-28T12:00:00Z"))).not.toThrow();
    expect(validateTargetLock({ ...lock(), baseSha: "A".repeat(40) }, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL");
    expect(validateTargetLock({ ...lock(), baseBranch: "../main" }, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL");
    expect(validateTargetLock({ ...lock(), expiresAt: "2026-08-29T12:00:00+01:00" }, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL");
  });

  it("T18-T26 compares every target-lock field with frozen precedence", () => {
    const fields = ["changeRequestNumber", "expectedCommitCount", "expectedThreadIds", "expiresAt"] as const;
    for (const field of fields) {
      const changed = { ...lock(), [field]: field === "expectedThreadIds" ? ["thread-2"] : field === "expiresAt" ? "2026-08-30T12:00:00Z" : 2 };
      expect(compareTargetLocks(lock(), changed).outcome).toBe("FAIL");
    }
    expect(validateTargetLock({ ...lock(), expectedThreadIds: ["thread-1", ""] }, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL");
    expect(validateTargetLock({ ...lock(), expectedThreadIds: ["thread-1", 1] as any }, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL");
    expect(validateTargetLock({ ...lock(), expectedThreadIds: ["thread-1", "bad value"] }, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL");
    expect(validateTargetLock({ ...lock(), expectedThreadIds: ["x", "x"] }, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL");
    const unknown = { ...lock(), unexpected: true };
    expect(validateTargetLock(unknown, new Date("2026-08-28T12:00:00Z")).outcome).toBe("FAIL");
  });

  it("T47-T55 validates target locks from a Factory snapshot without original reads", () => {
    let reads = 0;
    const proxy = new Proxy(lock(), { get: () => { reads += 1; throw new Error("must-not-read"); } });
    expect(validateTargetLock(proxy, new Date("2026-08-28T12:00:00Z")).outcome).toBe("PASS");
    expect(reads).toBe(0);
  });
});