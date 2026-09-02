import { createPresentationFixture } from "@onyx/post-alpha-onyx-presence-thin-slice";

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
