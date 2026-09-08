import { describe, expect, it } from "vitest";
import { runAdapterConformance } from "@onyx/train-b-connector-adapter-foundation";
import { githubReadAdapter } from "../src/index.js";

describe("GitHub synthetic read adapter", () => {
  it("is conformant and disabled by default", () => {
    expect(runAdapterConformance(githubReadAdapter).passed).toBe(true);
    expect(githubReadAdapter.registration.enabled).toBe(false);
  });
});
