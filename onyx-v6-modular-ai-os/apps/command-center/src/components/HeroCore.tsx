import { useEffect, useState } from "react";
import type { AssistantMode, CoreState } from "@onyx/contracts";
import {
  type ActivationControl,
  mapCoreStateToSemanticState,
  PRIVATE_ALPHA_BUILD_ACTIVATION,
  projectNativeSemanticFallback,
} from "../nativeSemanticFallbackActivation";
import type { NativeQuality, NativeSemanticState } from "../nativeSemanticFallbackActivation";
import { getOrbitActions, type OrbitActionDefinition } from "../orbitActionRegistry";

export function HeroCore({ mode, state, onSwitch, onAction, lowPower, quality, activationControl = PRIVATE_ALPHA_BUILD_ACTIVATION }: {
  mode: AssistantMode; state: CoreState | NativeSemanticState; onSwitch: () => void;
  onAction: (action: string) => void; lowPower: boolean; quality: NativeQuality; activationControl?: ActivationControl;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [mode]);
  const choose = (definition: OrbitActionDefinition) => {
    setMenuOpen(false);
    if (definition.handler?.kind === "ASSISTANT_SWITCH") onSwitch(); else onAction(definition.id);
  };
  const legacyState = state.toLowerCase().replaceAll("_", "-");
  const legacyLabelSource = legacyState.replaceAll("-", " ");
  const legacyLabel = legacyState === "thinking" ? "ANALYZING" : legacyState === "error" ? "ATTENTION" : legacyLabelSource.toUpperCase();
  const semantic = projectNativeSemanticFallback(
    activationControl,
    mode === "onyx" ? "ONYX" : "NOVA",
    mapCoreStateToSemanticState(state),
    { quality },
  );
  const presentationState = semantic.enabled ? semantic.state.toLowerCase() : legacyState;
  const label = semantic.enabled ? semantic.state.replace("_", " ") : legacyLabel;

  return <section className={`hero-core hero-${mode} core-${presentationState} ${semantic.enabled ? `native-fallback-${semantic.state.toLowerCase()}` : "native-fallback-off"} ${menuOpen ? "menu-open" : "menu-closed"} ${lowPower ? "hero-low-power" : ""}`}>
    {menuOpen && <button className="core-dismiss-layer" aria-label="Close core menu" onClick={() => setMenuOpen(false)} />}
    <div className="hero-visual-zone">
      <div className="portrait-deck" aria-hidden="true">
        <div className="portrait-aura aura-nova"/><div className="portrait-aura aura-onyx"/>
        <img src="/heroes/nova-original.jpeg" alt="" className={`portrait portrait-nova ${mode === "nova" ? "is-active" : "is-inactive"}`} draggable={false}/>
        <img src="/heroes/onyx-original.jpeg" alt="" className={`portrait portrait-onyx ${mode === "onyx" ? "is-active" : "is-inactive"}`} draggable={false}/>
        <div className="portrait-edge-blend"/>
      </div>
      <div className={`core-aura core-aura-${mode}`} aria-hidden="true"/>
      <button className="functional-core" onClick={() => setMenuOpen(open => !open)} aria-expanded={menuOpen} aria-label={`${mode.toUpperCase()} actions`}><span>{mode.toUpperCase()}</span><i/><em/></button>
      <div className="state-visual" aria-hidden="true">{Array.from({length:8},(_,i)=><i key={i} style={{"--i":i} as React.CSSProperties}/>)}</div>
      {menuOpen && <div className="equal-action-ring" role="menu" aria-label={`${mode} actions`}>
        <div className="equal-ring-track" aria-hidden="true"/>
        {getOrbitActions(mode).map(definition => {
          const disabled = definition.kind === "DISABLED_UNAVAILABLE";
          return <button key={definition.id} role="menuitem"
            aria-label={disabled ? `${definition.label} — unavailable — ${definition.disabledReason}` : definition.label}
            title={disabled ? definition.disabledReason : definition.label}
            disabled={disabled}
            aria-disabled={disabled ? true : undefined}
            style={{"--action-angle":`${definition.angle}deg`} as React.CSSProperties}
            onPointerDown={event => event.stopPropagation()}
            onClick={event => { event.preventDefault(); event.stopPropagation(); if (disabled) return; choose(definition); }}><span>{definition.shortLabel}</span></button>;
        })}
      </div>}
    </div>
    <div className="hero-status-row"><b>{label}</b>{semantic.enabled && <small className="native-semantic-label" aria-live="polite">{semantic.label}</small>}<small>Tap core for actions</small></div>
  </section>;
}
