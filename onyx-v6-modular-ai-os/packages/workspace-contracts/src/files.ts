export type FileProviderId = "microsoft" | "google";
export type FileSourceId = "local" | "microsoft-onedrive" | "microsoft-sharepoint" | "google-drive" | (string & {});
export type FileSourceAvailability = "AVAILABLE" | "CONNECTED" | "DISCONNECTED" | "CONNECT_REQUIRED" | "PERMISSION_REQUIRED" | "NOT_APPLICABLE" | "NOT_SUPPORTED" | "DEGRADED" | "ERROR";
export type FileSourceConnectionState = "CONNECTED" | "DISCONNECTED" | "CONNECT_REQUIRED" | "NOT_APPLICABLE";
export type FileSourceOperation = "BROWSE" | "READ_METADATA" | "READ_CONTENT" | "CREATE" | "UPDATE" | "MOVE" | "RENAME" | "DELETE" | "SEARCH";
export type FileProviderDiagnostic = { readonly sourceId: FileSourceId; readonly providerFamily: string; readonly operation: FileSourceOperation; readonly state: FileSourceAvailability; readonly reasonCode?: string; readonly freshness: "LIVE" | "STALE" | "NOT_AVAILABLE"; readonly retryEligible: boolean; readonly userActionRequired: boolean; };
export type FileSourceCapability = { readonly operation: FileSourceOperation; readonly enabled: boolean; };
export type FileProviderAction = "OPEN" | "CONNECT" | "RECONNECT" | "REFRESH" | "CLEAR";
export type LocalSelectionMechanism = "FILE_SYSTEM_HANDLE" | "FILE_INPUT" | "DRAG_AND_DROP";
export type LocalPermissionState = "UNKNOWN" | "GRANTED" | "PROMPT_REQUIRED" | "DENIED";
export type LocalPreviewState = "NOT_REQUESTED" | "AVAILABLE" | "UNSUPPORTED" | "UNAVAILABLE" | "TOO_LARGE" | "FAILED";
export type LocalValidationState = "VALID" | "INVALID" | "NOT_VALIDATED";
export interface LocalSelectedFileProjection {
  readonly sourceId: "local";
  readonly selectionId: string;
  readonly name: string;
  readonly extension: string;
  readonly mimeType: string;
  readonly size: number;
  readonly lastModified?: number;
  readonly itemKind: "FILE";
  readonly selectionMechanism: LocalSelectionMechanism;
  readonly readCapability: boolean;
  readonly originalSaveCapability: boolean;
  readonly saveAsCapability: boolean;
  readonly previewCapability: boolean;
  readonly editCapability: boolean;
  readonly conversionCapabilities: readonly string[];
  readonly dirty: boolean;
  readonly permissionState: LocalPermissionState;
  readonly previewState: LocalPreviewState;
  readonly validationState: LocalValidationState;
}
export interface FileSourceProjection { readonly sourceId: FileSourceId; readonly displayName: string; readonly providerFamily: string; readonly availability: FileSourceAvailability; readonly connection: FileSourceConnectionState; readonly capabilities: readonly FileSourceCapability[]; readonly diagnostic?: FileProviderDiagnostic; }
export interface FilesHubSnapshot { readonly availability: "AVAILABLE"; readonly sources: readonly FileSourceProjection[]; }
export interface LocalFileCapabilityProjection { readonly filePicker: "LOCAL_FILE_PICKER_SUPPORTED" | "LOCAL_FILE_ACCESS_NOT_SUPPORTED" | "LOCAL_PERMISSION_REQUIRED" | "LOCAL_PERMISSION_GRANTED" | "LOCAL_PERMISSION_DENIED" | "LOCAL_SELECTION_CANCELLED"; readonly directoryPicker: "LOCAL_DIRECTORY_PICKER_SUPPORTED" | "LOCAL_FILE_ACCESS_NOT_SUPPORTED" | "LOCAL_PERMISSION_REQUIRED" | "LOCAL_PERMISSION_GRANTED" | "LOCAL_PERMISSION_DENIED" | "LOCAL_SELECTION_CANCELLED"; }
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
  | "MICROSOFT_SHAREPOINT_SUCCEEDED" | "MICROSOFT_SHAREPOINT_EMPTY" | "MICROSOFT_SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT" | "MICROSOFT_SHAREPOINT_GUEST_SITE_AVAILABLE" | "MICROSOFT_SHAREPOINT_NO_ACCESSIBLE_SITE" | "MICROSOFT_SHAREPOINT_CONSENT_REQUIRED" | "MICROSOFT_SHAREPOINT_SCOPE_MISSING" | "MICROSOFT_SHAREPOINT_POLICY_BLOCKED" | "MICROSOFT_SHAREPOINT_SITE_NOT_FOUND" | "MICROSOFT_SHAREPOINT_LIBRARY_NOT_FOUND" | "MICROSOFT_SHAREPOINT_ITEM_NOT_FOUND" | "MICROSOFT_SHAREPOINT_RATE_LIMITED" | "MICROSOFT_SHAREPOINT_WRITE_SUCCEEDED" | "MICROSOFT_SHAREPOINT_WRITE_FORBIDDEN" | "MICROSOFT_SHAREPOINT_WRITE_CONFLICT" | "MICROSOFT_SHAREPOINT_CLEANUP_SUCCEEDED" | "MICROSOFT_SHAREPOINT_UNCERTAIN_EXTERNAL_EFFECT" | "MICROSOFT_SHAREPOINT_UNKNOWN_BOUNDED_FAILURE"
  | "MICROSOFT_FILES_CURSOR_INVALID" | "MICROSOFT_FILES_CURSOR_ACCOUNT_MISMATCH" | "MICROSOFT_FILES_CURSOR_DRIVE_MISMATCH" | "MICROSOFT_FILES_CURSOR_SITE_MISMATCH" | "MICROSOFT_FILES_CURSOR_LIBRARY_MISMATCH" | "MICROSOFT_FILES_CURSOR_PARENT_MISMATCH" | "MICROSOFT_FILES_CURSOR_RESOURCE_MISMATCH" | "MICROSOFT_FILES_CURSOR_INTEGRITY_FAILURE" | "MICROSOFT_ACCOUNT_CLASSIFICATION_FAILED" | "MICROSOFT_FILES_UNKNOWN_BOUNDED_FAILURE" | "MICROSOFT_FILES_ACTION_HANDLER_NOT_REACHED" | "MICROSOFT_FILES_CONTROLLER_NOT_REACHED" | "MICROSOFT_FILES_ACCOUNT_NOT_AVAILABLE" | "MICROSOFT_FILES_ADAPTER_NOT_AVAILABLE" | "MICROSOFT_FILES_INTERACTION_REQUIRED" | "MICROSOFT_FILES_TOKEN_ACQUISITION_FAILED" | "MICROSOFT_FILES_ACCESS_TOKEN_ABSENT" | "MICROSOFT_FILES_SCOPE_MISSING" | "MICROSOFT_FILES_GRAPH_AUDIENCE_MISMATCH" | "MICROSOFT_FILES_REQUEST_CONSTRUCTION_FAILED" | "MICROSOFT_FILES_AUTHORIZATION_HEADER_FAILED" | "FETCH_IMPLEMENTATION_ABSENT" | "FETCH_IMPLEMENTATION_NOT_CALLABLE" | "FETCH_IMPLEMENTATION_INVOCATION_FAILED" | "MICROSOFT_FILES_FETCH_CONSTRUCTION_FAILED" | "MICROSOFT_FILES_FETCH_REJECTED" | "MICROSOFT_FILES_FETCH_DISPATCH_FAILED" | "MICROSOFT_FILES_HTTP_400" | "MICROSOFT_FILES_HTTP_401" | "MICROSOFT_FILES_HTTP_403" | "MICROSOFT_FILES_HTTP_409" | "MICROSOFT_FILES_RATE_LIMITED" | "MICROSOFT_FILES_PROVIDER_5XX" | "MICROSOFT_FILES_RESPONSE_BODY_READ_FAILED" | "MICROSOFT_FILES_NON_JSON_RESPONSE" | "MICROSOFT_FILES_MALFORMED_RESPONSE" | "MICROSOFT_FILES_DUPLICATE_OPERATION_IN_PROGRESS" | "MICROSOFT_FILES_OPERATION_ALREADY_COMPLETED" | "MICROSOFT_FILES_IDEMPOTENCY_SCOPE_MISMATCH" | "MICROSOFT_FILES_REPLAY_BLOCKED_UNCERTAIN_EFFECT" | "MICROSOFT_FILES_CLEANUP_VERIFIED" | "MICROSOFT_FILES_CLEANUP_FAILED" | "MICROSOFT_FILES_CLEANUP_BLOCKED_UNKNOWN_OWNERSHIP" | "MICROSOFT_FILES_CLEANUP_BLOCKED_NOT_OWNED" | "MICROSOFT_FILES_UNCERTAIN_EXTERNAL_EFFECT";

