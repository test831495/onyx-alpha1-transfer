import { deepFreeze, type PresenceLifecycleState } from "./contracts";

export function createAccessibilityProjection(state: PresenceLifecycleState, reducedMotion = true) {
  const semanticDescription = `ONYX interaction state: ${state.toLowerCase().replaceAll("_", " ")}.`;
  return deepFreeze({
    semanticState: state,
    semanticDescription,
    screenReaderSafe: true as const,
    captions: true as const,
    captionTiming: "DETERMINISTIC_FIXTURE" as const,
    textInputOutputFallback: true as const,
    reducedMotion,
    highContrast: true as const,
    textOnlyFallback: true as const,
    keyboardNavigation: true as const,
    remoteFocus: true as const,
    noColorOnlyMeaning: true as const,
    stopControl: true as const,
    muteProjection: true as const,
    tvTypography: { minimumCaptionPixels: 36, maximumLineCharacters: 42, largeCaptions: true as const },
  });
}