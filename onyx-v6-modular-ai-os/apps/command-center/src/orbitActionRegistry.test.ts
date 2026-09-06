import { describe, expect, it } from "vitest";
import {
  ORBIT_ACTION_REGISTRY,
  findOrbitAction,
  getOrbitActions,
  resolveOrbitHandler,
  validateOrbitRegistry,
} from "./orbitActionRegistry";

describe("ORBIT-ACTION-REGISTRY-001", () => {
  it("is duplicate-free and every entry resolves to exactly one handler or a disabled reason", () => {
    expect(validateOrbitRegistry()).toEqual([]);
  });

  it("fails closed for unknown action IDs", () => {
    expect(findOrbitAction("does-not-exist")).toBeUndefined();
    expect(resolveOrbitHandler("does-not-exist")).toBeUndefined();
  });

  it("rejects raw visible labels as dispatch IDs", () => {
    expect(findOrbitAction("Executive")).toBeUndefined();
    expect(resolveOrbitHandler("Executive")).toBeUndefined();
    expect(resolveOrbitHandler("Tasks")).toBeUndefined();
  });

  it("does not return a handler for disabled/unavailable orbit actions", () => {
    expect(resolveOrbitHandler("onyx.executive")).toBeUndefined();
    expect(resolveOrbitHandler("onyx.finance")).toBeUndefined();
    expect(resolveOrbitHandler("nova.files")).toBeUndefined();
  });

  it("resolves proven registered targets for enabled navigation actions", () => {
    expect(resolveOrbitHandler("nova.tasks")).toEqual({ kind: "OPEN_SHELL_APP", appId: "tasks" });
    expect(resolveOrbitHandler("nova.calendar")).toEqual({ kind: "OPEN_SHELL_APP", appId: "calendar" });
    expect(resolveOrbitHandler("nova.system")).toEqual({ kind: "OPEN_SHELL_APP", appId: "health" });
    expect(resolveOrbitHandler("onyx.news")).toEqual({ kind: "OPEN_SHELL_APP", appId: "news" });
    expect(resolveOrbitHandler("onyx.automation")).toEqual({ kind: "OPEN_SHELL_APP", appId: "automation" });
  });

  it("keeps ONYX and NOVA registries deterministic and character-scoped", () => {
    const nova = getOrbitActions("nova");
    const onyx = getOrbitActions("onyx");
    expect(nova.map((entry) => entry.id)).toEqual([
      "nova.listen",
      "nova.tasks",
      "nova.files",
      "nova.calendar",
      "nova.system",
      "nova.switch",
    ]);
    expect(onyx.map((entry) => entry.id)).toEqual([
      "onyx.listen",
      "onyx.executive",
      "onyx.finance",
      "onyx.news",
      "onyx.automation",
      "onyx.switch",
    ]);
    expect(nova.every((entry) => entry.character === "nova")).toBe(true);
    expect(onyx.every((entry) => entry.character === "onyx")).toBe(true);
  });

  it("preserves the currently valid Executive and Calendar visible labels and angles", () => {
    expect(findOrbitAction("onyx.executive")).toMatchObject({ label: "Executive", angle: 60 });
    expect(findOrbitAction("nova.calendar")).toMatchObject({ label: "Calendar", angle: 180 });
  });

  it("covers every registered entry with the shared registry array", () => {
    expect(ORBIT_ACTION_REGISTRY.length).toBe(12);
  });
});
