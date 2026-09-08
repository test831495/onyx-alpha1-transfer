import { createSyntheticReadAdapter, type SyntheticRecord } from "@onyx/train-b-universal-connector-intelligence";

const records: readonly SyntheticRecord[] = [
  { recordReference: "google:mail:1", dataClass: "MAIL_METADATA", fields: [{ key: "kind", value: "mail" }, { key: "subject", value: "ONYX status" }] },
  { recordReference: "google:calendar:1", dataClass: "CALENDAR_METADATA", fields: [{ key: "kind", value: "calendar" }, { key: "status", value: "scheduled" }] },
  { recordReference: "google:drive:1", dataClass: "FILE_METADATA", fields: [{ key: "kind", value: "file" }, { key: "name", value: "status.md" }] },
];

export const googleReadAdapter = createSyntheticReadAdapter({
  adapterId: "train-b.google.read-only",
  providerMetadataReference: "provider-family:google",
  capabilities: [{ capabilityId: "google.productivity.read", permissionReference: "google:read:approved", dataClass: "PRODUCTIVITY_METADATA", operations: ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES", "GET_QUOTA", "GET_COST_EVIDENCE"] }],
  records,
});
export const googleSearchCandidate = { applicationId: "application.mail", capabilityId: "mail.messages.read", connectorId: "connector:google", accountScopeReference: "account:synthetic", dataClass: "PRODUCTIVITY_METADATA", supportedSearchModes: ["METADATA", "FULL_TEXT"] as const, sourceHealth: "HEALTHY", freshnessState: "CURRENT", attributionAvailable: true, privacyDecision: "AUTHORIZED", regionCompatible: true, availability: "AVAILABLE", evidenceReferences: ["google:evidence:synthetic"], priority: 4 } as const;
