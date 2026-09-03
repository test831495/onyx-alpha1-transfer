import { describe, expect, it } from "vitest";
import {
  accountSwitchCleanup,
  applyAvatarSelection,
  detectSelectionConflict,
  projectAvatarVariant,
  revokeAvatarSelection,
  rollbackAvatarSelection,
  type AccountCharacterAvatarSelection,
} from "../src/index";

const onyx: AccountCharacterAvatarSelection = { accountId: "a", character: "ONYX", avatarId: "v1", version: 1, hash: "h1", revoked: false };
const nova: AccountCharacterAvatarSelection = { accountId: "a", character: "NOVA", avatarId: "n1", version: 1, hash: "nh1", revoked: false };
const authed = { authenticated: true, accountId: "a" };

describe("account-bound avatar selection", () => {
  const current = { accountId: "a", character: "ONYX" as const, avatarId: "v1", version: 1, hash: "h1", revoked: false };
  it("accepts monotonic authenticated changes and preserves identity", () => {
    expect(applyAvatarSelection(current, { ...current, avatarId: "v2", version: 2, hash: "h2" }, { authenticated: true, accountId: "a" }).ok).toBe(true);
    expect(projectAvatarVariant(current, "tv")).toMatchObject({ avatarId: "v1", version: 1, deviceVariant: "tv" });
  });
  it("rejects stale, wrong-account, revoked, and unauthenticated updates", () => {
    for (const facts of [{ authenticated: false, accountId: "a" }, { authenticated: true, accountId: "b" }]) expect(applyAvatarSelection(current, { ...current, version: 2 }, facts).ok).toBe(false);
    expect(applyAvatarSelection(current, { ...current, version: 1 }, { authenticated: true, accountId: "a" }).reason).toBe("STALE_VERSION");
  });
});

describe("T2-AVATAR-SYNC-001 selection policy", () => {
  it("T2-AVATAR-SYNC-001-POS: ONYX and NOVA advance independently and atomically", () => {
    const onyxNext = applyAvatarSelection(onyx, { ...onyx, avatarId: "v2", version: 2, hash: "h2" }, authed);
    const novaNext = applyAvatarSelection(nova, { ...nova, avatarId: "n2", version: 2, hash: "nh2" }, authed);
    expect(onyxNext.selection.avatarId).toBe("v2");
    expect(novaNext.selection.avatarId).toBe("n2");
    expect(onyxNext.selection.character).toBe("ONYX");
    expect(novaNext.selection.character).toBe("NOVA");
    expect(Object.isFrozen(onyxNext)).toBe(true);
  });

  it("T2-AVATAR-SYNC-001-NEG: rejects malformed, cross-character, revoked, and hashless updates", () => {
    expect(applyAvatarSelection(null, onyx, authed).reason).toBe("MALFORMED_INPUT");
    expect(applyAvatarSelection(onyx, { nope: true }, authed).reason).toBe("MALFORMED_INPUT");
    expect(applyAvatarSelection(onyx, { ...onyx, character: "NOVA", version: 2 }, authed).reason).toBe("CHARACTER_MISMATCH");
    expect(applyAvatarSelection(onyx, { ...onyx, version: 2, hash: "" }, authed).reason).toBe("HASH_MISSING");
    expect(applyAvatarSelection(onyx, { ...onyx, version: 2, revoked: true }, authed).reason).toBe("REVOKED_CANDIDATE");
    expect(applyAvatarSelection(onyx, { ...onyx, accountId: "b", version: 2 }, authed).reason).toBe("ACCOUNT_MISMATCH");
  });

  it("T2-AVATAR-SYNC-001-NEG: an exact duplicate is idempotent and never advances state", () => {
    const duplicate = applyAvatarSelection(onyx, { ...onyx }, authed);
    expect(duplicate.ok).toBe(false);
    expect(duplicate.idempotent).toBe(true);
    expect(duplicate.selection).toEqual(onyx);

    const older = applyAvatarSelection({ ...onyx, version: 5 }, { ...onyx, version: 2, avatarId: "vX" }, authed);
    expect(older.idempotent).toBe(false);
    expect(older.reason).toBe("STALE_VERSION");
  });
});

