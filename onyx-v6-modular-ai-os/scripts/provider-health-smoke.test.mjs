import { describe, expect, it, vi } from "vitest";
import { runProviderHealthSmoke } from "./provider-health-smoke.mjs";

/**
 * Helper to create mock dependencies for testing.
 */
function createMockDeps() {
  const dirStack = [];
  
  return {
    createTempDir: vi.fn(async () => {
      const dir = `/tmp/test-onyx-health-${Date.now()}-${Math.random()}`;
      dirStack.push(dir);
      return dir;
    }),
    runGenerator: vi.fn((output) => ({
      status: 0,
      stderr: "",
      stdout: ""
    })),
    readOutput: vi.fn(async (path) => JSON.stringify({
      providers: [],
      production: { deploymentAllowed: false, liveNetlifyUpdatesAllowed: false }
    })),
    removeDir: vi.fn(async (path) => {
      const idx = dirStack.indexOf(path);
      if (idx >= 0) dirStack.splice(idx, 1);
    }),
    dirStack
  };
}

describe("provider-health-smoke production cleanup behavior", () => {
  it("removes the actual temporary directory on success", async () => {
    const deps = createMockDeps();
    
    await runProviderHealthSmoke(deps);
    
    expect(deps.createTempDir).toHaveBeenCalledTimes(1);
    expect(deps.removeDir).toHaveBeenCalledTimes(1);
    expect(deps.dirStack.length).toBe(0);
  });

  it("removes the actual temporary directory when generator execution fails", async () => {
    const deps = createMockDeps();
    deps.runGenerator.mockReturnValue({
      status: 1,
      stderr: "Generator failed",
      stdout: ""
    });
    
    await expect(runProviderHealthSmoke(deps)).rejects.toThrow("Generator failed");
    
    expect(deps.createTempDir).toHaveBeenCalledTimes(1);
    expect(deps.removeDir).toHaveBeenCalledTimes(1);
    expect(deps.dirStack.length).toBe(0);
  });

  it("removes the actual temporary directory when secret detection fails", async () => {
    const deps = createMockDeps();
    const secret = "must-never-appear-in-output";
    deps.readOutput.mockResolvedValue(JSON.stringify({
      providers: [],
      production: { deploymentAllowed: false, liveNetlifyUpdatesAllowed: false },
      secret: secret
    }));
    
    await expect(runProviderHealthSmoke(deps)).rejects.toThrow("exposed a secret");
    
    expect(deps.createTempDir).toHaveBeenCalledTimes(1);
    expect(deps.removeDir).toHaveBeenCalledTimes(1);
    expect(deps.dirStack.length).toBe(0);
  });

  it("removes the actual temporary directory when JSON parsing fails", async () => {
    const deps = createMockDeps();
    deps.readOutput.mockResolvedValue("invalid json {");
    
    await expect(runProviderHealthSmoke(deps)).rejects.toThrow();
    
    expect(deps.createTempDir).toHaveBeenCalledTimes(1);
    expect(deps.removeDir).toHaveBeenCalledTimes(1);
    expect(deps.dirStack.length).toBe(0);
  });

  it("removes the actual temporary directory when schema validation fails", async () => {
    const deps = createMockDeps();
    deps.readOutput.mockResolvedValue(JSON.stringify({
      // Missing providers array
      production: { deploymentAllowed: false, liveNetlifyUpdatesAllowed: false }
    }));
    
    await expect(runProviderHealthSmoke(deps)).rejects.toThrow("no providers array");
    
    expect(deps.createTempDir).toHaveBeenCalledTimes(1);
    expect(deps.removeDir).toHaveBeenCalledTimes(1);
    expect(deps.dirStack.length).toBe(0);
  });

  it("preserves the original failure as observable after cleanup", async () => {
    const deps = createMockDeps();
    const expectedMessage = "Production blockade is not active";
    deps.readOutput.mockResolvedValue(JSON.stringify({
      providers: [],
      production: { deploymentAllowed: true, liveNetlifyUpdatesAllowed: false }
    }));
    
    const error = await expect(runProviderHealthSmoke(deps)).rejects.toThrow(expectedMessage);
    
    expect(deps.removeDir).toHaveBeenCalledTimes(1);
    expect(error).toBeTruthy();
  });

  it("exposes cleanup failure context safely when both primary and cleanup fail", async () => {
    const deps = createMockDeps();
    const primaryFailure = "Validation failed";
    
    deps.readOutput.mockResolvedValue("invalid");
    deps.removeDir.mockRejectedValue(new Error("Cleanup failed"));
    
    const originalConsoleError = console.error;
    const consoleErrorCalls = [];
    console.error = (...args) => consoleErrorCalls.push(args);
    
    try {
      await expect(runProviderHealthSmoke(deps)).rejects.toThrow();
      
      expect(deps.removeDir).toHaveBeenCalledTimes(1);
      expect(consoleErrorCalls.some(call => 
        call.some(arg => typeof arg === 'string' && arg.includes("Cleanup failed"))
      )).toBe(true);
    } finally {
      console.error = originalConsoleError;
    }
  });

  it("maintains successful script behavior and PASS messages", async () => {
    const deps = createMockDeps();
    
    const originalConsoleLog = console.log;
    const consoleLogs = [];
    console.log = (...args) => consoleLogs.push(args);
    
    try {
      await runProviderHealthSmoke(deps);
      
      expect(consoleLogs.some(call =>
        call.some(arg => arg?.includes("[PASS]"))
      )).toBe(true);
      
      expect(consoleLogs.length).toBe(3);
    } finally {
      console.log = originalConsoleLog;
    }
  });

  it("exercises production cleanup on rapid sequential validations", async () => {
    const deps = createMockDeps();
    
    // Run multiple validations sequentially
    for (let i = 0; i < 3; i++) {
      await runProviderHealthSmoke(deps);
    }
    
    expect(deps.createTempDir).toHaveBeenCalledTimes(3);
    expect(deps.removeDir).toHaveBeenCalledTimes(3);
    expect(deps.dirStack.length).toBe(0);
  });

  it("correctly orders cleanup relative to validation failure", async () => {
    const deps = createMockDeps();
    const callOrder = [];
    
    deps.runGenerator = vi.fn((output) => {
      callOrder.push("runGenerator");
      return { status: 1, stderr: "Generator failed", stdout: "" };
    });
    
    deps.removeDir = vi.fn(async (path) => {
      callOrder.push("removeDir");
    });
    
    await expect(runProviderHealthSmoke(deps)).rejects.toThrow();
    
    expect(callOrder).toEqual(["runGenerator", "removeDir"]);
  });
});

