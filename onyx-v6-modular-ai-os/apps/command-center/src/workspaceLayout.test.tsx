import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { MinimizedAppTray } from "./components/MinimizedAppTray";
import { AppCardShell } from "./components/AppCardShell";
import { OverflowIndicator } from "./components/OverflowIndicator";
import { cardHorizontalBounds } from "./cardGeometry";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

function automaticCardRect(position: "LEFT_TOP" | "LEFT_MIDDLE" | "LEFT_BOTTOM" | "RIGHT_TOP" | "RIGHT_MIDDLE" | "RIGHT_BOTTOM") {
  const canvas = { width: 1416, height: 740 };
  const card = { width: 300, height: 220 };
  const inset = 24;
  const topBySlot = {
    LEFT_TOP: inset,
    RIGHT_TOP: inset,
    LEFT_MIDDLE: (canvas.height - card.height) / 2,
    RIGHT_MIDDLE: (canvas.height - card.height) / 2,
    LEFT_BOTTOM: canvas.height - card.height - inset,
    RIGHT_BOTTOM: canvas.height - card.height - inset,
  } satisfies Record<typeof position, number>;
  const left = position.startsWith("LEFT") ? inset : canvas.width - card.width - inset;
  const top = topBySlot[position];
  return { left, right: left + card.width, top, bottom: top + card.height, width: card.width, height: card.height };
}

describe("Phase 1A.9.1 workspace layout", () => {
  it("renders the minimized dock outside CardCanvas with compact content", () => {
    const html = renderToStaticMarkup(
      <>
        <section className="functional-scene functional-scene--cards">
          <div className="app-card-list" role="list" aria-label="Open applications" />
        </section>
        <div className="bottom-stack">
          <div className="minimized-app-dock-region">
            <MinimizedAppTray minimizedAppIds={["news", "tasks"]} onRestore={() => undefined} onClose={() => undefined} />
          </div>
          <footer className="functional-footer" />
        </div>
      </>,
    );
    expect(html.indexOf("app-card-list")).toBeLessThan(html.indexOf("minimized-app-dock-region"));
    expect(html).toContain('aria-label="2 minimized apps"');
    expect(html).toContain("Minimized (2)");
    expect(html).toContain("News");
    expect(html).toContain("Tasks");
    expect(html).toContain("Restore News");
    expect(html).toContain("Close Tasks");
  });

  it("keeps the dock absent when no apps are minimized", () => {
    expect(renderToStaticMarkup(<MinimizedAppTray minimizedAppIds={[]} onRestore={() => undefined} onClose={() => undefined} />)).toBe("");
  });

  it("keeps canvas bounds independent of dock width and symmetric at both edges", () => {
    const bounds = cardHorizontalBounds(1200, 300, 24);
    expect(bounds.minX).toBe(24);
    expect(bounds.maxX).toBe(876);
    expect(bounds.minX).toBe(1200 - bounds.maxX - 300);
  });

  it("renders overflow navigation outside CardCanvas and before the footer", () => {
    const html = renderToStaticMarkup(
      <main className="functional-app phase0-footer-guard">
        <div className="phase0-scroll">
          <section className="functional-scene functional-scene--cards">
            <div className="hero-status-row"><b>WAKE ARMED</b></div>
            <div className="app-card-list" role="list" aria-label="Open applications" />
          </section>
        </div>
        <div className="bottom-stack">
          <div className="overflow-navigation-region">
            <OverflowIndicator overflowCount={2} currentPage={0} totalPages={2} onPrevious={() => undefined} onNext={() => undefined} />
          </div>
          <footer className="functional-footer" />
        </div>
      </main>,
    );
    expect(html.indexOf("functional-scene--cards")).toBeLessThan(html.indexOf("overflow-navigation-region"));
    expect(html.indexOf("overflow-navigation-region")).toBeLessThan(html.indexOf("functional-footer"));
    expect(html).toContain("+2 more apps");
    expect(html).toContain("1 / 2");
    expect(html).toContain("Previous page of overflow apps");
    expect(html).toContain("Next page of overflow apps");
  });

  it("marks automatic cards separately from manual cards", () => {
    const automatic = renderToStaticMarkup(
      <AppCardShell appId="messages" title="Messages" position="LEFT_TOP" hasManualPosition={false}>summary</AppCardShell>,
    );
    const manual = renderToStaticMarkup(
      <AppCardShell appId="tasks" title="Tasks" position="RIGHT_TOP" hasManualPosition>summary</AppCardShell>,
    );
    expect(automatic).toContain('data-card-positioning="automatic"');
    expect(manual).toContain('data-card-positioning="manual"');
  });

  it("declares complete safe-shell width for CardCanvas without narrow wrapper derivation", () => {
    expect(styles).toContain(".functional-scene--cards {");
    expect(styles).toContain("width: 100% !important;");
    expect(styles).toContain("max-width: 100% !important;");
    expect(styles).toContain("--card-safe-inset-x: 24px;");
    expect(styles).not.toContain("width: min(1320px, 100%) !important;\n  margin: 14px 0 0 !important;");
  });

  it("places automatic edge cards with equal margins and no clipping", () => {
    const canvasWidth = 1416;
    const left = automaticCardRect("LEFT_TOP");
    const right = automaticCardRect("RIGHT_TOP");
    expect(left.left).toBe(24);
    expect(canvasWidth - right.right).toBe(24);
    expect(left.left).toBe(canvasWidth - right.right);
    expect(left.right).toBeLessThan(canvasWidth);
    expect(right.right).toBeLessThan(canvasWidth);
    expect(right.left).toBeGreaterThan(1003);
  });

  it("preserves at least 12px between adjacent automatic vertical cards", () => {
    const top = automaticCardRect("LEFT_TOP");
    const middle = automaticCardRect("LEFT_MIDDLE");
    const bottom = automaticCardRect("LEFT_BOTTOM");
    expect(middle.top - top.bottom).toBeGreaterThanOrEqual(12);
    expect(bottom.top - middle.bottom).toBeGreaterThanOrEqual(12);
    expect(middle.top - top.bottom).toBe(16);
    expect(bottom.top - middle.bottom).toBe(16);
  });

  it("keeps Wake centered and separates compact overflow above the footer", () => {
    expect(styles).toContain(".functional-scene--cards .hero-status-row");
    expect(styles).toContain("margin-bottom: 64px !important;");
    expect(styles).toContain(".bottom-stack > .overflow-navigation-region");
    expect(styles).toContain("justify-self: center;");
    expect(styles).toContain("width: max-content;");
    expect(styles).toContain("max-width: 100%;");
    expect(styles).toContain("grid-template-rows: auto 1fr !important;");
    expect(styles).toContain("gap: 12px !important;");
  });
});