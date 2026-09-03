export const CHARACTERS = Object.freeze(["ONYX", "NOVA"] as const);
export type CharacterId = (typeof CHARACTERS)[number];
export type SemanticState = "IDLE" | "LISTENING" | "UNDERSTANDING" | "THINKING" | "SPEAKING" | "APPROVAL_REQUIRED" | "PRIVACY_RESTRICTED" | "RECOVERING";
export type RenderOptions = { readonly reducedMotion?: boolean; readonly highContrast?: boolean };
export type RenderIntent = { readonly character: CharacterId; readonly version: "1.0"; readonly state: SemanticState; readonly motion: "subtle" | "focused" | "analytical" | "timed" | "reduced" | "static"; readonly aura: "none" | "approval" | "privacy" | "recovery"; readonly lighting: "standard" | "high-contrast" | "restoration"; readonly contrast: "standard" | "high"; readonly expression: "neutral" | "attentive" | "analytical" | "speaking" | "minimized"; readonly fallback: boolean; readonly provider: "abstract" };
const states: Readonly<Record<SemanticState, Omit<RenderIntent, "character" | "version" | "state">>> = {
  IDLE: { motion: "subtle", aura: "none", lighting: "standard", contrast: "standard", expression: "neutral", fallback: false, provider: "abstract" },
  LISTENING: { motion: "focused", aura: "none", lighting: "standard", contrast: "standard", expression: "attentive", fallback: false, provider: "abstract" },
  UNDERSTANDING: { motion: "analytical", aura: "none", lighting: "standard", contrast: "standard", expression: "analytical", fallback: false, provider: "abstract" },
  THINKING: { motion: "analytical", aura: "none", lighting: "standard", contrast: "standard", expression: "analytical", fallback: false, provider: "abstract" },
  SPEAKING: { motion: "timed", aura: "none", lighting: "standard", contrast: "standard", expression: "speaking", fallback: false, provider: "abstract" },
  APPROVAL_REQUIRED: { motion: "focused", aura: "approval", lighting: "standard", contrast: "standard", expression: "attentive", fallback: false, provider: "abstract" },
  PRIVACY_RESTRICTED: { motion: "static", aura: "privacy", lighting: "standard", contrast: "standard", expression: "minimized", fallback: false, provider: "abstract" },
  RECOVERING: { motion: "static", aura: "recovery", lighting: "restoration", contrast: "standard", expression: "neutral", fallback: true, provider: "abstract" },
};
export function renderIntent(character: CharacterId, state: SemanticState, options: RenderOptions = {}): RenderIntent { const intent = states[state]; return Object.freeze({ character, version: "1.0", state, ...intent, motion: options.reducedMotion ? "reduced" : intent.motion, contrast: options.highContrast ? "high" : intent.contrast, lighting: options.highContrast ? "high-contrast" : intent.lighting }); }
export function rendererFallback(character: CharacterId, state: SemanticState): RenderIntent { return Object.freeze({ ...renderIntent(character, state, { reducedMotion: true }), fallback: true }); }
