import { CHARACTERS, renderIntent, rendererFallback, type CharacterId, type RenderIntent, type SemanticState } from "./index.js";

const SEMANTIC_STATES: readonly SemanticState[] = ["IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "SPEAKING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "RECOVERING"];
export type DeviceVariant = "DESKTOP" | "TV" | "MOBILE" | "TABLET" | "CONSTRAINED";
const DEVICE_VARIANTS: readonly DeviceVariant[] = ["DESKTOP", "TV", "MOBILE", "TABLET", "CONSTRAINED"];

// VP-RENDERER-01 / VP-RENDERER-02
export function isDistinctCharacter(character: CharacterId): boolean {
  return CHARACTERS.includes(character) && CHARACTERS.filter((candidate) => candidate === character).length === 1;
}

// VP-RENDERER-03
export function canonicalIdentityAcrossVariants(character: CharacterId, state: SemanticState): boolean {
  return DEVICE_VARIANTS.every((variant) => projectForVariant(character, state, variant).character === character && projectForVariant(character, state, variant).version === "1.0");
}
export type VariantProjection = RenderIntent & { readonly variant: DeviceVariant };
export function projectForVariant(character: CharacterId, state: SemanticState, variant: DeviceVariant): VariantProjection {
  const intent = renderIntent(character, state, { reducedMotion: variant === "CONSTRAINED", highContrast: false });
  return Object.freeze({ ...intent, variant });
}

// VP-RENDERER-04
export type RendererAdapterContract = { readonly boundImplementation: null };
export function rendererAdapterBoundary(): RendererAdapterContract {
  return Object.freeze({ boundImplementation: null });
}

// VP-RENDERER-05
export function coversAllEightStates(character: CharacterId): boolean {
  return new Set(SEMANTIC_STATES.map((state) => renderIntent(character, state).state)).size === 8;
}

// VP-RENDERER-06
export function idleMotionIsOptionalAndNonSemantic(character: CharacterId): boolean {
  const withMotion = renderIntent(character, "IDLE");
  const reduced = renderIntent(character, "IDLE", { reducedMotion: true });
  return withMotion.state === reduced.state && withMotion.aura === reduced.aura;
}

// VP-RENDERER-07
export type TransitionIntent = { readonly from: SemanticState; readonly to: SemanticState; readonly operational: false };
export function transitionIntentNotOperationalEvent(from: SemanticState, to: SemanticState): TransitionIntent {
  return Object.freeze({ from, to, operational: false });
}

// VP-RENDERER-08
export function approvalPriorityWithoutGranting(character: CharacterId): boolean {
  const intent = renderIntent(character, "APPROVAL_REQUIRED");
  return intent.aura === "approval" && intent.fallback === false;
}

// VP-RENDERER-09
export function privacyPriorityOverAppearance(character: CharacterId): boolean {
  const intent = renderIntent(character, "PRIVACY_RESTRICTED");
  return intent.aura === "privacy" && intent.expression === "minimized";
}

// VP-RENDERER-10
export function recoveringWithoutClaimingCompletion(character: CharacterId): boolean {
  const intent = renderIntent(character, "RECOVERING");
  return intent.aura === "recovery" && intent.fallback === true && !("recoveryComplete" in intent);
}

// VP-RENDERER-11
export function reducedMotionRemovesNonessentialMotion(character: CharacterId, state: SemanticState): boolean {
  return renderIntent(character, state, { reducedMotion: true }).motion === "reduced";
}

// VP-RENDERER-12
export function highContrastPreservesStateDistinction(character: CharacterId): boolean {
  const labels = new Set(SEMANTIC_STATES.map((state) => renderIntent(character, state, { highContrast: true }).expression));
  return labels.size === SEMANTIC_STATES.length;
}

// VP-RENDERER-13
export function textOnlyFallbackWhenUnavailable(character: CharacterId, state: SemanticState): boolean {
  return rendererFallback(character, state).fallback === true;
}

// VP-RENDERER-14
export function preservesSemanticsOnDesktopAndTv(character: CharacterId, state: SemanticState): boolean {
  const desktop = projectForVariant(character, state, "DESKTOP");
  const tv = projectForVariant(character, state, "TV");
  return desktop.character === tv.character && desktop.state === tv.state && desktop.aura === tv.aura;
}

// VP-RENDERER-15
export function requiresNoExternalProviderDependency(): boolean {
  return renderIntent("ONYX", "IDLE").provider === "abstract";
}
