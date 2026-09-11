export const GOOGLE_CAPABILITIES = [
  "calendar.events.read",
  "mail.messages.read",
  "files.metadata.read",
] as const;

export type GoogleCapability = (typeof GOOGLE_CAPABILITIES)[number];

export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
] as const;

export type GoogleCapabilityState =
  | "connected"
  | "insufficient-scope"
  | "reauthentication-required"
  | "unavailable";

export type GoogleConnectionState =
  | "not-connected"
  | "connected"
  | "connected-partial"
  | "connected-empty"
  | "reauthentication-required"
  | "unavailable"
  | "error-safe";

export interface GoogleConnectionSnapshot {
  readonly accountReference?: string;
  readonly state: GoogleConnectionState;
  readonly capabilities: Readonly<Record<GoogleCapability, GoogleCapabilityState>>;
}

export function createGoogleConnectionSnapshot(input: {
  readonly accountReference?: string;
  readonly grantedCapabilities: readonly GoogleCapability[];
  readonly reauthenticationRequired?: boolean;
  readonly unavailable?: boolean;
}): GoogleConnectionSnapshot {
  const granted = new Set(input.grantedCapabilities);
  const capabilities = Object.fromEntries(
    GOOGLE_CAPABILITIES.map((capability) => [
      capability,
      input.unavailable
        ? "unavailable"
        : input.reauthenticationRequired
          ? "reauthentication-required"
          : granted.has(capability)
            ? "connected"
            : "insufficient-scope",
    ]),
  ) as Record<GoogleCapability, GoogleCapabilityState>;
  const connectedCount = GOOGLE_CAPABILITIES.filter((capability) => granted.has(capability)).length;

  let state: GoogleConnectionState;
  if (!input.accountReference) state = "not-connected";
  else if (input.unavailable) state = "unavailable";
  else if (input.reauthenticationRequired) state = "reauthentication-required";
  else if (connectedCount === GOOGLE_CAPABILITIES.length) state = "connected";
  else if (connectedCount > 0) state = "connected-partial";
  else state = "connected-empty";

  return { accountReference: input.accountReference, state, capabilities };
}

export interface CalendarQuery {
  readonly startInclusive: string;
  readonly endExclusive: string;
  readonly text?: string;
  readonly participant?: string;
  readonly status?: "confirmed" | "tentative" | "cancelled";
  readonly maximumResults?: number;
  readonly continuation?: string;
}

export interface MailQuery {
  readonly startInclusive?: string;
  readonly endExclusive?: string;
  readonly sender?: string;
  readonly text?: string;
  readonly labels?: readonly string[];
  readonly unreadOnly?: boolean;
  readonly maximumResults?: number;
  readonly continuation?: string;
}

export interface FileQuery {
  readonly parentReference?: string;
  readonly text?: string;
  readonly mimeTypes?: readonly string[];
  readonly modifiedStartInclusive?: string;
  readonly modifiedEndExclusive?: string;
  readonly createdStartInclusive?: string;
  readonly createdEndExclusive?: string;
  readonly starred?: boolean;
  readonly sharedWithMe?: boolean;
  readonly maximumResults?: number;
  readonly continuation?: string;
}

export interface CalendarEventProjection {
  readonly id: string;
  readonly subject: string;
  readonly description?: string;
  readonly start: string;
  readonly end: string;
  readonly allDay: boolean;
  readonly timeZone?: string;
  readonly location?: string;
  readonly participants?: readonly string[];
  readonly organizer?: string;
  readonly recurrenceId?: string;
  readonly status?: string;
  readonly sourceProvider: "google";
}

export interface MailMessageProjection {
  readonly id: string;
  readonly threadId?: string;
  readonly subject?: string;
  readonly sender?: string;
  readonly receivedAt?: string;
  readonly labels: readonly string[];
  readonly snippet?: string;
  readonly sourceProvider: "google";
}

export interface FileMetadataProjection {
  readonly id: string;
  readonly name: string;
  readonly mimeType?: string;
  readonly isFolder: boolean;
  readonly parentReferences: readonly string[];
  readonly createdAt?: string;
  readonly modifiedAt?: string;
  readonly size?: number;
  readonly starred?: boolean;
  readonly trashed: false;
  readonly webViewLink?: string;
  readonly sourceProvider: "google";
}

