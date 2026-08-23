import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CalendarIntelligencePanel } from "./components/CalendarIntelligencePanel";
import { NewsPanel } from "./components/NewsPanel";
import { WorkspacePanel } from "./components/WorkspacePanel";
import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";

describe("secondary panel presentation", () => {
  it("uses friendly workspace statuses and hides alpha release details from default view", () => {
    const snapshot: WorkspaceSnapshot = {
      updatedAt: Date.now(),
      providers: [
        {
          provider: "microsoft",
          label: "Microsoft 365",
          state: "unconfigured",
          diagnostic: "Microsoft workspace is ready to connect.",
          capabilities: [
            { id: "profile", label: "Microsoft profile", enabled: true },
            { id: "calendar", label: "Microsoft calendar", enabled: true },
          ],
        },
        {
          provider: "google",
          label: "Google",
          state: "unconfigured",
          diagnostic: "Google connection is planned after Microsoft foundation acceptance.",
          capabilities: [{ id: "profile", label: "Google profile", enabled: false, plannedRelease: "Alpha 3.1.2" }],
        },
        {
          provider: "yahoo",
          label: "Yahoo",
          state: "unconfigured",
          diagnostic: "Yahoo Mail connection is planned for the email intelligence release.",
          capabilities: [{ id: "profile", label: "Yahoo profile", enabled: false, plannedRelease: "Alpha 3.1.2" }],
        },
      ],
    };

    const html = renderToStaticMarkup(
      <WorkspacePanel
        snapshot={snapshot}
        busy={false}
        onConnect={() => undefined}
        onDisconnect={() => undefined}
        onRefresh={() => undefined}
      />,
    );

    expect(html).toContain("Connected Services");
    expect(html).toContain("Not Connected");
    expect(html).toContain("Available");
    expect(html).toContain("Coming Soon");
    expect(html).not.toContain("Alpha 3.1.2");
    expect(html).not.toContain("PHASE 1 WORKSPACE");
  });

  it("renders a complete empty state for news", () => {
    const html = renderToStaticMarkup(
      <NewsPanel loading={false} connected={false} onRefresh={() => undefined} onManage={() => undefined} />,
    );

    expect(html).toContain("News");
    expect(html).toContain("No news is available yet.");
    expect(html).toContain("Connect a news source or refresh to check for updates.");
    expect(html).toContain("Manage Sources");
  });

  it("renders a complete empty state for calendar and uses the friendly local label", () => {
    const html = renderToStaticMarkup(
      <CalendarIntelligencePanel summary={undefined} busy={false} onRefresh={() => undefined} onSpeak={() => undefined} />,
    );

    expect(html).toContain("Local Calendar");
    expect(html).toContain("Calendar");
    expect(html).toContain("No calendar events are available.");
    expect(html).toContain("Connect a calendar account or refresh to check for events.");
    expect(html).toContain("Read Agenda");
    expect(html).not.toContain("MICROSOFT CALENDAR");
    expect(html).not.toContain("Speak");
  });
});
