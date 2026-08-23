import React, { useEffect, useRef, useState } from "react";
import { ShellAppId } from "../shellState";
import "../styles/DetailShell.css";

interface DetailShellProps {
  appId: ShellAppId;
  appTitle: string;
  children: React.ReactNode;
  onClose: () => void;
  onBack: () => void;
  onMinimize?: () => void;
  state?: "loading" | "empty" | "error" | "not-connected" | "ready";
  errorMessage?: string;
  initialBounds?: { x: number; y: number; width: number; height: number };
}

const getStateMessage = (
  state: "loading" | "empty" | "error" | "not-connected" | "ready" | undefined
): string => {
  switch (state) {
    case "loading":
      return "Loading...";
    case "empty":
      return "No content available";
    case "error":
      return "Error loading content";
    case "not-connected":
      return "Not connected";
    case "ready":
    default:
      return "";
  }
};

export const DetailShell: React.FC<DetailShellProps> = ({
  appId,
  appTitle,
  children,
  onClose,
  onBack,
  onMinimize,
  state = "ready",
  errorMessage,
  initialBounds = { x: 120, y: 96, width: 720, height: 560 },
}) => {
  const [bounds, setBounds] = useState(initialBounds);
  const [maximized, setMaximized] = useState(false);
  const restoreBounds = useRef(initialBounds);
  const interaction = useRef<{
    mode: "drag" | "resize";
    startX: number;
    startY: number;
    bounds: typeof initialBounds;
  } | null>(null);

  useEffect(() => {
    const move = (event: PointerEvent) => {
      const active = interaction.current;
      if (!active) return;
      const dx = event.clientX - active.startX;
      const dy = event.clientY - active.startY;
      const maxX = Math.max(8, window.innerWidth - 80);
      const maxY = Math.max(64, window.innerHeight - 88);
      if (active.mode === "drag") {
        setBounds((current) => ({
          ...current,
          x: Math.max(8, Math.min(maxX - current.width, active.bounds.x + dx)),
          y: Math.max(64, Math.min(maxY - current.height, active.bounds.y + dy)),
        }));
      } else {
        setBounds((current) => ({
          ...current,
          width: Math.max(420, Math.min(window.innerWidth - current.x - 8, active.bounds.width + dx)),
          height: Math.max(280, Math.min(window.innerHeight - current.y - 88, active.bounds.height + dy)),
        }));
      }
    };
    const stop = () => { interaction.current = null; };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
  }, []);

  const beginInteraction = (mode: "drag" | "resize", event: React.PointerEvent) => {
    if (maximized) return;
    interaction.current = { mode, startX: event.clientX, startY: event.clientY, bounds };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const toggleMaximize = () => {
    if (maximized) {
      setBounds(restoreBounds.current);
      setMaximized(false);
      return;
    }
    restoreBounds.current = bounds;
    setMaximized(true);
  };

  return (
    <div
      className={`detail-shell${maximized ? " detail-shell--maximized" : ""}`}
      role="dialog"
      aria-modal="false"
      aria-labelledby={`${appId}-detail-title`}
      style={maximized ? undefined : { left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
      tabIndex={-1}
    >
      <div className="detail-shell__header glass-surface" onPointerDown={(event) => {
        if ((event.target as HTMLElement).closest("button")) return;
        beginInteraction("drag", event);
      }}>
        <button
          className="detail-shell__back-button"
          onClick={onBack}
          aria-label={`Back from ${appTitle}`}
          title="Back to character view"
        >
          ← Back
        </button>
        <button type="button" className="detail-shell__minimize-button" onClick={onMinimize} aria-label={`Minimize ${appTitle}`} title="Minimize window">
          Minimize
        </button>
        <h2 id={`${appId}-detail-title`} className="detail-shell__title">{appTitle}</h2>
        <button type="button" className="detail-shell__maximize-button" onClick={toggleMaximize} aria-label={maximized ? `Restore ${appTitle}` : `Maximize ${appTitle}`} title={maximized ? "Restore window" : "Maximize window"}>
          {maximized ? "Restore" : "Maximize"}
        </button>
        <button
          className="detail-shell__close-button"
          onClick={onClose}
          aria-label={`Close ${appTitle}`}
          title="Close details"
        >
          ✕ Close
        </button>
      </div>

      <div className="detail-shell__content">
        {state === "loading" && (
          <div className="detail-shell__state-message">
            <span className="detail-shell__spinner">⟳</span>
            {getStateMessage(state)}
          </div>
        )}
        {state === "empty" && (
          <div className="detail-shell__state-message">
            {getStateMessage(state)}
          </div>
        )}
        {state === "error" && (
          <div className="detail-shell__state-message detail-shell__state-message--error">
            {errorMessage || getStateMessage(state)}
          </div>
        )}
        {state === "not-connected" && (
          <div className="detail-shell__state-message detail-shell__state-message--warning">
            {getStateMessage(state)}
          </div>
        )}
        {state === "ready" && children}
      </div>

      <div className="detail-shell__resize-handle" role="presentation" aria-hidden="true" onPointerDown={(event) => beginInteraction("resize", event)} />

      <div className="detail-shell__footer glass-surface">
        <small className="detail-shell__metadata">
          {appTitle} · Detailed View
        </small>
      </div>
    </div>
  );
};
