// @onyx/post-alpha-avatar-runtime-preview
// Presentation-grade avatar registry fixtures and composition adapters

export type { AvatarRegistryFixture, RegistryResolverOptions } from "./registry-fixture.js";
export type { CompositionAdapter, DesktopProjection, TvProjection } from "./composition-adapter.js";

export { createAvatarRegistryFixture, validateRegistryFixture } from "./registry-fixture.js";
export { createCompositionAdapter, createDesktopProjection, createTvProjection } from "./composition-adapter.js";
export { createOnyxPreviewFixture, createNovaPreviewFixture } from "./desktop-fixtures.js";
