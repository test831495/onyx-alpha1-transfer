export function NewsPanel({
  loading,
  connected,
  onRefresh,
  onManage,
}: {
  loading: boolean;
  connected: boolean;
  onRefresh: () => void;
  onManage: () => void;
}) {
  const status = loading ? "Loading News" : connected ? "News Available" : "News Source Not Connected";
  const emptyText = "No news is available yet.";
  const helperText = "Connect a news source or refresh to check for updates.";

  return (
    <section id="panel-news" className="glass-surface" style={{ margin: "1rem", padding: "1rem", borderRadius: "1.25rem", display: "grid", gap: ".8rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: ".5rem", flexWrap: "wrap" }}>
        <div>
          <small>News</small>
          <h2 style={{ margin: ".2rem 0 0" }}>News</h2>
        </div>
        <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={onRefresh} disabled={loading} aria-label="Refresh news">Refresh</button>
          <button type="button" onClick={onManage} aria-label="Manage news sources">Manage Sources</button>
        </div>
      </div>

      <div aria-live="polite" style={{ display: "grid", gap: ".75rem" }}>
        <strong>{status}</strong>
        <div className="glass-surface" style={{ padding: "1rem", borderRadius: "1rem", display: "grid", gap: ".45rem" }}>
          <span>{emptyText}</span>
          <small>{helperText}</small>
        </div>
      </div>
    </section>
  );
}
