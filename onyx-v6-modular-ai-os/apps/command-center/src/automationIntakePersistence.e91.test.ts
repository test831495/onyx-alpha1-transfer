import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAutomationIssueDraft, deleteAutomationIssueDraft, listAutomationIssueDrafts, loadActiveAutomationIssueDraft, saveAutomationIssueDraft } from "./automationIntakeService";

const input = {
  goal: "Persist this governed automation draft across reloads",
  repository: "test831495/onyx-alpha1-transfer",
  baseBranch: "feature/phase1a2-github-automation-foundation",
  requestedBy: "Rahul Kumar" as const,
  allowedPaths: ["apps/command-center/src"],
};

function createStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length() { return entries.size; },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => [...entries.keys()][index] ?? null,
    removeItem: (key) => entries.delete(key),
    setItem: (key, value) => entries.set(key, String(value)),
  };
}

describe("E.9.1 persistence", () => {
  beforeEach(() => {
    const localStorage = createStorage();
    vi.stubGlobal("localStorage", localStorage);
    vi.stubGlobal(
      "CustomEvent",
      class CustomEvent<T = unknown> extends Event {
        public readonly detail: T;
        constructor(type: string, init?: CustomEventInit<T>) {
          super(type, init);
          this.detail = init?.detail as T;
        }
      },
    );
    vi.stubGlobal("window", { localStorage, dispatchEvent: vi.fn() });
  });

  it("saves and reloads active draft", () => {
    const draft = createAutomationIssueDraft(input, new Date(0));
    saveAutomationIssueDraft(draft);
    expect(listAutomationIssueDrafts()).toHaveLength(1);
    expect(loadActiveAutomationIssueDraft()?.scopeHash).toBe(draft.scopeHash);
  });

  it("deduplicates same scope and deletes safely", () => {
    const draft = createAutomationIssueDraft(input, new Date(0));
    saveAutomationIssueDraft(draft);
    saveAutomationIssueDraft(draft);
    expect(listAutomationIssueDrafts()).toHaveLength(1);
    deleteAutomationIssueDraft(draft.draftId);
    expect(listAutomationIssueDrafts()).toHaveLength(0);
  });

  it("retains no-execution governance", () => {
    const draft = createAutomationIssueDraft(input, new Date(0));
    expect(draft.remoteIssueCreated).toBe(false);
    expect(draft.executionStarted).toBe(false);
    expect(draft.mergeAllowed).toBe(false);
  });
});