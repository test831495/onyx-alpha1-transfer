import type { ReactorProfile } from "./CharacterProjection.js";

export function renderReactor(profile: ReactorProfile): string {
  const label = profile.mode.replace(/_/g, " ").toLowerCase();
  return `<div class="presence-reactor ${profile.cssClass}" data-reactor-state="${profile.mode}" data-animated="${profile.animated}" role="status" aria-label="Reactor ${label}"><span class="reactor-core" aria-hidden="true"></span><span class="reactor-label">${label}</span></div>`;
}