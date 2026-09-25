export type AppProjectionFrame = Readonly<{
  appId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  focused: boolean;
}>;

export type AppOrbitSnapshot = Readonly<{
  frames: readonly AppProjectionFrame[];
  enabled: false;
}>;

export type AppOrbitProjection = Readonly<{
  frames: readonly AppProjectionFrame[];
  snapshot: AppOrbitSnapshot;
  enabled: true;
  presentationOnly: true;
}>;

function freezeFrames(frames: readonly AppProjectionFrame[]): readonly AppProjectionFrame[] {
  return Object.freeze(frames.map((frame) => Object.freeze({ ...frame })));
}

export function snapshotAppOrbit(frames: readonly AppProjectionFrame[]): AppOrbitSnapshot {
  return Object.freeze({ frames: freezeFrames(frames), enabled: false });
}

export function enableAppOrbit(snapshot: AppOrbitSnapshot): AppOrbitProjection {
  const count = Math.max(1, snapshot.frames.length);
  const projected = snapshot.frames.map((frame, index) => {
    const angle = -Math.PI / 2 + index / count * Math.PI * 2;
    return {
      ...frame,
      x: 50 + Math.cos(angle) * 34 - frame.width / 2,
      y: 46 + Math.sin(angle) * 31 - frame.height / 2,
      zIndex: frame.focused ? 20 : 10 + index,
    };
  });
  return Object.freeze({ frames: freezeFrames(projected), snapshot, enabled: true, presentationOnly: true });
}

export function disableAppOrbit(projection: AppOrbitProjection): AppOrbitSnapshot {
  return snapshotAppOrbit(projection.snapshot.frames);
}