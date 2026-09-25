import type { CouncilProfile } from "./CharacterProjection.js";

export function renderCouncil(profile: CouncilProfile): string {
  if (!profile.visible) {
    return `<div class="presence-council ${profile.cssClass}" data-visible="false" hidden></div>`;
  }

  const members = profile.members.map((member) => `<span class="council-member">${member}</span>`).join("");
  return `<aside class="presence-council ${profile.cssClass}" data-visible="true" data-advisory-only="true" data-grants-authority="false" aria-label="Council visual"><span class="council-status">Council Active</span>${members}</aside>`;
}