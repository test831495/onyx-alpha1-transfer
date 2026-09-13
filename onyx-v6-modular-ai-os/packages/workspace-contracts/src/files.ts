export type FileProviderId = "microsoft" | "google";
export type FileAccountKind = "PERSONAL_MICROSOFT_ACCOUNT" | "ORGANIZATIONAL_MICROSOFT_ACCOUNT" | "GUEST_MICROSOFT_ACCOUNT" | "UNKNOWN_MICROSOFT_ACCOUNT";
export type FileCapability = "MICROSOFT_ONEDRIVE_READ" | "MICROSOFT_ONEDRIVE_WRITE" | "MICROSOFT_SHAREPOINT_READ" | "MICROSOFT_SHAREPOINT_WRITE";
export type FileItemKind = "FILE" | "FOLDER";
export type FileWriteCapability = "READ_ONLY" | "READ_WRITE";

export interface FileItemProjection {
  readonly provider: FileProviderId;
  readonly accountKind: FileAccountKind;
  readonly driveId: string;
  readonly itemId: string;
  readonly parentItemId?: string;
  readonly name: string;
  readonly itemKind: FileItemKind;
  readonly mimeType?: string;
  readonly size?: number;
  readonly createdAt?: string;
  readonly modifiedAt?: string;
  readonly webUrl?: string;
  readonly sourcePathClass: "ONEDRIVE" | "SHAREPOINT_LIBRARY";
  readonly writeCapability: FileWriteCapability;
  readonly sourceAttribution: "MICROSOFT_GRAPH";
}

export interface DriveProjection {
  readonly provider: FileProviderId;
  readonly accountKind: FileAccountKind;
  readonly driveId: string;
  readonly driveType: "PERSONAL" | "BUSINESS" | "DOCUMENT_LIBRARY" | "UNKNOWN";
  readonly displayName?: string;
  readonly sourcePathClass: "ONEDRIVE" | "SHAREPOINT_LIBRARY";
  readonly sourceAttribution: "MICROSOFT_GRAPH";
}

export interface FolderListingProjection {
  readonly parent: FileItemProjection;
  readonly items: readonly FileItemProjection[];
  readonly itemCount: number;
  readonly continuationCursor?: string;
  readonly truncated: boolean;
  readonly sourceAttribution: "MICROSOFT_GRAPH";
  readonly freshness: "LIVE";
  readonly diagnosticReference: string;
}

export type FileDiagnosticStage = "CAPABILITY_DETECTION" | "ACCOUNT_CLASSIFICATION" | "TOKEN_REQUESTED" | "TOKEN_ACQUIRED" | "SCOPE_VALIDATED" | "TARGET_RESOLVED" | "GRAPH_REQUEST_STARTED" | "GRAPH_RESPONSE_RECEIVED" | "RESPONSE_VALIDATED" | "ITEMS_NORMALIZED" | "WRITE_PREVIEW_CREATED" | "WRITE_STARTED" | "WRITE_VERIFIED" | "CLEANUP_STARTED" | "CLEANUP_VERIFIED" | "COMPLETED" | "FAILED";
export type FileDiagnosticReasonCode =
  | "MICROSOFT_ONEDRIVE_SUCCEEDED" | "MICROSOFT_ONEDRIVE_EMPTY" | "MICROSOFT_ONEDRIVE_CONSENT_REQUIRED" | "MICROSOFT_ONEDRIVE_SCOPE_MISSING" | "MICROSOFT_ONEDRIVE_NOT_PROVISIONED" | "MICROSOFT_ONEDRIVE_ITEM_NOT_FOUND" | "MICROSOFT_ONEDRIVE_RATE_LIMITED" | "MICROSOFT_ONEDRIVE_WRITE_SUCCEEDED" | "MICROSOFT_ONEDRIVE_WRITE_CONFLICT" | "MICROSOFT_ONEDRIVE_WRITE_FORBIDDEN" | "MICROSOFT_ONEDRIVE_CLEANUP_SUCCEEDED" | "MICROSOFT_ONEDRIVE_UNCERTAIN_EXTERNAL_EFFECT" | "MICROSOFT_ONEDRIVE_UNKNOWN_BOUNDED_FAILURE"
  | "MICROSOFT_SHAREPOINT_SUCCEEDED" | "MICROSOFT_SHAREPOINT_EMPTY" | "MICROSOFT_SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT" | "MICROSOFT_SHAREPOINT_GUEST_SITE_AVAILABLE" | "MICROSOFT_SHAREPOINT_NO_ACCESSIBLE_SITE" | "MICROSOFT_SHAREPOINT_CONSENT_REQUIRED" | "MICROSOFT_SHAREPOINT_SCOPE_MISSING" | "MICROSOFT_SHAREPOINT_POLICY_BLOCKED" | "MICROSOFT_SHAREPOINT_SITE_NOT_FOUND" | "MICROSOFT_SHAREPOINT_LIBRARY_NOT_FOUND" | "MICROSOFT_SHAREPOINT_RATE_LIMITED" | "MICROSOFT_SHAREPOINT_WRITE_SUCCEEDED" | "MICROSOFT_SHAREPOINT_WRITE_FORBIDDEN" | "MICROSOFT_SHAREPOINT_WRITE_CONFLICT" | "MICROSOFT_SHAREPOINT_CLEANUP_SUCCEEDED" | "MICROSOFT_SHAREPOINT_UNCERTAIN_EXTERNAL_EFFECT" | "MICROSOFT_SHAREPOINT_UNKNOWN_BOUNDED_FAILURE";

export interface FileDiagnosticEnvelope {
  readonly capability: FileCapability;
  readonly operation: string;
  readonly stage: FileDiagnosticStage;
  readonly accountKind: FileAccountKind;
  readonly requestedScopes: readonly string[];
  readonly targetClass: "ONEDRIVE" | "SHAREPOINT_SITE" | "SHAREPOINT_LIBRARY";
  readonly itemCountBounded?: number;
  readonly paginationPresent?: boolean;
  readonly httpStatus?: number;
  readonly graphErrorClass?: string;
  readonly retryAttempted: boolean;
  readonly writeOperationClass?: "CREATE" | "REPLACE" | "RENAME" | "MOVE" | "DELETE";
  readonly uncertainExternalEffect: boolean;
  readonly finalReasonCode: FileDiagnosticReasonCode;
}

export interface FileWriteRequest {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly provider: FileProviderId;
  readonly driveId: string;
  readonly parentItemId: string;
  readonly testFolderName: "ONYX-NOVA-Connector-Test";
  readonly artifactName: string;
  readonly consequencePreview: string;
  readonly explicitTestMode: true;
}

export interface FileOperationReceipt {
  readonly operationId: string;
  readonly idempotencyKey: string;
  readonly createdItemIds: readonly string[];
  readonly deletedItemIds: readonly string[];
  readonly cleanupVerified: boolean;
  readonly uncertainExternalEffect: boolean;
}
