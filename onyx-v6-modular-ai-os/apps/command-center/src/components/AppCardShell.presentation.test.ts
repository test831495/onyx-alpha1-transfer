import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("./AppCardShell.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("PRESENTATION-MOBILE-CARD-001", () => {
  it("keeps shared card actions accessible and side by side on compact layouts", () => {
    expect(componentSource).toContain('aria-label={`Minimize ${title}`}');
    expect(componentSource).toContain('aria-label={`Close ${title}`}');
    expect(styleSource).toMatch(/\.app-card-shell__actions\{[^}]*display:flex/);
    expect(styleSource).toMatch(/\.app-card-shell__actions\{[^}]*flex-wrap:nowrap/);
    expect(styleSource).toMatch(/\.app-card-shell__header\{[^}]*align-items:flex-start/);
    expect(styleSource).toMatch(/\.app-card-shell__identity\{[^}]*min-width:0/);
  });

  it("keeps the compact override bounded and preserves the shared card geometry", () => {
    expect(styleSource).toContain("@media(max-width:760px)");
    expect(styleSource).toContain(".app-card-shell__actions");
    expect(styleSource).toContain("min-height:220px");
    expect(styleSource).toContain("prefers-reduced-motion:reduce");
  });
});