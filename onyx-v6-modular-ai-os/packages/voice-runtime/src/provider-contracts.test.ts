import { describe, expect, it } from "vitest";
import {
  createAdapterRegistry,
  createDeterministicModelRouter,
  type ModelAdapter,
  type STTAdapter,
  type TTSAdapter,
  type WakeWordAdapter,
} from "./provider-contracts";

const localModel: ModelAdapter = {
  id: "model.local.baseline",
  kind: "MODEL",
  enabled: false,
  providerReference: "synthetic-local",
  capabilities: ["CHAT"],
  health: "HEALTHY",
  quality: 0.9,
  privacy: "LOCAL_ONLY",
  reliability: 0.95,
  latencyMs: 80,
  costScore: 1,
};

describe("provider-neutral C1 contracts", () => {
  it("keeps all registries disabled until an explicit policy activation", () => {
    const registry = createAdapterRegistry("MODEL", [localModel]);

    expect(registry.enabled()).toEqual([]);
    expect(registry.byId("model.local.baseline")?.enabled).toBe(false);
  });

  it("fails closed before ranking when trusted time or an eligible local baseline is missing", () => {
    const router = createDeterministicModelRouter({ policyVersion: "c1-v2" });
    const registry = createAdapterRegistry("MODEL", [localModel]);

    expect(router.route({ requestId: "missing-time", privacy: "LOCAL_ONLY", budgetMs: 1000 }, registry)).toMatchObject({
      ok: false,
      error: "TRUSTED_TIME_REQUIRED",
    });
    expect(router.route({ requestId: "disabled", privacy: "LOCAL_ONLY", budgetMs: 1000, trustedTime: "2026-09-09T00:00:00.000Z" }, registry)).toMatchObject({
      ok: false,
      error: "NO_ELIGIBLE_MODEL_ADAPTER",
    });
  });

  it("rejects duplicate, unknown, malformed, expired and disabled registrations for every adapter kind", () => {
    const complete = <T extends ModelAdapter | STTAdapter | TTSAdapter | WakeWordAdapter>(adapter: T) => ({ ...adapter, healthEvidence: { observedAt: "2026-09-09T00:00:00.000Z", expiresAt: "2026-09-10T00:00:00.000Z", evidenceReference: "synthetic-health" }, costEvidence: { known: true, budgetCompatible: true, evidenceReference: "synthetic-cost" }, region: "LOCAL" });
    expect(() => createAdapterRegistry("MODEL", [complete(localModel), complete(localModel)])).toThrow("Duplicate adapter id");
    expect(createAdapterRegistry("STT", [complete({ ...localModel, id: "stt.local", kind: "STT", capabilities: ["TRANSCRIBE"] })]).kind).toBe("STT");
    expect(createAdapterRegistry("TTS", [complete({ ...localModel, id: "tts.local", kind: "TTS", capabilities: ["SYNTHESIZE"] })]).kind).toBe("TTS");
    expect(createAdapterRegistry("WAKE_WORD", [complete({ ...localModel, id: "wake.local", kind: "WAKE_WORD", capabilities: ["DETECT_WAKE_WORD"] })]).kind).toBe("WAKE_WORD");
    expect(() => createAdapterRegistry("MODEL", [complete({ ...localModel, expiresAt: "invalid" })])).toThrow("Invalid expiry evidence");
  });

  it("ranks only current declared local candidates deterministically and permits exactly one fallback", () => {
    const candidates = [
      { ...localModel, id: "model.local.b", declared: true, quality: 0.8, healthEvidence: { observedAt: "2026-09-09T00:00:00.000Z", expiresAt: "2026-09-10T00:00:00.000Z", evidenceReference: "h-b" }, costEvidence: { known: true, budgetCompatible: true, evidenceReference: "c-b" }, region: "LOCAL" },
      { ...localModel, id: "model.local.a", declared: true, quality: 0.8, healthEvidence: { observedAt: "2026-09-09T00:00:00.000Z", expiresAt: "2026-09-10T00:00:00.000Z", evidenceReference: "h-a" }, costEvidence: { known: true, budgetCompatible: true, evidenceReference: "c-a" }, region: "LOCAL" },
    ] as const;
    const router = createDeterministicModelRouter({ policyVersion: "c1-v3" });
    const route = router.route({ requestId: "request-1", privacy: "LOCAL_ONLY", budgetMs: 1000, trustedTime: "2026-09-09T12:00:00.000Z", preferredAdapterId: "model.local.b" }, createAdapterRegistry("MODEL", [...candidates].reverse()));

    expect(route).toMatchObject({ ok: true, value: { adapter: { id: "model.local.b" }, receipt: { nonAuthorizing: true, fallback: false } } });
    if (!route.ok) throw new Error(route.error);
    expect(router.failover(route.value.receipt, createAdapterRegistry("MODEL", candidates))).toMatchObject({ ok: true, value: { adapter: { id: "model.local.a" }, receipt: { fallback: true } } });
    expect(router.failover({ ...route.value.receipt, fallback: true }, createAdapterRegistry("MODEL", candidates))).toMatchObject({ ok: false, error: "FAILOVER_LIMIT_REACHED" });
    expect(JSON.stringify(route.value.receipt)).not.toContain("prompt");
  });
});