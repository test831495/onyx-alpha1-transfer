/**
 * LANE_B account-bound character avatar selection.
 * Pure policy core: no network, no persistence, no authority mutation.
 */

import {
  CHARACTERS,
  DEVICE_CLASSES,
  MAX_IDENTIFIER_LENGTH,
  deepFreeze,
  isBoundedString,
  isMember,
  isPlainObject,
  type AccountCharacterAvatarSelection,
} from "../../post-alpha-visible-presence-integration-contracts/src/index";

export type { AccountCharacterAvatarSelection };

export type CharacterId = (typeof CHARACTERS)[number];
export type DeviceVariant = (typeof DEVICE_CLASSES)[number];

export type SessionFacts = Readonly<{
  authenticated: boolean;
  accountId: string;
}>;

export type SelectionRejectionReason =
  | "MALFORMED_INPUT"
  | "UNAUTHENTICATED"
  | "ACCOUNT_MISMATCH"
  | "CHARACTER_MISMATCH"
  | "STALE_VERSION"
  | "HASH_MISSING"
  | "REVOKED_CANDIDATE";

export type SelectionChangeResult = Readonly<{
  ok: boolean;
  reason?: SelectionRejectionReason;
  idempotent: boolean;
  selection: AccountCharacterAvatarSelection;
}>;

function isSelection(value: unknown): value is AccountCharacterAvatarSelection {
  if (!isPlainObject(value)) return false;
  return (
    isBoundedString(value["accountId"], MAX_IDENTIFIER_LENGTH) &&
    isMember(CHARACTERS, value["character"]) &&
    isBoundedString(value["avatarId"], MAX_IDENTIFIER_LENGTH) &&
    isBoundedString(value["hash"], MAX_IDENTIFIER_LENGTH) &&
    typeof value["version"] === "number" &&
    Number.isInteger(value["version"]) &&
    (value["version"] as number) > 0 &&
    typeof value["revoked"] === "boolean"
  );
}

function reject(
  current: AccountCharacterAvatarSelection,
  reason: SelectionRejectionReason,
  idempotent = false,
): SelectionChangeResult {
  return deepFreeze({ ok: false, reason, idempotent, selection: current });
}

function malformedSelection(): AccountCharacterAvatarSelection {
  return deepFreeze({ accountId: "", character: "ONYX", avatarId: "", version: 0, hash: "", revoked: true });
}

/**
 * Atomic, monotonic, account-bound selection change.
 * An exact duplicate is reported as non-advancing rather than applied twice.
 */
export function applyAvatarSelection(
  current: unknown,
  next: unknown,
  facts: unknown,
): SelectionChangeResult {
  if (!isSelection(current)) {
    return deepFreeze({
      ok: false,
      reason: "MALFORMED_INPUT",
      idempotent: false,
      selection: {
        accountId: "",
        character: "ONYX",
        avatarId: "",
        version: 0,
        hash: "",
        revoked: true,
      },
    });
  }
  if (!isSelection(next)) return reject(current, "MALFORMED_INPUT");
  if (!isPlainObject(facts) || facts["authenticated"] !== true) return reject(current, "UNAUTHENTICATED");
  if (facts["accountId"] !== current.accountId || next.accountId !== current.accountId) {
    return reject(current, "ACCOUNT_MISMATCH");
  }
  if (next.character !== current.character) return reject(current, "CHARACTER_MISMATCH");
  if (!isBoundedString(next.hash)) return reject(current, "HASH_MISSING");
  if (next.revoked) return reject(current, "REVOKED_CANDIDATE");

  if (next.version <= current.version) {
    const duplicate =
      next.version === current.version && next.avatarId === current.avatarId && next.hash === current.hash;
    return reject(current, "STALE_VERSION", duplicate);
  }

  return deepFreeze({ ok: true, idempotent: false, selection: { ...next } });
}

/**
 * Device rendering variant. Canonical identity and version are always preserved;
 * a device may only choose how to render, never what to render.
 */
export function projectAvatarVariant(
  selection: AccountCharacterAvatarSelection,
  deviceVariant: DeviceVariant,
): Readonly<{
  accountId: string;
  character: CharacterId;
  avatarId: string;
  version: number;
  deviceVariant: DeviceVariant;
  canonical: true;
}> {
  return deepFreeze({
    accountId: selection.accountId,
    character: selection.character,
    avatarId: selection.avatarId,
    version: selection.version,
    deviceVariant,
    canonical: true as const,
  });
}

export function rollbackAvatarSelection(
  current: AccountCharacterAvatarSelection,
  priorAllowed: readonly AccountCharacterAvatarSelection[],
  targetVersion: number,
  facts: SessionFacts,
): SelectionChangeResult {
  if (!isSelection(current) || !priorAllowed.every(isSelection)) {
    return reject(isSelection(current) ? current : malformedSelection(), "MALFORMED_INPUT");
  }
  if (!facts.authenticated || facts.accountId !== current.accountId) return reject(current, "UNAUTHENTICATED");
  const target = priorAllowed.find(
    (entry) =>
      entry.version === targetVersion &&
      entry.accountId === current.accountId &&
      entry.character === current.character &&
      !entry.revoked,
  );
  if (target === undefined) return reject(current, "STALE_VERSION");
  return deepFreeze({
    ok: true,
    idempotent: false,
    selection: { ...target, version: current.version + 1 },
  });
}

/** Revocation always wins over any stale device-held version. */
export function revokeAvatarSelection(
  current: AccountCharacterAvatarSelection,
  revokedAvatarId: string,
): Readonly<{ revoked: boolean; selection: AccountCharacterAvatarSelection }> {
  if (!isSelection(current)) throw new TypeError("MALFORMED_SELECTION");
  const revoked = current.avatarId === revokedAvatarId;
  return deepFreeze({
    revoked,
    selection: revoked ? { ...current, revoked: true } : current,
  });
}

export function accountSwitchCleanup(
  previousAccountId: string,
  nextAccountId: string,
): Readonly<{
  clearDecryptedState: boolean;
  clearRebuildableProjections: boolean;
  retainAuthority: false;
  clearedAccountId: string;
}> {
  return deepFreeze({
    clearDecryptedState: previousAccountId !== nextAccountId,
    clearRebuildableProjections: previousAccountId !== nextAccountId,
    retainAuthority: false as const,
    clearedAccountId: previousAccountId,
  });
}

/** Two authenticated writers advancing from the same base is a deterministic conflict. */
export function detectSelectionConflict(
  base: AccountCharacterAvatarSelection,
  a: AccountCharacterAvatarSelection,
  b: AccountCharacterAvatarSelection,
): Readonly<{ conflict: boolean; winner: AccountCharacterAvatarSelection }> {
  const concurrent = a.version === b.version && a.version > base.version && a.avatarId !== b.avatarId;
  const winner = a.avatarId <= b.avatarId ? a : b;
  return deepFreeze({ conflict: concurrent, winner: concurrent ? winner : a });
}
