import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Run provider health smoke test with dependency injection for testability.
 * @param {Object} deps Dependency injection object
 * @param {Function} deps.createTempDir Function to create temp directory
 * @param {Function} deps.runGenerator Function to run the generator (returns result object with status, stderr, stdout)
 * @param {Function} deps.readOutput Function to read output file
 * @param {Function} deps.removeDir Function to remove temporary directory
 * @returns {Promise<void>} Resolves on success, throws on validation failure
 */
export async function runProviderHealthSmoke(deps = {}) {
  const {
    createTempDir = () => mkdtemp(resolve(tmpdir(), "onyx-health-")),
    runGenerator = (output) => spawnSync(process.execPath, ["scripts/generate-provider-health.mjs", output], {
      cwd: process.cwd(), encoding: "utf8", env: { ...process.env, ONYX_AZURE_AI_KEY: "must-never-appear-in-output" }
    }),
    readOutput = (path) => readFile(path, "utf8"),
    removeDir = (path) => rm(path, { recursive: true, force: true })
  } = deps;

  let dir = null;
  let primaryError = null;

  try {
    dir = await createTempDir();
    const output = resolve(dir, "health.json");
    const secret = "must-never-appear-in-output";

    const result = runGenerator(output);
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || "Generator failed");
    }

    const text = await readOutput(output);
    if (text.includes(secret)) {
      throw new Error("Provider health output exposed a secret");
    }

    const data = JSON.parse(text);
    if (!Array.isArray(data.providers)) {
      throw new Error("Provider snapshot has no providers array");
    }
    if (data.production.deploymentAllowed || data.production.liveNetlifyUpdatesAllowed) {
      throw new Error("Production blockade is not active");
    }

    console.log("[PASS] Provider health generator masks secret values");
    console.log("[PASS] Provider health snapshot schema is readable");
    console.log("[PASS] Production blockade remains active");
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    if (dir) {
      try {
        await removeDir(dir);
      } catch (cleanupError) {
        if (primaryError) {
          // Primary error takes precedence, but we track cleanup failure
          console.error("Cleanup failed after validation error:", cleanupError instanceof Error ? cleanupError.message : String(cleanupError));
        } else {
          throw cleanupError;
        }
      }
    }
  }
}

// CLI entry point
try {
  await runProviderHealthSmoke();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