type GoogleCalendarEvent = {
  id?: unknown;
  summary?: unknown;
  description?: unknown;
  start?: { date?: unknown; dateTime?: unknown; timeZone?: unknown };
  end?: { date?: unknown; dateTime?: unknown; timeZone?: unknown };
  location?: unknown;
  attendees?: readonly { email?: unknown; displayName?: unknown }[];
  organizer?: { email?: unknown; displayName?: unknown };
  recurringEventId?: unknown;
  status?: unknown;
};

export function normalizeGoogleCalendarEvent(event: GoogleCalendarEvent): CalendarEventProjection {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  if (typeof event.id !== "string" || typeof start !== "string" || typeof end !== "string") {
    throw new Error("Google Calendar event is malformed.");
  }
  return {
    id: event.id,
    subject: typeof event.summary === "string" ? event.summary : "(untitled event)",
    ...(typeof event.description === "string" ? { description: event.description } : {}),
    start,
    end,
    allDay: typeof event.start?.date === "string" && typeof event.start?.dateTime !== "string",
    ...(typeof event.start?.timeZone === "string" ? { timeZone: event.start.timeZone } : {}),
    ...(typeof event.location === "string" ? { location: event.location } : {}),
    ...(event.attendees ? { participants: event.attendees.flatMap((attendee) => [attendee.email, attendee.displayName].filter((value): value is string => typeof value === "string")) } : {}),
    ...(event.organizer && typeof (event.organizer.email ?? event.organizer.displayName) === "string" ? { organizer: String(event.organizer.email ?? event.organizer.displayName) } : {}),
    ...(typeof event.recurringEventId === "string" ? { recurrenceId: event.recurringEventId } : {}),
    ...(typeof event.status === "string" ? { status: event.status } : {}),
    sourceProvider: "google",
  };
}

type GoogleGmailMessage = {
  id?: unknown;
  threadId?: unknown;
  internalDate?: unknown;
  payload?: { headers?: readonly { name?: unknown; value?: unknown }[] };
  snippet?: unknown;
  labelIds?: readonly unknown[];
};

export function normalizeGmailMessage(message: GoogleGmailMessage): MailMessageProjection {
  if (typeof message.id !== "string") throw new Error("Gmail message is malformed.");
  const headers = message.payload?.headers ?? [];
  const header = (name: string) => headers.find((item) => item.name?.toString().toLowerCase() === name)?.value;
  const received = typeof message.internalDate === "string" ? Number(message.internalDate) : NaN;
  return {
    id: message.id,
    ...(typeof message.threadId === "string" ? { threadId: message.threadId } : {}),
    ...(typeof header("subject") === "string" ? { subject: header("subject") as string } : {}),
    ...(typeof header("from") === "string" ? { sender: header("from") as string } : {}),
    ...(Number.isFinite(received) ? { receivedAt: new Date(received).toISOString() } : {}),
    labels: (message.labelIds ?? []).filter((label): label is string => typeof label === "string"),
    ...(typeof message.snippet === "string" ? { snippet: message.snippet.slice(0, 2_000) } : {}),
    sourceProvider: "google",
  };
}

type GoogleDriveFile = {
  id?: unknown;
  name?: unknown;
  mimeType?: unknown;
  parents?: readonly unknown[];
  createdTime?: unknown;
  modifiedTime?: unknown;
  size?: unknown;
  starred?: unknown;
  trashed?: unknown;
  webViewLink?: unknown;
};

export function normalizeGoogleDriveFile(file: GoogleDriveFile): FileMetadataProjection {
  if (typeof file.id !== "string" || typeof file.name !== "string" || file.trashed === true) {
    throw new Error("Google Drive file is malformed or trashed.");
  }
  return {
    id: file.id,
    name: file.name,
    ...(typeof file.mimeType === "string" ? { mimeType: file.mimeType } : {}),
    isFolder: file.mimeType === "application/vnd.google-apps.folder",
    parentReferences: (file.parents ?? []).filter((parent): parent is string => typeof parent === "string"),
    ...(typeof file.createdTime === "string" ? { createdAt: file.createdTime } : {}),
    ...(typeof file.modifiedTime === "string" ? { modifiedAt: file.modifiedTime } : {}),
    ...(typeof file.size === "string" && /^\d+$/.test(file.size) ? { size: Number(file.size) } : {}),
    ...(typeof file.starred === "boolean" ? { starred: file.starred } : {}),
    trashed: false,
    ...(typeof file.webViewLink === "string" ? { webViewLink: file.webViewLink } : {}),
    sourceProvider: "google",
  };
}

