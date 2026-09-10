import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { CalendarIntelligencePanel } from "./components/CalendarIntelligencePanel";
import { NewsPanel } from "./components/NewsPanel";
import { WorkspacePanel } from "./components/WorkspacePanel";
import type { CalendarEventRecord } from "@onyx/calendar-intelligence";
import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";
import { createCalendarRequestCoordinator, isCalendarConnected, isMicrosoftCalendarAdapterEligible, readLatestCalendarRange, reconcileMicrosoftReconnect } from "./App";

describe("secondary panel presentation", () => {
  it("derives Calendar readiness from the canonical active provider and capability", () => {
    expect(isCalendarConnected({
      activeProvider: "microsoft",
      providers: [{
        provider: "microsoft",
        label: "Microsoft 365",
        state: "unconfigured",
        diagnostic: "Restored active provider",
        capabilities: [{ id: "calendar", label: "Microsoft calendar", enabled: true }],
      }],
      updatedAt: Date.now(),
    })).toBe(true);

    expect(isCalendarConnected({
      activeProvider: "google",
      providers: [{
        provider: "google",
        label: "Google",
        state: "connected",
        diagnostic: "Connected",
        capabilities: [{ id: "calendar", label: "Google calendar", enabled: false }],
      }],
      updatedAt: Date.now(),
    })).toBe(false);
  });

  it("guards the Microsoft adapter at its provider-specific boundary", () => {
    const microsoft = {
      activeProvider: "microsoft" as const,
      providers: [{ provider: "microsoft" as const, label: "Microsoft 365", state: "connected" as const, diagnostic: "Connected", capabilities: [{ id: "calendar" as const, label: "Microsoft calendar", enabled: true }] }],
      updatedAt: Date.now(),
    };
    expect(isMicrosoftCalendarAdapterEligible(microsoft)).toBe(true);
    expect(isMicrosoftCalendarAdapterEligible({
      activeProvider: "google",
      providers: [{ provider: "google", label: "Google", state: "connected", diagnostic: "Connected", capabilities: [{ id: "calendar", label: "Google calendar", enabled: true }] }],
      updatedAt: Date.now(),
    })).toBe(false);
    expect(isMicrosoftCalendarAdapterEligible({
      ...microsoft,
      providers: [{ provider: "microsoft", label: "Microsoft 365", state: "connected", diagnostic: "Connected", capabilities: [{ id: "calendar", label: "Microsoft calendar", enabled: false }] }],
    })).toBe(false);
  });

  it("ignores stale range success, failure, and empty results", async () => {
    const coordinator = createCalendarRequestCoordinator();
    const pending: Array<{ resolve: (events: readonly CalendarEventRecord[]) => void; reject: () => void }> = [];
    const loadEvents = vi.fn(() => new Promise<readonly CalendarEventRecord[]>((resolve, reject) => pending.push({ resolve, reject })));
    const events = vi.fn();
    const failure = vi.fn();
    const settled = vi.fn();
    const today = readLatestCalendarRange("TODAY", loadEvents, coordinator, events, failure, settled);
    const tomorrow = readLatestCalendarRange("TOMORROW", loadEvents, coordinator, events, failure, settled);

    pending[1]!.resolve([{ id: "tomorrow", subject: "Tomorrow", start: "2026-09-11T09:00:00.000Z", end: "2026-09-11T10:00:00.000Z", isAllDay: false, isCancelled: false, isOnlineMeeting: false }]);
    await tomorrow;
    pending[0]!.resolve([]);
    await today;

    expect(events).toHaveBeenCalledTimes(1);
    expect(events).toHaveBeenCalledWith([{ id: "tomorrow", subject: "Tomorrow", start: "2026-09-11T09:00:00.000Z", end: "2026-09-11T10:00:00.000Z", isAllDay: false, isCancelled: false, isOnlineMeeting: false }]);
    expect(failure).not.toHaveBeenCalled();
    expect(settled).toHaveBeenCalledTimes(1);
  });

  it("ignores a pending Microsoft result after request invalidation", async () => {
    const coordinator = createCalendarRequestCoordinator();
    let resolveRequest: ((events: readonly CalendarEventRecord[]) => void) | undefined;
    const request = readLatestCalendarRange("TODAY", () => new Promise<readonly CalendarEventRecord[]>((resolve) => { resolveRequest = resolve; }), coordinator, vi.fn(), vi.fn(), vi.fn());
    coordinator.invalidate();
    resolveRequest?.([{ id: "stale", subject: "Stale", start: "2026-09-10T09:00:00.000Z", end: "2026-09-10T10:00:00.000Z", isAllDay: false, isCancelled: false, isOnlineMeeting: false }]);
    await request;
    expect(coordinator.isCurrent(1)).toBe(false);
  });

  it("ignores an older failure but reports the current request failure", async () => {
    const coordinator = createCalendarRequestCoordinator();
    const pending: Array<{ resolve: (events: readonly CalendarEventRecord[]) => void; reject: () => void }> = [];
    const loadEvents = vi.fn(() => new Promise<readonly CalendarEventRecord[]>((resolve, reject) => pending.push({ resolve, reject })));
    const events = vi.fn();
    const failure = vi.fn();
    const settled = vi.fn();
    const today = readLatestCalendarRange("TODAY", loadEvents, coordinator, events, failure, settled);
    const tomorrow = readLatestCalendarRange("TOMORROW", loadEvents, coordinator, events, failure, settled);

    pending[0]!.reject();
    await today;
    expect(failure).not.toHaveBeenCalled();

    pending[1]!.reject();
    await tomorrow;
    expect(failure).toHaveBeenCalledOnce();
    expect(settled).toHaveBeenCalledOnce();
  });

  it("awaits reconnect, refreshes Workspace and Calendar, and handles reconnect failures", async () => {
    const reconnect = vi.fn().mockResolvedValue(undefined);
    const refreshWorkspace = vi.fn().mockResolvedValue({
      activeProvider: "microsoft",
      providers: [{
        provider: "microsoft",
        label: "Microsoft 365",
        state: "connected",
        diagnostic: "Connected",
        capabilities: [{ id: "calendar", label: "Microsoft calendar", enabled: true }],
      }],
      updatedAt: Date.now(),
    });
    const loadCalendarEvents = vi.fn().mockResolvedValue([{ id: "event-1" }]);
    const loadCalendarEventsWithDiagnostic = vi.fn().mockResolvedValue({ events: [{ id: "event-1" }], diagnostic: { stage: "GRAPH_RESPONSE", outcome: "SUCCEEDED_WITH_EVENTS", reasonCode: "CALENDAR_GRAPH_SUCCEEDED_WITH_EVENTS" } });
    const setWorkspace = vi.fn();
    const setCalendarEvents = vi.fn();
    const setCalendarUnavailable = vi.fn();
    const setBusy = vi.fn();
    const showError = vi.fn();

    await reconcileMicrosoftReconnect({
      reconnect,
      refreshWorkspace,
      loadCalendarEvents,
      loadCalendarEventsWithDiagnostic,
      range: "TODAY",
      setWorkspace,
      setCalendarEvents,
      setCalendarUnavailable,
      setCalendarDiagnostic: vi.fn(),
      requestCoordinator: createCalendarRequestCoordinator(),
      setBusy,
      showError,
    });

    expect(reconnect).toHaveBeenCalledOnce();
    expect(refreshWorkspace).toHaveBeenCalledOnce();
    expect(loadCalendarEventsWithDiagnostic).toHaveBeenCalledOnce();
    expect(setCalendarEvents).toHaveBeenCalledWith([{ id: "event-1" }]);
    expect(setCalendarUnavailable).toHaveBeenCalledWith(false);
    expect(setBusy).toHaveBeenLastCalledWith(false);
    expect(showError).not.toHaveBeenCalled();

    reconnect.mockRejectedValueOnce(new Error("recoverable reconnect failure"));
    await reconcileMicrosoftReconnect({
      reconnect,
      refreshWorkspace,
      loadCalendarEvents,
      loadCalendarEventsWithDiagnostic: vi.fn().mockResolvedValue({ events: [{ id: "should-not-load" }], diagnostic: { stage: "GRAPH_RESPONSE", outcome: "SUCCEEDED_WITH_EVENTS", reasonCode: "CALENDAR_GRAPH_SUCCEEDED_WITH_EVENTS" } }),
      range: "TODAY",
      setWorkspace,
      setCalendarEvents,
      setCalendarUnavailable,
      setCalendarDiagnostic: vi.fn(),
      requestCoordinator: createCalendarRequestCoordinator(),
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
      refreshWorkspace: vi.fn().mockResolvedValue({
        activeProvider: "google",
        providers: [{
          provider: "google",
          label: "Google",
          state: "connected",
          diagnostic: "Connected",
          capabilities: [{ id: "calendar", label: "Google calendar", enabled: false }],
        }],
        updatedAt: Date.now(),
      }),
      loadCalendarEvents,
      loadCalendarEventsWithDiagnostic: vi.fn().mockResolvedValue({ events: [{ id: "should-not-load" }], diagnostic: { stage: "GRAPH_RESPONSE", outcome: "SUCCEEDED_WITH_EVENTS", reasonCode: "CALENDAR_GRAPH_SUCCEEDED_WITH_EVENTS" } }),
      range: "TODAY",
      setWorkspace: vi.fn(),
      setCalendarEvents,
      setCalendarUnavailable,
      setCalendarDiagnostic: vi.fn(),
      requestCoordinator: createCalendarRequestCoordinator(),
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

  it("labels an unconfigured Microsoft Connect action as configuration-unavailable", () => {
    const snapshot: WorkspaceSnapshot = {
      updatedAt: Date.now(),
      providers: [{
        provider: "microsoft",
        label: "Microsoft 365",
        state: "unconfigured",
        diagnostic: "Microsoft workspace is not configured.",
        capabilities: [{ id: "calendar", label: "Microsoft calendar", enabled: true }],
      }],
    };
    const html = renderToStaticMarkup(
      <WorkspacePanel snapshot={snapshot} busy={false} onConnect={() => undefined} onReconnect={() => undefined} onDisconnect={() => undefined} onRefresh={() => undefined} />,
    );

    expect(html).toContain("Connect Microsoft unavailable because Microsoft is not configured");
    expect(html).not.toContain("not connected");
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

  it("renders only bounded diagnostic fields", () => {
    const html = renderToStaticMarkup(<CalendarIntelligencePanel summary={undefined} connected unavailable events={[]} busy={false} onRefresh={() => undefined} onSpeak={() => undefined} diagnostic={{ stage: "GRAPH_RESPONSE", outcome: "FAILED", reasonCode: "CALENDAR_GRAPH_HTTP_403", httpStatus: 403, returnedEventCount: 0 }} />);
    expect(html).toContain("CALENDAR_GRAPH_HTTP_403");
    expect(html).toContain("403");
    expect(html).toContain("Events rendered");
    expect(html).not.toContain("accessToken");
    expect(html).not.toContain("Authorization");
    expect(html).not.toContain("graph.microsoft.com");
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
