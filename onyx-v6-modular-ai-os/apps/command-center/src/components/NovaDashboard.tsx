import { GlassPanel, MetricBar, RingMetric } from "./GlassKit";
export function NovaDashboard({ activePanel }: { activePanel: string | null }) {
  const now = new Date(); const selected = (id: string) => activePanel === id;
  return <div className="scene-grid nova-grid"><div className="scene-column left-column">
    <GlassPanel panelId="home" selected={selected("home")} title="Good morning, Rahul" icon="◷"><div className="clock-time">{now.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</div><p>{now.toLocaleDateString([], {weekday:"short",day:"2-digit",month:"short",year:"numeric"})}</p><small>NOVA is your local AI assistant.</small></GlassPanel>
    <GlassPanel panelId="weather" selected={selected("weather")} title="Weather" icon="☁"><div className="weather-row"><strong>28°C</strong><div><b>Partly Cloudy</b><small>Chennai, India</small></div></div><div className="triplet"><span>Humidity <b>62%</b></span><span>Wind <b>12 km/h</b></span><span>AQI <b>48 Good</b></span></div></GlassPanel>
    <GlassPanel panelId="system-health" selected={selected("system-health")} title="System Health" icon="♡"><div className="health-layout"><RingMetric value={92} label="Good" color="mint"/><div><MetricBar label="CPU" value={24}/><MetricBar label="RAM" value={52} color="violet"/><MetricBar label="Storage" value={68} color="blue"/></div></div></GlassPanel>
    <GlassPanel panelId="messages" selected={selected("messages")} title="Messages" className="aux-panel"><p>Three local message summaries are ready.</p></GlassPanel>
    <GlassPanel panelId="settings" selected={selected("settings")} title="Settings" className="aux-panel"><p>Voice, quality, privacy and accessibility controls.</p></GlassPanel>
  </div><div className="scene-column right-column">
    <GlassPanel panelId="calendar" selected={selected("calendar")} title="Calendar" icon="▣"><div className="calendar-days">{[10,11,12,13,14,15,16].map(day=><span className={day===14?"active":""} key={day}>{day}</span>)}</div><ul className="timeline"><li><i/>10:00 AM <b>Team Sync Meeting</b></li><li><i className="violet"/>02:00 PM <b>Product Review</b></li><li><i className="mint"/>06:30 PM <b>Gym & Wellness</b></li></ul></GlassPanel>
    <GlassPanel panelId="smart-home" selected={selected("smart-home")} title="Smart Home" icon="⌂"><div className="device-grid"><button><b>◉ Lights</b><small>On</small></button><button><b>❄ AC</b><small>24°C</small></button><button><b>◇ Security</b><small>Armed</small></button><button><b>♫ Music</b><small>Playing</small></button></div></GlassPanel>
    <GlassPanel panelId="files" selected={selected("files")} title="Files" icon="▤" className="aux-panel"><ul className="notification-list"><li>Phase 0 validation report <small>Recent</small></li><li>ONYX architecture baseline <small>Saved</small></li><li>NOVA command mappings <small>Saved</small></li></ul></GlassPanel>
    <GlassPanel panelId="tasks" selected={selected("tasks")} title="Tasks" icon="✓" className="aux-panel"><ul className="notification-list"><li>Review Phase 0 sign-off <small>Today</small></li><li>Validate devices <small>Today</small></li></ul></GlassPanel>
    <GlassPanel panelId="news" selected={selected("news")} title="News" icon="◫" className="aux-panel"><p>Local news module ready for provider integration.</p></GlassPanel>
  </div></div>;
}
