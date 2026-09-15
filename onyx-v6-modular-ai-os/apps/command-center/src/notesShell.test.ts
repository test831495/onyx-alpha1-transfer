import { describe, expect, it } from "vitest";
import { getAppDetail } from "./appDetailRegistry";
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
});