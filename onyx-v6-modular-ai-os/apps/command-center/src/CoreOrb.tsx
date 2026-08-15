import type { AssistantMode, CoreState } from "@onyx/contracts";
import { AvatarExperience } from "./AvatarExperience";

export function CoreOrb({
  mode,
  state,
  caption,
  demoMode,
  onMode,
}: {
  mode: AssistantMode;
  state: CoreState;
  caption: string;
  demoMode: boolean;
  onMode: (mode: AssistantMode) => void;
}) {
  const assistant = mode.toUpperCase();
  return (
    <div className={`core-zone ${mode} ${state}`}>
      <div className="assistant-visual-stage">
        <AvatarExperience mode={mode} state={state} onActivate={() => onMode(mode)} />
        <div className="orbit o1" />
        <div className="orbit o2" />
        <button
          className="ai-core"
          onClick={() => onMode(mode === "nova" ? "onyx" : "nova")}
          aria-label={`Switch from ${mode}`}
        >
          <span>{assistant}</span>
        </button>
      </div>
      <div className="assistant-state">
        <strong>{state.replace("-", " ").toUpperCase()}</strong>
        <small>Say “Hey {mode === "nova" ? "Nova" : "Onyx"}” or tap the avatar</small>
      </div>
      <div className="avatar-caption" role="status" aria-live="polite">
        {caption || `${assistant} is ready.`}
      </div>
      <div className={`mode-context ${demoMode ? "demo" : mode}`}>
        {demoMode ? "AVATAR STATE DEMO" : mode === "nova" ? "NOVA · LOCAL" : "ONYX · CLOUD UI PREVIEW"}
      </div>
    </div>
  );
}
