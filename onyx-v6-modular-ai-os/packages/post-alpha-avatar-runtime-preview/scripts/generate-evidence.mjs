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

  // Generate fixture manifest
  const fixtureManifest = {
    package: "@onyx/post-alpha-avatar-runtime-preview",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
    repository: "test831495/onyx-alpha1-transfer",
    baselineSha: "0eebbc38011ca1559895059a229c0bdbc0462cad",
    classification: "REPOSITORY_EVIDENCE",
    purpose: "Document avatar registry fixtures and composition adapters",
  };

  const fixtureManifestPath = resolve(evidencePath, "fixture-manifest.json");
  await writeFile(fixtureManifestPath, JSON.stringify(fixtureManifest, null, 2));
  const fixtureHash = await hashFile(fixtureManifestPath);
  await writeFile(
    resolve(evidencePath, "fixture-manifest.json.sha256"),
    fixtureHash
  );

  // Generate asset provenance
  const assetProvenance = {
    package: "@onyx/post-alpha-avatar-runtime-preview",
    assets: [
      {
        id: "preview-onyx-desktop-001",
        character: "ONYX",
        recordCreator: "@onyx/post-alpha-avatar-runtime-preview",
        assetCreator: "UNKNOWN",
        aiGenerationDisclosure: "NOT_ESTABLISHED",
        licenseStatus: "NOT_ESTABLISHED",
        provenanceStatus: "INCOMPLETE_PLACEHOLDER",
        assetStatus: "METADATA_ONLY",
        runtimeCandidate: false,
      },
      {
        id: "preview-nova-desktop-001",
        character: "NOVA",
        recordCreator: "@onyx/post-alpha-avatar-runtime-preview",
        assetCreator: "UNKNOWN",
        aiGenerationDisclosure: "NOT_ESTABLISHED",
        licenseStatus: "NOT_ESTABLISHED",
        provenanceStatus: "INCOMPLETE_PLACEHOLDER",
        assetStatus: "METADATA_ONLY",
        runtimeCandidate: false,
      },
    ],
    timestamp: new Date().toISOString(),
  };

  assetProvenance.metadataRecordHash = createHash("sha256")
    .update(JSON.stringify(assetProvenance.assets))
    .digest("hex");
  const assetProvenancePath = resolve(evidencePath, "asset-provenance.json");
  await writeFile(assetProvenancePath, JSON.stringify(assetProvenance, null, 2));
  const assetHash = await hashFile(assetProvenancePath);
  await writeFile(
    resolve(evidencePath, "asset-provenance.json.sha256"),
    assetHash
  );

  // Generate acceptance coverage
  const acceptanceCoverage = {
    package: "@onyx/post-alpha-avatar-runtime-preview",
    families: {
      "PA-AVATAR-REGISTRY-PREVIEW": { idRange: [1, 16], status: "EXECUTABLE_TEST" },
      "PA-AVATAR-RESOLVER": { idRange: [1, 20], status: "EXECUTABLE_TEST" },
      "PA-AVATAR-COMPOSITION": { idRange: [1, 20], status: "EXECUTABLE_TEST" },
      "PA-AVATAR-PREVIEW-FIXTURE": { idRange: [1, 18], status: "EXECUTABLE_TEST" },
      "PA-AVATAR-PREVIEW-EVIDENCE": { idRange: [1, 10], status: "EVIDENCE_VALIDATION" },
      "PA-AVATAR-LEGACY-BRIDGE": {
        conditionalNotApplicable: [1, 2],
        executableTest: [3, 4, 5, 6],
      },
    },
    timestamp: new Date().toISOString(),
  };

  const acceptanceCoveragePath = resolve(evidencePath, "acceptance-coverage.json");
  await writeFile(
    acceptanceCoveragePath,
    JSON.stringify(acceptanceCoverage, null, 2)
  );
  const coverageHash = await hashFile(acceptanceCoveragePath);
  await writeFile(
    resolve(evidencePath, "acceptance-coverage.json.sha256"),
    coverageHash
  );

  console.log("✓ Evidence generated for @onyx/post-alpha-avatar-runtime-preview");
  console.log(`  - fixture-manifest.json (${fixtureHash.substring(0, 8)}...)`);
  console.log(`  - asset-provenance.json (${assetHash.substring(0, 8)}...)`);
  console.log(`  - acceptance-coverage.json (${coverageHash.substring(0, 8)}...)`);
}

generateEvidence().catch((err) => {
  console.error("Evidence generation failed:", err);
  process.exit(1);
});