describe("T2-AVATAR-SYNC-002 device variants", () => {
  it("T2-AVATAR-SYNC-002-POS: every device keeps canonical identity and version", () => {
    for (const device of ["desktop", "tv", "mobile", "tablet"] as const) {
      const variant = projectAvatarVariant(onyx, device);
      expect(variant).toMatchObject({ avatarId: "v1", version: 1, deviceVariant: device, canonical: true });
    }
  });

  it("T2-AVATAR-SYNC-002-NEG: a variant cannot substitute a different appearance", () => {
    const variant = projectAvatarVariant(onyx, "tv") as unknown as Record<string, unknown>;
    expect(Object.isFrozen(variant)).toBe(true);
    expect(() => {
      "use strict";
      variant["avatarId"] = "someone-else";
    }).toThrow();
    expect(variant["avatarId"]).toBe("v1");
  });
});

describe("T2-AVATAR-SYNC-003 rollback and T2-AVATAR-SYNC-004 revocation", () => {
  it("T2-AVATAR-SYNC-003-POS: rollback restores an allowed prior version monotonically", () => {
    const current = { ...onyx, avatarId: "v3", version: 3, hash: "h3" };
    const result = rollbackAvatarSelection(current, [onyx], 1, authed);
    expect(result.ok).toBe(true);
    expect(result.selection.avatarId).toBe("v1");
    expect(result.selection.version).toBe(4);
  });

  it("T2-AVATAR-SYNC-003-NEG: rollback refuses unknown targets and unauthenticated actors", () => {
    const current = { ...onyx, version: 3 };
    expect(rollbackAvatarSelection(current, [onyx], 99, authed).reason).toBe("STALE_VERSION");
    expect(rollbackAvatarSelection(current, [onyx], 1, { authenticated: false, accountId: "a" }).reason).toBe("UNAUTHENTICATED");
    expect(rollbackAvatarSelection(current, [{ ...onyx, revoked: true }], 1, authed).reason).toBe("STALE_VERSION");
  });

  it("T2-AVATAR-SYNC-004: revocation wins and account switch clears decrypted state", () => {
    expect(revokeAvatarSelection(onyx, "v1").selection.revoked).toBe(true);
    expect(revokeAvatarSelection(onyx, "other").revoked).toBe(false);

    const cleanup = accountSwitchCleanup("a", "b");
    expect(cleanup).toMatchObject({ clearDecryptedState: true, clearRebuildableProjections: true, retainAuthority: false });
    expect(accountSwitchCleanup("a", "a").clearDecryptedState).toBe(false);
  });

  it("surfaces deterministic conflicts for concurrent writers", () => {
    const a = { ...onyx, avatarId: "aa", version: 2 };
    const b = { ...onyx, avatarId: "bb", version: 2 };
    const conflict = detectSelectionConflict(onyx, a, b);
    expect(conflict.conflict).toBe(true);
    expect(conflict.winner.avatarId).toBe("aa");
    expect(detectSelectionConflict(onyx, a, a).conflict).toBe(false);
  });

  it("never mutates identity, role, session, or authorization", () => {
    const result = applyAvatarSelection(onyx, { ...onyx, avatarId: "v2", version: 2, hash: "h2" }, authed);
    expect(Object.keys(result.selection).sort()).toEqual(["accountId", "avatarId", "character", "hash", "revoked", "version"]);
  });
});

describe("T2-AVATAR-SYNC-005 shared contract ownership", () => {
  it("T2-AVATAR-SYNC-005-POS: consumes the LANE_A shared selection contract", async () => {
    const shared = await import("../../post-alpha-visible-presence-integration-contracts/src/index");
    expect(shared.SHARED_CONTRACT_NAMES).toContain("AccountCharacterAvatarSelection");
    const value: AccountCharacterAvatarSelection = onyx;
    expect(value.character).toBe("ONYX");
  });

  it("T2-AVATAR-SYNC-005-NEG: LANE_B does not redefine the shared contract", async () => {
    const source = await import("node:fs").then((fs) => fs.readFileSync(new URL("../src/index.ts", import.meta.url), "utf8"));
    expect(/export type AccountCharacterAvatarSelection\s*=/.test(source)).toBe(false);
    expect(source.includes("post-alpha-visible-presence-integration-contracts/src/index")).toBe(true);
  });
});