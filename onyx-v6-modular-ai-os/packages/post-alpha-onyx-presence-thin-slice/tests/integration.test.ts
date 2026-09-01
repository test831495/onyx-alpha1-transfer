import { describe, expect, it } from "vitest";
import { FOUNDATION_BINDINGS, POST_ALPHA_VALIDATION_PROFILE, PROHIBITED_EFFECTS, VALIDATION_COMMANDS } from "../src/index";

describe("Presence integration eligibility boundaries", () => {
  it("PPT-060 predecessor foundation regressions", () => {
    expect(FOUNDATION_BINDINGS).toMatchObject({ governance: "CONTRACT_SAFE", intelligence: "CONTRACT_SAFE", avatar: "CONTRACT_SAFE", assurance: "EXTERNAL_VERIFIER_ONLY" });
  });

  it("PPT-061 all Post-Alpha package regressions", () => {
    expect(POST_ALPHA_VALIDATION_PROFILE).toMatchObject({ packageTests: "ALL_POST_ALPHA", packageTypechecks: "ALL_POST_ALPHA", expectedPredecessorTests: 42 });
  });

  it("PPT-062 monorepo typecheck and Factory regression", () => {
    expect(VALIDATION_COMMANDS).toContain("pnpm typecheck");
    expect(VALIDATION_COMMANDS).toContain("pnpm --filter @onyx/ai-development-factory-foundation test");
    expect(POST_ALPHA_VALIDATION_PROFILE.expectedFactoryTests).toBe(303);
  });

  it("PPT-063 no runtime activation, Git action, PA-PRESENCE external composition, or paid provider", () => {
    expect(PROHIBITED_EFFECTS).toMatchObject({ runtimeActivation: false, gitAction: false, externalComposition: false, paidProvider: false, networkAccess: false, externalMutation: false });
  });
});