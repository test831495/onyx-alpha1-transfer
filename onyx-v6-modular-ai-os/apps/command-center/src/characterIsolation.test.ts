import { describe, expect, it } from "vitest";
import { shellReducer, shellStateFactory, getActiveWorkspace, migrateAutomaticCardPresentations } from "./shellState";
import type { ShellIntent } from "./shellState";

describe("Character isolation (NOVA and ONYX)", () => {
  it("initializes separate workspaces for nova and onyx", () => {
    const state = shellStateFactory();
    expect(state.workspaceByCharacter.nova.openAppIds).toEqual([]);
    expect(state.workspaceByCharacter.onyx.openAppIds).toEqual([]);
    expect(state.currentCharacter).toBe("nova");
  });

  it("isolation scenario: NOVA opens News, Tasks, Workspace, Messages", () => {
    let state = shellStateFactory();
    state = { ...state, currentCharacter: "nova" };

    // Open apps on NOVA
    state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "workspace" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });

    const novaApps = getActiveWorkspace(state).openAppIds;
    expect(novaApps).toEqual(["news", "tasks", "workspace", "messages"]);
  });

  it("isolation scenario: switch to ONYX, open Automation and Health", () => {
    let state = shellStateFactory();
    state = { ...state, currentCharacter: "nova" };

    // Open apps on NOVA
    state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });

    // Switch to ONYX
    state = { ...state, currentCharacter: "onyx" };
    const onyxActiveBeforeOpen = getActiveWorkspace(state).openAppIds;
    expect(onyxActiveBeforeOpen).toEqual([]); // ONYX should be empty

    // Open apps on ONYX
    state = shellReducer(state, { type: "OPEN_APP", appId: "automation" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "health" });

    const onyxApps = getActiveWorkspace(state).openAppIds;
    expect(onyxApps).toEqual(["automation", "health"]);

    // Verify NOVA's apps are unchanged
    expect(state.workspaceByCharacter.nova.openAppIds).toEqual(["news", "tasks"]);
  });

  it("isolation scenario: switch back to NOVA, verify original layout", () => {
    let state = shellStateFactory();
    state = { ...state, currentCharacter: "nova" };

    // Open apps on NOVA
    state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "workspace" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });

    // Switch to ONYX and open apps
    state = { ...state, currentCharacter: "onyx" };
    state = shellReducer(state, { type: "OPEN_APP", appId: "automation" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "health" });

    // Switch back to NOVA
    state = { ...state, currentCharacter: "nova" };
    const novaAppsRestored = getActiveWorkspace(state).openAppIds;
    expect(novaAppsRestored).toEqual(["news", "tasks", "workspace", "messages"]);
  });

  it("isolation scenario: switch to ONYX again, verify its layout", () => {
    let state = shellStateFactory();
    state = { ...state, currentCharacter: "nova" };

    state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });

    state = { ...state, currentCharacter: "onyx" };
    state = shellReducer(state, { type: "OPEN_APP", appId: "automation" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "health" });

    state = { ...state, currentCharacter: "nova" };
    state = { ...state, currentCharacter: "onyx" };
    const onyxAppsAgain = getActiveWorkspace(state).openAppIds;
    expect(onyxAppsAgain).toEqual(["automation", "health"]);
  });

  it("closing app on one character does not affect other character", () => {
    let state = shellStateFactory();
    state = { ...state, currentCharacter: "nova" };
    state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });

    state = { ...state, currentCharacter: "onyx" };
    state = shellReducer(state, { type: "OPEN_APP", appId: "automation" });

    // Close automation on ONYX
    state = shellReducer(state, { type: "CLOSE_APP", appId: "automation" });
    expect(getActiveWorkspace(state).openAppIds).toEqual([]);

    // Verify NOVA's apps are unchanged
    expect(state.workspaceByCharacter.nova.openAppIds).toEqual(["news", "tasks"]);
  });

  it("minimizing app on one character does not affect other character", () => {
    let state = shellStateFactory();
    state = { ...state, currentCharacter: "nova" };
    state = shellReducer(state, { type: "OPEN_APP", appId: "news" });

    state = { ...state, currentCharacter: "onyx" };
    state = shellReducer(state, { type: "OPEN_APP", appId: "automation" });
    state = shellReducer(state, { type: "MINIMIZE_APP", appId: "automation" });

    const onyxMinimized = getActiveWorkspace(state).minimizedAppIds;
    expect(onyxMinimized).toContain("automation");

    // Verify NOVA has no minimized apps
    expect(state.workspaceByCharacter.nova.minimizedAppIds).toEqual([]);
  });

  it("migrates stale NOVA automatic card positions without changing manual positions", () => {
    let state = shellStateFactory();
    state = {
      ...state,
      currentCharacter: "nova",
      workspaceByCharacter: {
        ...state.workspaceByCharacter,
        nova: {
          ...state.workspaceByCharacter.nova,
          openAppIds: ["messages", "tasks", "news", "workspace"],
          cardPresentationByAppId: new Map([
            ["messages", { x: 2, y: 3, zIndex: 1, selected: false, hasManualPosition: false }],
            ["tasks", { x: 70, y: 3, zIndex: 6, selected: true, hasManualPosition: false }],
            ["news", { x: 2, y: 31, zIndex: 1, selected: false, hasManualPosition: false }],
            ["workspace", { x: 70, y: 31, zIndex: 1, selected: false, hasManualPosition: false }],
          ]),
        },
      },
    };

    const migratedNova = getActiveWorkspace(state);
    expect(migratedNova.cardPresentationByAppId.get("messages")?.x).toBeCloseTo(1.7, 1);
    expect(migratedNova.cardPresentationByAppId.get("tasks")?.x).toBeCloseTo(1.7, 1);
    expect(migratedNova.cardPresentationByAppId.get("workspace")?.x).toBeCloseTo(77.12, 2);

    const manuallyMovedNova = migrateAutomaticCardPresentations({
      ...state.workspaceByCharacter.nova,
      cardPresentationByAppId: new Map([
        ["messages", { x: 2, y: 3, zIndex: 1, selected: false, hasManualPosition: false }],
        ["tasks", { x: 70, y: 20, zIndex: 6, selected: true, hasManualPosition: true }],
        ["news", { x: 2, y: 31, zIndex: 1, selected: false, hasManualPosition: false }],
        ["workspace", { x: 70, y: 31, zIndex: 1, selected: false, hasManualPosition: false }],
      ]),
    });

    expect(manuallyMovedNova.cardPresentationByAppId.get("messages")?.x).toBeCloseTo(1.7, 1);
    expect(manuallyMovedNova.cardPresentationByAppId.get("tasks")?.x).toBe(70);
    expect(manuallyMovedNova.cardPresentationByAppId.get("tasks")?.y).toBe(20);
  });

  it("keeps migrated NOVA and fresh ONYX automatic right margins equivalent", () => {
    const canvasWidth = 1416;
    const cardWidth = 300;
    let state = shellStateFactory();
    state = {
      ...state,
      currentCharacter: "nova",
      workspaceByCharacter: {
        ...state.workspaceByCharacter,
        nova: {
          ...state.workspaceByCharacter.nova,
          openAppIds: ["messages", "tasks", "news", "workspace"],
          cardPresentationByAppId: new Map([
            ["messages", { x: 2, y: 3, zIndex: 1, selected: false, hasManualPosition: false }],
            ["tasks", { x: 70, y: 3, zIndex: 6, selected: true, hasManualPosition: false }],
            ["news", { x: 2, y: 31, zIndex: 1, selected: false, hasManualPosition: false }],
            ["workspace", { x: 70, y: 31, zIndex: 1, selected: false, hasManualPosition: false }],
          ]),
        },
      },
    };
    const migratedNovaRight = getActiveWorkspace(state).cardPresentationByAppId.get("workspace")!;

    state = { ...state, currentCharacter: "onyx" };
    state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "workspace" });
    const freshOnyxRight = getActiveWorkspace(state).cardPresentationByAppId.get("workspace")!;

    const rightMargin = (x: number) => canvasWidth - (x / 100) * canvasWidth - cardWidth;
    expect(migratedNovaRight.x).toBeCloseTo(freshOnyxRight.x, 3);
    expect(rightMargin(migratedNovaRight.x)).toBeCloseTo(rightMargin(freshOnyxRight.x), 1);
    expect(rightMargin(migratedNovaRight.x)).toBeCloseTo(24, 1);
  });
});
