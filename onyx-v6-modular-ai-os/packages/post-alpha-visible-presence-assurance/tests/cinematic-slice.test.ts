import { describe, expect, it } from "vitest";
import { buildCinematicSlice } from "../src/cinematic-slice.js";

describe("CINEMATIC_PRESENCE_SLICE_1", () => {
  it("covers the deterministic bounded sequence", () => {
    const slice = buildCinematicSlice();
    expect(slice.accepted).toBe(true);
    expect(slice.frames).toHaveLength(9);
    expect(slice.frames.filter((frame) => frame.character === "ONYX")).toHaveLength(8);
    expect(slice.frames[4]?.captions).toBe(true);
    expect(slice.frames[5]?.disclosure).toBe("normal");
    expect(slice.frames[6]?.disclosure).toBe("minimized");
    expect(slice.frames[8]).toMatchObject({ character: "NOVA", world: "FUTURE_CITY", state: "IDLE" });
    expect(slice.externalIo).toBe(false);
    expect(slice.flags).toBe("OFF");
    expect(slice.activation).toBe("NONE");
  });
});
