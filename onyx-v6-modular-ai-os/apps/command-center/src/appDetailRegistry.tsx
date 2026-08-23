import React, { useContext, useEffect } from "react";
import { ShellAppId } from "./shellState";
import { NewsPanel } from "./components/NewsPanel";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { CalendarIntelligencePanel } from "./components/CalendarIntelligencePanel";
import { AutomationDashboard } from "./components/AutomationDashboard";
import { SettingsCenter } from "./components/SettingsCenter";
import { ProviderHealthDashboard } from "./components/ProviderHealthDashboard";

export interface AppDetailSpec {
  appId: ShellAppId;
  label: string;
  icon: string;
  cardComponent: React.ComponentType<{ appId: ShellAppId }>;
  detailComponent: React.ComponentType<{ appId: ShellAppId }>;
  supportsDetails: boolean;
}

// Context for passing detail view dependencies
export const DetailDataContext = React.createContext<{
  workspaceSnapshot?: any;
  workspaceBusy?: boolean;
  onWorkspaceConnect?: () => void;
  onWorkspaceDisconnect?: () => void;
  onWorkspaceRefresh?: () => void;
  calendarSummary?: any;
  calendarBusy?: boolean;
  onCalendarRefresh?: () => void;
  onCalendarSpeak?: () => void;
}>({});

// Real detail components wrapped to match the required signature
const MessageDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => (
  <div style={{ padding: "1rem" }}>
    <p>Messages detail view is not available yet.</p>
  </div>
);

const TaskDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => (
  <div style={{ padding: "1rem" }}>
    <p>Tasks detail view is not available yet.</p>
  </div>
);

const NewsDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => {
  return (
    <NewsPanel
      loading={false}
      connected={false}
      onRefresh={() => {}}
      onManage={() => {}}
    />
  );
};

const WorkspaceDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => {
  const data = useContext(DetailDataContext);
  return (
    <WorkspacePanel
      snapshot={data.workspaceSnapshot || { providers: [], activeProvider: undefined, updatedAt: Date.now() }}
      busy={data.workspaceBusy ?? false}
      onConnect={data.onWorkspaceConnect ?? (() => {})}
      onDisconnect={data.onWorkspaceDisconnect ?? (() => {})}
      onRefresh={data.onWorkspaceRefresh ?? (() => {})}
    />
  );
};

const AutomationDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => {
  return <AutomationDashboard embedded />;
};

const SettingsDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => {
  useEffect(() => {
    window.dispatchEvent(new Event("onyx:open-settings"));
  }, []);
  return <SettingsCenter embedded />;
};

const HealthDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => {
  useEffect(() => {
    window.dispatchEvent(new Event("onyx:open-provider-health"));
  }, []);
  return <ProviderHealthDashboard embedded />;
};

const CalendarDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => {
  const data = useContext(DetailDataContext);
  return (
    <CalendarIntelligencePanel
      summary={data.calendarSummary}
      busy={data.calendarBusy ?? false}
      onRefresh={data.onCalendarRefresh ?? (() => {})}
      onSpeak={data.onCalendarSpeak ?? (() => {})}
    />
  );
};

const ProviderHealthDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => {
  return <ProviderHealthDashboard embedded />;
};

const HomeDetail: React.FC<{ appId: ShellAppId }> = ({ appId }) => (
  <div style={{ padding: "1rem" }}>
    <h3>Home</h3>
    <p>Return to home to close all apps.</p>
  </div>
);

// Simple card component placeholder (cards are rendered by App.tsx renderShellAppContent)
const SimpleCard: React.FC<{ appId: ShellAppId; title: string }> = ({ appId, title }) => (
  <div style={{ padding: "0.5rem", textAlign: "center", fontSize: "0.85rem" }}>
    <div>{title}</div>
  </div>
);

export const APP_DETAIL_REGISTRY: AppDetailSpec[] = [
  {
    appId: "home",
    label: "Home",
    icon: "🏠",
    cardComponent: () => <SimpleCard appId="home" title="Home" />,
    detailComponent: HomeDetail,
    supportsDetails: false,
  },
  {
    appId: "messages",
    label: "Messages",
    icon: "✉",
    cardComponent: () => <SimpleCard appId="messages" title="Messages" />,
    detailComponent: MessageDetail,
    supportsDetails: false, // No real detail component available yet
  },
  {
    appId: "tasks",
    label: "Tasks",
    icon: "✓",
    cardComponent: () => <SimpleCard appId="tasks" title="Tasks" />,
    detailComponent: TaskDetail,
    supportsDetails: false, // No real detail component available yet
  },
  {
    appId: "news",
    label: "News",
    icon: "◍",
    cardComponent: () => <SimpleCard appId="news" title="News" />,
    detailComponent: NewsDetail,
    supportsDetails: true,
  },
  {
    appId: "workspace",
    label: "Workspace",
    icon: "▣",
    cardComponent: () => <SimpleCard appId="workspace" title="Workspace" />,
    detailComponent: WorkspaceDetail,
    supportsDetails: true,
  },
  {
    appId: "automation",
    label: "Automation",
    icon: "◎",
    cardComponent: () => <SimpleCard appId="automation" title="Automation" />,
    detailComponent: AutomationDetail,
    supportsDetails: true,
  },
  {
    appId: "settings",
    label: "Settings",
    icon: "⚙",
    cardComponent: () => <SimpleCard appId="settings" title="Settings" />,
    detailComponent: SettingsDetail,
    supportsDetails: true,
  },
  {
    appId: "health",
    label: "Health",
    icon: "♥",
    cardComponent: () => <SimpleCard appId="health" title="Health" />,
    detailComponent: HealthDetail,
    supportsDetails: true,
  },
  {
    appId: "calendar",
    label: "Calendar",
    icon: "◫",
    cardComponent: () => <SimpleCard appId="calendar" title="Calendar" />,
    detailComponent: CalendarDetail,
    supportsDetails: true,
  },
  {
    appId: "provider-health",
    label: "Provider Health",
    icon: "◈",
    cardComponent: () => <SimpleCard appId="provider-health" title="Provider Health" />,
    detailComponent: ProviderHealthDetail,
    supportsDetails: true,
  },
];

export const getAppDetail = (appId: ShellAppId): AppDetailSpec | undefined => {
  return APP_DETAIL_REGISTRY.find((spec) => spec.appId === appId);
};

export const getAppLabel = (appId: ShellAppId): string => {
  const spec = getAppDetail(appId);
  return spec?.label || appId;
};

export const getAppIcon = (appId: ShellAppId): string => {
  const spec = getAppDetail(appId);
  return spec?.icon || "◈";
};
