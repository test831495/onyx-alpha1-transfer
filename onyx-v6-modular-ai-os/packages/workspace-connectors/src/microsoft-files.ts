import type {
  DriveProjection,
  FileAccountKind,
  FileCapability,
  FileDiagnosticEnvelope,
  FileDiagnosticReasonCode,
  FileItemProjection,
  FileWriteRequest,
  FileOperationReceipt,
  FolderListingProjection,
  FileRuntimeTrace,
  FileTraceAction,
  FileTraceStage,
} from "@onyx/workspace-contracts";

const GRAPH_ORIGIN = "https://graph.microsoft.com";
const GRAPH_BASE = `${GRAPH_ORIGIN}/v1.0`;
const FILES_SCOPE = "Files.ReadWrite";
const TEST_FOLDER = "ONYX-NOVA-Connector-Test";
const ARTIFACT_PREFIX = "onyx-nova-connector-test-";
const MAX_PAGE_SIZE = 200;
const MAX_ITEMS = 200;
const MAX_NAME = 256;
type RequestTarget = "ONEDRIVE_DRIVE" | "ONEDRIVE_ITEM" | "SHAREPOINT_SITE" | "SHAREPOINT_LIBRARY" | "SHAREPOINT_ITEM";

type GraphItem = { id?: unknown; name?: unknown; parentReference?: { id?: unknown; driveId?: unknown }; file?: { mimeType?: unknown; size?: unknown }; folder?: Record<string, unknown>; createdDateTime?: unknown; lastModifiedDateTime?: unknown; webUrl?: unknown; remoteItem?: unknown };
type GraphDrive = { id?: unknown; driveType?: unknown; name?: unknown };
type GraphResponse = { value?: unknown; "@odata.nextLink"?: unknown };
type CursorPayload = {
  schemaVersion: 1;
  provider: "microsoft";
  capability: FileCapability;
  accountKind: FileAccountKind;
  driveId: string;
  siteId?: string;
  libraryId?: string;
  parentItemId: string;
  nextLink: string;
  operation: "LIST_CHILDREN";
  scopeHash: string;
  integrity: string;
};

const MAX_CURSOR = 4096;
const operationRegistry = new Map<string, { scopeHash: string; state: "IN_PROGRESS" | "SUCCEEDED" | "FAILED_CLEANUP_VERIFIED" | "UNCERTAIN_EXTERNAL_EFFECT"; receipt?: FileOperationReceipt }>();

export type MicrosoftAccountClassification = FileAccountKind;
export type MicrosoftFilesCapabilityState = "ONEDRIVE_READ_WRITE_GRANTED" | "ONEDRIVE_CONSENT_REQUIRED" | "SHAREPOINT_READ_WRITE_GRANTED" | "SHAREPOINT_CONSENT_REQUIRED" | "SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT" | "SHAREPOINT_GUEST_SITE_AVAILABLE" | "SHAREPOINT_NO_ACCESSIBLE_SITE" | "SHAREPOINT_ORGANIZATIONAL_POLICY_BLOCKED";

export function classifyMicrosoftAccount(input: { tenantId?: unknown; effectiveTenantId?: unknown; accountType?: unknown; homeAccountType?: unknown; isGuest?: unknown }): MicrosoftAccountClassification {
  if (typeof input.accountType === "string") {
    const type = input.accountType.toLowerCase();
    if (type.includes("personal") || type === "msa") return "PERSONAL_MICROSOFT_ACCOUNT";
  }
  if (input.homeAccountType === "PERSONAL_MICROSOFT_ACCOUNT" || input.homeAccountType === "personal") return "PERSONAL_MICROSOFT_ACCOUNT";
  if (input.isGuest === true) return "GUEST_MICROSOFT_ACCOUNT";
  if (typeof input.accountType === "string") {
    const type = input.accountType.toLowerCase();
    if (type.includes("organizational") || type === "work" || type === "school") return "ORGANIZATIONAL_MICROSOFT_ACCOUNT";
  }
  if (typeof input.effectiveTenantId === "string" && input.effectiveTenantId.trim()) return "ORGANIZATIONAL_MICROSOFT_ACCOUNT";
  if (typeof input.tenantId === "string" && input.tenantId.trim()) return "ORGANIZATIONAL_MICROSOFT_ACCOUNT";
  return "UNKNOWN_MICROSOFT_ACCOUNT";
}

export function validateGraphNextLink(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length > 2048) throw new Error("Microsoft Graph continuation is malformed.");
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Microsoft Graph continuation is malformed."); }
  if (url.protocol !== "https:" || url.origin !== GRAPH_ORIGIN || !url.pathname.startsWith("/v1.0/")) throw new Error("Microsoft Graph continuation is outside the approved host.");
  return url.toString();
}

function safeDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function safeSize(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isSafeInteger(number) && number >= 0 ? number : undefined;
}

function requireString(value: unknown, label: string, max = MAX_NAME): string {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`Microsoft Graph ${label} is malformed.`);
  return value;
}

