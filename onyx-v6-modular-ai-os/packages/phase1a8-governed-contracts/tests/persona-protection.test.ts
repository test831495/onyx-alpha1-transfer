import { describe, expect, it } from "vitest";
import { assertCouncilKeepsPersonasDistinct, assertNoPersonaWriteTarget, assertPersonaBoundary, COUNCIL_PRESENCE_MODE, PERSONA_IDS, readPersonaMetadata } from "../src/track-b/persona-protection";

describe("Wave 3A immutable persona protection", () => {
  it("exposes only distinct read-only ONYX and NOVA metadata", () => {
    expect(PERSONA_IDS).toEqual(["ONYX", "NOVA"]);
    expect(readPersonaMetadata("ONYX")).toMatchObject({ personaId: "ONYX", immutable: true });
    expect(readPersonaMetadata("NOVA")).toMatchObject({ personaId: "NOVA", immutable: true });
    expect(() => readPersonaMetadata("ONYX_NOVA_COUNCIL")).toThrow();
  });

  it("has no generic P0 writer path and blocks every lifecycle mutation", () => {
    for (const operation of ["CORRECTION", "SUPERSESSION", "DELETION", "PROMOTION", "LEDGER_APPEND", "SELF_MODIFICATION"]) {
      expect(() => assertPersonaBoundary(operation, "P0")).toThrow();
    }
    expect(() => assertNoPersonaWriteTarget("P0")).toThrow();
    expect(() => assertNoPersonaWriteTarget("M2")).not.toThrow();
  });

  it("keeps Council as presence only and does not merge personas", () => {
    expect(COUNCIL_PRESENCE_MODE).toBe("ONYX_NOVA_COUNCIL");
    expect(() => assertCouncilKeepsPersonasDistinct(["ONYX", "NOVA"])).not.toThrow();
    expect(() => assertCouncilKeepsPersonasDistinct(["ONYX_NOVA_COUNCIL"])).toThrow();
    expect(() => assertCouncilKeepsPersonasDistinct(["ONYX", "ONYX"])).toThrow();
  });
});
