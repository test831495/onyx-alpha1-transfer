import { renderCharacter } from "./CharacterRenderer.js";
import type { CharacterProjection } from "./CharacterProjection.js";
import { renderCouncil } from "./CouncilRenderer.js";
import { projectCharacterPresence } from "./ProjectionEngine.js";
import { renderReactor } from "./ReactorRenderer.js";

const PRESENCE_STYLES = `<style>
.presence-shell{position:relative;display:grid;grid-template-columns:1fr minmax(8rem,18%) 1fr;align-items:end;min-height:32rem;overflow:hidden;background:#030609;color:#eef7ff}
.presence-character{position:relative;height:30rem;margin:0;opacity:.68;transition:opacity 240ms ease,filter 240ms ease}.presence-character img{width:100%;height:100%;object-fit:contain}.presence-character figcaption{position:absolute;inset:auto 0 1rem;text-align:center;font:600 .8rem sans-serif}.character-focus{opacity:1}.character-focus-onyx{filter:drop-shadow(0 0 1.6rem #22c7ff)}.character-focus-nova{filter:drop-shadow(0 0 1.6rem #f5c66a)}
.character-aura{position:absolute;inset:12% 8%;z-index:-1;border-radius:50%;box-shadow:0 0 3rem currentColor}.listening-glow{color:#42d9ff}.speaking-glow{color:#8af0c7;animation:presence-speaking 1s ease-in-out infinite}.approval-amber{color:#ffb534}.privacy-shield{color:#86a0b8;filter:saturate(.45)}.recovery-visualization{color:#61d5a8}.thinking-pulse{color:#7dc5ff;animation:presence-pulse 1.6s ease-in-out infinite}
.character-eyelids{position:absolute;inset:28% 25% auto;height:2px}.blink-scheduler .character-eyelids{animation:presence-blink var(--blink-interval) step-end infinite}.breathing-scheduler img{animation:presence-breathe var(--breathing-duration) ease-in-out infinite}
.presence-reactor{align-self:center;text-align:center}.reactor-core{display:block;width:5rem;aspect-ratio:1;margin:auto;border:2px solid #8edfff;border-radius:50%;box-shadow:inset 0 0 1.4rem #36b9e8,0 0 1.8rem #36b9e8}.reactor-label{display:block;margin-top:.75rem;font:600 .7rem sans-serif;text-transform:uppercase}.presence-reactor[data-animated=true] .reactor-core{animation:presence-pulse 1.4s ease-in-out infinite}
.presence-council{position:absolute;inset:1rem 1rem auto;display:flex;justify-content:center;gap:1rem}.council-active{filter:drop-shadow(0 0 1rem #8edfff)}.council-hidden{display:none}.council-member{border-bottom:1px solid #8edfff;padding:.35rem .75rem;font:600 .7rem sans-serif}.presence-caption{position:absolute;inset:auto 0 .75rem;display:flex;justify-content:center;gap:1rem;text-align:center;font:600 .75rem sans-serif}
@keyframes presence-blink{0%,3%,100%{transform:scaleY(0)}1%,2%{transform:scaleY(1)}}@keyframes presence-breathe{0%,100%{transform:scale(1)}50%{transform:scale(var(--breathing-scale))}}@keyframes presence-pulse{0%,100%{opacity:.62}50%{opacity:1}}@keyframes presence-speaking{0%,100%{filter:brightness(1)}50%{filter:brightness(1.16)}}
@media(prefers-reduced-motion:reduce){.presence-shell *{animation:none!important;transition:none!important}}
</style>`;

export function renderPresenceShell(projection: CharacterProjection): string {
  const stateLabel = projection.state.replace(/_/g, " ").toLowerCase();
  const speakerLabel = projection.activeSpeaker.toLowerCase();
  const reasoningStage = projection.reactorProfile.mode.replace(/_/g, " ").toLowerCase();
  const caption = `<div class="presence-caption" aria-live="${projection.captionProfile.ariaLive}"><span data-caption-speaker>Speaker: ${speakerLabel}</span><span data-caption-state>State: ${stateLabel}</span><span data-caption-reasoning>Reasoning stage: ${reasoningStage}</span></div>`;
  return `${PRESENCE_STYLES}<section class="presence-shell" data-state="${projection.state}" data-speaker="${projection.activeSpeaker}" data-offline-capable="true" aria-label="ONYX and NOVA presence"><div class="presence-characters">${renderCharacter("ONYX", projection)}</div>${renderReactor(projection.reactorProfile)}<div class="presence-characters">${renderCharacter("NOVA", projection)}</div>${renderCouncil(projection.councilProfile)}${caption}</section>`;
}

export function PresenceShell(input: unknown): string {
  return renderPresenceShell(projectCharacterPresence(input));
}