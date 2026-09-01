import { describe, expect, it } from "vitest";
import { buildPresenceContext, composeMemoryFixture, FIXTURES, projectStatusTool } from "../src/index";

describe("Presence context, memory, and tool boundaries", () => {
  it("PPT-020 bounded Context Envelope", () => {
    const context = buildPresenceContext(FIXTURES.contextInput);
    expect(context).toMatchObject({ ownerScope: "OWNER_PRIVATE", role: "ONYX", memoryProjection: null, toolResult: null, cancelled: false });
    expect(context.evidenceReferences).toHaveLength(1);
  });

  it("PPT-021 token budget valid path", () => {
    expect(buildPresenceContext(FIXTURES.contextInput).tokenBudget.status).toBe("ACCEPTED");
  });

  it("PPT-022 token budget invalid path", () => {
    expect(() => buildPresenceContext({ ...FIXTURES.contextInput, tokenBudget: { ...FIXTURES.contextInput.tokenBudget, total: 0 } })).toThrow();
  });

  it("PPT-023 evidence current path", () => {
    expect(buildPresenceContext(FIXTURES.contextInput).freshness).toBe("CURRENT");
  });

  it("PPT-024 evidence missing path", () => {
    expect(() => buildPresenceContext({ ...FIXTURES.contextInput, evidence: [] })).toThrow(/NOT_ASSESSABLE/);
  });

  it("PPT-025 evidence stale/conflicting path", () => {
    expect(() => buildPresenceContext({ ...FIXTURES.contextInput, evidence: [{ ...FIXTURES.contextInput.evidence[0]!, status: "STALE" }] })).toThrow();
    expect(() => buildPresenceContext({ ...FIXTURES.contextInput, evidence: [...FIXTURES.contextInput.evidence, { ...FIXTURES.contextInput.evidence[0]!, id: "e2", claim: "conflict" }] })).toThrow();
  });

  it("PPT-026 one-memory maximum", () => {
    const memory = composeMemoryFixture(FIXTURES.memoryRecords);
    expect(memory.records.filter((record) => record.tier === "M4")).toHaveLength(1);
    expect(() => composeMemoryFixture([...FIXTURES.memoryRecords, { ...FIXTURES.memoryRecords[2]!, id: "m4-2" }])).toThrow();
  });

  it("PPT-027 no memory persistence/admission", () => {
    const projected = composeMemoryFixture(FIXTURES.memoryRecords);
    expect(projected).toMatchObject({ persisted: false, admitted: false, rawTransfer: false, ownerScope: "OWNER_PRIVATE" });
    expect(projected.records.every((record) => !("content" in record))).toBe(true);
    expect(projected.records.every((record) => "reference" in record && "boundedSummary" in record && "provenance" in record && "sensitivity" in record && "freshness" in record)).toBe(true);
    expect(composeMemoryFixture([{ ...FIXTURES.memoryRecords[0]!, freshness: "STALE" }]).records).toHaveLength(0);
  });

  it("PPT-028 read-only tool success", () => {
    expect(projectStatusTool({ projectId: "onyx", cancelled: false, available: true })).toMatchObject({ status: "CURRENT", access: "READ_ONLY", authorizing: false, externalEffect: false });
  });

  it("PPT-029 read-only tool unavailable/NOT_ASSESSABLE", () => {
    expect(projectStatusTool({ projectId: "onyx", cancelled: false, available: false }).status).toBe("NOT_ASSESSABLE");
    expect(projectStatusTool({ projectId: "onyx", cancelled: true, available: true }).status).toBe("CANCELLED");
  });
});