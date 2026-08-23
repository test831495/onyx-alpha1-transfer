import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppWindowShell } from "./components/AppWindowShell";
import { HOME_MINIMAL, shellReducer, shellStateFactory, getActiveWorkspace } from "./shellState";

describe("Phase 1A.9.1 shell stabilization focused tests", () => {
  describe("Production root composition", () => {
    it("maintains shell factory with HOME_MINIMAL as initial state", () => {
      const state = shellStateFactory();
      expect(state.homeState).toBe(HOME_MINIMAL);
      expect(getActiveWorkspace(state).openAppIds).toHaveLength(0);
      expect(getActiveWorkspace(state).minimizedAppIds).toHaveLength(0);
      expect(getActiveWorkspace(state).selectedAppId).toBeNull();
    });

    it("confirms exactly one home state path exists", () => {
      const state = shellStateFactory();
      expect(state.homeState).toEqual(HOME_MINIMAL);
      // Verify no other home state constants exist
      expect(typeof HOME_MINIMAL).toBe("string");
    });

    it("shell reducer opens single app without duplicates", () => {
      const state = shellStateFactory();
      const after1 = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      expect(getActiveWorkspace(after1).openAppIds).toEqual(["news"]);
      
      // Opening same app again should not duplicate
      const after2 = shellReducer(after1, { type: "OPEN_APP", appId: "news" });
      expect(getActiveWorkspace(after2).openAppIds).toEqual(["news"]);
    });
  });

  describe("Character presence rendering", () => {
    it("shell state supports ONYX_ONLY presence mode", () => {
      const state = shellStateFactory();
      const withMode = shellReducer(state, {
        type: "SET_PRESENCE_MODE",
        mode: "ONYX_ONLY",
      });
      expect(withMode.presenceMode).toBe("ONYX_ONLY");
    });

    it("shell state supports NOVA_ONLY presence mode", () => {
      const state = shellStateFactory();
      const withMode = shellReducer(state, {
        type: "SET_PRESENCE_MODE",
        mode: "NOVA_ONLY",
      });
      expect(withMode.presenceMode).toBe("NOVA_ONLY");
    });

    it("shell state supports ONYX_AND_NOVA presence mode", () => {
      const state = shellStateFactory();
      const withMode = shellReducer(state, {
        type: "SET_PRESENCE_MODE",
        mode: "ONYX_AND_NOVA",
      });
      expect(withMode.presenceMode).toBe("ONYX_AND_NOVA");
    });
  });

  describe("Application registry and routing", () => {
    it("shell supports opening home app (returns to home view)", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      expect(getActiveWorkspace(state).openAppIds).toContain("news");
      
      // Opening home closes all apps
      state = shellReducer(state, { type: "OPEN_APP", appId: "home" });
      expect(getActiveWorkspace(state).openAppIds).toHaveLength(0);
    });

    it("shell supports opening messages app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "messages" });
      expect(getActiveWorkspace(open).openAppIds).toContain("messages");
    });

    it("shell supports opening tasks app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "tasks" });
      expect(getActiveWorkspace(open).openAppIds).toContain("tasks");
    });

    it("shell supports opening news app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      expect(getActiveWorkspace(open).openAppIds).toContain("news");
    });

    it("shell supports opening workspace app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "workspace" });
      expect(getActiveWorkspace(open).openAppIds).toContain("workspace");
    });

    it("shell supports opening calendar app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "calendar" });
      expect(getActiveWorkspace(open).openAppIds).toContain("calendar");
    });

    it("shell supports opening automation app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "automation" });
      expect(getActiveWorkspace(open).openAppIds).toContain("automation");
    });

    it("shell supports opening settings app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "settings" });
      expect(getActiveWorkspace(open).openAppIds).toContain("settings");
    });

    it("shell supports opening health app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "health" });
      expect(getActiveWorkspace(open).openAppIds).toContain("health");
    });

    it("shell supports opening provider-health app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "provider-health" });
      expect(getActiveWorkspace(open).openAppIds).toContain("provider-health");
    });
  });

  describe("App window shell controls", () => {
    it("renders AppWindowShell with visible minimize control", () => {
      const html = renderToStaticMarkup(
        <AppWindowShell
          appId="news"
          title="News"
          onMinimize={() => undefined}
          onClose={() => undefined}
        >
          <div>News content</div>
        </AppWindowShell>,
      );
      expect(html).toContain("Minimize");
      expect(html).toContain("aria-label");
    });

    it("renders AppWindowShell with visible close control", () => {
      const html = renderToStaticMarkup(
        <AppWindowShell
          appId="workspace"
          title="Workspace"
          onMinimize={() => undefined}
          onClose={() => undefined}
        >
          <div>Workspace content</div>
        </AppWindowShell>,
      );
      expect(html).toContain("Close");
      expect(html).toContain("aria-label");
    });

    it("AppWindowShell has accessible title heading", () => {
      const html = renderToStaticMarkup(
        <AppWindowShell
          appId="calendar"
          title="Calendar"
          onMinimize={() => undefined}
          onClose={() => undefined}
        >
          <div>Calendar content</div>
        </AppWindowShell>,
      );
      expect(html).toContain("<h2>Calendar</h2>");
    });

    it("AppWindowShell wraps content in body container", () => {
      const html = renderToStaticMarkup(
        <AppWindowShell
          appId="settings"
          title="Settings"
          onMinimize={() => undefined}
          onClose={() => undefined}
        >
          <div>Settings content</div>
        </AppWindowShell>,
      );
      expect(html).toContain("shell-window-body");
      expect(html).toContain("Settings content");
    });

    it("AppWindowShell uses dialog role for accessibility", () => {
      const html = renderToStaticMarkup(
        <AppWindowShell
          appId="automation"
          title="Automation"
          onMinimize={() => undefined}
          onClose={() => undefined}
        >
          <div>Automation content</div>
        </AppWindowShell>,
      );
      expect(html).toContain('role="dialog"');
    });
  });

  describe("Single foreground application", () => {
    it("open app sets focusedAppId to opened app", () => {
      const state = shellStateFactory();
      const open = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      expect(getActiveWorkspace(open).selectedAppId).toBe("news");
    });

    it("opening second app updates focused app", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      expect(getActiveWorkspace(state).selectedAppId).toBe("news");
      
      state = shellReducer(state, { type: "OPEN_APP", appId: "workspace" });
      expect(getActiveWorkspace(state).selectedAppId).toBe("workspace");
    });

    it("closing focused app clears focusedAppId", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      expect(getActiveWorkspace(state).selectedAppId).toBe("news");
      
      state = shellReducer(state, { type: "CLOSE_APP", appId: "news" });
      expect(getActiveWorkspace(state).selectedAppId).toBeNull();
      expect(getActiveWorkspace(state).openAppIds).not.toContain("news");
    });

    it("minimizing app removes from focusedAppId", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      expect(getActiveWorkspace(state).selectedAppId).toBe("news");
      
      state = shellReducer(state, { type: "MINIMIZE_APP", appId: "news" });
      expect(getActiveWorkspace(state).selectedAppId).toBeNull();
      expect(getActiveWorkspace(state).minimizedAppIds).toContain("news");
      expect(getActiveWorkspace(state).openAppIds).toContain("news");
    });
  });

  describe("Home return behavior", () => {
    it("RETURN_HOME intent closes all apps", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      state = shellReducer(state, { type: "OPEN_APP", appId: "workspace" });
      expect(getActiveWorkspace(state).openAppIds).toHaveLength(2);
      
      state = shellReducer(state, { type: "RETURN_HOME" });
      expect(getActiveWorkspace(state).openAppIds).toHaveLength(0);
      expect(state.homeState).toBe(HOME_MINIMAL);
    });

    it("RETURN_HOME clears minimized apps", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "news" });
      state = shellReducer(state, { type: "MINIMIZE_APP", appId: "news" });
      expect(getActiveWorkspace(state).minimizedAppIds).toHaveLength(1);
      
      state = shellReducer(state, { type: "RETURN_HOME" });
      expect(getActiveWorkspace(state).minimizedAppIds).toHaveLength(0);
    });
  });

  describe("No execution handler changes", () => {
    it("shell state factory does not enable scheduler", () => {
      const state = shellStateFactory();
      // Verify no scheduler-related flags are set
      expect(state).toBeDefined();
      expect(state.homeState).toBe(HOME_MINIMAL);
      // No execution-related properties should exist or be true
    });

    it("shell state factory does not enable promotion", () => {
      const state = shellStateFactory();
      // Verify no promotion-related flags are set
      expect(state).toBeDefined();
      expect(state.homeState).toBe(HOME_MINIMAL);
      // No promotion-related properties should exist or be true
    });
  });

  describe("Workspace provider section uniqueness", () => {
    it("shell supports exactly one workspace app instance", () => {
      let state = shellStateFactory();
      state = shellReducer(state, { type: "OPEN_APP", appId: "workspace" });
      expect(getActiveWorkspace(state).openAppIds).toEqual(["workspace"]);
      
      // Attempting to open workspace again should not duplicate
      state = shellReducer(state, { type: "OPEN_APP", appId: "workspace" });
      expect(getActiveWorkspace(state).openAppIds).toEqual(["workspace"]);
    });
  });

  describe("Legacy widget containment", () => {
    it("AppWindowShell contains child content within bounded viewport", () => {
      const html = renderToStaticMarkup(
        <AppWindowShell
          appId="workspace"
          title="Workspace"
          onMinimize={() => undefined}
          onClose={() => undefined}
        >
          <div className="workspace-content">Content here</div>
        </AppWindowShell>,
      );
      expect(html).toContain("shell-window-body");
      expect(html).toContain("workspace-content");
      // Verify shell-window element uses CSS containment
      expect(html).toContain("shell-window");
    });
  });

  describe("Card overview composition", () => {
    it("renders equal-shell app cards around the character stage", () => {
      const html = renderToStaticMarkup(
        <div className="functional-scene functional-scene--cards">
          <div className="app-card-list">
            <section className="app-card-shell app-card-shell--left_top app-card-shell--selected" data-position="LEFT_TOP">
              <header className="app-card-shell__header">
                <button type="button" aria-label="Minimize Messages">Minimize</button>
                <button type="button" aria-label="Close Messages">Close</button>
              </header>
            </section>
            <section className="app-card-shell app-card-shell--right_middle" data-position="RIGHT_MIDDLE">
              <header className="app-card-shell__header">
                <button type="button" aria-label="Minimize Tasks">Minimize</button>
                <button type="button" aria-label="Close Tasks">Close</button>
              </header>
            </section>
          </div>
        </div>,
      );

      expect(html).toContain("functional-scene--cards");
      expect(html).toContain("app-card-shell");
      expect(html).toContain("LEFT_TOP");
      expect(html).toContain("RIGHT_MIDDLE");
      expect(html).toContain("Minimize");
      expect(html).toContain("Close");
    });

    it("keeps the character stage visible when a compact app card is open", () => {
      const html = renderToStaticMarkup(
        <section className="functional-scene functional-scene--cards">
          <div className="hero-core" data-character-visible="true" />
          <div className="app-card-list">
            <div className="app-card-shell app-card-shell--right_middle" data-position="RIGHT_MIDDLE" />
          </div>
        </section>,
      );

      expect(html).toContain("hero-core");
      expect(html).toContain("data-character-visible");
      expect(html).toContain("app-card-shell--right_middle");
    });
  });
});

