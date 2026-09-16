import { describe, expect, it } from "vitest";
import { getAppDetail } from "./appDetailRegistry";
import { APP_REGISTRY } from "./applicationRegistry";
import { resolveShellIntent, shellReducer, shellStateFactory } from "./shellState";

describe("Notes first-class application", () => {
  it.each(["notes", "note", "open notes", "show notes"]) ("routes %s to Notes", (command) => {
    expect(resolveShellIntent(command)).toEqual({ type: "OPEN_APP", appId: "notes" });
  });
  it("supports dock lifecycle and details", () => {
    let state = shellStateFactory();
    state = shellReducer(state, { type: "OPEN_APP", appId: "notes" });
    state = shellReducer(state, { type: "OPEN_DETAILS", appId: "notes" });
    expect(getAppDetail("notes")?.supportsDetails).toBe(true);
    expect(state.workspaceByCharacter[state.currentCharacter].detailAppId).toBe("notes");
  });

  it("activates Notes detail when the dock opens Notes", () => {
    const state = shellReducer(shellStateFactory(), { type: "OPEN_APP", appId: "notes" });
    const workspace = state.workspaceByCharacter[state.currentCharacter];
    expect(workspace.openAppIds).toContain("notes");
    expect(workspace.selectedAppId).toBe("notes");
    expect(workspace.detailAppId).toBe("notes");
  });

  it("restores Notes as the active detail without duplicating it", () => {
    let state = shellReducer(shellStateFactory(), { type: "OPEN_APP", appId: "notes" });
    state = shellReducer(state, { type: "MINIMIZE_APP", appId: "notes" });
    state = shellReducer(state, { type: "OPEN_APP", appId: "notes" });
    const workspace = state.workspaceByCharacter[state.currentCharacter];
    expect(workspace.openAppIds.filter((appId) => appId === "notes")).toHaveLength(1);
    expect(workspace.detailAppId).toBe("notes");
  });

  it("exposes Notes-owned card metadata and a real detail component", () => {
    const card = APP_REGISTRY.find((entry) => entry.appId === "notes");
    expect(card?.compactSummary).toContain("Offline-first notes");
    expect(card?.compactSummary).not.toContain("Character view is active");
    expect(getAppDetail("notes")?.supportsDetails).toBe(true);
  });
});