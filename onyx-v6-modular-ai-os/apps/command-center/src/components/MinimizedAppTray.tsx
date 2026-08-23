import React from "react";
import { ShellAppId } from "../shellState";
import "../styles/MinimizedAppTray.css";

interface MinimizedAppTrayProps {
  minimizedAppIds: ShellAppId[];
  onRestore: (appId: ShellAppId) => void;
  onClose: (appId: ShellAppId) => void;
}

export const MinimizedAppTray: React.FC<MinimizedAppTrayProps> = ({
  minimizedAppIds,
  onRestore,
  onClose,
}) => {
  if (minimizedAppIds.length === 0) {
    return null;
  }

  const getAppLabel = (appId: ShellAppId): string => {
    if (appId === "provider-health") return "Provider Health";
    return appId.charAt(0).toUpperCase() + appId.slice(1);
  };

  const getAppIcon = (appId: ShellAppId): string => {
    const icons: Record<ShellAppId, string> = {
      home: "🏠",
      workspace: "▣",
      automation: "◎",
      settings: "⚙",
      health: "♥",
      messages: "✉",
      calendar: "◫",
      news: "◍",
      tasks: "✓",
      "provider-health": "◈",
    };
    return icons[appId] || "◈";
  };

  return (
    <div
      className="minimized-app-tray"
      role="status"
      aria-label={`${minimizedAppIds.length} minimized apps`}
    >
      <div className="minimized-app-tray__label">
        Minimized ({minimizedAppIds.length})
      </div>
      <div className="minimized-app-tray__apps">
        {minimizedAppIds.map((appId) => (
          <div
            key={appId}
            className="minimized-app-item"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onRestore(appId);
              }
            }}
          >
            <span className="minimized-app-item__icon">{getAppIcon(appId)}</span>
            <span className="minimized-app-item__label">{getAppLabel(appId)}</span>
            <div className="minimized-app-item__actions">
              <button
                className="minimized-app-item__restore"
                onClick={() => onRestore(appId)}
                title={`Restore ${getAppLabel(appId)}`}
                aria-label={`Restore ${getAppLabel(appId)}`}
              >
                ↑ Restore
              </button>
              <button
                className="minimized-app-item__close"
                onClick={() => onClose(appId)}
                title={`Close ${getAppLabel(appId)}`}
                aria-label={`Close ${getAppLabel(appId)}`}
              >
                ✕ Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