export type FileTraceAction = "OPEN_ONEDRIVE" | "BOUNDED_ONEDRIVE_TEST";
export type FileTraceStage = "FILES_ACTION_RECEIVED" | "FILES_ACCOUNT_CONTEXT_REQUESTED" | "FILES_ACCOUNT_CONTEXT_AVAILABLE" | "FILES_REQUEST_CONSTRUCTION_STARTED" | "FILES_REQUEST_CONSTRUCTION_SUCCEEDED" | "FILES_REQUEST_CONSTRUCTION_FAILED" | "FILES_AUTHORIZATION_HEADER_STARTED" | "FILES_AUTHORIZATION_HEADER_SUCCEEDED" | "FILES_AUTHORIZATION_HEADER_FAILED" | "FILES_ACCOUNT_CLASSIFICATION_STARTED" | "FILES_ACCOUNT_CLASSIFICATION_SUCCEEDED" | "FILES_ACCOUNT_CLASSIFICATION_FAILED" | "FILES_ADAPTER_CONSTRUCTION_STARTED" | "FILES_ADAPTER_CONSTRUCTION_SUCCEEDED" | "FILES_TOKEN_REQUEST_STARTED" | "FILES_TOKEN_REQUEST_CACHE_HIT" | "FILES_TOKEN_REQUEST_NETWORK_STARTED" | "FILES_TOKEN_REQUEST_SUCCEEDED" | "FILES_TOKEN_REQUEST_INTERACTION_REQUIRED" | "FILES_TOKEN_REQUEST_FAILED" | "FILES_SCOPE_VALIDATION_SUCCEEDED" | "FILES_SCOPE_VALIDATION_FAILED" | "FILES_GET_DRIVE_STARTED" | "FILES_FETCH_DISPATCH_STARTED" | "FILES_FETCH_DISPATCH_RETURNED" | "FILES_FETCH_INVOCATION_STARTED" | "FILES_FETCH_INVOCATION_FAILED" | "FILES_FETCH_INVOCATION_RETURNED_RESPONSE" | "FILES_FETCH_REJECTED" | "FILES_GRAPH_RESPONSE_RECEIVED" | "FILES_HTTP_RESPONSE_RECEIVED" | "FILES_HTTP_RESPONSE_SUCCESS" | "FILES_HTTP_RESPONSE_FAILED" | "FILES_GRAPH_RESPONSE_FAILED" | "FILES_RESPONSE_BODY_READ_STARTED" | "FILES_RESPONSE_BODY_READ_SUCCEEDED" | "FILES_RESPONSE_BODY_READ_FAILED" | "FILES_RESPONSE_PARSE_STARTED" | "FILES_RESPONSE_PARSE_SUCCEEDED" | "FILES_RESPONSE_PARSE_FAILED" | "FILES_RESULT_MAPPING_STARTED" | "FILES_RESULT_MAPPING_SUCCEEDED" | "FILES_RESULT_MAPPING_FAILED" | "FILES_DRIVE_NORMALIZATION_STARTED" | "FILES_DRIVE_NORMALIZATION_SUCCEEDED" | "FILES_DRIVE_NORMALIZATION_FAILED" | "FILES_WRITE_CONFIRMATION_ACCEPTED" | "FILES_WRITE_PREFLIGHT_STARTED" | "FILES_WRITE_NOT_STARTED" | "FILES_ACTION_COMPLETED" | "FILES_ACTION_FAILED";
export interface FileRuntimeTrace {
  readonly schemaVersion: 1;
  readonly correlationId: string;
  readonly action: FileTraceAction;
  readonly stage: FileTraceStage;
  readonly accountKind?: FileAccountKind;
  readonly requestedScopeClass?: "USER_READ_FILES_READWRITE";
  readonly returnedScopeClass?: "FILES_READWRITE_PRESENT" | "FILES_READWRITE_ABSENT" | "NOT_REPORTED";
  readonly tokenPresent?: boolean;
  readonly tokenSourceClass?: "CACHE" | "NETWORK" | "UNKNOWN";
  readonly interactionRequired?: boolean;
  readonly adapterAvailable?: boolean;
  readonly authorizationHeaderPresent?: boolean;
  readonly fetchReached?: boolean;
  readonly httpStatus?: number;
  readonly reasonCode?: FileDiagnosticReasonCode;
  readonly errorNameClass?: "TYPE_ERROR" | "MSAL_ERROR" | "MICROSOFT_FILES_ERROR" | "UNKNOWN";
  readonly retryAttempted: boolean;
  readonly finalReasonCode?: FileDiagnosticReasonCode;
  readonly buildIdentity: string;
  readonly sequence: number;
}

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
  readonly requestIdPresent?: boolean;
  readonly clientRequestIdPresent?: boolean;
  readonly consentRequired?: boolean;
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
  readonly replayDisposition?: "NEW_EXECUTION" | "ALREADY_COMPLETED" | "REPLAY_BLOCKED" | "IN_PROGRESS";
  readonly finalReasonCode?: FileDiagnosticReasonCode;
}
