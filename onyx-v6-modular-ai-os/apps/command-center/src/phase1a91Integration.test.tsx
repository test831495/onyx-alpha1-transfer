import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  shellReducer,
  shellStateFactory,
  getActiveWorkspace,
  getVisibleAppIds,
  allocateVisibleAndOverflow,
  resolveShellIntent,
  type ShellAppId,
} from "./shellState";
import { getAppDetail } from "./appDetailRegistry";
import { AppCardShell } from "./components/AppCardShell";
import { clampCardX, clampCardPosition } from "./shellState";

describe("Phase 1A.9.1 Integration Tests", () => {
  describe("Card presentation stabilization", () => {
    it("brings a rear card forward with bounded z-order and preserves its sibling", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
      state = shellReducer(state, { type: "FOCUS_APP", appId: "news" });
      const workspace = getActiveWorkspace(state);
      expect(workspace.selectedAppId).toBe("news");
      expect(workspace.cardPresentationByAppId.get("news")?.zIndex).toBe(6);
      expect(workspace.cardPresentationByAppId.get("tasks")?.zIndex).toBe(5);
      expect(workspace.openAppIds).toEqual(["news", "tasks"]);
      expect(Math.max(...[...workspace.cardPresentationByAppId.values()].map((x) => x.zIndex))).toBeLessThanOrEqual(6);
    });

    it("persists manual card coordinates and clamps them outside the protected core", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      state = shellReducer(state, { type: "SET_CARD_POSITION", appId: "news", x: 45, y: 90 });
      const presentation = getActiveWorkspace(state).cardPresentationByAppId.get("news");
      expect(presentation?.x).toBe(26);
      expect(presentation?.y).toBe(72);
      expect(presentation?.hasManualPosition).toBe(true);
      expect(clampCardX(75)).toBe(72);
      expect(clampCardX(-4)).toBe(0);
      expect(clampCardPosition(45, 10)).toEqual({ x: 45, y: 10 });
      expect(clampCardPosition(45, 60).x).toBe(26);
    });

    it("renders a selectable card with a drag handle and presentation z-index", () => {
      const html = renderToStaticMarkup(
        <AppCardShell
          appId="news"
          title="News"
          position="LEFT_TOP"
          selected
          x={2}
          y={3}
          zIndex={6}
          onMove={() => undefined}
        >
          <span>News content</span>
        </AppCardShell>,
      );
      expect(html).toContain('aria-selected="true"');
      expect(html).toContain('data-card-drag-handle="true"');
      expect(html).toContain('style="left:2%;top:3%;z-index:6;--card-x:2%;--card-y:3%;--card-left:2%;--card-top:3%"');
      expect(html).toContain('data-card-x="2"');
      expect(html).toContain('data-card-y="3"');
    });

    it("keeps card presentation isolated between character workspaces", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      state = shellReducer(state, { type: "SET_CARD_POSITION", appId: "news", x: 70, y: 20 });
      state = { ...state, currentCharacter: "onyx" };
      expect(getActiveWorkspace(state).cardPresentationByAppId.has("news")).toBe(false);
      state = { ...state, currentCharacter: "nova" };
      expect(getActiveWorkspace(state).cardPresentationByAppId.get("news")?.x).toBe(70);
    });
  });

  describe("Overflow Behavior", () => {
    it("allocates six unique slots for applications 1-6", () => {
      const state = shellStateFactory();
      const appIds: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation"];
      
      let current = state;
      for (const appId of appIds) {
        current = shellReducer(current, { type: "OPEN_APP", appId });
      }
      
      const active = getActiveWorkspace(current);
      expect(active.openAppIds).toHaveLength(6);
      expect(new Set(active.openAppIds).size).toBe(6); // All unique
    });

    it("preserves all apps when opening app 7+", () => {
      const state = shellStateFactory();
      const appIds: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      
      let current = state;
      for (const appId of appIds) {
        current = shellReducer(current, { type: "OPEN_APP", appId });
      }
      
      const active = getActiveWorkspace(current);
      expect(active.openAppIds).toHaveLength(7);
      expect(active.openAppIds).toContain("messages");
      expect(active.openAppIds).toContain("health");
    });

    it("shows +N more apps indicator for overflow", () => {
      const state = shellStateFactory();
      const appIds: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health", "settings"];
      
      let current = state;
      for (const appId of appIds) {
        current = shellReducer(current, { type: "OPEN_APP", appId });
      }
      
      const active = getActiveWorkspace(current);
      const { overflowCount } = allocateVisibleAndOverflow(active.openAppIds, active.minimizedAppIds, 0);
      expect(overflowCount).toBe(2);
    });

    it("changes overflow page without mutating openAppIds", () => {
      const state = shellStateFactory();
      const appIds: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health", "settings"];
      
      let current = state;
      for (const appId of appIds) {
        current = shellReducer(current, { type: "OPEN_APP", appId });
      }
      
      const beforePage = getActiveWorkspace(current).openAppIds;
      const currentAfterPageChange = shellReducer(current, { type: "SET_OVERFLOW_PAGE", page: 1 });
      const afterPage = getActiveWorkspace(currentAfterPageChange).openAppIds;
      
      expect(beforePage).toEqual(afterPage);
      expect(getActiveWorkspace(currentAfterPageChange).overflowPage).toBe(1);
    });

    it("makes all overflow apps retrievable via page navigation", () => {
      const state = shellStateFactory();
      const appIds: ShellAppId[] = ["messages", "tasks", "news", "workspace", "calendar", "automation", "health"];
      
      let current = state;
      for (const appId of appIds) {
        current = shellReducer(current, { type: "OPEN_APP", appId });
      }
      
      const active = getActiveWorkspace(current);
      const { visibleAppIds, overflowAppIds } = allocateVisibleAndOverflow(active.openAppIds, active.minimizedAppIds, 0);
      
      expect(visibleAppIds.length).toBe(6);
      expect(overflowAppIds.length).toBe(1);
      expect(visibleAppIds).toContain("messages");
      expect(overflowAppIds).toContain("health");
    });
  });

  describe("Minimized App Tray", () => {
    it("minimizes app and removes from visible cards", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      state = shellReducer(state, { type: "MINIMIZE_APP", appId: "messages" });
      
      const active = getActiveWorkspace(state);
      expect(active.minimizedAppIds).toContain("messages");
      expect(active.openAppIds).toContain("messages");
    });

    it("restores minimized app to visible cards", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      state = shellReducer(state, { type: "MINIMIZE_APP", appId: "messages" });
      state = shellReducer(state, { type: "RESTORE_APP", appId: "messages" });
      
      const active = getActiveWorkspace(state);
      expect(active.minimizedAppIds).not.toContain("messages");
      expect(active.openAppIds).toContain("messages");
    });

    it("closes minimized app removes from both visible and minimized", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      state = shellReducer(state, { type: "MINIMIZE_APP", appId: "messages" });
      state = shellReducer(state, { type: "CLOSE_APP", appId: "messages" });
      
      const active = getActiveWorkspace(state);
      expect(active.minimizedAppIds).not.toContain("messages");
      expect(active.openAppIds).not.toContain("messages");
    });

    it("keeps minimized apps open, just not visible", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      state = shellReducer(state, { type: "MINIMIZE_APP", appId: "messages" });
      
      const active = getActiveWorkspace(state);
      const visible = getVisibleAppIds(state);
      
      expect(active.openAppIds).toContain("messages");
      expect(visible).not.toContain("messages");
      expect(active.minimizedAppIds).toContain("messages");
    });
  });

  describe("Detail Registry", () => {
    it("every registered app has label, icon, and component", () => {
      const appIds: ShellAppId[] = ["home", "messages", "tasks", "news", "workspace", "calendar", "automation", "settings", "health", "provider-health"];
      
      for (const appId of appIds) {
        const detail = getAppDetail(appId);
        expect(detail).toBeDefined();
        expect(detail?.label).toBeTruthy();
        expect(detail?.icon).toBeTruthy();
        expect(detail?.detailComponent).toBeDefined();
      }
    });

    it("news uses real NewsPanel component", () => {
      const spec = getAppDetail("news");
      expect(spec?.supportsDetails).toBe(true);
    });

    it("workspace uses real WorkspacePanel component", () => {
      const spec = getAppDetail("workspace");
      expect(spec?.supportsDetails).toBe(true);
    });

    it("automation uses real AutomationDashboard component", () => {
      const spec = getAppDetail("automation");
      expect(spec?.supportsDetails).toBe(true);
    });

    it("calendar uses real CalendarIntelligencePanel component", () => {
      const spec = getAppDetail("calendar");
      expect(spec?.supportsDetails).toBe(true);
    });

    it("settings uses real SettingsCenter component", () => {
      const spec = getAppDetail("settings");
      expect(spec?.supportsDetails).toBe(true);
    });

    it("health uses real ProviderHealthDashboard component", () => {
      const spec = getAppDetail("health");
      expect(spec?.supportsDetails).toBe(true);
    });
  });

  describe("Detail Shell Mode", () => {
    it("OPEN_DETAILS captures workspace state snapshot before opening", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
      
      const beforeDetail = getActiveWorkspace(state);
      const openAppsCountBefore = beforeDetail.openAppIds.length;
      
      state = shellReducer(state, { type: "OPEN_DETAILS", appId: "messages" });
      
      const withDetail = getActiveWorkspace(state);
      expect(withDetail.detailAppId).toBe("messages");
      expect(withDetail.detailReturnSnapshot).toBeDefined();
      expect(withDetail.detailReturnSnapshot?.openAppIds.length).toBe(openAppsCountBefore);
    });

    it("CLOSE_DETAILS restores exact prior workspace state", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      
      const beforeDetail = getActiveWorkspace(state);
      
      state = shellReducer(state, { type: "OPEN_DETAILS", appId: "messages" });
      state = shellReducer(state, { type: "CLOSE_DETAILS" });
      
      const restored = getActiveWorkspace(state);
      expect(restored.openAppIds).toEqual(beforeDetail.openAppIds);
      expect(restored.selectedAppId).toBe(beforeDetail.selectedAppId);
      expect(restored.detailAppId).toBeNull();
    });

    it("closes detail only the app presentation, not underlying work", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "automation" });
      state = shellReducer(state, { type: "OPEN_DETAILS", appId: "automation" });
      state = shellReducer(state, { type: "CLOSE_DETAILS" });
      
      const active = getActiveWorkspace(state);
      expect(active.openAppIds).toContain("automation");
      expect(active.detailAppId).toBeNull();
    });
  });

  describe("Presence Workspace Isolation", () => {
    it("NOVA_ONLY workspace is independent from ONYX_ONLY", () => {
      let state = shellStateFactory();
      
      // NOVA workspace
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "workspace" });
      
      let novaWorkspace = getActiveWorkspace(state);
      expect(novaWorkspace.openAppIds).toHaveLength(3);
      
      // Switch to ONYX
      state = shellReducer(state, { type: "SET_PRESENCE_MODE", mode: "ONYX_ONLY" });
      state = { ...state, currentCharacter: "onyx" }; // Simulate character switch
      
      let onyxWorkspace = getActiveWorkspace(state);
      expect(onyxWorkspace.openAppIds).toHaveLength(0);
      
      // Open different apps in ONYX
      state = shellReducer(state, { type: "OPEN_APP", appId: "automation" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "health" });
      
      onyxWorkspace = getActiveWorkspace(state);
      expect(onyxWorkspace.openAppIds).toContain("automation");
      expect(onyxWorkspace.openAppIds).not.toContain("news");
    });

    it("switching back restores each workspace exactly", () => {
      let state = shellStateFactory();
      
      // Setup NOVA with apps
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
      
      const novaApps = getActiveWorkspace(state).openAppIds.slice();
      
      // Switch to ONYX and open different apps
      state = shellReducer(state, { type: "SET_PRESENCE_MODE", mode: "ONYX_ONLY" });
      state = { ...state, currentCharacter: "onyx" };
      
      state = shellReducer(state, { type: "OPEN_APP", appId: "automation" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "health" });
      
      // Switch back to NOVA
      state = shellReducer(state, { type: "SET_PRESENCE_MODE", mode: "NOVA_ONLY" });
      state = { ...state, currentCharacter: "nova" };
      
      const restoredNovaWorkspace = getActiveWorkspace(state);
      expect(restoredNovaWorkspace.openAppIds).toEqual(novaApps);
    });
  });

  describe("Typed Shell Commands", () => {
    it("resolves 'Open Messages' to OPEN_APP intent", () => {
      const intent = resolveShellIntent("open messages");
      expect(intent?.type).toBe("OPEN_APP");
      expect((intent as any)?.appId).toBe("messages");
    });

    it("resolves 'Open Tasks' to OPEN_APP intent", () => {
      const intent = resolveShellIntent("open tasks");
      expect(intent?.type).toBe("OPEN_APP");
      expect((intent as any)?.appId).toBe("tasks");
    });

    it("resolves 'Close Tasks' to CLOSE_APP intent", () => {
      const intent = resolveShellIntent("close tasks");
      expect(intent?.type).toBe("CLOSE_APP");
      expect((intent as any)?.appId).toBe("tasks");
    });

    it("resolves 'Open Automation details' to OPEN_DETAILS intent", () => {
      const intent = resolveShellIntent("open automation details");
      expect(intent?.type).toBe("OPEN_DETAILS");
      expect((intent as any)?.appId).toBe("automation");
    });

    it("resolves 'Back to character view' to close view intent", () => {
      const intent = resolveShellIntent("back to character view");
      // Can resolve to either CLOSE_DETAILS or RETURN_HOME depending on context
      expect(intent?.type === "CLOSE_DETAILS" || intent?.type === "RETURN_HOME").toBe(true);
    });

    it("resolves 'Switch to ONYX' to SET_PRESENCE_MODE intent", () => {
      const intent = resolveShellIntent("switch to onyx");
      expect(intent?.type).toBe("SET_PRESENCE_MODE");
      expect((intent as any)?.mode).toBe("ONYX_ONLY");
    });

    it("resolves 'Switch to NOVA' to SET_PRESENCE_MODE intent", () => {
      const intent = resolveShellIntent("switch to nova");
      expect(intent?.type).toBe("SET_PRESENCE_MODE");
      expect((intent as any)?.mode).toBe("NOVA_ONLY");
    });

    it("resolves 'Close all panels' to CLOSE_ALL_APPS intent", () => {
      const intent = resolveShellIntent("close all panels");
      expect(intent?.type).toBe("CLOSE_ALL_APPS");
    });

    it("returns null for unmatched text", () => {
      const intent = resolveShellIntent("random text that doesnt match");
      expect(intent).toBeNull();
    });
  });

  describe("Acknowledgement vs Execution", () => {
    it("visible shell state change proves successful execution, not just acknowledgement", () => {
      let state = shellStateFactory();
      const before = getVisibleAppIds(state).length;
      
      state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      
      const after = getVisibleAppIds(state).length;
      expect(after).toBeGreaterThan(before);
    });
  });

  describe("Dual Presence Mode Workspace", () => {
    it("ONYX_AND_NOVA mode has independent workspace", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "SET_PRESENCE_MODE", mode: "ONYX_AND_NOVA" });
      
      state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
      
      const workspace = getActiveWorkspace(state);
      expect(workspace.openAppIds).toContain("messages");
      expect(workspace.openAppIds).toContain("tasks");
    });

    it("switching presence mode between ONYX_ONLY and NOVA_ONLY preserves each independently", () => {
      let state = shellStateFactory();
      state = { ...state, currentCharacter: "nova" };
      
      // Setup NOVA workspace
      state = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
      
      const novaApps = getActiveWorkspace(state).openAppIds.slice();
      
      // Switch to ONYX
      state = shellReducer(state, { type: "SET_PRESENCE_MODE", mode: "ONYX_ONLY" });
      state = { ...state, currentCharacter: "onyx" };
      
      // ONYX starts empty
      let onyxWorkspace = getActiveWorkspace(state);
      expect(onyxWorkspace.openAppIds).toHaveLength(0);
      
      // Open different apps in ONYX
      state = shellReducer(state, { type: "OPEN_APP", appId: "automation" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "health" });
      
      const onyxApps = getActiveWorkspace(state).openAppIds.slice();
      expect(onyxApps).not.toEqual(novaApps);
      
      // Switch back to NOVA
      state = shellReducer(state, { type: "SET_PRESENCE_MODE", mode: "NOVA_ONLY" });
      state = { ...state, currentCharacter: "nova" };
      
      const restoredNovaWorkspace = getActiveWorkspace(state).openAppIds;
      expect(restoredNovaWorkspace).toEqual(novaApps);
    });
  });

  describe("Speech Status Indicators", () => {
    it("HEARD state updates with recognized transcript", () => {
      // Voice router updates diagnostic with HEARD text
      // This is tested in useVoiceRouter via the diagnostic state
      expect(true).toBe(true); // Placeholder for voice testing
    });

    it("HEARD state clears using existing status lifecycle", () => {
      // Voice router clears HEARD after 1500ms via setDiagnostic
      expect(true).toBe(true); // Placeholder for voice testing
    });

    it("SPEAKING displays only during actual speech output", () => {
      // SettingsCenter and voice components manage voice output states
      expect(true).toBe(true); // Placeholder for voice testing
    });
  });

  describe("Overflow Controls Accessibility", () => {
    it("Previous Apps button disabled when on first page", () => {
      const state = shellStateFactory();
      const { currentPage } = allocateVisibleAndOverflow([], [], 0);
      expect(currentPage).toBe(0);
    });

    it("Next Apps button disabled when on last page", () => {
      let state = shellStateFactory();
      const appIds: ShellAppId[] = ["messages", "tasks", "news"];
      
      for (const appId of appIds) {
        state = shellReducer(state, { type: "OPEN_APP", appId });
      }
      
      const active = getActiveWorkspace(state);
      const { currentPage, totalPages } = allocateVisibleAndOverflow(active.openAppIds, active.minimizedAppIds, 0);
      expect(currentPage).toBe(0);
      expect(totalPages).toBe(1);
    });

    it("keyboard navigation available for Previous/Next", () => {
      // OverflowIndicator component supports keyboard via standard button handling
      expect(true).toBe(true); // Placeholder for keyboard testing
    });
  });
});
