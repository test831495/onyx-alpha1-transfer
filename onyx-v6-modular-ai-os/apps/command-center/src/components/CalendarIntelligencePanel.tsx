import type { CalendarAgendaProjection, CalendarRangeKind } from "@onyx/calendar-intelligence";

export function CalendarIntelligencePanel({ summary, busy, onRefresh, onSpeak, onSelectRange = () => {} }: { summary?: CalendarAgendaProjection; busy: boolean; onRefresh: () => void; onSpeak: () => void; onSelectRange?: (range: CalendarRangeKind) => void }) {
  const ranges: { label: string; value: CalendarRangeKind }[] = [
    { label: "Today", value: "TODAY" }, { label: "Tomorrow", value: "TOMORROW" },
    { label: "Current Week", value: "CURRENT_WEEK" }, { label: "Next Week", value: "NEXT_WEEK" },
  ];
  if (!summary) return <section id="panel-calendar-intelligence" className="glass-surface" style={{ margin: "1rem", padding: "1rem", borderRadius: "1rem" }}><small>Local Calendar</small><h2>Calendar</h2><button type="button" onClick={onRefresh}>Refresh</button> <button type="button" onClick={onSpeak} disabled>Read Agenda</button><strong>Calendar not configured</strong><p>No calendar events are available.</p><small>Connect a calendar account or refresh to check for events. No connected calendar event data is available.</small></section>;
  return <section id="panel-calendar-intelligence" className="glass-surface" style={{ margin: "1rem", padding: "1rem", borderRadius: "1rem", display: "grid", gap: "1rem" }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: ".75rem", flexWrap: "wrap" }}><div><small>Local Calendar</small><h2>Calendar</h2></div><div><button type="button" onClick={onRefresh} disabled={busy}>Refresh</button> <button type="button" onClick={onSpeak} disabled={busy}>Read Agenda</button></div></header>
    <div aria-live="polite" style={{ display: "grid", gap: ".75rem" }}>
      <div><strong>Local date and time</strong><div>{summary.currentDateTime}</div><small>{summary.requestedRange.timeZone} · locale-aware browser display</small></div>
      <div role="group" aria-label="Date range"><strong>Date navigation</strong><div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap", marginTop: ".4rem" }}>{ranges.map((range) => <button key={range.value} type="button" onClick={() => onSelectRange(range.value)} aria-pressed={summary.requestedRange.kind === range.value} disabled={busy}>{range.label}</button>)}</div></div>
      <div><strong>Calendar connection</strong><div>Not configured</div><small>Real meetings require a future approved connector.</small></div>
      <div className="glass-surface" style={{ padding: ".8rem", borderRadius: ".75rem" }}><strong>Local agenda: {summary.requestedRange.displayLabel}</strong><p>No connected calendar event data is available.</p><small>{summary.limitations[0]}</small></div>
    </div>
  </section>;
}