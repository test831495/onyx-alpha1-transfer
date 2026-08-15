import type { AssistantMode, CoreState } from "@onyx/contracts";

const hotspots = {
  nova: [
    ["Time and greeting", "time"],
    ["Weather", "weather"],
    ["System health", "health"],
    ["Calendar", "calendar"],
    ["Smart home", "smart-home"],
  ],
  onyx: [
    ["Business overview", "business"],
    ["Calendar", "calendar"],
    ["Finance tracker", "finance"],
    ["News briefing", "news"],
    ["Social monitor", "social"],
    ["Smart home", "smart-home"],
    ["Weather", "weather"],
    ["System performance", "performance"],
  ],
} as const;

export function ReferenceStage({
  mode,
  state,
  caption,
  onCore,
  onHotspot,
}: {
  mode: AssistantMode;
  state: CoreState;
  caption: string;
  onCore: () => void;
  onHotspot: (label: string) => void;
}) {
  return (
    <section className={`reference-stage reference-${mode} state-${state}`}>
      <img
        className="reference-scene"
        src={`/scenes/${mode}-reference.webp`}
        alt=""
        draggable={false}
        decoding="async"
      />
      <div className="scene-vignette" aria-hidden="true" />
      <div className="scene-shimmer" aria-hidden="true" />
      <button
        className="scene-core-control"
        onClick={onCore}
        aria-label={`${mode.toUpperCase()} central AI core`}
      >
        <span className="scene-core-ring" />
        <span className="scene-core-state">{state.replace("-", " ").toUpperCase()}</span>
      </button>
      <div className="scene-waveform" aria-hidden="true">
        {Array.from({ length: 28 }, (_, index) => (
          <i key={index} style={{ "--bar": index } as React.CSSProperties} />
        ))}
      </div>
      <div className="scene-caption" role="status" aria-live="polite">
        {caption}
      </div>
      <div className="scene-hotspots">
        {hotspots[mode].map(([label, key]) => (
          <button
            key={key}
            className={`scene-hotspot hotspot-${key}`}
            aria-label={label}
            title={label}
            onClick={() => onHotspot(label)}
          />
        ))}
      </div>
    </section>
  );
}
