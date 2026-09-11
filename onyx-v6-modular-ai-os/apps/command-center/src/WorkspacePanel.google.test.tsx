import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WorkspacePanel } from "./components/WorkspacePanel";

describe("Google Workspace card", () => {
  it("renders shared connection actions without a Coming Soon placeholder", () => {
    const onAction = vi.fn();
    const html = renderToStaticMarkup(
      <WorkspacePanel
        snapshot={{
          updatedAt: Date.now(),
          providers: [{
            provider: "google",
            label: "Google",
            state: "disconnected",
            diagnostic: "Google is not connected.",
            capabilities: [
              { id: "profile", label: "Google profile", enabled: false },
              { id: "mail", label: "Gmail", enabled: false },
              { id: "calendar", label: "Google Calendar", enabled: false },
              { id: "files", label: "Google Drive", enabled: false },
            ],
          }],
        }}
        busy={false}
        onConnect={() => undefined}
        onReconnect={() => undefined}
        onDisconnect={() => undefined}
        onRefresh={() => undefined}
        onProviderAction={onAction}
      />,
    );

    expect(html).toContain("Connect Google");
    expect(html).toContain("Refresh Google workspace status");
    expect(html).not.toContain("Coming Soon");
  });
});