import { describe, expect, it } from "vitest";
import { getAppDetail } from "./appDetailRegistry";
import { getActiveWorkspace, resolveShellIntent, shellReducer, shellStateFactory } from "./shellState";

describe("Files shell integration", () => {
  it.each(["files", "file", "open files", "show files", "go to files"])("routes %s to Files", (command) => {
    expect(resolveShellIntent(command)).toEqual({ type: "OPEN_APP", appId: "files" });
  });

  it("keeps Workspace routing separate", () => {
    expect(resolveShellIntent("open workspace")).toEqual({ type: "OPEN_APP", appId: "workspace" });
  });

  it("supports the standard open, focus, minimize, restore, close, and details lifecycle", () => {
    let state = shellStateFactory();
    state = shellReducer(state, { type: "OPEN_APP", appId: "files" });
    expect(getActiveWorkspace(state).openAppIds).toContain("files");
    state = shellReducer(state, { type: "FOCUS_APP", appId: "files" });
    expect(getActiveWorkspace(state).selectedAppId).toBe("files");
    state = shellReducer(state, { type: "MINIMIZE_APP", appId: "files" });
    expect(getActiveWorkspace(state).minimizedAppIds).toContain("files");
    state = shellReducer(state, { type: "RESTORE_APP", appId: "files" });
    expect(getActiveWorkspace(state).minimizedAppIds).not.toContain("files");
    state = shellReducer(state, { type: "OPEN_DETAILS", appId: "files" });
    expect(getActiveWorkspace(state).detailAppId).toBe("files");
    state = shellReducer(state, { type: "MINIMIZE_APP", appId: "files" });
    expect(getActiveWorkspace(state).detailAppId).toBe("files");
    state = shellReducer(state, { type: "RESTORE_APP", appId: "files" });
    expect(getActiveWorkspace(state).detailAppId).toBe("files");
    expect(getAppDetail("files")?.supportsDetails).toBe(true);
    state = shellReducer(state, { type: "CLOSE_APP", appId: "files" });
    expect(getActiveWorkspace(state).openAppIds).not.toContain("files");
  });
});