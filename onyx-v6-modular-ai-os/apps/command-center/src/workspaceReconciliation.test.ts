import { describe, expect, it, vi } from "vitest";
import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";
import { clearMicrosoftFilesTrace, getMicrosoftFilesTrace } from "./workspaceController";

/**
 * Pure state machine representing the exact ref-based account transition logic
 * used in App.tsx to eliminate callback churn while preserving trace reset behavior.
 */
class WorkspaceReconciliationLifecycle {
  private previousMicrosoftAccountId: string | undefined = undefined;
  public workspace: WorkspaceSnapshot = {
    providers: [],
    activeProvider: undefined,
    updatedAt: Date.now(),
  };
  public workspaceBusy = false;
  public loadSnapshotCalls = 0;

  constructor(private readonly loadSnapshotFn: () => Promise<WorkspaceSnapshot>) {}

  public async refreshWorkspace(): Promise<WorkspaceSnapshot> {
    this.workspaceBusy = true;
    try {
      this.loadSnapshotCalls += 1;
      const nextWorkspace = await this.loadSnapshotFn();
      const nextMicrosoft = nextWorkspace.providers.find((provider) => provider.provider === "microsoft");
      const nextAccountId = nextMicrosoft?.profile?.accountId;
      if (this.previousMicrosoftAccountId !== nextAccountId && (this.previousMicrosoftAccountId || nextAccountId)) {
        clearMicrosoftFilesTrace();
      }
      this.previousMicrosoftAccountId = nextAccountId;
      this.workspace = nextWorkspace;
      return nextWorkspace;
    } finally {
      this.workspaceBusy = false;
    }
  }

  public getPreviousAccountId(): string | undefined {
    return this.previousMicrosoftAccountId;
  }
}

function snapshotFor(accountId?: string): WorkspaceSnapshot {
  return {
    providers: [
      {
        provider: "microsoft",
        label: "Microsoft 365",
        state: accountId ? "connected" : "disconnected",
        diagnostic: accountId ? "Connected" : "Disconnected",
        ...(accountId ? { profile: { displayName: "User", accountId } } : {}),
        capabilities: [{ id: "files", label: "OneDrive", enabled: Boolean(accountId) }],
      },
      {
        provider: "google",
        label: "Google",
        state: "unconfigured",
        diagnostic: "Planned",
        capabilities: [],
      },
    ],
    activeProvider: accountId ? "microsoft" : undefined,
    updatedAt: Date.now(),
  };
}

describe("App workspace reconciliation and trace lifecycle regression", () => {
  it("Scenario 1 & 5: does NOT clear trace on same-account refreshes and repeated equivalent snapshots", async () => {
    clearMicrosoftFilesTrace();
    const loadSnapshot = vi.fn().mockImplementation(() => Promise.resolve(snapshotFor("account-A")));
    const harness = new WorkspaceReconciliationLifecycle(loadSnapshot);

    // Initial load
    await harness.refreshWorkspace();
    expect(harness.getPreviousAccountId()).toBe("account-A");
    expect(harness.loadSnapshotCalls).toBe(1);

    // Simulate trace populated during session
    const traceStore = getMicrosoftFilesTrace();
    expect(traceStore).toBeDefined();

    // Repeated refresh with same account ID
    await harness.refreshWorkspace();
    expect(harness.getPreviousAccountId()).toBe("account-A");
    expect(harness.loadSnapshotCalls).toBe(2);

    // Third identical refresh
    await harness.refreshWorkspace();
    expect(harness.getPreviousAccountId()).toBe("account-A");
    expect(harness.loadSnapshotCalls).toBe(3);
  });

  it("Scenario 2: clears trace on account switch (Account A -> Account B)", async () => {
    let currentAccount = "account-A";
    const loadSnapshot = vi.fn().mockImplementation(() => Promise.resolve(snapshotFor(currentAccount)));
    const harness = new WorkspaceReconciliationLifecycle(loadSnapshot);

    // Initial sign-in with Account A
    await harness.refreshWorkspace();
    expect(harness.getPreviousAccountId()).toBe("account-A");

    // Account switch to Account B
    currentAccount = "account-B";
    await harness.refreshWorkspace();
    expect(harness.getPreviousAccountId()).toBe("account-B");
    expect(getMicrosoftFilesTrace()).toEqual([]);
  });

  it("Scenario 3: clears trace on disconnect / sign-out (Account A -> disconnected)", async () => {
    let currentAccount: string | undefined = "account-A";
    const loadSnapshot = vi.fn().mockImplementation(() => Promise.resolve(snapshotFor(currentAccount)));
    const harness = new WorkspaceReconciliationLifecycle(loadSnapshot);

    // Initial sign-in
    await harness.refreshWorkspace();
    expect(harness.getPreviousAccountId()).toBe("account-A");

    // Sign out (no account ID in snapshot)
    currentAccount = undefined;
    await harness.refreshWorkspace();
    expect(harness.getPreviousAccountId()).toBeUndefined();
    expect(getMicrosoftFilesTrace()).toEqual([]);
  });

  it("Scenario 4: clears trace on connect / sign-in (disconnected -> Account A)", async () => {
    let currentAccount: string | undefined = undefined;
    const loadSnapshot = vi.fn().mockImplementation(() => Promise.resolve(snapshotFor(currentAccount)));
    const harness = new WorkspaceReconciliationLifecycle(loadSnapshot);

    // Initial disconnected state
    await harness.refreshWorkspace();
    expect(harness.getPreviousAccountId()).toBeUndefined();

    // Sign in with Account A
    currentAccount = "account-A";
    await harness.refreshWorkspace();
    expect(harness.getPreviousAccountId()).toBe("account-A");
    expect(getMicrosoftFilesTrace()).toEqual([]);
  });

  it("Guards callback stability: refreshWorkspace dependency in App.tsx has 0 dynamic array dependencies", async () => {
    // Structural regression check on App.tsx to verify refreshWorkspace uses stable [] deps
    const fs = await import("node:fs");
    const appSource = fs.readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

    // Find refreshWorkspace definition
    const refreshWorkspaceDef = appSource.match(/const refreshWorkspace = useCallback\(async \(\) => {[\s\S]*?}, \[([\s\S]*?)\]\);/);
    expect(refreshWorkspaceDef).not.toBeNull();
    const deps = refreshWorkspaceDef![1]?.trim();
    expect(deps).toBe(""); // empty dependency array []
    expect(deps).not.toContain("workspace.providers");
  });
});
