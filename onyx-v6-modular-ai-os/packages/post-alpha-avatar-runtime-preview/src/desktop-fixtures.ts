import { createPresentationFixture, createDesktopProjection as createPresenceDesktopProjection } from "@onyx/post-alpha-onyx-presence-thin-slice";
import { createAvatarRegistryFixture } from "./registry-fixture.js";
import { CANONICAL_CHARACTERS } from "@onyx/post-alpha-avatar-foundation";

export interface PreviewFixture {
  character: "ONYX" | "NOVA";
  presentationState: string;
  desktopLayout: string;
  tvLayout: string;
  metadata: { createdAt: string; version: string };
}

export function createOnyxPreviewFixture(): PreviewFixture {
  // ONYX reuses sealed PA-PRESENCE behavior (ONYX-specific)
  const presentationFixture = createPresentationFixture("IDLE");
  const registryFixture = createAvatarRegistryFixture(
    "preview-onyx-desktop-001",
    "ONYX",
    "ACTIVE",
    "CANONICAL"
  );

  const desktopProjection = createPresenceDesktopProjection("IDLE");

  return {
    character: "ONYX",
    presentationState: presentationFixture.semanticState,
    desktopLayout: "SIDEBAR",
    tvLayout: "CORNER",
    metadata: {
      createdAt: new Date().toISOString(),
      version: "0.1.0",
    },
  };
}

export function createNovaPreviewFixture(): PreviewFixture {
  // NOVA fixtures are package-local (not reusing PA-PRESENCE ONYX-specific behavior)
  const registryFixture = createAvatarRegistryFixture(
    "preview-nova-desktop-001",
    "NOVA",
    "ACTIVE",
    "CANONICAL"
  );

  return {
    character: "NOVA",
    presentationState: "IDLE",
    desktopLayout: "FLOATING",
    tvLayout: "PICTURE_IN_PICTURE",
    metadata: {
      createdAt: new Date().toISOString(),
      version: "0.1.0",
    },
  };
}
