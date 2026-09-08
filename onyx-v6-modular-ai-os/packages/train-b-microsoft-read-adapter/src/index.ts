import { createSyntheticReadAdapter, type SyntheticRecord } from "@onyx/train-b-universal-connector-intelligence";

const records: readonly SyntheticRecord[] = [
  { recordReference: "microsoft:mail:1", dataClass: "MAIL_METADATA", fields: [{ key: "kind", value: "mail" }, { key: "subject", value: "ONYX status" }] },
  { recordReference: "microsoft:mail:2", dataClass: "MAIL_METADATA", fields: [{ key: "kind", value: "mail" }, { key: "subject", value: "Deployment review" }] },
  { recordReference: "microsoft:calendar:1", dataClass: "CALENDAR_METADATA", fields: [{ key: "kind", value: "calendar" }, { key: "status", value: "scheduled" }] },
  { recordReference: "microsoft:drive:1", dataClass: "FILE_METADATA", fields: [{ key: "kind", value: "file" }, { key: "name", value: "status.md" }] },
  { recordReference: "microsoft:drive:2", dataClass: "FILE_METADATA", fields: [{ key: "kind", value: "file" }, { key: "name", value: "release-notes.md" }] },
];

export const microsoftReadAdapter = createSyntheticReadAdapter({
  adapterId: "train-b.microsoft.read-only",
  providerMetadataReference: "provider-family:microsoft",
  capabilities: [{ capabilityId: "microsoft.productivity.read", permissionReference: "microsoft:read:approved", dataClass: "PRODUCTIVITY_METADATA", operations: ["SEARCH", "LIST", "GET_BY_ID", "GET_CHANGES", "GET_QUOTA", "GET_COST_EVIDENCE"] }],
  records,
});
export const microsoftSearchCandidate = { applicationId: "application.mail", capabilityId: "mail.messages.read", connectorId: "connector:microsoft", accountScopeReference: "account:synthetic", dataClass: "PRODUCTIVITY_METADATA", supportedSearchModes: ["METADATA", "FULL_TEXT"] as const, sourceHealth: "HEALTHY", freshnessState: "CURRENT", attributionAvailable: true, privacyDecision: "AUTHORIZED", regionCompatible: true, availability: "AVAILABLE", evidenceReferences: ["microsoft:evidence:synthetic"], priority: 3 } as const;
