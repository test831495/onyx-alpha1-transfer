import type { ReactNode } from "react";

export function AppWindowShell({
  appId,
  title,
  children,
  onMinimize,
  onClose,
}: {
  appId: string;
  title: string;
  children: ReactNode;
  onMinimize: () => void;
  onClose: () => void;
}) {
  return (
    <section
      aria-label={`${title} panel`}
      data-app-id={appId}
      className="shell-window"
      role="dialog"
    >
      <header className="shell-window-header">
        <h2>{title}</h2>
        <div className="shell-window-actions">
          <button type="button" aria-label={`Minimize ${title}`} onClick={onMinimize}>
            Minimize
          </button>
          <button type="button" aria-label={`Close ${title}`} onClick={onClose}>
            Close
          </button>
        </div>
      </header>
      <div className="shell-window-body">{children}</div>
    </section>
  );
}
