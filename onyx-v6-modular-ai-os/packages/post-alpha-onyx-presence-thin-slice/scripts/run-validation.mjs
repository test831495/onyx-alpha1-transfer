import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const monorepoRoot = resolve(packageRoot, "../..");
const repositoryRoot = resolve(monorepoRoot, "..");
const validationRoot = join(packageRoot, "validation");
const packagePrefix = "onyx-v6-modular-ai-os/packages/post-alpha-onyx-presence-thin-slice/";
const generatedAt = process.env.GENERATED_AT ?? new Date().toISOString();
const trustedTime = process.env.GENERATED_AT ? "OWNER_SUPPLIED_GENERATED_AT" : "LOCAL_SYSTEM_UTC";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hashFile = async (path) => sha256(await readFile(path));
const expectedPptIds = Array.from({ length: 63 }, (_, index) => `PPT-${String(index + 1).padStart(3, "0")}`);
const acceptanceFamilies = [
  "PA-PRESENCE-SCOPE", "PA-PRESENCE-DEPENDENCY", "PA-PRESENCE-LIFECYCLE", "PA-PRESENCE-ONYX", "PA-PRESENCE-INPUT", "PA-PRESENCE-CONTEXT", "PA-PRESENCE-EVIDENCE", "PA-PRESENCE-MEMORY", "PA-PRESENCE-TOOL", "PA-PRESENCE-PRESENTATION", "PA-PRESENCE-AVATAR", "PA-PRESENCE-AMBIENT", "PA-PRESENCE-DESKTOP", "PA-PRESENCE-TV", "PA-PRESENCE-PRIVACY", "PA-PRESENCE-ACCESSIBILITY", "PA-PRESENCE-INTERRUPTION", "PA-PRESENCE-RECOVERY", "PA-PRESENCE-FLAG", "PA-PRESENCE-ROLLBACK", "PA-PRESENCE-NONAUTHORITY", "PA-PRESENCE-EVIDENCE-GENERATION", "PA-PRESENCE-INTEGRATION",
];

async function filesUnder(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const paths = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (["node_modules", "evidence", "validation"].includes(entry.name)) continue;
    const path = join(root, entry.name);
    if (entry.isDirectory()) paths.push(...await filesUnder(path));
    else paths.push(path);
  }
  return paths;
}

async function aggregateFingerprint(paths) {
  const records = [];
  for (const path of paths.sort()) records.push(`${relative(repositoryRoot, path)}:${await hashFile(path)}`);
  return sha256(records.join("\n"));
}

async function run(command, args) {
  const startedAt = new Date().toISOString();
  try {
    const { stdout, stderr } = await execFileAsync(command, args, { cwd: monorepoRoot, maxBuffer: 1024 * 1024 * 16 });
    return { command: [command, ...args].join(" "), exitCode: 0, startedAt, completedAt: new Date().toISOString(), stdoutSha256: sha256(stdout), stderrSha256: sha256(stderr), stdoutTail: stdout.slice(-4000), stderrTail: stderr.slice(-4000) };
  } catch (error) {
    const stdout = String(error.stdout ?? "");
    const stderr = String(error.stderr ?? "");
    return { command: [command, ...args].join(" "), exitCode: typeof error.code === "number" ? error.code : 1, startedAt, completedAt: new Date().toISOString(), stdoutSha256: sha256(stdout), stderrSha256: sha256(stderr), stdoutTail: stdout.slice(-4000), stderrTail: stderr.slice(-4000) };
  }
}

