import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(resolve(process.cwd(), "src/components/HeroCore.tsx"), "utf8");
const styleSource = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8");

describe("PRESENTATION-MOBILE-ORBIT-001", () => {
  it("keeps the Executive label intact in the compact action node", () => {
    expect(componentSource).toContain('{ label: "Executive", short: "Executive", angle: 60 }');
    expect(componentSource).toContain('aria-label={action}');
    expect(styleSource).toMatch(/\.equal-action-ring button\[aria-label="Executive"\] span\{[^}]*white-space:nowrap/);
    expect(styleSource).toMatch(/\.equal-action-ring button\[aria-label="Executive"\] span\{[^}]*overflow-wrap:normal/);
    expect(styleSource).toMatch(/\.equal-action-ring button\[aria-label="Executive"\] span\{[^}]*word-break:normal/);
  });

  it("preserves the compact node touch target and desktop rule", () => {
    expect(styleSource).toContain(".equal-action-ring button{position:absolute;left:0;top:0;width:52px;height:52px;");
    expect(styleSource).toContain(".equal-action-ring button{width:44px;height:44px;font-size:7.5px;");
    expect(styleSource).toContain("@media(max-width:1100px){.functional-footer");
  });
});