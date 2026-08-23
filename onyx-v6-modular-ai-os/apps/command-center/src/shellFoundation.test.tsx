import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppWindowShell } from "./components/AppWindowShell";
import { HOME_MINIMAL, shellReducer, shellStateFactory, type ShellIntent, getActiveWorkspace } from "./shellState";
import { APP_REGISTRY } from "./applicationRegistry";

describe("Phase 1A.9.1 shell foundation", () => {
  it("declares the minimal home shell and default registry", () => {
    const next = shellStateFactory();
    const active = getActiveWorkspace(next);
    expect(next.homeState).toBe(HOME_MINIMAL);
    expect(active.openAppIds).toEqual([]);
    expect(active.selectedAppId).toBeNull();
    expect(APP_REGISTRY.some((entry) => entry.appId === "home")).toBe(true);
    expect(APP_REGISTRY.some((entry) => entry.appId === "automation")).toBe(true);
  });

  it("dispatches a deterministic OPEN_APP shell intent", () => {
    const state = shellStateFactory();
    const intent: ShellIntent = { type: "OPEN_APP", appId: "tasks" };
    const next = shellReducer(state, intent);
    const active = getActiveWorkspace(next);
    expect(active.openAppIds).toContain("tasks");
    expect(active.selectedAppId).toBe("tasks");
    expect(next.homeState).toBe(HOME_MINIMAL);
  });

  it("renders a reusable app window shell with close and minimize controls", () => {
    const html = renderToStaticMarkup(
      <AppWindowShell
        appId="automation"
        title="Automation"
        onMinimize={() => undefined}
        onClose={() => undefined}
      >
        <div>Automation Center</div>
      </AppWindowShell>,
    );
    expect(html).toContain("Automation");
    expect(html).toContain("Minimize");
    expect(html).toContain("Close");
  });
});
