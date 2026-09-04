export type PersistedCharacter = "nova" | "onyx";

type PersistedCharacterRecord = {
  schemaVersion: "UI_CHARACTER_SELECTION_V1";
  character: "NOVA" | "ONYX";
  source: "USER_SELECTION";
};

export const CHARACTER_SELECTION_STORAGE_KEY =
  "onyx.command-center.character-selection.v1";
const MAX_RECORD_LENGTH = 512;

type StorageLike = Pick<Storage, "getItem" | "setItem">;
type StorageEventTarget = Pick<EventTarget, "addEventListener" | "removeEventListener">;

function browserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseCharacterSelection(raw: string | null): PersistedCharacter {
  if (!raw || raw.length > MAX_RECORD_LENGTH) return "nova";

  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return "nova";

    const record = value as Record<string, unknown>;
    if (
      record.schemaVersion !== "UI_CHARACTER_SELECTION_V1" ||
      record.source !== "USER_SELECTION"
    ) {
      return "nova";
    }

    if (record.character === "ONYX") return "onyx";
    if (record.character === "NOVA") return "nova";
  } catch {
    return "nova";
  }

  return "nova";
}

export function loadCharacterSelection(
  storage: StorageLike | null = browserStorage(),
): PersistedCharacter {
  if (!storage) return "nova";

  try {
    return parseCharacterSelection(storage.getItem(CHARACTER_SELECTION_STORAGE_KEY));
  } catch {
    return "nova";
  }
}

export function persistCharacterSelection(
  character: PersistedCharacter,
  storage: StorageLike | null = browserStorage(),
): void {
  if (!storage) return;

  const record: PersistedCharacterRecord = {
    schemaVersion: "UI_CHARACTER_SELECTION_V1",
    character: character === "onyx" ? "ONYX" : "NOVA",
    source: "USER_SELECTION",
  };

  try {
    storage.setItem(CHARACTER_SELECTION_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Storage is an optional presentation cache; UI state remains authoritative.
  }
}

export function subscribeToCharacterSelection(
  onCharacter: (character: PersistedCharacter) => void,
  eventTarget: StorageEventTarget | null = typeof window === "undefined" ? null : window,
  storage: StorageLike | null = browserStorage(),
): () => void {
  if (!eventTarget) return () => undefined;

  const onStorage = (event: Event) => {
    const storageEvent = event as StorageEvent;
    if (storageEvent.key !== CHARACTER_SELECTION_STORAGE_KEY) return;
    onCharacter(parseCharacterSelection(storageEvent.newValue));
  };

  eventTarget.addEventListener("storage", onStorage);
  void storage;
  return () => eventTarget.removeEventListener("storage", onStorage);
}