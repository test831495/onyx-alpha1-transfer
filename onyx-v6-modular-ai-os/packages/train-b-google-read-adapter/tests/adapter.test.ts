import { describe, expect, it } from "vitest";
import { runAdapterConformance } from "@onyx/train-b-connector-adapter-foundation";
import { googleReadAdapter } from "../src/index.js";

describe("Google synthetic read adapter", () => {
  it("is conformant and disabled by default", () => {
    expect(runAdapterConformance(googleReadAdapter).passed).toBe(true);
    expect(googleReadAdapter.registration.enabled).toBe(false);
  });
});
