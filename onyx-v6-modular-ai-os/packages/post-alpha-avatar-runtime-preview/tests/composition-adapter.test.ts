import { describe, it, expect } from "vitest";
import {
  createDesktopProjection,
  createTvProjection,
  createCompositionAdapter,
} from "../src/composition-adapter";
import { createAvatarRegistryFixture } from "../src/registry-fixture";

describe("Composition Adapter", () => {
  it("should create desktop projection with default parameters", () => {
    const projection = createDesktopProjection("ONYX");
    expect(projection.character).toBe("ONYX");
    expect(projection.layout).toBe("SIDEBAR");
    expect(projection.resolution.width).toBe(320);
    expect(projection.resolution.height).toBe(600);
    expect(projection.fps).toBe(30);
  });

  it("should create desktop projection with custom layout", () => {
    const projection = createDesktopProjection("NOVA", "FLOATING");
    expect(projection.layout).toBe("FLOATING");
  });

  it("should create TV projection with default parameters", () => {
    const projection = createTvProjection("ONYX");
    expect(projection.character).toBe("ONYX");
    expect(projection.layout).toBe("CORNER");
    expect(projection.resolution.width).toBe(1920);
    expect(projection.resolution.height).toBe(1080);
    expect(projection.fps).toBe(60);
  });

  it("should create composition adapter from fixture", () => {
    const fixture = createAvatarRegistryFixture("comp-001", "ONYX", "ACTIVE");
    const adapter = createCompositionAdapter(fixture);
    expect(adapter.character).toBe("ONYX");
    expect(adapter.fixtureId).toBe("comp-001");
  });

  it("should project desktop from adapter", () => {
    const fixture = createAvatarRegistryFixture("comp-002", "NOVA", "ACTIVE");
    const adapter = createCompositionAdapter(fixture, "INLINE");
    const desktop = adapter.projectDesktop();
    expect(desktop.character).toBe("NOVA");
    expect(desktop.layout).toBe("INLINE");
  });

  it("should project TV from adapter", () => {
    const fixture = createAvatarRegistryFixture("comp-003", "ONYX", "ACTIVE");
    const adapter = createCompositionAdapter(fixture, undefined, "FULL_SCREEN");
    const tv = adapter.projectTv();
    expect(tv.character).toBe("ONYX");
    expect(tv.layout).toBe("FULL_SCREEN");
  });

  it("should validate projection consistency", () => {
    const fixture = createAvatarRegistryFixture("comp-004", "ONYX", "ACTIVE");
    const adapter = createCompositionAdapter(fixture);
    expect(adapter.validateProjection()).toBe(true);
  });
});
