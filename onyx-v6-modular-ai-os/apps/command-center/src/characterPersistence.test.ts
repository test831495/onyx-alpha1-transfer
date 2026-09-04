import { describe, expect, it, vi } from "vitest";
import {
  CHARACTER_SELECTION_STORAGE_KEY,
  loadCharacterSelection,
  persistCharacterSelection,
  subscribeToCharacterSelection,
} from "./characterPersistence";

type TestStorage = Storage & { values: Map<string, string> };

function createStorage(): TestStorage {
  const values = new Map<string, string>();
  return {
    values,
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

function selection(character: "NOVA" | "ONYX"): string {
  return JSON.stringify({
    schemaVersion: "UI_CHARACTER_SELECTION_V1",
    character,
    source: "USER_SELECTION",
  });
}

function storageEvent(key: string, newValue: string | null): Event {
  const event = new Event("storage");
  Object.defineProperties(event, {
    key: { value: key },
    newValue: { value: newValue },
  });
  return event;
}

describe("command center character persistence", () => {
  it("writes a bounded versioned record for each selection", () => {
    const storage = createStorage();

    persistCharacterSelection("onyx", storage);

    expect(storage.getItem(CHARACTER_SELECTION_STORAGE_KEY)).toBe(selection("ONYX"));
  });

  it.each([
    ["ONYX", "onyx"],
    ["NOVA", "nova"],
  ] as const)("restores stored %s during startup", (stored, expected) => {
    const storage = createStorage();
    storage.setItem(CHARACTER_SELECTION_STORAGE_KEY, selection(stored));

    expect(loadCharacterSelection(storage)).toBe(expected);
  });

  it("falls back to NOVA for malformed, unknown, and oversized records", () => {
    const storage = createStorage();
    const invalidRecords = [
      "not-json",
      selection("NOVA").replace("UI_CHARACTER_SELECTION_V1", "OLD"),
      JSON.stringify({ schemaVersion: "UI_CHARACTER_SELECTION_V1", character: "ROGUE" }),
      "x".repeat(513),
    ];

    for (const record of invalidRecords) {
      storage.setItem(CHARACTER_SELECTION_STORAGE_KEY, record);
      expect(loadCharacterSelection(storage)).toBe("nova");
    }
  });

  it("does not throw when storage reads or writes fail", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("denied");
      }),
      setItem: vi.fn(() => {
        throw new Error("full");
      }),
    } as unknown as Storage;

    expect(loadCharacterSelection(storage)).toBe("nova");
    expect(() => persistCharacterSelection("onyx", storage)).not.toThrow();
  });

  it("syncs both directions, ignores unrelated and duplicate events, and cleans up", () => {
    const storage = createStorage();
    const target = new EventTarget();
    const received: string[] = [];
    const unsubscribe = subscribeToCharacterSelection(
      (character) => received.push(character),
      target,
      storage,
    );

    const send = (character: "NOVA" | "ONYX") => {
      storage.setItem(CHARACTER_SELECTION_STORAGE_KEY, selection(character));
      target.dispatchEvent(storageEvent(CHARACTER_SELECTION_STORAGE_KEY, selection(character)));
    };

    send("ONYX");
    send("NOVA");
    target.dispatchEvent(storageEvent("other-key", selection("ONYX")));
    unsubscribe();
    send("ONYX");

    expect(received).toEqual(["onyx", "nova"]);
  });
});