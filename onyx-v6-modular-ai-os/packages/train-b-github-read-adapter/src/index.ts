import { createSyntheticReadAdapter, type SyntheticRecord } from "@onyx/train-b-universal-connector-intelligence";

const records: readonly SyntheticRecord[] = [
  { recordReference: "github:repository:onyx", dataClass: "ENGINEERING_METADATA", fields: [{ key: "kind", value: "repository" }, { key: "name", value: "onyx" }, { key: "status", value: "active" }] },
  { recordReference: "github:issue:17", dataClass: "ENGINEERING_ACTIVITY", fields: [{ key: "kind", value: "issue" }, { key: "status", value: "open" }] },
  { recordReference: "github:pull-request:42", dataClass: "ENGINEERING_ACTIVITY", fields: [{ key: "kind", value: "pull_request" }, { key: "status", value: "review" }] },
  { recordReference: "github:workflow:main", dataClass: "ENGINEERING_OBSERVABILITY", fields: [{ key: "kind", value: "workflow" }, { key: "status", value: "success" }] },
  { recordReference: "github:commit:abc123", dataClass: "ENGINEERING_ACTIVITY", fields: [{ key: "kind", value: "commit" }, { key: "status", value: "verified" }] },
  { recordReference: "github:release:v1", dataClass: "ENGINEERING_METADATA", fields: [{ key: "kind", value: "release" }, { key: "status", value: "published" }] },
];

export const githubReadAdapter = createSyntheticReadAdapter({
  adapterId: "train-b.github.read-only",
  providerMetadataReference: "provider-family:github",
  capabilities: [{ capabilityId: "github.engineering.read", permissionReference: "github:read:approved", dataClass: "ENGINEERING_METADATA", operations: ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES", "GET_QUOTA", "GET_COST_EVIDENCE"] }],
  records,
});
export const githubSearchCandidate = { applicationId: "application.files", capabilityId: "files.search", connectorId: "connector:github", accountScopeReference: "account:synthetic", dataClass: "ENGINEERING_METADATA", supportedSearchModes: ["METADATA", "FULL_TEXT"] as const, sourceHealth: "HEALTHY", freshnessState: "CURRENT", attributionAvailable: true, privacyDecision: "AUTHORIZED", regionCompatible: true, availability: "AVAILABLE", evidenceReferences: ["github:evidence:synthetic"], priority: 1 } as const;
