import { createAccessibilityProjection } from "./accessibility";
import { deepFreeze, type PresenceLifecycleState } from "./contracts";

export interface PresentationEnvelope {
  readonly semanticState: string;
  readonly authorizing: false;
}

const ONYX_IDENTITY = Object.freeze({ id: "ONYX", gender: "MALE", canonicalVersion: "PA-AVATAR-01", role: "STRATEGIC_COMPANION_AND_INTEGRATOR" as const });

export interface AvatarPresentationCompatibility {
  readonly acceptedEnvelope?: PresentationEnvelope;
}

export function createPresentationFixture(state: PresenceLifecycleState) {
  const accessibility = createAccessibilityProjection(state);
  return deepFreeze({
    character: "ONYX" as const,
    role: ONYX_IDENTITY.role,
    identity: ONYX_IDENTITY,
    semanticState: state,
    syntheticVisual: true as const,
    descriptor: "Generic geometric ONYX presence descriptor",
    layers: {
      baseIdle: { active: state === "IDLE", presentationOnly: true as const },
      semanticState: { state, operationalTruth: false as const },
      captionTiming: { mode: accessibility.captionTiming },
      privacy: { mode: "OWNER_PRIVATE" as const },
      accessibility,
      ambientWorld: { worldId: "OPERATIONS_CENTER_REFERENCE_WORLD" as const, presentationOnly: true as const },
      rendererFallback: ["SYNTHETIC_DESCRIPTOR", "TEXT_ONLY"] as const,
    },
    authorizing: false as const,
    operationalTruth: false as const,
  });
}

export function createDesktopProjection(state: PresenceLifecycleState) {
  const presentation = createPresentationFixture(state);
  return deepFreeze({ device: "DESKTOP" as const, identity: presentation.identity, semanticState: state, stateDescription: presentation.layers.accessibility.semanticDescription, textInputRequired: true as const, captions: true as const, onyxDescriptor: presentation.descriptor, continuityUsedCue: true as const, stopControl: true as const, interruptionControl: true as const, highContrast: true as const, reducedMotion: true as const, textOnlyFallback: true as const, ownerPrivate: true as const, runtimeActivation: false as const, authorizing: false as const });
}

export function createTvProjection(state: PresenceLifecycleState) {
  const presentation = createPresentationFixture(state);
  return deepFreeze({ device: "TV" as const, interfaceClass: "PRESENCE_INTERFACE" as const, mirroring: false as const, identity: presentation.identity, semanticState: state, stateDescription: presentation.layers.accessibility.semanticDescription, tenFootReadable: true as const, largeCaptions: true as const, reducedDensity: true as const, remoteFocus: true as const, sharedRoomRedaction: true as const, highContrast: true as const, reducedMotion: true as const, textOnlyFallback: true as const, adapterActive: false as const, runtimeActivation: false as const, authorizing: false as const });
}

export function replaceRenderer(presentation: ReturnType<typeof createPresentationFixture>, renderer: "SYNTHETIC_DESCRIPTOR" | "TEXT_ONLY") {
  return deepFreeze({ renderer, semanticState: presentation.semanticState, identity: presentation.identity, authorizing: presentation.authorizing, operationalTruth: presentation.operationalTruth });
}

export function createAmbientWorldFixture() {
  return deepFreeze({ worldId: "OPERATIONS_CENTER_REFERENCE_WORLD" as const, classification: "REFERENCE_ONLY" as const, lightingProfile: "STATIC_COOL_NEUTRAL" as const, ambientAudioClass: "OPTIONAL_SYNTHETIC_LOW" as const, reducedMotionVariant: "STATIC_LIGHTING" as const, textOnlyFallback: "Operations center reference world", presentationOnly: true as const, operationalTruthEffect: false as const, locationWeatherInput: false as const, runtimeAssetDependency: false as const });
}