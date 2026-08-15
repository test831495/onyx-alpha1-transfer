import { useEffect, useState } from "react";
import type { AssistantMode, CoreState } from "@onyx/contracts";

const actions: Record<AssistantMode, Array<{ label: string; short: string; angle: number }>> = {
  nova: [
    { label: "Listen", short: "Listen", angle: 0 },
    { label: "Tasks", short: "Tasks", angle: 60 },
    { label: "Files", short: "Files", angle: 120 },
    { label: "Calendar", short: "Calendar", angle: 180 },
    { label: "System", short: "System", angle: 240 },
    { label: "Switch to ONYX", short: "Switch", angle: 300 },
  ],
  onyx: [
    { label: "Listen", short: "Listen", angle: 0 },
    { label: "Executive", short: "Executive", angle: 60 },
    { label: "Finance", short: "Finance", angle: 120 },
    { label: "News", short: "News", angle: 180 },
    { label: "Automation", short: "Auto", angle: 240 },
    { label: "Switch to NOVA", short: "Switch", angle: 300 },
  ],
};

export function HeroCore({ mode, state, onSwitch, onAction, lowPower }: {
  mode: AssistantMode; state: CoreState; onSwitch: () => void;
  onAction: (action: string) => void; lowPower: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [mode]);
  const choose = (action: string) => {
    setMenuOpen(false);
    if (action.startsWith("Switch")) onSwitch(); else onAction(action);
  };
  const label = state === "thinking" ? "ANALYZING" : state === "error" ? "ATTENTION" : state.replace("-", " ").toUpperCase();

  return <section className={`hero-core hero-${mode} core-${state} ${menuOpen ? "menu-open" : "menu-closed"} ${lowPower ? "hero-low-power" : ""}`}>
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
        {actions[mode].map(({label:action,short,angle}) => <button key={action} role="menuitem" aria-label={action} title={action}
          style={{"--action-angle":`${angle}deg`} as React.CSSProperties}
          onPointerDown={event => event.stopPropagation()}
          onClick={event => { event.preventDefault(); event.stopPropagation(); choose(action); }}><span>{short}</span></button>)}
      </div>}
    </div>
    <div className="hero-status-row"><b>{label}</b><small>Tap core for actions</small></div>
  </section>;
}
