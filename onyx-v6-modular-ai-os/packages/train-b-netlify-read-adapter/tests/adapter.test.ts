import { describe, expect, it } from "vitest";
import { runAdapterConformance } from "@onyx/train-b-connector-adapter-foundation";
import { netlifyReadAdapter } from "../src/index.js";

describe("Netlify synthetic read adapter", () => {
  it("is conformant and disabled by default", () => {
    expect(runAdapterConformance(netlifyReadAdapter).passed).toBe(true);
    expect(netlifyReadAdapter.registration.enabled).toBe(false);
  });
});
