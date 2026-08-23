import type { ReactNode } from "react";
import { AutomationDashboard } from "./components/AutomationDashboard";
import { WorkspacePanel } from "./components/WorkspacePanel";

export type AppRegistryEntry = {
  appId: string;
  friendlyLabel: string;
  accessibleLabel: string;
  component: ReactNode;
  launcherOrder: number;
  icon?: string;
  supportsMinimize: boolean;
  supportsClose: boolean;
  supportsDetails: boolean;
  detailComponent?: ReactNode;
  compactSummary: string;
};

const emptySummary = "No recent activity.";

export const APP_REGISTRY: AppRegistryEntry[] = [
  {
    appId: "home",
    friendlyLabel: "Home",
    accessibleLabel: "Home",
    component: <span>Home</span>,
    detailComponent: <span>Home detail</span>,
    launcherOrder: 0,
    icon: "⌂",
    supportsMinimize: false,
    supportsClose: false,
    supportsDetails: false,
    compactSummary: "Character view is active.",
  },
  {
    appId: "messages",
    friendlyLabel: "Messages",
    accessibleLabel: "Messages",
    component: <div aria-label="Messages panel">Messages</div>,
    detailComponent: <div aria-label="Messages details">Messages details</div>,
    launcherOrder: 1,
    icon: "✉",
    supportsMinimize: true,
    supportsClose: true,
    supportsDetails: true,
    compactSummary: "Recent message summary available when data is present; otherwise empty inbox state.",
  },
  {
    appId: "tasks",
    friendlyLabel: "Tasks",
    accessibleLabel: "Tasks",
    component: <div aria-label="Tasks panel">Tasks</div>,
    detailComponent: <div aria-label="Tasks details">Tasks details</div>,
    launcherOrder: 2,
    icon: "✓",
    supportsMinimize: true,
    supportsClose: true,
    supportsDetails: true,
    compactSummary: "Pending: 0 • Due soon: 0 • No tasks scheduled.",
  },
  {
    appId: "news",
    friendlyLabel: "News",
    accessibleLabel: "News",
    component: <div aria-label="News panel">News</div>,
    detailComponent: <div aria-label="News details">News details</div>,
    launcherOrder: 3,
    icon: "◌",
    supportsMinimize: true,
    supportsClose: true,
    supportsDetails: true,
    compactSummary: "Connection: offline • Last update: never • No headlines available.",
  },
  {
    appId: "workspace",
    friendlyLabel: "Workspace",
    accessibleLabel: "Workspace",
    component: <WorkspacePanel snapshot={{ providers: [], activeProvider: undefined, updatedAt: Date.now() } as any} busy={false} onConnect={() => undefined} onDisconnect={() => undefined} onRefresh={() => undefined} />,
    detailComponent: <WorkspacePanel snapshot={{ providers: [], activeProvider: undefined, updatedAt: Date.now() } as any} busy={false} onConnect={() => undefined} onDisconnect={() => undefined} onRefresh={() => undefined} />,
    launcherOrder: 4,
    icon: "▣",
    supportsMinimize: true,
    supportsClose: true,
    supportsDetails: true,
    compactSummary: "Connected providers: 0 • Microsoft: disconnected • Google: disconnected • Yahoo: disconnected.",
  },
  {
    appId: "automation",
    friendlyLabel: "Automation",
    accessibleLabel: "Automation",
    component: <AutomationDashboard />,
    detailComponent: <AutomationDashboard />,
    launcherOrder: 5,
    icon: "◎",
    supportsMinimize: true,
    supportsClose: true,
    supportsDetails: true,
    compactSummary: "Workflow state: idle • Approvals: pending • Validation: not started • Recovery: nominal • Evidence: waiting.",
  },
  {
    appId: "settings",
    friendlyLabel: "Settings",
    accessibleLabel: "Settings",
    component: <div aria-label="Settings panel">Settings</div>,
    detailComponent: <div aria-label="Settings details">Settings details</div>,
    launcherOrder: 6,
    icon: "⚙",
    supportsMinimize: true,
    supportsClose: true,
    supportsDetails: true,
    compactSummary: "Presence: ONYX_ONLY • Voice: idle • Quality: balanced • Config: default profile.",
  },
  {
    appId: "health",
    friendlyLabel: "Health",
    accessibleLabel: "Health",
    component: <div aria-label="Health panel">Health</div>,
    detailComponent: <div aria-label="Health details">Health details</div>,
    launcherOrder: 7,
    icon: "♥",
    supportsMinimize: true,
    supportsClose: true,
    supportsDetails: true,
    compactSummary: "Overall health: nominal • CPU: normal • Memory: stable • Storage: healthy • Warnings: 0.",
  },
];

export const APP_REGISTRY_BY_ID = Object.fromEntries(
  APP_REGISTRY.map((entry) => [entry.appId, entry]),
) as Record<string, AppRegistryEntry>;
