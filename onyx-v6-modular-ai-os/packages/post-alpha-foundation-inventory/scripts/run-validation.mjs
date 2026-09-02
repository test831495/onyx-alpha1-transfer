#!/usr/bin/env node
import { createHash } from "crypto";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { dirname, resolve } from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evidencePath = resolve(packageRoot, "evidence");
const validationPath = resolve(packageRoot, "validation/validation-results.json");

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, { cwd: packageRoot, encoding: "utf8" });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${arguments_.join(" ")} failed`);
  }
}

async function verifySidecar(name) {
  const content = await readFile(resolve(evidencePath, name), "utf8");
  const expected = (await readFile(resolve(evidencePath, `${name}.sha256`), "utf8")).trim();
  const actual = createHash("sha256").update(content).digest("hex");
  if (actual !== expected) throw new Error(`${name} hash mismatch`);
}

async function validate() {
  const temporaryDirectory = await mkdtemp(resolve(tmpdir(), "onyx-validation-"));
  const reportPath = resolve(temporaryDirectory, "vitest.json");
  try {
    run("pnpm", ["exec", "vitest", "run", "--reporter=json", `--outputFile=${reportPath}`]);
    run("pnpm", ["exec", "tsc", "--noEmit"]);
    const report = JSON.parse(await readFile(reportPath, "utf8"));
    const { numTotalTests: testCount, numPassedTests: passed, numFailedTests: failed } = report;
    const testFiles = report.testResults?.length;
    if (![testCount, passed, failed, testFiles].every(Number.isInteger) || failed !== 0 || passed !== testCount) {
      throw new Error("Vitest result counts could not be reconciled");
    }
    await verifySidecar("baseline-manifest.json");
    await verifySidecar("acceptance-inventory.json");
    await writeFile(validationPath, JSON.stringify({
      package: "@onyx/post-alpha-foundation-inventory",
      testCommand: "pnpm exec vitest run --reporter=json",
      typecheckCommand: "pnpm exec tsc --noEmit",
      testFiles, testCount, passed, failed, typecheckPassed: true,
      timestamp: new Date().toISOString(),
    }, null, 2));
    console.log(`Package A validation passed: ${passed}/${testCount} tests, ${testFiles} files, typecheck passed`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

validate().catch((error) => {
  console.error(`Validation failed: ${error.message}`);
  process.exit(1);
});
