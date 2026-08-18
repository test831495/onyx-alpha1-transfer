import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const repoRoot = resolve(process.cwd(), process.cwd().endsWith("apps/command-center") ? "../.." : ".");
const configPath = resolve(repoRoot, "config/onyx.config.json");
const outputPath = resolve(process.argv[2] ?? resolve(repoRoot, "apps/command-center/public/provider-health.generated.json"));
const config = JSON.parse(await readFile(configPath, "utf8"));

const providers = Object.entries(config.providers).map(([provider, definition]) => {
  if (!definition.enabled) return { provider, role: definition.role, state: "disabled", missing: [], credentialDetected: false, diagnostic: "Provider is disabled by configuration." };
  const required = [...definition.publicEnv, ...definition.secretEnv];
  const missing = required.filter((name) => !process.env[name]);
  return {
    provider,
    role: definition.role,
    state: missing.length ? "unconfigured" : "configured",
    missing,
    credentialDetected: definition.secretEnv.length === 0 || definition.secretEnv.every((name) => Boolean(process.env[name])),
    diagnostic: missing.length ? `Missing ${missing.length} required configuration item(s).` : "Required configuration references are available."
  };
});

const snapshot = {
  generatedAt: new Date().toISOString(),
  environment: config.environment,
  production: {
    deploymentAllowed: Boolean(config.production?.deploymentAllowed),
    liveNetlifyUpdatesAllowed: Boolean(config.production?.liveNetlifyUpdatesAllowed)
  },
  routing: config.routing,
  providers
};

const serialized = JSON.stringify(snapshot, null, 2) + "\n";
for (const definition of Object.values(config.providers)) {
  for (const name of definition.secretEnv) {
    const value = process.env[name];
    if (value && serialized.includes(value)) throw new Error(`Secret exposure detected for ${name}`);
  }
}
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, serialized, "utf8");
console.log(`[OK] Provider health snapshot generated: ${outputPath}`);