export type GoogleProviderErrorCode =
  | "UNAUTHORIZED"
  | "INSUFFICIENT_SCOPE"
  | "RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "MALFORMED_RESPONSE"
  | "NETWORK_ERROR";

export class GoogleProviderError extends Error {
  constructor(readonly code: GoogleProviderErrorCode, message: string) {
    super(message);
    this.name = "GoogleProviderError";
  }
}

interface GoogleListResponse<T> {
  readonly items?: readonly T[];
  readonly nextPageToken?: unknown;
}

export interface GoogleReadAdapter {
  listCalendar(query: CalendarQuery): Promise<{ items: readonly CalendarEventProjection[]; continuation?: string }>;
  listMail(query: MailQuery): Promise<{ items: readonly MailMessageProjection[]; continuation?: string }>;
  listFiles(query: FileQuery): Promise<{ items: readonly FileMetadataProjection[]; continuation?: string }>;
}

export function createGoogleReadAdapter(input: {
  readonly accessToken: () => Promise<string>;
  readonly fetch: typeof globalThis.fetch;
  readonly maxPages?: number;
  readonly maxItems?: number;
}): GoogleReadAdapter {
  const maxPages = Math.max(1, Math.min(input.maxPages ?? 5, 10));
  const maxItems = Math.max(1, Math.min(input.maxItems ?? 100, 500));
  const queryLimit = (value: number | undefined): number => {
    if (value === undefined) return maxItems;
    if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > maxItems) throw new GoogleProviderError("MALFORMED_RESPONSE", "Google result limit is invalid.");
    return value;
  };
  const driveLiteral = (value: string): string => value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");

  async function request<T>(url: URL): Promise<GoogleListResponse<T>> {
    let response: Response;
    try {
      response = await input.fetch(url, {
        method: "GET",
        headers: { accept: "application/json", authorization: `Bearer ${await input.accessToken()}` },
      });
    } catch {
      throw new GoogleProviderError("NETWORK_ERROR", "Google is temporarily unavailable.");
    }
    if (response.status === 401) throw new GoogleProviderError("UNAUTHORIZED", "Google authorization must be renewed.");
    if (response.status === 403) throw new GoogleProviderError("INSUFFICIENT_SCOPE", "Google access is insufficient for this read operation.");
    if (response.status === 429) throw new GoogleProviderError("RATE_LIMITED", "Google is rate limiting requests.");
    if (response.status >= 500) throw new GoogleProviderError("UPSTREAM_UNAVAILABLE", "Google is temporarily unavailable.");
    if (!response.ok) throw new GoogleProviderError("MALFORMED_RESPONSE", "Google rejected the read request.");
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new GoogleProviderError("MALFORMED_RESPONSE", "Google returned an invalid response.");
    }
    if (!body || typeof body !== "object") throw new GoogleProviderError("MALFORMED_RESPONSE", "Google returned an invalid response.");
    const candidate = body as GoogleListResponse<T>;
    if (candidate.items !== undefined && !Array.isArray(candidate.items)) {
      throw new GoogleProviderError("MALFORMED_RESPONSE", "Google returned an invalid item list.");
    }
    return candidate;
  }

  async function collect<T, U>(
    baseUrl: URL,
    normalize: (value: T) => U,
    continuation?: string,
    aggregateLimit = maxItems,
    accept: (value: U) => boolean = () => true,
  ): Promise<{ items: readonly U[]; continuation?: string }> {
    const items: U[] = [];
    let scanned = 0;
    let pageToken = continuation;
    const seenTokens = new Set<string>();
    for (let page = 0; page < maxPages && items.length < aggregateLimit && scanned < maxItems; page += 1) {
      const url = new URL(baseUrl);
      if (pageToken) {
        if (seenTokens.has(pageToken)) throw new GoogleProviderError("MALFORMED_RESPONSE", "Google returned a repeated continuation token.");
        if (pageToken.length > 2_000) throw new GoogleProviderError("MALFORMED_RESPONSE", "Google returned an oversized continuation token.");
        seenTokens.add(pageToken);
        url.searchParams.set("pageToken", pageToken);
      }
      const response = await request<T>(url);
      for (const item of response.items ?? []) {
        if (scanned >= maxItems || items.length >= aggregateLimit) break;
        scanned += 1;
        const normalized = normalize(item);
        if (accept(normalized)) items.push(normalized);
      }
      pageToken = typeof response.nextPageToken === "string" ? response.nextPageToken : undefined;
      if (!pageToken) return { items };
    }
    return { items, ...(pageToken ? { continuation: pageToken } : {}) };
  }

  return {
    listCalendar: async (query) => {
      const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
      url.searchParams.set("timeMin", query.startInclusive);
      url.searchParams.set("timeMax", query.endExclusive);
      url.searchParams.set("singleEvents", "true");
      url.searchParams.set("orderBy", "startTime");
      url.searchParams.set("showDeleted", query.status === "cancelled" ? "true" : "false");
      if (query.text) url.searchParams.set("q", query.text);
      const limit = queryLimit(query.maximumResults);
      url.searchParams.set("maxResults", String(limit));
      const participant = query.participant?.trim().toLowerCase();
      return collect(url, normalizeGoogleCalendarEvent, query.continuation, limit, (event) => {
        const statusMatches = query.status === undefined || event.status === query.status;
        const participantMatches = !participant || [...(event.participants ?? []), event.organizer ?? ""].some((value) => value.toLowerCase().includes(participant));
        return statusMatches && participantMatches;
      });
    },
    listMail: async (query) => {
      const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
      const terms = [
        query.sender ? `from:${query.sender}` : undefined,
        query.text,
        query.unreadOnly ? "is:unread" : undefined,
        ...(query.labels ?? []).map((label) => `label:${label}`),
        query.startInclusive ? `after:${query.startInclusive.slice(0, 10).replaceAll("-", "/")}` : undefined,
        query.endExclusive ? `before:${query.endExclusive.slice(0, 10).replaceAll("-", "/")}` : undefined,
      ].filter((term): term is string => Boolean(term));
      if (terms.length) url.searchParams.set("q", terms.join(" "));
      const limit = queryLimit(query.maximumResults);
      url.searchParams.set("maxResults", String(limit));
      return collect(url, normalizeGmailMessage, query.continuation, limit);
    },
    listFiles: async (query) => {
      const url = new URL("https://www.googleapis.com/drive/v3/files");
      const clauses = ["trashed = false"];
      if (query.parentReference) clauses.push(`'${driveLiteral(query.parentReference)}' in parents`);
      if (query.text) clauses.push(`name contains '${driveLiteral(query.text)}'`);
      if (query.mimeTypes?.length) clauses.push(`(${query.mimeTypes.map((mime) => `mimeType = '${driveLiteral(mime)}'`).join(" or ")})`);
      if (query.modifiedStartInclusive) clauses.push(`modifiedTime >= '${query.modifiedStartInclusive}'`);
      if (query.modifiedEndExclusive) clauses.push(`modifiedTime < '${query.modifiedEndExclusive}'`);
      if (query.createdStartInclusive) clauses.push(`createdTime >= '${query.createdStartInclusive}'`);
      if (query.createdEndExclusive) clauses.push(`createdTime < '${query.createdEndExclusive}'`);
      if (query.starred !== undefined) clauses.push(`starred = ${query.starred}`);
      if (query.sharedWithMe !== undefined) clauses.push(`sharedWithMe = ${query.sharedWithMe}`);
      url.searchParams.set("q", clauses.join(" and "));
      url.searchParams.set("fields", "nextPageToken,files(id,name,mimeType,parents,createdTime,modifiedTime,size,starred,trashed,webViewLink)");
      const limit = queryLimit(query.maximumResults);
      url.searchParams.set("pageSize", String(limit));
      return collect(url, normalizeGoogleDriveFile, query.continuation, limit);
    },
  };
}