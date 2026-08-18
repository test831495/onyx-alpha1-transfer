import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const dir = await mkdtemp(resolve(tmpdir(), "onyx-health-"));
const output = resolve(dir, "health.json");
const secret = "must-never-appear-in-output";
const result = spawnSync(process.execPath, ["scripts/generate-provider-health.mjs", output], {
  cwd: process.cwd(), encoding: "utf8", env: { ...process.env, ONYX_AZURE_AI_KEY: secret }
});
if (result.status !== 0) throw new Error(result.stderr || result.stdout || "Generator failed");
const text = await readFile(output, "utf8");
if (text.includes(secret)) throw new Error("Provider health output exposed a secret");
const data = JSON.parse(text);
if (!Array.isArray(data.providers)) throw new Error("Provider snapshot has no providers array");
if (data.production.deploymentAllowed || data.production.liveNetlifyUpdatesAllowed) throw new Error("Production blockade is not active");
await rm(dir, { recursive: true, force: true });
console.log("[PASS] Provider health generator masks secret values");
console.log("[PASS] Provider health snapshot schema is readable");
console.log("[PASS] Production blockade remains active");
