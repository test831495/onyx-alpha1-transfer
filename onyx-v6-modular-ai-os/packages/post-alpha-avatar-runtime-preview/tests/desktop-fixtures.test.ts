import { describe, it, expect } from "vitest";
import { createOnyxPreviewFixture, createNovaPreviewFixture } from "../src/desktop-fixtures";

describe("Desktop Fixtures", () => {
  it("should create ONYX preview fixture", () => {
    const fixture = createOnyxPreviewFixture();
    expect(fixture.character).toBe("ONYX");
    expect(fixture.desktopLayout).toBe("SIDEBAR");
  });

  it("should create NOVA preview fixture", () => {
    const fixture = createNovaPreviewFixture();
    expect(fixture.character).toBe("NOVA");
    expect(fixture.desktopLayout).toBe("FLOATING");
  });

  it("should have metadata on ONYX fixture", () => {
    const fixture = createOnyxPreviewFixture();
    expect(fixture.metadata).toBeDefined();
    expect(fixture.metadata.version).toBe("0.1.0");
    expect(fixture.metadata.createdAt).toBeDefined();
  });

  it("should have different layouts for ONYX and NOVA", () => {
    const onyxFixture = createOnyxPreviewFixture();
    const novaFixture = createNovaPreviewFixture();
    expect(onyxFixture.desktopLayout).not.toBe(novaFixture.desktopLayout);
  });
});
