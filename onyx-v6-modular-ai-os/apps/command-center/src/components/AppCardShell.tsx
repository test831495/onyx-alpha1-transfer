import { useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import "../styles/AppCardShell.css";
import { protectedCharacterRect, resolveCardPosition, type CardCanvasGeometry } from "../cardGeometry";

export type AppCardPosition =
  | "LEFT_TOP"
  | "LEFT_MIDDLE"
  | "LEFT_BOTTOM"
  | "RIGHT_TOP"
  | "RIGHT_MIDDLE"
  | "RIGHT_BOTTOM";

export function AppCardShell({
  appId,
  title,
  icon,
  position,
  selected = false,
  x = 0,
  y = 0,
  zIndex = 1,
  hasManualPosition = false,
  onSelect,
  onMove,
  onMoveEnd,
  onMinimize,
  onClose,
  children,
}: {
  appId: string;
  title: string;
  icon?: string;
  position: AppCardPosition;
  selected?: boolean;
  x?: number;
  y?: number;
  zIndex?: number;
  hasManualPosition?: boolean;
  onSelect?: () => void;
  onMove?: (x: number, y: number) => void;
  onMoveEnd?: (x: number, y: number) => void;
  onMinimize?: () => void;
  onClose?: () => void;
  children: ReactNode;
}) {
  const [dragging, setDragging] = useState(false);
  const [canvasGeometry, setCanvasGeometry] = useState<{ width: number; height: number; left: number; top: number } | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);
  const drag = useRef<{ startX: number; startY: number; originX: number; originY: number; parentWidth: number; parentHeight: number } | null>(null);
  useLayoutEffect(() => {
    const canvas = canvasRef.current?.closest(".app-card-list");
    if (!canvas) return;
    const update = () => {
      const bounds = canvas.getBoundingClientRect();
      setCanvasGeometry({ width: bounds.width, height: bounds.height, left: bounds.left, top: bounds.top });
    };
    update();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(canvas);
    return () => observer?.disconnect();
  }, []);
  const beginDrag = (event: PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, [data-no-card-drag]")) return;
    onSelect?.();
    const parent = event.currentTarget.closest(".app-card-list");
    if (!parent || !onMove) return;
    const parentBounds = parent.getBoundingClientRect();
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: x,
      originY: y,
      parentWidth: parentBounds.width,
      parentHeight: parentBounds.height,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLElement>) => {
    if (!drag.current || !onMove) return;
    onMove(
      drag.current.originX + ((event.clientX - drag.current.startX) / Math.max(1, drag.current.parentWidth)) * 100,
      drag.current.originY + ((event.clientY - drag.current.startY) / Math.max(1, drag.current.parentHeight)) * 100,
    );
  };
  const endDrag = (event?: PointerEvent<HTMLElement>) => {
    if (drag.current && onMoveEnd) {
      const nextX = drag.current.originX + ((event?.clientX ?? drag.current.startX) - drag.current.startX) / Math.max(1, drag.current.parentWidth) * 100;
      const nextY = drag.current.originY + ((event?.clientY ?? drag.current.startY) - drag.current.startY) / Math.max(1, drag.current.parentHeight) * 100;
      const canvas = canvasRef.current?.closest(".app-card-list");
      const character = canvas?.closest(".functional-scene")?.querySelector(".portrait.is-active");
      const core = canvas?.closest(".functional-scene")?.querySelector(".functional-core");
      const name = canvas?.closest(".functional-scene")?.querySelector(".hero-status-row");
      const cardRect = canvasRef.current?.getBoundingClientRect();
      const canvasRect = canvas?.getBoundingClientRect();
      if (character && core && name && cardRect && canvasRect) {
        const geometry: CardCanvasGeometry = {
          canvas: { width: canvasRect.width, height: canvasRect.height },
          card: { width: cardRect.width, height: cardRect.height },
          protectedCharacter: protectedCharacterRect(
            character.getBoundingClientRect(),
            core.getBoundingClientRect(),
            name.getBoundingClientRect(),
            canvasRect,
          ),
          safeHorizontalInset: 16,
          safeVerticalInset: 8,
        };
        const resolved = resolveCardPosition(nextX, nextY, geometry);
        onMoveEnd(resolved.x, resolved.y);
      } else {
        onMoveEnd(nextX, nextY);
      }
    }
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    drag.current = null;
    setDragging(false);
  };
  return (
    <section
      ref={canvasRef}
      aria-label={`${title} card`}
      aria-selected={selected}
      data-app-id={appId}
      data-position={position}
      data-card-x={x}
      data-card-y={y}
      data-card-positioning={hasManualPosition ? "manual" : "automatic"}
      data-manual-position={dragging ? "active" : "committed"}
      data-card-left={canvasGeometry ? x / 100 * canvasGeometry.width : undefined}
      data-card-top={canvasGeometry ? y / 100 * canvasGeometry.height : undefined}
      data-canvas-width={canvasGeometry?.width}
      data-canvas-height={canvasGeometry?.height}
      className={`app-card-shell app-card-shell--${position.toLowerCase()} ${selected ? "app-card-shell--selected" : ""} ${dragging ? "app-card-shell--dragging" : ""} app-card-shell--manual-position`.trim()}
      role="listitem"
      tabIndex={0}
      onFocus={onSelect}
      onClick={onSelect}
      style={{ left: canvasGeometry ? `${x / 100 * canvasGeometry.width}px` : `${x}%`, top: canvasGeometry ? `${y / 100 * canvasGeometry.height}px` : `${y}%`, zIndex, transition: dragging ? "none" : undefined, "--card-x": `${x}%`, "--card-y": `${y}%`, "--card-left": canvasGeometry ? `${x / 100 * canvasGeometry.width}px` : `${x}%`, "--card-top": canvasGeometry ? `${y / 100 * canvasGeometry.height}px` : `${y}%` } as CSSProperties}
    >
      <header
        className="app-card-shell__header"
        data-card-drag-handle
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="app-card-shell__identity">
          <span className="app-card-shell__icon" aria-hidden="true">{icon ?? "◈"}</span>
          <div>
            <strong>{title}</strong>
            <small>{selected ? "Selected" : "Open"}</small>
          </div>
        </div>
        <div className="app-card-shell__actions" aria-label={`${title} actions`}>
          <button type="button" aria-label={`Minimize ${title}`} onClick={(event) => { event.stopPropagation(); onMinimize?.(); }}>
            Minimize
          </button>
          <button type="button" aria-label={`Close ${title}`} onClick={(event) => { event.stopPropagation(); onClose?.(); }}>
            Close
          </button>
        </div>
      </header>
      <div className="app-card-shell__body">{children}</div>
    </section>
  );
}
