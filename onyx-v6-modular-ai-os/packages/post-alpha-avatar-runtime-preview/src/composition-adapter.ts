import { AvatarRegistryFixture } from "./registry-fixture.js";

export interface DesktopProjection {
  character: "ONYX" | "NOVA";
  layout: "SIDEBAR" | "FLOATING" | "INLINE";
  resolution: { width: number; height: number };
  fps: number;
}

export interface TvProjection {
  character: "ONYX" | "NOVA";
  layout: "FULL_SCREEN" | "CORNER" | "PICTURE_IN_PICTURE";
  resolution: { width: number; height: number };
  fps: number;
}

export interface CompositionAdapter {
  fixtureId: string;
  character: "ONYX" | "NOVA";
  projectDesktop(): DesktopProjection;
  projectTv(): TvProjection;
  validateProjection(): boolean;
}

export function createDesktopProjection(
  character: "ONYX" | "NOVA",
  layout: "SIDEBAR" | "FLOATING" | "INLINE" = "SIDEBAR",
  resolution: { width: number; height: number } = { width: 320, height: 600 },
  fps: number = 30
): DesktopProjection {
  return { character, layout, resolution, fps };
}

export function createTvProjection(
  character: "ONYX" | "NOVA",
  layout: "FULL_SCREEN" | "CORNER" | "PICTURE_IN_PICTURE" = "CORNER",
  resolution: { width: number; height: number } = { width: 1920, height: 1080 },
  fps: number = 60
): TvProjection {
  return { character, layout, resolution, fps };
}

export function createCompositionAdapter(
  fixture: AvatarRegistryFixture,
  desktopLayout?: "SIDEBAR" | "FLOATING" | "INLINE",
  tvLayout?: "FULL_SCREEN" | "CORNER" | "PICTURE_IN_PICTURE"
): CompositionAdapter {
  return {
    fixtureId: fixture.id,
    character: fixture.character,
    projectDesktop() {
      return createDesktopProjection(fixture.character, desktopLayout);
    },
    projectTv() {
      return createTvProjection(fixture.character, tvLayout);
    },
    validateProjection() {
      const desktop = this.projectDesktop();
      const tv = this.projectTv();

      if (desktop.character !== fixture.character) {
        throw new Error("Desktop projection character mismatch");
      }
      if (tv.character !== fixture.character) {
        throw new Error("TV projection character mismatch");
      }

      return true;
    },
  };
}
