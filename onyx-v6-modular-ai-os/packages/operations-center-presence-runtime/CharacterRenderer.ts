import type { CharacterId, CharacterProjection } from "./CharacterProjection.js";

export const APPROVED_CHARACTER_ARTWORK: Readonly<Record<CharacterId, Readonly<{ id: string; source: string }>>> = Object.freeze({
  ONYX: Object.freeze({ id: "ONYX_MASTER_V2", source: "/heroes/onyx-original.jpeg" }),
  NOVA: Object.freeze({ id: "NOVA_MASTER_V2", source: "/heroes/nova-original.jpeg" }),
});

export const CHARACTER_MOTION_PROFILES = Object.freeze({
  ONYX: Object.freeze({ blinkMinimumMs: 4_000, blinkMaximumMs: 8_000, breathingDurationMs: 5_200, breathingScale: 1.008 }),
  NOVA: Object.freeze({ blinkMinimumMs: 3_000, blinkMaximumMs: 7_000, breathingDurationMs: 5_600, breathingScale: 1.011 }),
} satisfies Readonly<Record<CharacterId, Readonly<{
  blinkMinimumMs: number;
  blinkMaximumMs: number;
  breathingDurationMs: number;
  breathingScale: number;
}>>>);

export function nextBlinkDelay(character: CharacterId, randomValue = Math.random()): number {
  const profile = CHARACTER_MOTION_PROFILES[character];
  const normalized = Number.isFinite(randomValue) ? Math.max(0, Math.min(1, randomValue)) : 0.5;
  return Math.round(profile.blinkMinimumMs + (profile.blinkMaximumMs - profile.blinkMinimumMs) * normalized);
}

export function renderCharacter(character: CharacterId, projection: CharacterProjection): string {
  const active = projection.activeSpeaker === character || projection.activeSpeaker === "COUNCIL";
  const focusClass = active ? `character-focus character-focus-${character.toLowerCase()}` : "character-ambient";
  const motion = CHARACTER_MOTION_PROFILES[character];
  const blinkStyle = `--blink-duration:${projection.blinkProfile.durationMs}ms;--blink-interval:${nextBlinkDelay(character)}ms`;
  const breathingStyle = `--breathing-duration:${motion.breathingDurationMs}ms;--breathing-scale:${motion.breathingScale}`;

  const artwork = APPROVED_CHARACTER_ARTWORK[character];
  return `<figure class="presence-character ${focusClass} ${projection.auraProfile.cssClass} ${projection.blinkProfile.cssClass} ${projection.breathingProfile.cssClass}" data-character="${character}" data-asset-id="${artwork.id}" data-active="${active}" data-state="${projection.state}" style="${blinkStyle};${breathingStyle}"><img src="${artwork.source}" alt="${character}" draggable="false"><span class="character-aura" aria-hidden="true"></span><span class="character-eyelids" aria-hidden="true"></span><figcaption>${character}</figcaption></figure>`;
}