export function normalizeMicrosoftFileItem(raw: GraphItem, accountKind: FileAccountKind, sourcePathClass: "ONEDRIVE" | "SHAREPOINT_LIBRARY", writeCapability: "READ_ONLY" | "READ_WRITE"): FileItemProjection {
  if (raw.remoteItem || (raw.file && raw.folder)) throw new Error("Microsoft Graph item shape is unsupported.");
  const itemId = requireString(raw.id, "item id", 512);
  const name = requireString(raw.name, "item name");
  const itemKind = raw.folder ? "FOLDER" : raw.file ? "FILE" : undefined;
  if (!itemKind) throw new Error("Microsoft Graph item has no file or folder facet.");
  const parentItemId = typeof raw.parentReference?.id === "string" ? requireString(raw.parentReference.id, "parent id", 512) : undefined;
  const mimeType = raw.file?.mimeType;
  if (mimeType !== undefined && typeof mimeType !== "string") throw new Error("Microsoft Graph mime type is malformed.");
  const webUrl = raw.webUrl;
  if (webUrl !== undefined && (typeof webUrl !== "string" || webUrl.length > 2048)) throw new Error("Microsoft Graph web URL is malformed.");
  return Object.freeze({ provider: "microsoft", accountKind, driveId: requireString(raw.parentReference?.driveId, "drive id", 512), itemId, ...(parentItemId ? { parentItemId } : {}), name, itemKind, ...(typeof mimeType === "string" ? { mimeType } : {}), ...(itemKind === "FILE" ? { size: safeSize(raw.file?.size) } : {}), ...(safeDate(raw.createdDateTime) ? { createdAt: safeDate(raw.createdDateTime) } : {}), ...(safeDate(raw.lastModifiedDateTime) ? { modifiedAt: safeDate(raw.lastModifiedDateTime) } : {}), ...(typeof webUrl === "string" ? { webUrl } : {}), sourcePathClass, writeCapability, sourceAttribution: "MICROSOFT_GRAPH" });
}

function reasonFor(capability: FileCapability, outcome: "success" | "empty"): FileDiagnosticReasonCode {
  if (capability.startsWith("MICROSOFT_SHAREPOINT")) return outcome === "empty" ? "MICROSOFT_SHAREPOINT_EMPTY" : "MICROSOFT_SHAREPOINT_SUCCEEDED";
  return outcome === "empty" ? "MICROSOFT_ONEDRIVE_EMPTY" : "MICROSOFT_ONEDRIVE_SUCCEEDED";
}

export interface MicrosoftFilesAdapterOptions {
  readonly accessToken: (scopes: readonly string[]) => Promise<string>;
  readonly fetch?: typeof globalThis.fetch;
  readonly accountKind: FileAccountKind;
  readonly maxItems?: number;
  readonly action?: FileTraceAction;
  readonly buildIdentity?: string;
  readonly onTrace?: (trace: FileRuntimeTrace) => void;
}

export interface SharePointTarget { readonly hostname: string; readonly sitePath: string; }
export interface SharePointResolution {
  readonly siteId: string;
  readonly siteName?: string;
  readonly drives: readonly DriveProjection[];
  readonly diagnostic: FileDiagnosticEnvelope;
}
export interface BoundedWriteOptions extends FileWriteRequest {
  readonly confirmed: true;
  readonly sourcePathClass: "ONEDRIVE" | "SHAREPOINT_LIBRARY";
}
export interface FileNavigationContext {
  readonly siteId?: string;
  readonly libraryId?: string;
}

export class MicrosoftFilesError extends Error {
  constructor(readonly diagnostic: FileDiagnosticEnvelope) {
    super(diagnostic.finalReasonCode);
    this.name = "MicrosoftFilesError";
  }
}

function boundedHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function encodeCursor(payload: Omit<CursorPayload, "integrity">): string {
  const integrity = boundedHash(JSON.stringify(payload));
  const encoded = encodeURIComponent(JSON.stringify({ ...payload, integrity }));
  if (encoded.length > MAX_CURSOR) throw new Error("Microsoft Files continuation is oversized.");
  return `mfc1.${encoded}`;
}

function cursorFailure(reason: FileDiagnosticReasonCode, accountKind: FileAccountKind, operation: string): MicrosoftFilesError {
  return new MicrosoftFilesError({ capability: "MICROSOFT_ONEDRIVE_READ", operation, stage: "FAILED", accountKind, requestedScopes: ["User.Read", FILES_SCOPE], targetClass: "ONEDRIVE", retryAttempted: false, uncertainExternalEffect: false, finalReasonCode: reason });
}

