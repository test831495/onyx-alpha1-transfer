export interface ConversationDecisionProjection {
  readonly kind: string;
  readonly sideEffect: string;
}

export interface ConversationShadowProjection {
  readonly diverged: boolean;
  readonly divergenceCategory: "NONE" | "CLASSIFICATION" | "SIDE_EFFECT" | "CONTEXT";
  readonly legacyKind: string;
  readonly v1Kind: string;
  readonly projectedSideEffect: string;
  readonly contextOutcome: string;
  readonly sideEffectsExecuted: false;
}

export function projectConversationShadow(
  legacy: ConversationDecisionProjection,
  v1: ConversationDecisionProjection,
  contextOutcome: string,
): ConversationShadowProjection {
  const classificationDiffers = legacy.kind !== v1.kind;
  const sideEffectDiffers = legacy.sideEffect !== v1.sideEffect;
  return Object.freeze({
    diverged: classificationDiffers || sideEffectDiffers || contextOutcome !== "RESOLVED",
    divergenceCategory: classificationDiffers ? "CLASSIFICATION" : sideEffectDiffers ? "SIDE_EFFECT" : contextOutcome !== "RESOLVED" ? "CONTEXT" : "NONE",
    legacyKind: legacy.kind,
    v1Kind: v1.kind,
    projectedSideEffect: v1.sideEffect,
    contextOutcome,
    sideEffectsExecuted: false,
  });
}