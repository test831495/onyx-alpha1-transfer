import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Phase 1A.11 NOVA_CALENDAR_NAVIGATION_PARITY_FIX
// Root cause (E: conditional rendering bug): the footer nav Calendar button
// was gated behind `mode === "onyx"`, hiding it for NOVA. This test locks in
// parity by asserting the footer nav renders identically for both
// characters and always routes through the single shared "calendar" app id.
const appSource = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

function extractFooterNav(source: string): string {
  const start = source.indexOf('<footer className="functional-footer">');
  const navStart = source.indexOf("<nav", start);
  const navEnd = source.indexOf("</nav>", navStart) + "</nav>".length;
  expect(start).toBeGreaterThan(-1);
  expect(navStart).toBeGreaterThan(-1);
  return source.slice(navStart, navEnd);
}

describe("footer navigation calendar parity (ONYX/NOVA)", () => {
  const footerNav = extractFooterNav(appSource);

  it("does not gate the Calendar nav button behind a character check", () => {
    expect(footerNav).not.toMatch(/mode === "onyx"/);
    expect(footerNav).not.toMatch(/mode === "nova"/);
  });

  it("contains exactly one Calendar navigation entry bound to the shared calendar app id", () => {
    const matches = footerNav.match(/openShellApp\("calendar"\)/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(footerNav).toContain('<button onClick={() => openShellApp("calendar")}>Calendar</button>');
  });

  it("preserves navigation ordering: Home, Messages, Tasks, News, Workspace, Calendar, Automation, Settings, Health", () => {
    const labels = ["Home", "Messages", "Tasks", "News", "Workspace", "Calendar", "Automation", "Settings", "Health"];
    let cursor = -1;
    for (const label of labels) {
      const index = footerNav.indexOf(label, cursor + 1);
      expect(index, `expected label "${label}" after position ${cursor}`).toBeGreaterThan(cursor);
      cursor = index;
    }
  });

  it("routes Calendar through the same shell app id used elsewhere (no duplicate route/component)", () => {
    expect(footerNav).toContain('openShellApp("calendar")');
    // No second, competing calendar route target inside the footer nav.
    expect((footerNav.match(/"calendar"/g) ?? []).length).toBe(1);
  });

  it("does not regress any existing footer navigation entry", () => {
    for (const [label, appId] of [
      ["Messages", "messages"],
      ["Tasks", "tasks"],
      ["News", "news"],
      ["Workspace", "workspace"],
      ["Automation", "automation"],
      ["Settings", "settings"],
      ["Health", "health"],
    ] as const) {
      expect(footerNav).toContain(`<button onClick={() => openShellApp("${appId}")}>${label}</button>`);
    }
    expect(footerNav).toMatch(/>\s*Home\s*<\/button>/);
  });
});
