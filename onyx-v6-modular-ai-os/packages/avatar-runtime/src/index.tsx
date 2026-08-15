import { useEffect, useState, type CSSProperties } from "react";
import type { AssistantMode, CoreState } from "@onyx/contracts";

export type AvatarExpression =
  | "neutral"
  | "attentive"
  | "explaining"
  | "acknowledging"
  | "success"
  | "warning"
  | "error";

export interface AvatarRuntimeState {
  mode: AssistantMode;
  core: CoreState;
  expression: AvatarExpression;
  speechLevel: number;
  viseme: number;
}

export const AVATAR_ASSETS: Record<AssistantMode, string> = {
  nova: "/avatars/nova-avatar.webp",
  onyx: "/avatars/onyx-avatar.webp",
};

export function avatarAssetForMode(mode: AssistantMode): string {
  return AVATAR_ASSETS[mode];
}

export function expressionForState(core: CoreState): AvatarExpression {
  switch (core) {
    case "listening": return "attentive";
    case "thinking":
    case "speaking": return "explaining";
    case "executing": return "acknowledging";
    case "error": return "error";
    default: return "neutral";
  }
}

export function useSpeechDynamics(core: CoreState) {
  const [level, setLevel] = useState(0);
  const [viseme, setViseme] = useState(0);

  useEffect(() => {
    if (core !== "speaking") {
      setLevel(0);
      setViseme(0);
      return;
    }
    let frame = 0;
    const started = performance.now();
    const tick = (now: number) => {
      const wave =
        (Math.sin((now - started) / 72) +
          Math.sin((now - started) / 131) + 2) / 4;
      setLevel(0.24 + wave * 0.76);
      setViseme(1 + Math.floor(wave * 8));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [core]);

  return { level, viseme };
}

export function preloadAvatarAssets() {
  if (typeof window === "undefined") return;
  Object.values(AVATAR_ASSETS).forEach((src) => {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
  });
}

export function AvatarStage({
  state,
  reducedMotion = false,
  onActivate,
}: {
  state: AvatarRuntimeState;
  reducedMotion?: boolean;
  onActivate?: () => void;
}) {
  const label = state.mode.toUpperCase();
  const style = { "--speech-level": state.speechLevel } as CSSProperties;

  return (
    <figure
      className={`avatar-stage avatar-${state.mode} avatar-${state.core} expr-${state.expression} ${reducedMotion ? "reduce-motion" : ""}`}
      aria-label={`${label} avatar, ${state.core}`}
      style={style}
    >
      <span className="avatar-aura" aria-hidden="true" />
      <button className="avatar-hit" onClick={onActivate} aria-label={`Activate ${label}`}>
        {(Object.keys(AVATAR_ASSETS) as AssistantMode[]).map((avatarMode) => (
          <img
            key={avatarMode}
            src={AVATAR_ASSETS[avatarMode]}
            alt=""
            className={`avatar-image avatar-image-${avatarMode} ${state.mode === avatarMode ? "is-active" : "is-inactive"}`}
            draggable={false}
            decoding="async"
          />
        ))}
        <span className="avatar-face-pulse" aria-hidden="true" />
        <span className="avatar-scan" aria-hidden="true" />
      </button>
      <figcaption>
        <b>{label}</b>
        <span>{state.core.replace("-", " ").toUpperCase()}</span>
      </figcaption>
    </figure>
  );
}

export const avatarPrivacyContract = {
  allowed: ["mode", "core state", "expression label", "speech level", "viseme number", "caption summary", "target module id"],
  denied: ["api keys", "passwords", "raw local files", "raw screenshots", "camera video", "unnecessary private content"],
} as const;
