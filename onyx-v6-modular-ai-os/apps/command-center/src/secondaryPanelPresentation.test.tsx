import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CalendarIntelligencePanel } from "./components/CalendarIntelligencePanel";
import { NewsPanel } from "./components/NewsPanel";
import { WorkspacePanel } from "./components/WorkspacePanel";
import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";
import { reconcileMicrosoftReconnect } from "./App";

describe("secondary panel presentation", () => {
  it("awaits reconnect, refreshes Workspace and Calendar, and handles reconnect failures", async () => {
    const reconnect = vi.fn().mockResolvedValue(undefined);
    const refreshWorkspace = vi.fn().mockResolvedValue({ activeProvider: "microsoft" });
    const loadCalendarEvents = vi.fn().mockResolvedValue([{ id: "event-1" }]);
    const setWorkspace = vi.fn();
    const setCalendarEvents = vi.fn();
    const setCalendarUnavailable = vi.fn();
    const setBusy = vi.fn();
    const showError = vi.fn();

    await reconcileMicrosoftReconnect({
      reconnect,
      refreshWorkspace,
      loadCalendarEvents,
      range: "TODAY",
      setWorkspace,
      setCalendarEvents,
      setCalendarUnavailable,
      setBusy,
      showError,
    });

    expect(reconnect).toHaveBeenCalledOnce();
    expect(refreshWorkspace).toHaveBeenCalledOnce();
    expect(loadCalendarEvents).toHaveBeenCalledOnce();
    expect(setCalendarEvents).toHaveBeenCalledWith([{ id: "event-1" }]);
    expect(setCalendarUnavailable).toHaveBeenCalledWith(false);
    expect(setBusy).toHaveBeenLastCalledWith(false);
    expect(showError).not.toHaveBeenCalled();

    reconnect.mockRejectedValueOnce(new Error("recoverable reconnect failure"));
    await reconcileMicrosoftReconnect({
      reconnect,
      refreshWorkspace,
      loadCalendarEvents,
      range: "TODAY",
      setWorkspace,
      setCalendarEvents,
      setCalendarUnavailable,
      setBusy,
      showError,
    });

    expect(showError).toHaveBeenCalledWith("recoverable reconnect failure");
    expect(setBusy).toHaveBeenLastCalledWith(false);
  });

  it("clears stale Microsoft calendar projection when reconnect leaves Microsoft inactive", async () => {
    const loadCalendarEvents = vi.fn().mockResolvedValue([{ id: "should-not-load" }]);
    const setCalendarEvents = vi.fn();
    const setCalendarUnavailable = vi.fn();

    await reconcileMicrosoftReconnect({
      reconnect: vi.fn().mockResolvedValue(undefined),
      refreshWorkspace: vi.fn().mockResolvedValue({ activeProvider: "google" }),
      loadCalendarEvents,
      range: "TODAY",
      setWorkspace: vi.fn(),
      setCalendarEvents,
      setCalendarUnavailable,
      setBusy: vi.fn(),
      showError: vi.fn(),
    });

    expect(loadCalendarEvents).not.toHaveBeenCalled();
    expect(setCalendarEvents).toHaveBeenCalledWith([]);
    expect(setCalendarUnavailable).toHaveBeenCalledWith(false);
  });

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
        onReconnect={() => undefined}
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

  it("renders connected Microsoft calendar events without exposing provider internals", () => {
    const html = renderToStaticMarkup(
      <CalendarIntelligencePanel
        summary={undefined}
        busy={false}
        onRefresh={() => undefined}
        onSpeak={() => undefined}
        connected
        events={[{
          id: "event-1",
          subject: "Planning",
          start: "2026-09-10T09:00:00.000Z",
          end: "2026-09-10T10:00:00.000Z",
          isAllDay: false,
          isCancelled: false,
          isOnlineMeeting: false,
        }]}
      />,
    );

    expect(html).toContain("Planning");
    expect(html).toContain("1 event");
    expect(html).not.toContain("No connected calendar event data is available.");
    expect(html).not.toContain("graph.microsoft.com");
  });

  it("distinguishes connected empty results from the provider-free fallback", () => {
    const html = renderToStaticMarkup(
      <CalendarIntelligencePanel summary={undefined} connected events={[]} busy={false} onRefresh={() => undefined} onSpeak={() => undefined} />,
    );

    expect(html).toContain("No events are scheduled for this range.");
    expect(html).not.toContain("No connected calendar event data is available.");
  });

  it("labels a connected but unavailable calendar truthfully", () => {
    const html = renderToStaticMarkup(
      <CalendarIntelligencePanel summary={{
        requestedRange: { kind: "TODAY", start: "2026-09-10", end: "2026-09-11", displayLabel: "Today", timeZone: "UTC" },
        currentDateTime: "Today",
        connectionState: "NOT_CONFIGURED",
        eventCount: "UNKNOWN",
        events: [],
        limitations: [],
        nextAvailableAction: "REFRESH_LOCAL_TEMPORAL_CONTEXT",
        privacyStatus: "LOCAL_FACTS_ONLY",
        speech: "",
      }} connected unavailable events={[]} busy={false} onRefresh={() => undefined} onSpeak={() => undefined} />,
    );

    expect(html).toContain("Connected, unavailable");
    expect(html).toContain("Microsoft calendar is connected, but events could not be loaded for this range.");
    expect(html).not.toContain("Not configured");
  });

  it("uses explicit reconnect and disconnect actions for a connected workspace", () => {
    const snapshot: WorkspaceSnapshot = {
      updatedAt: Date.now(),
      activeProvider: "microsoft",
      providers: [{
        provider: "microsoft",
        label: "Microsoft 365",
        state: "connected",
        diagnostic: "Connected",
        capabilities: [{ id: "calendar", label: "Microsoft calendar", enabled: true }],
      }],
    };
    const html = renderToStaticMarkup(
      <WorkspacePanel snapshot={snapshot} busy={false} onConnect={() => undefined} onReconnect={() => undefined} onDisconnect={() => undefined} onRefresh={() => undefined} />,
    );

    expect(html).toContain("Reconnect");
    expect(html).toContain("Disconnect");
    expect(html).not.toContain(">Manage<");
  });
});
