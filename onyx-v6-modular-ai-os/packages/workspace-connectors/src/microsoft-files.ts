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
} from "@onyx/workspace-contracts";

const GRAPH_ORIGIN = "https://graph.microsoft.com";
const GRAPH_BASE = `${GRAPH_ORIGIN}/v1.0`;
const FILES_SCOPE = "Files.ReadWrite";
const TEST_FOLDER = "ONYX-NOVA-Connector-Test";
const ARTIFACT_PREFIX = "onyx-nova-connector-test-";
const MAX_PAGE_SIZE = 200;
const MAX_ITEMS = 200;
const MAX_NAME = 256;

type GraphItem = { id?: unknown; name?: unknown; parentReference?: { id?: unknown; driveId?: unknown }; file?: { mimeType?: unknown; size?: unknown }; folder?: Record<string, unknown>; createdDateTime?: unknown; lastModifiedDateTime?: unknown; webUrl?: unknown; remoteItem?: unknown };
type GraphDrive = { id?: unknown; driveType?: unknown; name?: unknown };
type GraphResponse = { value?: unknown; "@odata.nextLink"?: unknown };

export type MicrosoftAccountClassification = FileAccountKind;
export type MicrosoftFilesCapabilityState = "ONEDRIVE_READ_WRITE_GRANTED" | "ONEDRIVE_CONSENT_REQUIRED" | "SHAREPOINT_READ_WRITE_GRANTED" | "SHAREPOINT_CONSENT_REQUIRED" | "SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT" | "SHAREPOINT_GUEST_SITE_AVAILABLE" | "SHAREPOINT_NO_ACCESSIBLE_SITE" | "SHAREPOINT_ORGANIZATIONAL_POLICY_BLOCKED";

