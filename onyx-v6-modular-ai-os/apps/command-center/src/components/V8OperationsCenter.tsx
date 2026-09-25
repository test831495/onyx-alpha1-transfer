import type { ReactNode } from "react";
import type { NativeSemanticState } from "../nativeSemanticFallbackActivation";
import "../styles/V8OperationsCenter.css";

export function V8OperationsCenter({ state, characterStage, intentLayer }: {
  state: NativeSemanticState;
  characterStage: ReactNode;
  intentLayer: ReactNode;
}) {
  const stateLabel = state.replaceAll("_", " ");
  return <section className={`v8-operations-center v8-state-${state.toLowerCase()}`} aria-label="ONYX and NOVA Operations Center">
    <div className="v8-world" data-world="future-city-local" aria-hidden="true">
      <div className="v8-skyline" />
      <div className="v8-horizon" />
      <div className="v8-command-deck" />
    </div>
    <header className="v8-presence-status">
      <span>Operations Center</span>
      <strong>{state === "IDLE" ? "System Ready" : stateLabel}</strong>
    </header>
    <div className="v8-character-stage">{characterStage}</div>
    <div className="v8-council-lane" data-council-authority="false">
      <span className="v8-council-signal" aria-hidden="true" />
      <span>Council Available</span>
    </div>
    <div className="v8-intent-layer">
      <div className="v8-intent-heading">
        <span>{state === "IDLE" ? "Awaiting Command" : stateLabel}</span>
        <small>Ask · Search · Open · Control · Create</small>
      </div>
      {intentLayer}
    </div>
  </section>;
}