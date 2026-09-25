import { describe, expect, it } from "vitest";
import { disableAppOrbit, enableAppOrbit, snapshotAppOrbit, type AppProjectionFrame } from "../AppOrbit.js";

const frames: readonly AppProjectionFrame[] = [
  { appId: "workspace", x: 3, y: 7, width: 22, height: 28, zIndex: 4, focused: false },
  { appId: "automation", x: 67, y: 33, width: 26, height: 31, zIndex: 9, focused: true },
];

describe("presentation-only app orbit", () => {
  it("snapshots position, size, focus, and stacking order", () => {
    const snapshot = snapshotAppOrbit(frames);
    expect(snapshot.frames).toEqual(frames);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.frames[0])).toBe(true);
  });

  it("projects apps into orbit without mutating the snapshot", () => {
    const snapshot = snapshotAppOrbit(frames);
    const orbit = enableAppOrbit(snapshot);
    expect(orbit.enabled).toBe(true);
    expect(orbit.presentationOnly).toBe(true);
    expect(orbit.frames).not.toEqual(frames);
    expect(snapshot.frames).toEqual(frames);
  });

  it("restores the exact prior layout when disabled", () => {
    const restored = disableAppOrbit(enableAppOrbit(snapshotAppOrbit(frames)));
    expect(restored.frames).toEqual(frames);
  });
});