const packageFiles = await filesUnder(packageRoot);
const testFiles = packageFiles.filter((path) => path.includes("/tests/"));
const testCases = [];
for (const testFile of testFiles) {
  const text = await readFile(testFile, "utf8");
  for (const match of text.matchAll(/it\("(PPT-\d{3} [^"]+)"/g)) testCases.push({ id: match[1].slice(0, 7), name: match[1], file: relative(packageRoot, testFile) });
}
testCases.sort((left, right) => left.id.localeCompare(right.id));
const exactPpt = testCases.length === 63 && testCases.every((entry, index) => entry.id === expectedPptIds[index]);
const commands = [
  await run("pnpm", ["--filter", "@onyx/post-alpha-onyx-presence-thin-slice", "test"]),
  await run("pnpm", ["--filter", "@onyx/post-alpha-onyx-presence-thin-slice", "typecheck"]),
];
const packageJson = JSON.parse(await readFile(join(packageRoot, "package.json"), "utf8"));
const sourceFiles = packageFiles.filter((path) => path.includes("/src/"));
const allTextEntries = await Promise.all(packageFiles.filter((path) => /\.(ts|mjs|json)$/.test(path)).map(async (path) => [relative(repositoryRoot, path), await readFile(path, "utf8")]));
const dependencyCheck = packageJson.dependencies?.["@onyx/post-alpha-intelligence-foundation"] === "workspace:*" && packageJson.dependencies?.["@onyx/post-alpha-avatar-foundation"] === "workspace:*" && !packageJson.dependencies?.["@onyx/post-alpha-assurance-foundation"];
const runtimeActivationCheck = allTextEntries.every(([, text]) => !/runtimeActivation\s*:\s*true|state\s*:\s*["'](?:OWNER_ACTIVE|GENERAL_ACTIVE)["']|activationSeparatelyAuthorized\s*:\s*true/.test(text));
const networkCheck = allTextEntries.filter(([path]) => path !== `${packagePrefix}scripts/run-validation.mjs`).every(([, text]) => !/\b(fetch|XMLHttpRequest|WebSocket|EventSource|navigator\.sendBeacon|http\.request|https\.request)\b/.test(text));
const secretCheck = allTextEntries.every(([, text]) => !/(gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----)/.test(text));
const privacyCheck = allTextEntries.some(([, text]) => text.includes("PRIVACY_RESTRICTED")) && allTextEntries.some(([, text]) => text.includes("SHARED_ROOM_REDACTED")) && allTextEntries.some(([, text]) => text.includes("CONFLICTING"));
const packageAllowlistCheck = packageFiles.every((path) => relative(repositoryRoot, path).startsWith(packagePrefix));
const result = exactPpt && commands.every((command) => command.exitCode === 0) ? "PASS" : "FAIL";
const checks = {
  packageAllowlist: packageAllowlistCheck,
  dependencyAllowlist: dependencyCheck,
  runtimeActivation: false,
  runtimeActivationScanPassed: runtimeActivationCheck,
  networkAccess: false,
  networkScanPassed: networkCheck,
  credentialsUsed: false,
  secretScanPassed: secretCheck,
  privacyFailClosedCovered: privacyCheck,
  externalMutation: false,
  featureFlagPromotion: false,
};
const artifact = {
  schemaVersion: "PA_PRESENCE_VALIDATION_RESULTS_V1",
  workstream: "PA-PRESENCE-01",
  generatedAt,
  trustedTime,
  result,
  environment: { nodeVersion: process.version, platform: platform(), osRelease: release(), architecture: arch(), packageManager: packageJson.packageManager ?? "pnpm workspace" },
  commands,
  ppt: { expected: expectedPptIds, discovered: testCases, passed: result === "PASS" ? expectedPptIds : [], exact: exactPpt, count: testCases.length },
  acceptanceFamilies,
  counts: { presencePpt: exactPpt && result === "PASS" ? 63 : 0, acceptanceFamilies: acceptanceFamilies.length },
  hashes: {
    sourceFingerprint: await aggregateFingerprint(sourceFiles),
    testFingerprint: await aggregateFingerprint(testFiles),
    packageJson: await hashFile(join(packageRoot, "package.json")),
    tsconfig: await hashFile(join(packageRoot, "tsconfig.json")),
  },
  checks,
  authorizing: false,
};

if (!Object.entries(checks).every(([key, value]) => ["runtimeActivation", "networkAccess", "credentialsUsed", "externalMutation", "featureFlagPromotion"].includes(key) ? value === false : value === true)) artifact.result = "FAIL";

await mkdir(validationRoot, { recursive: true });
const content = `${JSON.stringify(artifact, null, 2)}\n`;
await writeFile(join(validationRoot, "validation-results.json"), content, "utf8");
await writeFile(join(validationRoot, "validation-results.json.sha256"), `${sha256(content)}  ${packagePrefix}validation/validation-results.json\n`, "utf8");
console.log(`Validation ${result}: wrote validation-results.json and sidecar.`);
if (artifact.result !== "PASS") process.exit(1);