export class MicrosoftFilesAdapter {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly maxItems: number;
  private sequence = 0;
  private readonly correlationId = `files-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  constructor(private readonly options: MicrosoftFilesAdapterOptions) {
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.maxItems = Math.min(Math.max(options.maxItems ?? 50, 1), MAX_ITEMS);
    this.trace("FILES_ACTION_RECEIVED");
    this.trace("FILES_ACCOUNT_CONTEXT_REQUESTED");
    this.trace("FILES_ACCOUNT_CONTEXT_AVAILABLE");
    this.trace("FILES_ADAPTER_CONSTRUCTION_STARTED", { adapterAvailable: false });
    this.trace("FILES_ADAPTER_CONSTRUCTION_SUCCEEDED", { adapterAvailable: true });
  }

  private trace(stage: FileTraceStage, patch: Partial<FileRuntimeTrace> = {}): void {
    this.options.onTrace?.(Object.freeze({ schemaVersion: 1, correlationId: this.correlationId, action: this.options.action ?? "OPEN_ONEDRIVE", stage, accountKind: this.options.accountKind, requestedScopeClass: "USER_READ_FILES_READWRITE", retryAttempted: false, buildIdentity: this.options.buildIdentity ?? "UNKNOWN", sequence: ++this.sequence, ...patch }));
  }

  complete(finalReasonCode?: FileRuntimeTrace["finalReasonCode"]): void {
    this.trace("FILES_ACTION_COMPLETED", { finalReasonCode });
  }

  private async request<T extends GraphResponse>(url: string, init: RequestInit = {}, target: RequestTarget = url.includes("/sites/") ? "SHAREPOINT_SITE" : "ONEDRIVE_ITEM"): Promise<{ body: T; response: Response }> {
    const isSharePointRequest = target.startsWith("SHAREPOINT");
    this.trace("FILES_REQUEST_CONSTRUCTION_STARTED");
    let parsed: URL;
    try { parsed = new URL(url); }
    catch (error) {
      const reason = "MICROSOFT_FILES_REQUEST_CONSTRUCTION_FAILED" as const;
      this.trace("FILES_REQUEST_CONSTRUCTION_FAILED", { reasonCode: reason, finalReasonCode: reason, errorNameClass: error instanceof TypeError ? "TYPE_ERROR" : "UNKNOWN" });
      throw new MicrosoftFilesError(this.diagnostic(isSharePointRequest ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphRequest", "FAILED", reason, isSharePointRequest ? "SHAREPOINT_SITE" : "ONEDRIVE"));
    }
    if (parsed.origin !== GRAPH_ORIGIN || parsed.protocol !== "https:") {
      const reason = "MICROSOFT_FILES_REQUEST_CONSTRUCTION_FAILED" as const;
      this.trace("FILES_REQUEST_CONSTRUCTION_FAILED", { reasonCode: reason, finalReasonCode: reason });
      throw new MicrosoftFilesError(this.diagnostic(isSharePointRequest ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphRequest", "FAILED", reason, isSharePointRequest ? "SHAREPOINT_SITE" : "ONEDRIVE"));
    }
    this.trace("FILES_REQUEST_CONSTRUCTION_SUCCEEDED");
    this.trace("FILES_TOKEN_REQUEST_STARTED");
    let token: string;
    try { token = await this.options.accessToken([FILES_SCOPE]); }
    catch (error) {
      const interactionRequired = /interaction[_ -]?required|consent/i.test(error instanceof Error ? `${error.name} ${error.message} ${String(error.cause ?? "")}` : "");
      const reason = interactionRequired ? "MICROSOFT_FILES_INTERACTION_REQUIRED" : "MICROSOFT_FILES_TOKEN_ACQUISITION_FAILED";
      this.trace(interactionRequired ? "FILES_TOKEN_REQUEST_INTERACTION_REQUIRED" : "FILES_TOKEN_REQUEST_FAILED", { interactionRequired, reasonCode: reason, finalReasonCode: reason });
      throw new MicrosoftFilesError(this.diagnostic(isSharePointRequest ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphRequest", "FAILED", isSharePointRequest && interactionRequired ? "MICROSOFT_SHAREPOINT_CONSENT_REQUIRED" : reason, isSharePointRequest ? "SHAREPOINT_SITE" : "ONEDRIVE", { consentRequired: interactionRequired }));
    }
    if (!token) { this.trace("FILES_TOKEN_REQUEST_FAILED", { reasonCode: "MICROSOFT_FILES_ACCESS_TOKEN_ABSENT", finalReasonCode: "MICROSOFT_FILES_ACCESS_TOKEN_ABSENT" }); throw new MicrosoftFilesError(this.diagnostic("MICROSOFT_ONEDRIVE_READ", "graphRequest", "FAILED", "MICROSOFT_FILES_ACCESS_TOKEN_ABSENT", "ONEDRIVE")); }
    this.trace("FILES_TOKEN_REQUEST_SUCCEEDED", { tokenPresent: true, tokenSourceClass: "UNKNOWN" });
    this.trace("FILES_SCOPE_VALIDATION_SUCCEEDED", { returnedScopeClass: "FILES_READWRITE_PRESENT" });
    this.trace("FILES_AUTHORIZATION_HEADER_STARTED");
    const incomingHeaders = new Headers(init.headers ?? {});
    if (incomingHeaders.has("authorization") && incomingHeaders.get("authorization") !== `Bearer ${token}`) {
      const reason = "MICROSOFT_FILES_AUTHORIZATION_HEADER_FAILED" as const;
      this.trace("FILES_AUTHORIZATION_HEADER_FAILED", { reasonCode: reason, finalReasonCode: reason });
      throw new MicrosoftFilesError(this.diagnostic(isSharePointRequest ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphRequest", "FAILED", reason, isSharePointRequest ? "SHAREPOINT_SITE" : "ONEDRIVE"));
    }
    const headerInit = new Headers({ accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}) });
    headerInit.set("Authorization", `Bearer ${token}`);
    this.trace("FILES_AUTHORIZATION_HEADER_SUCCEEDED", { authorizationHeaderPresent: true });
    const fetchImplementation = this.fetcher ?? globalThis.fetch;
    if (fetchImplementation === undefined) {
      const reason = "FETCH_IMPLEMENTATION_ABSENT" as const;
      this.trace("FILES_FETCH_INVOCATION_STARTED", { fetchReached: false, reasonCode: reason, finalReasonCode: reason });
      throw new MicrosoftFilesError(this.diagnostic(isSharePointRequest ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphRequest", "FAILED", reason, isSharePointRequest ? "SHAREPOINT_SITE" : "ONEDRIVE"));
    }
    if (typeof fetchImplementation !== "function") {
      const reason = "FETCH_IMPLEMENTATION_NOT_CALLABLE" as const;
      this.trace("FILES_FETCH_INVOCATION_STARTED", { fetchReached: false, reasonCode: reason, finalReasonCode: reason });
      throw new MicrosoftFilesError(this.diagnostic(isSharePointRequest ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphRequest", "FAILED", reason, isSharePointRequest ? "SHAREPOINT_SITE" : "ONEDRIVE"));
    }
    this.trace("FILES_FETCH_INVOCATION_STARTED", { fetchReached: false });
    let response: Response;
    try { response = await fetchImplementation.call(globalThis, parsed, { ...init, headers: headerInit }); }
    catch (error) {
      const reason = "MICROSOFT_FILES_FETCH_REJECTED" as const;
      this.trace("FILES_FETCH_REJECTED", { fetchReached: false, errorNameClass: error instanceof TypeError ? "TYPE_ERROR" : "UNKNOWN", reasonCode: reason, finalReasonCode: reason });
      throw new MicrosoftFilesError(this.diagnostic(isSharePointRequest ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphRequest", "FAILED", reason, isSharePointRequest ? "SHAREPOINT_SITE" : "ONEDRIVE"));
    }
    this.trace("FILES_FETCH_INVOCATION_RETURNED_RESPONSE", { fetchReached: true });
    this.trace("FILES_HTTP_RESPONSE_RECEIVED", { fetchReached: true, httpStatus: response.status });
    if (!response.ok) {
      const reason = target === "SHAREPOINT_SITE"
        ? response.status === 404 ? "MICROSOFT_SHAREPOINT_SITE_NOT_FOUND" : response.status === 401 ? "MICROSOFT_SHAREPOINT_CONSENT_REQUIRED" : response.status === 403 ? "MICROSOFT_SHAREPOINT_POLICY_BLOCKED" : response.status === 429 ? "MICROSOFT_SHAREPOINT_RATE_LIMITED" : "MICROSOFT_SHAREPOINT_UNKNOWN_BOUNDED_FAILURE"
        : target === "SHAREPOINT_LIBRARY"
          ? response.status === 404 ? "MICROSOFT_SHAREPOINT_LIBRARY_NOT_FOUND" : response.status === 401 ? "MICROSOFT_SHAREPOINT_CONSENT_REQUIRED" : response.status === 403 ? "MICROSOFT_SHAREPOINT_POLICY_BLOCKED" : response.status === 429 ? "MICROSOFT_SHAREPOINT_RATE_LIMITED" : "MICROSOFT_SHAREPOINT_UNKNOWN_BOUNDED_FAILURE"
          : target === "SHAREPOINT_ITEM"
            ? response.status === 404 ? "MICROSOFT_SHAREPOINT_ITEM_NOT_FOUND" : response.status === 401 ? "MICROSOFT_SHAREPOINT_CONSENT_REQUIRED" : response.status === 403 ? "MICROSOFT_SHAREPOINT_POLICY_BLOCKED" : response.status === 429 ? "MICROSOFT_SHAREPOINT_RATE_LIMITED" : "MICROSOFT_SHAREPOINT_UNKNOWN_BOUNDED_FAILURE"
            : response.status === 400 ? "MICROSOFT_FILES_HTTP_400" : response.status === 401 ? "MICROSOFT_FILES_HTTP_401" : response.status === 403 ? "MICROSOFT_FILES_HTTP_403" : response.status === 404 ? (target === "ONEDRIVE_DRIVE" ? "MICROSOFT_ONEDRIVE_NOT_PROVISIONED" : "MICROSOFT_ONEDRIVE_ITEM_NOT_FOUND") : response.status === 409 ? "MICROSOFT_FILES_HTTP_409" : response.status === 429 ? "MICROSOFT_FILES_RATE_LIMITED" : response.status >= 500 ? "MICROSOFT_FILES_PROVIDER_5XX" : "MICROSOFT_ONEDRIVE_UNKNOWN_BOUNDED_FAILURE";
      this.trace("FILES_HTTP_RESPONSE_FAILED", { httpStatus: response.status, reasonCode: reason, finalReasonCode: reason });
      throw new MicrosoftFilesError(this.diagnostic(target.startsWith("SHAREPOINT") ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphRequest", "FAILED", reason, target === "SHAREPOINT_SITE" ? "SHAREPOINT_SITE" : target.startsWith("SHAREPOINT") ? "SHAREPOINT_LIBRARY" : "ONEDRIVE", { httpStatus: response.status, graphErrorClass: reason }));
    }
    this.trace("FILES_HTTP_RESPONSE_SUCCESS", { httpStatus: response.status });
    let body: unknown = {};
    if (response.status !== 204) {
      this.trace("FILES_RESPONSE_BODY_READ_STARTED");
      try {
        const contentType = response.headers.get("content-type") ?? "";
        if (!contentType || (!contentType.includes("application/json") && !contentType.includes("+json"))) {
          const reason = "MICROSOFT_FILES_NON_JSON_RESPONSE" as const;
          this.trace("FILES_RESPONSE_BODY_READ_FAILED", { reasonCode: reason, finalReasonCode: reason });
          throw new MicrosoftFilesError(this.diagnostic(target.startsWith("SHAREPOINT") ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphResponse", "FAILED", reason, target === "SHAREPOINT_SITE" ? "SHAREPOINT_SITE" : target === "SHAREPOINT_ITEM" || target === "SHAREPOINT_LIBRARY" ? "SHAREPOINT_LIBRARY" : "ONEDRIVE"));
        }
        const raw = await response.text();
        this.trace("FILES_RESPONSE_BODY_READ_SUCCEEDED");
        if (!raw.trim()) {
          const reason = "MICROSOFT_FILES_RESPONSE_BODY_READ_FAILED" as const;
          this.trace("FILES_RESPONSE_PARSE_FAILED", { reasonCode: reason, finalReasonCode: reason });
          throw new MicrosoftFilesError(this.diagnostic(target.startsWith("SHAREPOINT") ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphResponse", "FAILED", reason, target === "SHAREPOINT_SITE" ? "SHAREPOINT_SITE" : target === "SHAREPOINT_ITEM" || target === "SHAREPOINT_LIBRARY" ? "SHAREPOINT_LIBRARY" : "ONEDRIVE"));
        }
        this.trace("FILES_RESPONSE_PARSE_STARTED");
        try { body = JSON.parse(raw); }
        catch (error) {
          const reason = "MICROSOFT_FILES_RESPONSE_BODY_READ_FAILED" as const;
          this.trace("FILES_RESPONSE_PARSE_FAILED", { reasonCode: reason, finalReasonCode: reason, errorNameClass: error instanceof SyntaxError ? "UNKNOWN" : "UNKNOWN" });
          throw new MicrosoftFilesError(this.diagnostic(target.startsWith("SHAREPOINT") ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphResponse", "FAILED", reason, target === "SHAREPOINT_SITE" ? "SHAREPOINT_SITE" : target === "SHAREPOINT_ITEM" || target === "SHAREPOINT_LIBRARY" ? "SHAREPOINT_LIBRARY" : "ONEDRIVE"));
        }
        this.trace("FILES_RESPONSE_PARSE_SUCCEEDED");
      }
      catch (error) {
        if (error instanceof MicrosoftFilesError) throw error;
        const reason = "MICROSOFT_FILES_RESPONSE_BODY_READ_FAILED" as const;
        this.trace("FILES_RESPONSE_BODY_READ_FAILED", { reasonCode: reason, finalReasonCode: reason });
        throw new MicrosoftFilesError(this.diagnostic(target.startsWith("SHAREPOINT") ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphResponse", "FAILED", reason, target === "SHAREPOINT_SITE" ? "SHAREPOINT_SITE" : target === "SHAREPOINT_ITEM" || target === "SHAREPOINT_LIBRARY" ? "SHAREPOINT_LIBRARY" : "ONEDRIVE"));
      }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) { const reason = "MICROSOFT_FILES_MALFORMED_RESPONSE" as const; this.trace("FILES_RESULT_MAPPING_FAILED", { reasonCode: reason, finalReasonCode: reason }); throw new MicrosoftFilesError(this.diagnostic(target.startsWith("SHAREPOINT") ? "MICROSOFT_SHAREPOINT_READ" : "MICROSOFT_ONEDRIVE_READ", "graphResponse", "FAILED", reason, target === "SHAREPOINT_SITE" ? "SHAREPOINT_SITE" : target === "SHAREPOINT_ITEM" || target === "SHAREPOINT_LIBRARY" ? "SHAREPOINT_LIBRARY" : "ONEDRIVE")); }
    return { body: body as T, response };
  }

  private diagnostic(capability: FileCapability, operation: string, stage: FileDiagnosticEnvelope["stage"], reason: FileDiagnosticReasonCode, targetClass: FileDiagnosticEnvelope["targetClass"], extra: Partial<FileDiagnosticEnvelope> = {}): FileDiagnosticEnvelope {
    return Object.freeze({ capability, operation, stage, accountKind: this.options.accountKind, requestedScopes: ["User.Read", FILES_SCOPE], targetClass, retryAttempted: false, uncertainExternalEffect: false, finalReasonCode: reason, ...extra });
  }

  async getOneDrive(): Promise<{ drive: DriveProjection; diagnostic: FileDiagnosticEnvelope }> {
    this.trace("FILES_ACCOUNT_CLASSIFICATION_STARTED");
    if (this.options.accountKind === "UNKNOWN_MICROSOFT_ACCOUNT") { this.trace("FILES_ACCOUNT_CLASSIFICATION_FAILED", { reasonCode: "MICROSOFT_ACCOUNT_CLASSIFICATION_FAILED", finalReasonCode: "MICROSOFT_ACCOUNT_CLASSIFICATION_FAILED" }); throw new MicrosoftFilesError(this.diagnostic("MICROSOFT_ONEDRIVE_READ", "getOneDrive", "FAILED", "MICROSOFT_ACCOUNT_CLASSIFICATION_FAILED", "ONEDRIVE")); }
    this.trace("FILES_ACCOUNT_CLASSIFICATION_SUCCEEDED");
    this.trace("FILES_GET_DRIVE_STARTED");
    const { body } = await this.request<GraphResponse & GraphDrive>(`${GRAPH_BASE}/me/drive`, {}, "ONEDRIVE_DRIVE");
    this.trace("FILES_RESULT_MAPPING_STARTED");
    let driveId: string;
    try { driveId = requireString(body.id, "drive id", 512); } catch { const reason = "MICROSOFT_FILES_MALFORMED_RESPONSE" as const; this.trace("FILES_RESULT_MAPPING_FAILED", { reasonCode: reason, finalReasonCode: reason }); throw new MicrosoftFilesError(this.diagnostic("MICROSOFT_ONEDRIVE_READ", "getOneDrive", "FAILED", reason, "ONEDRIVE")); }
    const driveType = body.driveType === "personal" ? "PERSONAL" : body.driveType === "business" ? "BUSINESS" : "UNKNOWN";
    const drive = Object.freeze({ provider: "microsoft", accountKind: this.options.accountKind, driveId, driveType, ...(typeof body.name === "string" ? { displayName: body.name.slice(0, MAX_NAME) } : {}), sourcePathClass: "ONEDRIVE", sourceAttribution: "MICROSOFT_GRAPH" }) as DriveProjection;
    this.trace("FILES_RESULT_MAPPING_SUCCEEDED");
    return { drive, diagnostic: this.diagnostic("MICROSOFT_ONEDRIVE_READ", "getOneDrive", "COMPLETED", "MICROSOFT_ONEDRIVE_SUCCEEDED", "ONEDRIVE") };
  }

  async listChildren(driveId: string, itemId: string, sourcePathClass: "ONEDRIVE" | "SHAREPOINT_LIBRARY" = "ONEDRIVE", continuation?: string, context: FileNavigationContext = {}): Promise<{ listing: FolderListingProjection; diagnostic: FileDiagnosticEnvelope }> {
    requireString(driveId, "drive id", 512); requireString(itemId, "item id", 512);
    const capability = sourcePathClass === "ONEDRIVE" ? "MICROSOFT_ONEDRIVE_READ" : "MICROSOFT_SHAREPOINT_READ";
    if (this.options.accountKind === "UNKNOWN_MICROSOFT_ACCOUNT") throw new MicrosoftFilesError(this.diagnostic(capability, "listChildren", "FAILED", "MICROSOFT_ACCOUNT_CLASSIFICATION_FAILED", sourcePathClass === "ONEDRIVE" ? "ONEDRIVE" : "SHAREPOINT_LIBRARY"));
    let url: string;
    if (continuation) {
      let cursor: CursorPayload;
      try {
        if (!continuation.startsWith("mfc1.") || continuation.length > MAX_CURSOR) throw new Error();
        cursor = JSON.parse(decodeURIComponent(continuation.slice(5))) as CursorPayload;
        const expectedScope = `${cursor.provider}|${cursor.capability}|${cursor.accountKind}|${driveId}|${itemId}|${context.siteId ?? ""}|${context.libraryId ?? ""}`;
        if (cursor.provider !== "microsoft") throw cursorFailure("MICROSOFT_FILES_CURSOR_INVALID", this.options.accountKind, "listChildren");
        if (cursor.accountKind !== this.options.accountKind) throw cursorFailure("MICROSOFT_FILES_CURSOR_ACCOUNT_MISMATCH", this.options.accountKind, "listChildren");
        if (cursor.driveId !== driveId) throw cursorFailure("MICROSOFT_FILES_CURSOR_DRIVE_MISMATCH", this.options.accountKind, "listChildren");
        if (cursor.parentItemId !== itemId) throw cursorFailure("MICROSOFT_FILES_CURSOR_PARENT_MISMATCH", this.options.accountKind, "listChildren");
        if (cursor.siteId !== context.siteId) throw cursorFailure("MICROSOFT_FILES_CURSOR_SITE_MISMATCH", this.options.accountKind, "listChildren");
        if (cursor.libraryId !== context.libraryId) throw cursorFailure("MICROSOFT_FILES_CURSOR_LIBRARY_MISMATCH", this.options.accountKind, "listChildren");
        if (cursor.capability !== capability) throw cursorFailure("MICROSOFT_FILES_CURSOR_RESOURCE_MISMATCH", this.options.accountKind, "listChildren");
        if (cursor.schemaVersion !== 1 || cursor.operation !== "LIST_CHILDREN" || cursor.scopeHash !== boundedHash(expectedScope) || cursor.integrity !== boundedHash(JSON.stringify({ ...cursor, integrity: undefined }))) throw cursorFailure("MICROSOFT_FILES_CURSOR_INTEGRITY_FAILURE", this.options.accountKind, "listChildren");
        url = validateGraphNextLink(cursor.nextLink)!;
        if (!url.includes(`/drives/${encodeURIComponent(driveId)}/`) || !url.includes(`/items/${encodeURIComponent(itemId)}/children`)) throw cursorFailure("MICROSOFT_FILES_CURSOR_RESOURCE_MISMATCH", this.options.accountKind, "listChildren");
      } catch (error) { if (error instanceof MicrosoftFilesError) throw error; throw cursorFailure("MICROSOFT_FILES_CURSOR_INVALID", this.options.accountKind, "listChildren"); }
    } else url = `${GRAPH_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/children?$top=${this.maxItems}`;
    const { body } = await this.request<GraphResponse>(url!, {}, sourcePathClass === "ONEDRIVE" ? "ONEDRIVE_ITEM" : "SHAREPOINT_ITEM");
    if (!Array.isArray(body.value) || body.value.length > MAX_ITEMS) throw new MicrosoftFilesError(this.diagnostic(capability, "listChildren", "FAILED", "MICROSOFT_FILES_UNKNOWN_BOUNDED_FAILURE", sourcePathClass === "ONEDRIVE" ? "ONEDRIVE" : "SHAREPOINT_LIBRARY"));
    const parent: FileItemProjection = Object.freeze({ provider: "microsoft", accountKind: this.options.accountKind, driveId, itemId, name: itemId === "root" ? "Root" : "Folder", itemKind: "FOLDER", sourcePathClass, writeCapability: "READ_WRITE", sourceAttribution: "MICROSOFT_GRAPH" });
    let items: FileItemProjection[];
    try { items = body.value.map((item) => normalizeMicrosoftFileItem(item as GraphItem, this.options.accountKind, sourcePathClass, "READ_WRITE")).slice(0, this.maxItems); }
    catch { throw new MicrosoftFilesError(this.diagnostic(capability, "listChildren", "FAILED", "MICROSOFT_FILES_UNKNOWN_BOUNDED_FAILURE", sourcePathClass === "ONEDRIVE" ? "ONEDRIVE" : "SHAREPOINT_LIBRARY")); }
    const next = validateGraphNextLink(body["@odata.nextLink"]);
    const reason = reasonFor(capability, items.length === 0 ? "empty" : "success");
    const cursor = next ? encodeCursor({ schemaVersion: 1, provider: "microsoft", capability, accountKind: this.options.accountKind, driveId, ...(context.siteId ? { siteId: context.siteId } : {}), ...(context.libraryId ? { libraryId: context.libraryId } : {}), parentItemId: itemId, nextLink: next, operation: "LIST_CHILDREN", scopeHash: boundedHash(`microsoft|${capability}|${this.options.accountKind}|${driveId}|${itemId}|${context.siteId ?? ""}|${context.libraryId ?? ""}`) }) : undefined;
    return { listing: Object.freeze({ parent, items: Object.freeze(items), itemCount: items.length, ...(cursor ? { continuationCursor: cursor } : {}), truncated: Boolean(cursor), sourceAttribution: "MICROSOFT_GRAPH", freshness: "LIVE", diagnosticReference: `${capability}:${itemId}` }), diagnostic: this.diagnostic(capability, "listChildren", "COMPLETED", reason, sourcePathClass === "ONEDRIVE" ? "ONEDRIVE" : "SHAREPOINT_LIBRARY", { itemCountBounded: items.length, paginationPresent: Boolean(cursor) }) };
  }

  async resolveSharePoint(target?: SharePointTarget): Promise<SharePointResolution> {
    if (this.options.accountKind === "UNKNOWN_MICROSOFT_ACCOUNT") return { siteId: "", drives: [], diagnostic: this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "FAILED", "MICROSOFT_ACCOUNT_CLASSIFICATION_FAILED", "SHAREPOINT_SITE") };
    if (!target && this.options.accountKind === "PERSONAL_MICROSOFT_ACCOUNT") return { siteId: "", drives: [], diagnostic: this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "COMPLETED", "MICROSOFT_SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT", "SHAREPOINT_SITE") };
    if (!target) throw new MicrosoftFilesError(this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "FAILED", "MICROSOFT_SHAREPOINT_NO_ACCESSIBLE_SITE", "SHAREPOINT_SITE"));
    if (!/^[a-z0-9.-]+$/i.test(target.hostname) || !target.sitePath.startsWith("/")) throw new MicrosoftFilesError(this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "FAILED", "MICROSOFT_FILES_UNKNOWN_BOUNDED_FAILURE", "SHAREPOINT_SITE"));
    const siteUrl = `${GRAPH_BASE}/sites/${encodeURIComponent(target.hostname)}:${target.sitePath}`;
    const { body: site } = await this.request<GraphResponse & { id?: unknown; name?: unknown }>(siteUrl, {}, "SHAREPOINT_SITE");
    let siteId: string;
    try { siteId = requireString(site.id, "site id", 512); } catch { throw new MicrosoftFilesError(this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "FAILED", "MICROSOFT_SHAREPOINT_SITE_NOT_FOUND", "SHAREPOINT_SITE")); }
    const { body } = await this.request<GraphResponse>(`${GRAPH_BASE}/sites/${encodeURIComponent(siteId)}/drives`, {}, "SHAREPOINT_LIBRARY");
    if (!Array.isArray(body.value) || body.value.length > MAX_ITEMS) throw new MicrosoftFilesError(this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "FAILED", "MICROSOFT_SHAREPOINT_LIBRARY_NOT_FOUND", "SHAREPOINT_SITE"));
    let drives: DriveProjection[];
    try { drives = body.value.map((value) => { const drive = value as GraphDrive; return Object.freeze({ provider: "microsoft", accountKind: this.options.accountKind, driveId: requireString(drive.id, "drive id", 512), driveType: "DOCUMENT_LIBRARY", ...(typeof drive.name === "string" ? { displayName: drive.name.slice(0, MAX_NAME) } : {}), sourcePathClass: "SHAREPOINT_LIBRARY", sourceAttribution: "MICROSOFT_GRAPH" }) as DriveProjection; }); }
    catch { throw new MicrosoftFilesError(this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "FAILED", "MICROSOFT_SHAREPOINT_LIBRARY_NOT_FOUND", "SHAREPOINT_SITE")); }
    return { siteId, ...(typeof site.name === "string" ? { siteName: site.name.slice(0, MAX_NAME) } : {}), drives: Object.freeze(drives), diagnostic: this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "COMPLETED", this.options.accountKind === "PERSONAL_MICROSOFT_ACCOUNT" || this.options.accountKind === "GUEST_MICROSOFT_ACCOUNT" ? "MICROSOFT_SHAREPOINT_GUEST_SITE_AVAILABLE" : reasonFor("MICROSOFT_SHAREPOINT_READ", drives.length === 0 ? "empty" : "success"), "SHAREPOINT_SITE", { itemCountBounded: drives.length }) };
  }

  async runBoundedWriteValidation(input: BoundedWriteOptions): Promise<FileOperationReceipt> {
    if (input.explicitTestMode !== true || input.confirmed !== true || input.provider !== "microsoft") throw new Error("Microsoft Files writes require explicit test mode confirmation.");
    if (input.testFolderName !== TEST_FOLDER || !MicrosoftFilesAdapter.isBoundedTestArtifact(input.artifactName)) throw new Error("Microsoft Files write target is outside the bounded test boundary.");
    requireString(input.operationId, "operation id", 128); requireString(input.idempotencyKey, "idempotency key", 256); requireString(input.driveId, "drive id", 512); requireString(input.parentItemId, "parent id", 512);
    if (this.options.accountKind === "UNKNOWN_MICROSOFT_ACCOUNT") return Object.freeze({ operationId: input.operationId, idempotencyKey: boundedHash(input.idempotencyKey), createdItemIds: [], deletedItemIds: [], cleanupVerified: false, uncertainExternalEffect: false, replayDisposition: "REPLAY_BLOCKED", finalReasonCode: "MICROSOFT_ACCOUNT_CLASSIFICATION_FAILED" });
    const scopeHash = boundedHash(`${input.provider}|${this.options.accountKind}|${input.driveId}|${input.parentItemId}|${input.sourcePathClass}|${input.artifactName}`);
    const previous = operationRegistry.get(input.idempotencyKey);
    if (previous && previous.scopeHash !== scopeHash) return Object.freeze({ operationId: input.operationId, idempotencyKey: boundedHash(input.idempotencyKey), createdItemIds: [], deletedItemIds: [], cleanupVerified: false, uncertainExternalEffect: false, replayDisposition: "REPLAY_BLOCKED", finalReasonCode: "MICROSOFT_FILES_IDEMPOTENCY_SCOPE_MISMATCH" });
    if (previous?.state === "IN_PROGRESS") return Object.freeze({ operationId: input.operationId, idempotencyKey: boundedHash(input.idempotencyKey), createdItemIds: [], deletedItemIds: [], cleanupVerified: false, uncertainExternalEffect: false, replayDisposition: "IN_PROGRESS", finalReasonCode: "MICROSOFT_FILES_DUPLICATE_OPERATION_IN_PROGRESS" });
    if (previous?.state === "UNCERTAIN_EXTERNAL_EFFECT") return Object.freeze({ operationId: input.operationId, idempotencyKey: boundedHash(input.idempotencyKey), createdItemIds: [], deletedItemIds: [], cleanupVerified: false, uncertainExternalEffect: true, replayDisposition: "REPLAY_BLOCKED", finalReasonCode: "MICROSOFT_FILES_REPLAY_BLOCKED_UNCERTAIN_EFFECT" });
    if (previous?.state === "FAILED_CLEANUP_VERIFIED" && previous.receipt) return Object.freeze({ ...previous.receipt, replayDisposition: "REPLAY_BLOCKED", finalReasonCode: "MICROSOFT_FILES_OPERATION_ALREADY_COMPLETED" });
    if (previous?.state === "SUCCEEDED" && previous.receipt) return Object.freeze({ ...previous.receipt, replayDisposition: "ALREADY_COMPLETED" });
    operationRegistry.set(input.idempotencyKey, { scopeHash, state: "IN_PROGRESS" });
    while (operationRegistry.size > 100) operationRegistry.delete(operationRegistry.keys().next().value as string);
    const createdItemIds: string[] = [];
    const deletedItemIds: string[] = [];
    let uncertainExternalEffect = false;
    let testFolderId = "";
    let childFolderId = "";
    let artifactId = "";
    const requestTarget = input.sourcePathClass === "SHAREPOINT_LIBRARY" ? "SHAREPOINT_ITEM" : "ONEDRIVE_ITEM";
    try {
      const existing = await this.listChildren(input.driveId, input.parentItemId, input.sourcePathClass);
      const collision = existing.listing.items.find((item) => item.name === TEST_FOLDER);
      if (collision && collision.itemKind !== "FOLDER") throw new Error("Microsoft Files test folder name collides with a file.");
      if (collision) testFolderId = collision.itemId;
      else {
        const created = await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.parentItemId)}/children`, { method: "POST", body: JSON.stringify({ name: TEST_FOLDER, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) }, requestTarget);
        testFolderId = requireString(created.body.id, "created folder id", 512); createdItemIds.push(testFolderId);
      }
      const folderItems = await this.listChildren(input.driveId, testFolderId, input.sourcePathClass);
      if (folderItems.listing.items.some((item) => item.name === input.artifactName)) throw new Error("Microsoft Files synthetic artifact already exists.");
      const upload = await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(testFolderId)}:/${encodeURIComponent(input.artifactName)}:/content`, { method: "PUT", headers: { "content-type": "text/plain" }, body: "ONYX-NOVA bounded connector validation artifact" }, requestTarget);
      artifactId = requireString(upload.body.id, "uploaded artifact id", 512); createdItemIds.push(artifactId);
      await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(artifactId)}`, { method: "PATCH", body: JSON.stringify({ name: `${input.artifactName}.renamed` }) }, requestTarget);
      const child = await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(testFolderId)}/children`, { method: "POST", body: JSON.stringify({ name: `${TEST_FOLDER}-child`, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) }, requestTarget);
      childFolderId = requireString(child.body.id, "created child folder id", 512); createdItemIds.push(childFolderId);
      await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(artifactId)}`, { method: "PATCH", body: JSON.stringify({ parentReference: { id: childFolderId } }) }, requestTarget);
      await this.deleteOwnedAndVerify(input.driveId, artifactId, requestTarget);
      deletedItemIds.push(artifactId);
      await this.deleteOwnedAndVerify(input.driveId, childFolderId, requestTarget);
      deletedItemIds.push(childFolderId);
      if (createdItemIds.includes(testFolderId)) { await this.deleteOwnedAndVerify(input.driveId, testFolderId, requestTarget); deletedItemIds.push(testFolderId); }
      const receipt = Object.freeze({ operationId: input.operationId, idempotencyKey: boundedHash(input.idempotencyKey), createdItemIds: Object.freeze(createdItemIds), deletedItemIds: Object.freeze(deletedItemIds), cleanupVerified: true, uncertainExternalEffect, replayDisposition: "NEW_EXECUTION" as const, finalReasonCode: "MICROSOFT_FILES_CLEANUP_VERIFIED" as const });
      operationRegistry.set(input.idempotencyKey, { scopeHash, state: "SUCCEEDED", receipt });
      return receipt;
    } catch (error) {
      uncertainExternalEffect = error instanceof TypeError || /network|fetch|timeout/i.test(error instanceof Error ? error.message : "");
      let cleanupVerified = false;
      if (!uncertainExternalEffect) {
        try {
          for (const itemId of [artifactId, childFolderId, testFolderId].filter((itemId) => itemId && createdItemIds.includes(itemId) && !deletedItemIds.includes(itemId)).reverse()) {
            await this.deleteOwnedAndVerify(input.driveId, itemId, requestTarget);
            deletedItemIds.push(itemId);
          }
          cleanupVerified = true;
        } catch { cleanupVerified = false; }
      }
      const finalReasonCode = uncertainExternalEffect ? "MICROSOFT_FILES_UNCERTAIN_EXTERNAL_EFFECT" : cleanupVerified ? "MICROSOFT_FILES_CLEANUP_VERIFIED" : "MICROSOFT_FILES_CLEANUP_FAILED";
      const receipt = Object.freeze({ operationId: input.operationId, idempotencyKey: boundedHash(input.idempotencyKey), createdItemIds: Object.freeze(createdItemIds), deletedItemIds: Object.freeze(deletedItemIds), cleanupVerified, uncertainExternalEffect, replayDisposition: "NEW_EXECUTION" as const, finalReasonCode });
      operationRegistry.set(input.idempotencyKey, { scopeHash, state: uncertainExternalEffect ? "UNCERTAIN_EXTERNAL_EFFECT" : cleanupVerified ? "SUCCEEDED" : "FAILED_CLEANUP_VERIFIED", receipt });
      return receipt;
    }
  }

  private async mutate(url: string, init: RequestInit, target: RequestTarget = "ONEDRIVE_ITEM"): Promise<{ body: GraphResponse & { id?: unknown }; response: Response }> {
    return this.request<GraphResponse & { id?: unknown }>(url, init, target);
  }

  private async deleteOwnedAndVerify(driveId: string, itemId: string, target: RequestTarget = "ONEDRIVE_ITEM"): Promise<void> {
    await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`, { method: "DELETE" }, target);
    try { await this.request(`${GRAPH_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}`, {}, target); }
    catch (error) { if (error instanceof MicrosoftFilesError && error.diagnostic.httpStatus === 404) return; throw error; }
    throw new MicrosoftFilesError(this.diagnostic("MICROSOFT_ONEDRIVE_WRITE", "cleanupVerification", "FAILED", "MICROSOFT_FILES_CLEANUP_FAILED", "ONEDRIVE"));
  }

  static isBoundedTestArtifact(name: string): boolean { return name.startsWith(ARTIFACT_PREFIX) && name.length <= MAX_NAME; }
  static testFolderName = TEST_FOLDER;
  static artifactPrefix = ARTIFACT_PREFIX;
}

export type { FileOperationReceipt };
