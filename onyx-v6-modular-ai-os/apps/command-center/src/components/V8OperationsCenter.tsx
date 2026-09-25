import type { ReactNode } from "react";
import type { NativeSemanticState } from "../nativeSemanticFallbackActivation";
import "../styles/V8OperationsCenter.css";

export type OperationsCenterSpeaker = "ONYX" | "NOVA" | "COUNCIL" | "NONE";

// Same canonical artwork the desktop presence shell renders (packages/operations-center-presence-runtime/CharacterRenderer.ts).
const CANONICAL_PORTRAIT: Record<"ONYX" | "NOVA", string> = {
  ONYX: "/heroes/onyx-original.jpeg",
  NOVA: "/heroes/nova-original.jpeg",
};

export function V8OperationsCenter({ state, characterStage, intentLayer, activeSpeaker = "NONE", caption }: {
  state: NativeSemanticState;
  characterStage: ReactNode;
  intentLayer: ReactNode;
  activeSpeaker?: OperationsCenterSpeaker;
  caption?: string;
}) {
  const stateLabel = state.replaceAll("_", " ");
  const speakerState = (speaker: "ONYX" | "NOVA"): string =>
    activeSpeaker === speaker || activeSpeaker === "COUNCIL" ? stateLabel : "standby";
  const speakerCard = (speaker: "ONYX" | "NOVA") => {
    const active = activeSpeaker === speaker || activeSpeaker === "COUNCIL";
    return <div key={speaker} className={`v8-speaker-card v8-speaker-${speaker.toLowerCase()} ${active ? "is-active" : "is-standby"}`}>
      <img className="v8-speaker-portrait" src={CANONICAL_PORTRAIT[speaker]} alt={`${speaker} portrait`} draggable={false} />
      <span className="v8-speaker-name">{speaker}</span>
      <span className="v8-speaker-state">{speakerState(speaker)}</span>
    </div>;
  };
  return <section className={`v8-operations-center v8-state-${state.toLowerCase()}`} aria-label="ONYX and NOVA Operations Center">
    <div className="v8-world" data-world="future-city-local" aria-hidden="true">
      <div className="v8-skyline" />
      <div className="v8-horizon" />
      <div className="v8-command-deck" />
    </div>
    {/* display:contents on desktop keeps every child positioned exactly as before; mobile turns this into the flex stack */}
    <div className="v8-mobile-shell">
      <header className="v8-presence-status">
        <span>Operations Center</span>
        <strong>{state === "IDLE" ? "System Ready" : stateLabel}</strong>
      </header>
      {/* Compact mobile-only speaker cards carrying the same canonical portraits as the desktop character stage */}
      <div className="v8-mobile-speakers" role="group" aria-label="ONYX and NOVA speaker status">
        {speakerCard("ONYX")}
        {speakerCard("NOVA")}
      </div>
      <div className="v8-council-lane" data-council-authority="false">
        <span className="v8-council-signal" aria-hidden="true" />
        <span>Council Available</span>
      </div>
      {/* Mobile-only conversation region; keeps the current answer visible above the input */}
      <div className="v8-conversation-region" role="log" aria-live="polite">
        <p className="v8-conversation-text">{caption || (state === "IDLE" ? "System Ready" : stateLabel)}</p>
      </div>
      <div className="v8-intent-layer">
        <div className="v8-intent-heading">
          <span>{state === "IDLE" ? "Awaiting Command" : stateLabel}</span>
          <small>Ask · Search · Open · Control · Create</small>
        </div>
        {intentLayer}
      </div>
    </div>
    <div className="v8-character-stage">{characterStage}</div>
  </section>;
}