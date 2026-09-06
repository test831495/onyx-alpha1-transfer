import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { findOrbitAction } from "../orbitActionRegistry";

const componentSource = readFileSync(new URL("./HeroCore.tsx", import.meta.url), "utf8");
const styleSource = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

describe("PRESENTATION-MOBILE-ORBIT-001", () => {
  it("keeps the Executive label intact in the orbit action registry", () => {
    expect(findOrbitAction("onyx.executive")).toMatchObject({ label: "Executive", shortLabel: "Executive", angle: 60 });
    expect(componentSource).toContain("aria-label={disabled");
    expect(styleSource).toMatch(/\.equal-action-ring button\[aria-label\^="Executive"\] span\s*,\s*\.equal-action-ring button\[aria-label="Calendar"\] span\{[^}]*white-space:nowrap/);
    expect(styleSource).toMatch(/\.equal-action-ring button\[aria-label\^="Executive"\] span\s*,\s*\.equal-action-ring button\[aria-label="Calendar"\] span\{[^}]*overflow-wrap:normal/);
    expect(styleSource).toMatch(/\.equal-action-ring button\[aria-label\^="Executive"\] span\s*,\s*\.equal-action-ring button\[aria-label="Calendar"\] span\{[^}]*word-break:normal/);
  });

  it("keeps Calendar readable without weakening the Executive fix", () => {
    expect(findOrbitAction("nova.calendar")).toMatchObject({ label: "Calendar", shortLabel: "Calendar", angle: 180 });
    expect(styleSource).toMatch(/\.equal-action-ring button\[aria-label\^="Executive"\] span\s*,\s*\.equal-action-ring button\[aria-label="Calendar"\] span\{[^}]*white-space:nowrap/);
    expect(styleSource).toMatch(/\.equal-action-ring button\[aria-label\^="Executive"\] span\s*,\s*\.equal-action-ring button\[aria-label="Calendar"\] span\{[^}]*overflow-wrap:normal/);
  });

  it("preserves the compact node touch target and desktop rule", () => {
    expect(styleSource).toContain(".equal-action-ring button{position:absolute;left:0;top:0;width:52px;height:52px;");
    expect(styleSource).toContain(".equal-action-ring button{width:44px;height:44px;font-size:7.5px;");
    expect(styleSource).toContain("@media(max-width:1100px){.functional-footer");
  });

  it("gives disabled/unavailable orbit nodes truthful native-disabled presentation", () => {
    expect(componentSource).toContain("disabled={disabled}");
    expect(componentSource).toContain("aria-disabled={disabled ? true : undefined}");
    expect(styleSource).toContain('.equal-action-ring button:disabled,.equal-action-ring button[aria-disabled="true"]{opacity:.42');
  });
});