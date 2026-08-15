import { useState, type FormEvent } from "react";
import type { AssistantMode, CoreState } from "@onyx/contracts";

export function GlassCommandBar({ mode, state, onMic, onCommand }: {
  mode: AssistantMode;
  state: CoreState;
  onMic: () => void;
  onCommand: (command: string) => void;
}) {
  const [value, setValue] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const command = value.trim();
    if (!command) return;
    onCommand(command);
    setValue("");
  };
  return <form className={`glass-command glass-command-${state}`} onSubmit={submit}>
    <input value={value} onChange={(event) => setValue(event.target.value)} aria-label={`Ask ${mode}`} placeholder={`Ask ${mode.toUpperCase()} anything...`} />
    <div className="command-actions">
      <button type="submit" className="glass-send" aria-label="Send command">➤</button>
      <button type="button" className="glass-mic" onClick={onMic} aria-label="Push to talk"><span>🎙</span><i/><em/></button>
    </div>
  </form>;
}
