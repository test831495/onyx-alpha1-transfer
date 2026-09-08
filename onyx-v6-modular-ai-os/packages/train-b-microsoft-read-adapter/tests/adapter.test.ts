import { describe, expect, it } from "vitest";
import { runAdapterConformance } from "@onyx/train-b-connector-adapter-foundation";
import { microsoftReadAdapter } from "../src/index.js";

describe("Microsoft synthetic read adapter", () => {
  it("is conformant and disabled by default", () => {
    expect(runAdapterConformance(microsoftReadAdapter).passed).toBe(true);
    expect(microsoftReadAdapter.registration.enabled).toBe(false);
  });
});
