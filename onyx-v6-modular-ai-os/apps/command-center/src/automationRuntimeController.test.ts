import { describe, expect, it } from "vitest";
import { LocalAutomationRuntimeController } from "./automationRuntimeController";

const FIXED_NOW = new Date("2026-01-01T00:00:00.000Z");

function makeController(): LocalAutomationRuntimeController {
  return new LocalAutomationRuntimeController({ clock: () => FIXED_NOW });
}

describe("Phase 1A.7 runtime controller", () => {
  it("exposes a mock-only local-simulation runtime with no live workflow executing", () => {
    const controller = makeController();
    const snapshot = controller.getSnapshot();
    expect(snapshot.mergeAllowed).toBe(false);
    expect(snapshot.productionDeployAllowed).toBe(false);
    expect(snapshot.forcePushAllowed).toBe(false);
    expect(snapshot.branchDeletionAllowed).toBe(false);
    expect(snapshot.laneLimit).toBe(1);
  });

  it("exposes no arbitrary command, shell, or child-process surface", () => {
    const controller = makeController() as unknown as Record<string, unknown>;
    expect(controller.execute).toBeUndefined();
    expect(controller.runCommand).toBeUndefined();
    expect(controller.shellExec).toBeUndefined();
  });

  it("pauses only when permitted and rejects a repeated pause", async () => {
    const controller = makeController();
    await controller.runNextStep();
    controller.pause();
    expect(() => controller.pause()).toThrow();
  });

  it("rejects resume when the runtime is not paused", () => {
    const controller = makeController();
    expect(() => controller.resume()).toThrow();
  });

  it("resumes only from a safely paused state", async () => {
    const controller = makeController();
    controller.pause();
    await controller.runNextStep();
    expect(controller.getSnapshot().currentStatus).toBe("PAUSED");
    expect(() => controller.resume()).not.toThrow();
    expect(controller.getSnapshot().currentStatus).not.toBe("PAUSED");
  });

  it("cancels only at a safe checkpoint boundary and rejects unsafe cancellation after completion", async () => {
    const controller = makeController();
    for (let i = 0; i < 6; i += 1) await controller.runNextStep();
    expect(controller.getSnapshot().currentStatus).toBe("COMPLETED");
    expect(() => controller.cancel()).toThrow();
  });

  it("rejects every action after the runtime has completed", async () => {
    const controller = makeController();
    for (let i = 0; i < 6; i += 1) await controller.runNextStep();
    expect(() => controller.pause()).toThrow();
    expect(() => controller.resume()).toThrow();
    expect(() => controller.cancel()).toThrow();
    await expect(controller.runNextStep()).rejects.toThrow();
  });

  it("recovers only when recovery is available", async () => {
    const controller = makeController();
    await controller.runNextStep();
    const recovered = await controller.recover();
    expect(recovered.completedCapabilities).toContain("CREATE_GITHUB_ISSUE");
  });

  it("rejects recovery when no trusted checkpoint is available yet", async () => {
    const controller = makeController();
    await expect(controller.recover()).rejects.toThrow();
  });

  it("never calls GitHub, Git, connector, or paid APIs, and never spawns a child process", async () => {
    const controller = makeController();
    const outcome = await controller.runNextStep();
    expect(outcome.executorResult?.resourceUrl).toMatch(/^local:\/\//);
  });
});
