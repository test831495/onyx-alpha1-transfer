import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(new URL("./AppCardShell.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("PRESENTATION-MOBILE-CARD-001", () => {
  it("keeps shared card actions accessible and side by side on compact layouts", () => {
    expect(componentSource).toContain('aria-label={`Minimize ${title}`}');
    expect(componentSource).toContain('aria-label={`Close ${title}`}');
    expect(styleSource).toMatch(/\.functional-scene--cards\s*\.app-card-shell__actions\s*\{[^}]*flex:0\s+0\s+auto[^}]*flex-wrap:\s*nowrap[^}]*gap:\s*4px/);
    expect(styleSource).toMatch(/\.functional-scene--cards\s*\.app-card-shell__header\s*\{[^}]*align-items:\s*flex-start[^}]*gap:\s*6px/);
    expect(styleSource).toMatch(/\.functional-scene--cards\s*\.app-card-shell__identity\s*\{[^}]*min-width:\s*0/);
  });

  it("keeps the compact override bounded and preserves the shared card geometry", () => {
    expect(styleSource).toContain("@media(max-width:760px)");
    expect(styleSource).toContain(".app-card-shell__actions");
    expect(styleSource).toContain("min-height:220px");
    expect(styleSource).toContain("prefers-reduced-motion:reduce");
  });

  it("restores the pre-PR-45 tiled card width without changing action alignment", () => {
    expect(styleSource).toMatch(/\.app-card-shell\{[^}]*width:min\(300px,28vw\)[^}]*max-width:300px/);
    expect(styleSource).not.toMatch(/\.functional-scene--cards\{[^}]*--card-width:min\(300px,calc\(100vw\s*-\s*32px\)\)/);
    expect(styleSource).not.toMatch(/\.functional-scene--cards\s*\.app-card-shell\{[^}]*width:var\(--card-width\)/);
    expect(styleSource).toMatch(/\.functional-scene--cards\s*\.app-card-shell__actions\s*\{[^}]*flex-wrap:\s*nowrap[^}]*gap:\s*4px/);
    expect(styleSource).toMatch(/\.functional-scene--cards\s*\.app-card-shell__identity\s*\{[^}]*min-width:\s*0/);
    expect(styleSource).toMatch(/\.app-card-shell--left_top|\.app-card-shell--right_middle/);
    expect(styleSource).toContain("overflow-navigation-region");
  });
});