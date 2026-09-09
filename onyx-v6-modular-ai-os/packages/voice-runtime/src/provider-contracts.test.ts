import { describe, expect, it } from "vitest";
import {
  createAdapterRegistry,
  createDeterministicModelRouter,
  type ModelAdapter,
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
});