import { describe, expect, it } from "vitest";
import { APP_REGISTRY } from "./applicationRegistry";
import { allocateCardSlots, resolveShellIntent, shellStateFactory } from "./shellState"
import { getActiveWorkspace } from "./shellState";

describe("shell intent and presentation boundary", () => {
  it("allocates unique deterministic slots for visible cards", () => {
    const visible = ["messages", "tasks", "news", "workspace", "calendar", "automation"] as const;
    const slots = allocateCardSlots(visible, "tasks");
    expect(Array.from(slots.values())).toHaveLength(visible.length);
    expect(new Set(Array.from(slots.values())).size).toBe(visible.length);
    // Deterministic order: LEFT_TOP, LEFT_MIDDLE, LEFT_BOTTOM, RIGHT_TOP, RIGHT_MIDDLE, RIGHT_BOTTOM
    expect(slots.get("messages")).toBe("LEFT_TOP");
    expect(slots.get("tasks")).toBe("LEFT_MIDDLE");
    expect(slots.get("news")).toBe("LEFT_BOTTOM");
    expect(slots.get("workspace")).toBe("RIGHT_TOP");
    expect(slots.get("calendar")).toBe("RIGHT_MIDDLE");
    expect(slots.get("automation")).toBe("RIGHT_BOTTOM");
  });

  it("keeps registry entries rich enough for details and summaries", () => {
    expect(APP_REGISTRY.length).toBeGreaterThan(0);
    expect(APP_REGISTRY.every((entry) => entry.supportsDetails !== undefined)).toBe(true);
    expect(APP_REGISTRY.every((entry) => entry.compactSummary)).toBe(true);
  });

  it("routes bounded typed shell intents through the shell dispatcher", () => {
    expect(resolveShellIntent("Open Tasks")).toEqual({ type: "OPEN_APP", appId: "tasks" });
    expect(resolveShellIntent("Close Tasks")).toEqual({ type: "CLOSE_APP", appId: "tasks" });
    expect(resolveShellIntent("Open Automation details")).toEqual({ type: "OPEN_DETAILS", appId: "automation" });
    expect(resolveShellIntent("Switch to ONYX")).toEqual({ type: "SET_PRESENCE_MODE", mode: "ONYX_ONLY" });
    expect(resolveShellIntent("Show ONYX and NOVA")).toEqual({ type: "SET_PRESENCE_MODE", mode: "ONYX_AND_NOVA" });
  });

  it("keeps character workspaces isolated when switching", () => {
    let state = shellStateFactory();
    
    // Set current character to nova and open tasks
    state = { ...state, currentCharacter: "nova" };
    state.workspaceByCharacter.nova.openAppIds = ["tasks"];
    
    // Switch to onyx (workspace should be empty)
    state = { ...state, currentCharacter: "onyx" };
    expect(getActiveWorkspace(state).openAppIds).toEqual([]);
    
    // Verify nova still has its apps
    expect(state.workspaceByCharacter.nova.openAppIds).toEqual(["tasks"]);
    
    // Switch back to nova
    state = { ...state, currentCharacter: "nova" };
    expect(getActiveWorkspace(state).openAppIds).toEqual(["tasks"]);
  });
});
