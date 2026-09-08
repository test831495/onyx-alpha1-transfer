import { createSyntheticReadAdapter, type SyntheticRecord } from "@onyx/train-b-universal-connector-intelligence";

const records: readonly SyntheticRecord[] = [
  { recordReference: "netlify:site:onyx", dataClass: "DEPLOYMENT_METADATA", fields: [{ key: "kind", value: "site" }, { key: "name", value: "onyx" }, { key: "status", value: "published" }] },
  { recordReference: "netlify:deployment:latest", dataClass: "DEPLOYMENT_OBSERVABILITY", fields: [{ key: "kind", value: "deployment" }, { key: "status", value: "ready" }] },
  { recordReference: "netlify:build:latest", dataClass: "DEPLOYMENT_OBSERVABILITY", fields: [{ key: "kind", value: "build" }, { key: "status", value: "success" }] },
];

export const netlifyReadAdapter = createSyntheticReadAdapter({
  adapterId: "train-b.netlify.read-only",
  providerMetadataReference: "provider-family:netlify",
  capabilities: [{ capabilityId: "netlify.deployment.read", permissionReference: "netlify:read:approved", dataClass: "DEPLOYMENT_METADATA", operations: ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES", "GET_QUOTA", "GET_COST_EVIDENCE"] }],
  records,
});
export const netlifySearchCandidate = { applicationId: "application.files", capabilityId: "files.search", connectorId: "connector:netlify", accountScopeReference: "account:synthetic", dataClass: "DEPLOYMENT_METADATA", supportedSearchModes: ["METADATA", "FULL_TEXT"] as const, sourceHealth: "HEALTHY", freshnessState: "CURRENT", attributionAvailable: true, privacyDecision: "AUTHORIZED", regionCompatible: true, availability: "AVAILABLE", evidenceReferences: ["netlify:evidence:synthetic"], priority: 2 } as const;
