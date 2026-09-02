export const EVIDENCE_REFERENCES = Object.freeze({
  packageA: {
    baselineManifest: "evidence/baseline-manifest.json",
    baselineManifestHash: "evidence/baseline-manifest.json.sha256",
    acceptanceInventory: "evidence/acceptance-inventory.json",
    acceptanceInventoryHash: "evidence/acceptance-inventory.json.sha256",
    validationResults: "validation/validation-results.json",
  },
  packageB: {
    fixtureManifest: "evidence/fixture-manifest.json",
    fixtureManifestHash: "evidence/fixture-manifest.json.sha256",
    assetProvenance: "evidence/asset-provenance.json",
    assetProvenanceHash: "evidence/asset-provenance.json.sha256",
    acceptanceCoverage: "evidence/acceptance-coverage.json",
    acceptanceCoverageHash: "evidence/acceptance-coverage.json.sha256",
    validationResults: "validation/validation-results.json",
  },
});

export const EVIDENCE_CLASSIFICATION = Object.freeze({
  REPOSITORY_EVIDENCE: "REPOSITORY_EVIDENCE" as const,
  GITHUB_EVIDENCE: "GITHUB_EVIDENCE" as const,
  GOVERNANCE_SESSION_EVIDENCE: "GOVERNANCE_SESSION_EVIDENCE" as const,
});

export function getEvidenceReferences(packageName: string) {
  if (packageName === "@onyx/post-alpha-foundation-inventory") {
    return EVIDENCE_REFERENCES.packageA;
  } else if (packageName === "@onyx/post-alpha-avatar-runtime-preview") {
    return EVIDENCE_REFERENCES.packageB;
  }
  throw new Error(`Unknown package: ${packageName}`);
}