export function classifyMicrosoftAccount(input: { tenantId?: unknown; accountType?: unknown; isGuest?: unknown }): MicrosoftAccountClassification {
  if (input.isGuest === true) return "GUEST_MICROSOFT_ACCOUNT";
  if (typeof input.accountType === "string") {
    const type = input.accountType.toLowerCase();
    if (type.includes("personal") || type === "msa") return "PERSONAL_MICROSOFT_ACCOUNT";
    if (type.includes("organizational") || type === "work" || type === "school") return "ORGANIZATIONAL_MICROSOFT_ACCOUNT";
  }
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

export class MicrosoftFilesAdapter {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly maxItems: number;
  constructor(private readonly options: MicrosoftFilesAdapterOptions) {
    this.fetcher = options.fetch ?? globalThis.fetch;
    this.maxItems = Math.min(Math.max(options.maxItems ?? 50, 1), MAX_ITEMS);
  }

  private async request<T extends GraphResponse>(url: string, init: RequestInit = {}): Promise<{ body: T; response: Response }> {
    const parsed = new URL(url);
    if (parsed.origin !== GRAPH_ORIGIN || parsed.protocol !== "https:") throw new Error("Microsoft Graph request target is invalid.");
    const token = await this.options.accessToken([FILES_SCOPE]);
    if (!token) throw new Error("Microsoft Files access token is unavailable.");
    const response = await this.fetcher(parsed, { ...init, headers: { accept: "application/json", ...(init.body ? { "content-type": "application/json" } : {}), ...(init.headers ?? {}), Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const code = response.status === 401 ? "authorization" : response.status === 403 ? "forbidden" : response.status === 404 ? "not found" : response.status === 429 ? "rate limited" : "bounded";
      throw new Error(`Microsoft Files request failed (${code}).`);
    }
    let body: unknown = {};
    if (response.status !== 204) {
      try { body = await response.json(); } catch { throw new Error("Microsoft Files response is malformed."); }
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Microsoft Files response is malformed.");
    return { body: body as T, response };
  }

  private diagnostic(capability: FileCapability, operation: string, stage: FileDiagnosticEnvelope["stage"], reason: FileDiagnosticReasonCode, targetClass: FileDiagnosticEnvelope["targetClass"], extra: Partial<FileDiagnosticEnvelope> = {}): FileDiagnosticEnvelope {
    return Object.freeze({ capability, operation, stage, accountKind: this.options.accountKind, requestedScopes: ["User.Read", FILES_SCOPE], targetClass, retryAttempted: false, uncertainExternalEffect: false, finalReasonCode: reason, ...extra });
  }

  async getOneDrive(): Promise<{ drive: DriveProjection; diagnostic: FileDiagnosticEnvelope }> {
    const { body } = await this.request<GraphResponse & GraphDrive>(`${GRAPH_BASE}/me/drive`);
    const driveId = requireString(body.id, "drive id", 512);
    const driveType = body.driveType === "personal" ? "PERSONAL" : body.driveType === "business" ? "BUSINESS" : "UNKNOWN";
    const drive = Object.freeze({ provider: "microsoft", accountKind: this.options.accountKind, driveId, driveType, ...(typeof body.name === "string" ? { displayName: body.name.slice(0, MAX_NAME) } : {}), sourcePathClass: "ONEDRIVE", sourceAttribution: "MICROSOFT_GRAPH" }) as DriveProjection;
    return { drive, diagnostic: this.diagnostic("MICROSOFT_ONEDRIVE_READ", "getOneDrive", "COMPLETED", "MICROSOFT_ONEDRIVE_SUCCEEDED", "ONEDRIVE") };
  }

  async listChildren(driveId: string, itemId: string, sourcePathClass: "ONEDRIVE" | "SHAREPOINT_LIBRARY" = "ONEDRIVE", continuation?: string): Promise<{ listing: FolderListingProjection; diagnostic: FileDiagnosticEnvelope }> {
    requireString(driveId, "drive id", 512); requireString(itemId, "item id", 512);
    const url = continuation ? validateGraphNextLink(continuation) : `${GRAPH_BASE}/drives/${encodeURIComponent(driveId)}/items/${encodeURIComponent(itemId)}/children?$top=${this.maxItems}`;
    const { body } = await this.request<GraphResponse>(url!);
    if (!Array.isArray(body.value) || body.value.length > MAX_ITEMS) throw new Error("Microsoft Files item collection is malformed.");
    const parent: FileItemProjection = Object.freeze({ provider: "microsoft", accountKind: this.options.accountKind, driveId, itemId, name: itemId === "root" ? "Root" : "Folder", itemKind: "FOLDER", sourcePathClass, writeCapability: "READ_WRITE", sourceAttribution: "MICROSOFT_GRAPH" });
    const items = body.value.map((item) => normalizeMicrosoftFileItem(item as GraphItem, this.options.accountKind, sourcePathClass, "READ_WRITE")).slice(0, this.maxItems);
    const next = validateGraphNextLink(body["@odata.nextLink"]);
    const capability = sourcePathClass === "ONEDRIVE" ? "MICROSOFT_ONEDRIVE_READ" : "MICROSOFT_SHAREPOINT_READ";
    const reason = reasonFor(capability, items.length === 0 ? "empty" : "success");
    return { listing: Object.freeze({ parent, items: Object.freeze(items), itemCount: items.length, ...(next ? { continuationCursor: next } : {}), truncated: Boolean(next), sourceAttribution: "MICROSOFT_GRAPH", freshness: "LIVE", diagnosticReference: `${capability}:${itemId}` }), diagnostic: this.diagnostic(capability, "listChildren", "COMPLETED", reason, sourcePathClass === "ONEDRIVE" ? "ONEDRIVE" : "SHAREPOINT_LIBRARY", { itemCountBounded: items.length, paginationPresent: Boolean(next) }) };
  }

  async resolveSharePoint(target: SharePointTarget): Promise<SharePointResolution> {
    if (this.options.accountKind === "PERSONAL_MICROSOFT_ACCOUNT") return { siteId: "", drives: [], diagnostic: this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "COMPLETED", "MICROSOFT_SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT", "SHAREPOINT_SITE") };
    if (!/^[a-z0-9.-]+$/i.test(target.hostname) || !target.sitePath.startsWith("/")) throw new Error("SharePoint target is malformed.");
    const siteUrl = `${GRAPH_BASE}/sites/${encodeURIComponent(target.hostname)}:${target.sitePath}`;
    const { body: site } = await this.request<GraphResponse & { id?: unknown; name?: unknown }>(siteUrl);
    const siteId = requireString(site.id, "site id", 512);
    const { body } = await this.request<GraphResponse>(`${GRAPH_BASE}/sites/${encodeURIComponent(siteId)}/drives`);
    if (!Array.isArray(body.value) || body.value.length > MAX_ITEMS) throw new Error("SharePoint library collection is malformed.");
    const drives = body.value.map((value) => { const drive = value as GraphDrive; return Object.freeze({ provider: "microsoft", accountKind: this.options.accountKind, driveId: requireString(drive.id, "drive id", 512), driveType: "DOCUMENT_LIBRARY", ...(typeof drive.name === "string" ? { displayName: drive.name.slice(0, MAX_NAME) } : {}), sourcePathClass: "SHAREPOINT_LIBRARY", sourceAttribution: "MICROSOFT_GRAPH" }) as DriveProjection; });
    return { siteId, ...(typeof site.name === "string" ? { siteName: site.name.slice(0, MAX_NAME) } : {}), drives: Object.freeze(drives), diagnostic: this.diagnostic("MICROSOFT_SHAREPOINT_READ", "resolveSharePoint", "COMPLETED", this.options.accountKind === "GUEST_MICROSOFT_ACCOUNT" ? "MICROSOFT_SHAREPOINT_GUEST_SITE_AVAILABLE" : reasonFor("MICROSOFT_SHAREPOINT_READ", drives.length === 0 ? "empty" : "success"), "SHAREPOINT_SITE", { itemCountBounded: drives.length }) };
  }

  async runBoundedWriteValidation(input: BoundedWriteOptions): Promise<FileOperationReceipt> {
    if (input.explicitTestMode !== true || input.confirmed !== true || input.provider !== "microsoft") throw new Error("Microsoft Files writes require explicit test mode confirmation.");
    if (input.testFolderName !== TEST_FOLDER || !MicrosoftFilesAdapter.isBoundedTestArtifact(input.artifactName)) throw new Error("Microsoft Files write target is outside the bounded test boundary.");
    requireString(input.operationId, "operation id", 128); requireString(input.idempotencyKey, "idempotency key", 256); requireString(input.driveId, "drive id", 512); requireString(input.parentItemId, "parent id", 512);
    const createdItemIds: string[] = [];
    const deletedItemIds: string[] = [];
    let uncertainExternalEffect = false;
    let testFolderId = "";
    let childFolderId = "";
    let artifactId = "";
    try {
      const existing = await this.listChildren(input.driveId, input.parentItemId, input.sourcePathClass);
      const collision = existing.listing.items.find((item) => item.name === TEST_FOLDER);
      if (collision && collision.itemKind !== "FOLDER") throw new Error("Microsoft Files test folder name collides with a file.");
      if (collision) testFolderId = collision.itemId;
      else {
        const created = await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(input.parentItemId)}/children`, { method: "POST", body: JSON.stringify({ name: TEST_FOLDER, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) });
        testFolderId = requireString(created.body.id, "created folder id", 512); createdItemIds.push(testFolderId);
      }
      const folderItems = await this.listChildren(input.driveId, testFolderId, input.sourcePathClass);
      if (folderItems.listing.items.some((item) => item.name === input.artifactName)) throw new Error("Microsoft Files synthetic artifact already exists.");
      const upload = await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(testFolderId)}:/${encodeURIComponent(input.artifactName)}:/content`, { method: "PUT", headers: { "content-type": "text/plain" }, body: "ONYX-NOVA bounded connector validation artifact" });
      artifactId = requireString(upload.body.id, "uploaded artifact id", 512); createdItemIds.push(artifactId);
      await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(artifactId)}`, { method: "PATCH", body: JSON.stringify({ name: `${input.artifactName}.renamed` }) });
      const child = await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(testFolderId)}/children`, { method: "POST", body: JSON.stringify({ name: `${TEST_FOLDER}-child`, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) });
      childFolderId = requireString(child.body.id, "created child folder id", 512); createdItemIds.push(childFolderId);
      await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(artifactId)}`, { method: "PATCH", body: JSON.stringify({ parentReference: { id: childFolderId } }) });
      await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(artifactId)}`, { method: "DELETE" });
      deletedItemIds.push(artifactId);
      await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(childFolderId)}`, { method: "DELETE" });
      deletedItemIds.push(childFolderId);
      if (createdItemIds.includes(testFolderId)) { await this.mutate(`${GRAPH_BASE}/drives/${encodeURIComponent(input.driveId)}/items/${encodeURIComponent(testFolderId)}`, { method: "DELETE" }); deletedItemIds.push(testFolderId); }
      return Object.freeze({ operationId: input.operationId, idempotencyKey: input.idempotencyKey, createdItemIds: Object.freeze(createdItemIds), deletedItemIds: Object.freeze(deletedItemIds), cleanupVerified: true, uncertainExternalEffect });
    } catch (error) {
      uncertainExternalEffect = error instanceof TypeError || /network|fetch|timeout/i.test(error instanceof Error ? error.message : "");
      return Object.freeze({ operationId: input.operationId, idempotencyKey: input.idempotencyKey, createdItemIds: Object.freeze(createdItemIds), deletedItemIds: Object.freeze(deletedItemIds), cleanupVerified: false, uncertainExternalEffect });
    }
  }

  private async mutate(url: string, init: RequestInit): Promise<{ body: GraphResponse & { id?: unknown }; response: Response }> {
    return this.request<GraphResponse & { id?: unknown }>(url, init);
  }

  static isBoundedTestArtifact(name: string): boolean { return name.startsWith(ARTIFACT_PREFIX) && name.length <= MAX_NAME; }
  static testFolderName = TEST_FOLDER;
  static artifactPrefix = ARTIFACT_PREFIX;
}

export type { FileOperationReceipt };
