#!/usr/bin/env node
import { readFile, writeFile } from "fs/promises";
import { createHash } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { mkdir } from "fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function hashFile(filePath) {
  const content = await readFile(filePath, "utf-8");
  return createHash("sha256").update(content).digest("hex");
}

async function generateEvidence() {
  const evidencePath = resolve(__dirname, "../evidence");

  await mkdir(evidencePath, { recursive: true });

  // Generate baseline manifest
  const baselineManifest = {
    package: "@onyx/post-alpha-foundation-inventory",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    repository: "test831495/onyx-alpha1-transfer",
    baselineSha: "0eebbc38011ca1559895059a229c0bdbc0462cad",
    classification: "REPOSITORY_EVIDENCE",
    purpose: "Document foundation inventory baseline state",
  };

  const baselineManifestPath = resolve(evidencePath, "baseline-manifest.json");
  await writeFile(baselineManifestPath, JSON.stringify(baselineManifest, null, 2));
  const baselineHash = await hashFile(baselineManifestPath);
  await writeFile(
    resolve(evidencePath, "baseline-manifest.json.sha256"),
    baselineHash
  );

  // Generate acceptance inventory
  const acceptanceInventory = {
    package: "@onyx/post-alpha-foundation-inventory",
    totalFamilies: 7,
    totalIds: 100,
    dispositions: {
      EXECUTABLE_TEST: 87,
      EVIDENCE_VALIDATION: 11,
      CONDITIONAL_NOT_APPLICABLE: 2,
      DEFERRED_FUTURE_EVIDENCE: 0,
    },
    families: {
      "PA-INVENTORY": { range: [1, 10], total: 10 },
      "PA-AVATAR-REGISTRY-PREVIEW": { range: [1, 16], total: 16 },
      "PA-AVATAR-RESOLVER": { range: [1, 20], total: 20 },
      "PA-AVATAR-COMPOSITION": { range: [1, 20], total: 20 },
      "PA-AVATAR-PREVIEW-FIXTURE": { range: [1, 18], total: 18 },
      "PA-AVATAR-PREVIEW-EVIDENCE": { range: [1, 10], total: 10 },
      "PA-AVATAR-LEGACY-BRIDGE": { range: [1, 6], total: 6 },
    },
    mapping: createAcceptanceMapping(),
    timestamp: new Date().toISOString(),
  };

  const acceptanceInventoryPath = resolve(
    evidencePath,
    "acceptance-inventory.json"
  );
  await writeFile(
    acceptanceInventoryPath,
    JSON.stringify(acceptanceInventory, null, 2)
  );
  const acceptanceHash = await hashFile(acceptanceInventoryPath);
  await writeFile(
    resolve(evidencePath, "acceptance-inventory.json.sha256"),
    acceptanceHash
  );

  console.log("✓ Evidence generated for @onyx/post-alpha-foundation-inventory");
  console.log(`  - baseline-manifest.json (${baselineHash.substring(0, 8)}...)`);
  console.log(`  - acceptance-inventory.json (${acceptanceHash.substring(0, 8)}...)`);
}

function createAcceptanceMapping() {
  const entries = [];
  const add = (family, start, end, disposition, verificationId, verificationName) => {
    for (let number = start; number <= end; number += 1) {
      entries.push({
        acceptanceId: `${family}-${String(number).padStart(3, "0")}`,
        disposition,
        verificationId,
        verificationName,
      });
    }
  };
  add("PA-INVENTORY", 1, 9, "EXECUTABLE_TEST", "inventory.test.ts", "Inventory structure and sealed package tests");
  add("PA-INVENTORY", 10, 10, "EVIDENCE_VALIDATION", "acceptance-inventory.json", "Acceptance inventory SHA-256 integrity");
  add("PA-AVATAR-REGISTRY-PREVIEW", 1, 16, "EXECUTABLE_TEST", "registry-resolver.test.ts", "Registry fixture and character binding tests");
  add("PA-AVATAR-RESOLVER", 1, 20, "EXECUTABLE_TEST", "registry-resolver.test.ts", "Resolver character and ACTIVE-only lifecycle tests");
  add("PA-AVATAR-COMPOSITION", 1, 20, "EXECUTABLE_TEST", "composition-adapter.test.ts", "Desktop and TV composition adapter tests");
  add("PA-AVATAR-PREVIEW-FIXTURE", 1, 18, "EXECUTABLE_TEST", "desktop-fixtures.test.ts", "ONYX and package-local NOVA fixture tests");
  add("PA-AVATAR-PREVIEW-EVIDENCE", 1, 10, "EVIDENCE_VALIDATION", "evidence-sidecars", "Fixture, provenance, and coverage evidence integrity");
  add("PA-AVATAR-LEGACY-BRIDGE", 1, 2, "CONDITIONAL_NOT_APPLICABLE", "no-bridge-boundary", "No bridge module, import, or input path exists");
  add("PA-AVATAR-LEGACY-BRIDGE", 3, 6, "EXECUTABLE_TEST", "legacy-boundary.test.ts", "Legacy package, Command Center, and bridge coupling boundary checks");
  return entries;
}

generateEvidence().catch((err) => {
  console.error("Evidence generation failed:", err);
  process.exit(1);
});
