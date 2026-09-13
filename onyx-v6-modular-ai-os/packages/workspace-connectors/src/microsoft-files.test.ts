import { describe, expect, it, vi } from "vitest";
import {
  MicrosoftFilesAdapter,
  MicrosoftFilesError,
  classifyMicrosoftAccount,
  normalizeMicrosoftFileItem,
  validateGraphNextLink,
} from "./microsoft-files";

const token = vi.fn().mockResolvedValue("opaque-test-token");
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function adapter(fetch: typeof globalThis.fetch) {
  return new MicrosoftFilesAdapter({ accessToken: token, fetch, accountKind: "ORGANIZATIONAL_MICROSOFT_ACCOUNT" });
}

describe("Microsoft Files account and URL boundaries", () => {
  it("classifies personal, organizational, guest and unknown accounts", () => {
    expect(classifyMicrosoftAccount({ accountType: "personal" })).toBe("PERSONAL_MICROSOFT_ACCOUNT");
    expect(classifyMicrosoftAccount({ tenantId: "tenant" })).toBe("ORGANIZATIONAL_MICROSOFT_ACCOUNT");
    expect(classifyMicrosoftAccount({ isGuest: true })).toBe("GUEST_MICROSOFT_ACCOUNT");
    expect(classifyMicrosoftAccount({})).toBe("UNKNOWN_MICROSOFT_ACCOUNT");
  });

  it("accepts only bounded Microsoft Graph continuation URLs", () => {
    expect(validateGraphNextLink("https://graph.microsoft.com/v1.0/me/drive/root/children?$skiptoken=x")).toContain("graph.microsoft.com");
    expect(() => validateGraphNextLink("https://evil.example/v1.0/me")).toThrow(/approved host/i);
    expect(() => validateGraphNextLink("not-a-url")).toThrow(/malformed/i);
  });

  it("rejects ambiguous or unsafe Graph item shapes", () => {
    expect(() => normalizeMicrosoftFileItem({ id: "1", name: "x", file: {}, folder: {} }, "ORGANIZATIONAL_MICROSOFT_ACCOUNT", "ONEDRIVE", "READ_WRITE")).toThrow(/unsupported/i);
    expect(() => normalizeMicrosoftFileItem({ id: "1", name: "x", parentReference: { driveId: "d" } }, "ORGANIZATIONAL_MICROSOFT_ACCOUNT", "ONEDRIVE", "READ_WRITE")).toThrow(/facet/i);
    expect(() => normalizeMicrosoftFileItem({ id: "1", name: "x", file: {}, parentReference: { driveId: "d" }, webUrl: "x".repeat(2049) }, "ORGANIZATIONAL_MICROSOFT_ACCOUNT", "ONEDRIVE", "READ_WRITE")).toThrow(/web URL/i);
  });
});

describe("Microsoft Files metadata reads", () => {
  it("normalizes personal and business OneDrive drives", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ id: "drive-1", driveType: "personal", name: "Personal" }));
    const result = await new MicrosoftFilesAdapter({ accessToken: token, fetch, accountKind: "PERSONAL_MICROSOFT_ACCOUNT" }).getOneDrive();
    expect(result.drive).toMatchObject({ driveId: "drive-1", driveType: "PERSONAL", accountKind: "PERSONAL_MICROSOFT_ACCOUNT" });
    expect(token).toHaveBeenCalledWith(["Files.ReadWrite"]);
  });

  it("normalizes bounded folder listings and continuation", async () => {
    const fetch = vi.fn().mockResolvedValue(response({ value: [{ id: "item-1", name: "notes.txt", parentReference: { id: "root", driveId: "drive-1" }, file: { mimeType: "text/plain", size: "12" } }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/drives/drive-1/items/root/children?$skiptoken=x" }));
    const result = await adapter(fetch).listChildren("drive-1", "root");
    expect(result.listing.items[0]).toMatchObject({ itemId: "item-1", itemKind: "FILE", size: 12 });
    expect(result.listing.continuationCursor).toMatch(/^mfc1\./);
    expect(result.diagnostic.paginationPresent).toBe(true);
  });

  it("returns a non-error not-applicable state for standalone personal SharePoint", async () => {
    const result = await new MicrosoftFilesAdapter({ accessToken: token, fetch: vi.fn(), accountKind: "PERSONAL_MICROSOFT_ACCOUNT" }).resolveSharePoint();
    expect(result.drives).toEqual([]);
    expect(result.diagnostic.finalReasonCode).toBe("MICROSOFT_SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT");
  });

  it("resolves only an explicitly supplied SharePoint site and libraries", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response({ id: "site-1", name: "Project X" }))
      .mockResolvedValueOnce(response({ value: [{ id: "library-1", name: "Documents" }] }));
    const result = await adapter(fetch).resolveSharePoint({ hostname: "tenant.sharepoint.com", sitePath: "/sites/example" });
    expect(result.siteId).toBe("site-1");
    expect(result.siteName).toBe("Project X");
    expect(result.drives[0]).toMatchObject({ driveId: "library-1", driveType: "DOCUMENT_LIBRARY" });
    expect(String(fetch.mock.calls[0]?.[0])).toContain("/sites/");
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("runs the synthetic lifecycle and returns a cleanup receipt", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response({ value: [] }))
      .mockResolvedValueOnce(response({ id: "folder-1" }, 201))
      .mockResolvedValueOnce(response({ value: [] }))
      .mockResolvedValueOnce(response({ id: "artifact-1" }, 201))
      .mockResolvedValueOnce(response({}, 200))
      .mockResolvedValueOnce(response({ id: "child-1" }, 201))
      .mockResolvedValueOnce(response({}, 200))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(response({}, 404))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(response({}, 404))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(response({}, 404));
    const filesAdapter = adapter(fetch);
    const request = {
      operationId: "operation-1",
      idempotencyKey: "idempotency-1",
      provider: "microsoft",
      driveId: "drive-1",
      parentItemId: "root",
      testFolderName: "ONYX-NOVA-Connector-Test",
      artifactName: "onyx-nova-connector-test-artifact.txt",
      consequencePreview: "Synthetic bounded test only.",
      explicitTestMode: true,
      confirmed: true,
      sourcePathClass: "ONEDRIVE",
    } as const;
    const result = await filesAdapter.runBoundedWriteValidation(request);
    expect(result.cleanupVerified).toBe(true);
    expect(result.uncertainExternalEffect).toBe(false);
    expect(result.deletedItemIds).toEqual(["artifact-1", "child-1", "folder-1"]);
    const callCount = fetch.mock.calls.length;
    const replay = await filesAdapter.runBoundedWriteValidation(request);
    expect(replay.replayDisposition).toBe("ALREADY_COMPLETED");
    expect(fetch.mock.calls).toHaveLength(callCount);
  });

  it("binds continuation cursors to account, drive, parent and resource", async () => {
    const firstFetch = vi.fn().mockResolvedValue(response({ value: [], "@odata.nextLink": "https://graph.microsoft.com/v1.0/drives/drive-1/items/root/children?$skiptoken=x" }));
    const first = await adapter(firstFetch).listChildren("drive-1", "root");
    const secondFetch = vi.fn();
    await expect(new MicrosoftFilesAdapter({ accessToken: token, fetch: secondFetch, accountKind: "PERSONAL_MICROSOFT_ACCOUNT" }).listChildren("drive-1", "root", "ONEDRIVE", first.listing.continuationCursor)).rejects.toMatchObject({ diagnostic: { finalReasonCode: "MICROSOFT_FILES_CURSOR_ACCOUNT_MISMATCH" } });
    expect(secondFetch).not.toHaveBeenCalled();
    await expect(adapter(secondFetch).listChildren("other-drive", "root", "ONEDRIVE", first.listing.continuationCursor)).rejects.toMatchObject({ diagnostic: { finalReasonCode: "MICROSOFT_FILES_CURSOR_DRIVE_MISMATCH" } });
    expect(secondFetch).not.toHaveBeenCalled();
  });

  it("returns structured HTTP failures without exposing tokens", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { code: "AccessDenied", message: "private detail" } }), { status: 403 }));
    await expect(adapter(fetch).getOneDrive()).rejects.toBeInstanceOf(MicrosoftFilesError);
    await expect(adapter(fetch).getOneDrive()).rejects.toMatchObject({ diagnostic: { httpStatus: 403, finalReasonCode: "MICROSOFT_ONEDRIVE_WRITE_FORBIDDEN" } });
  });

  it("blocks unknown accounts before Graph access and replays completed operations safely", async () => {
    const unknownFetch = vi.fn();
    const unknown = await new MicrosoftFilesAdapter({ accessToken: token, fetch: unknownFetch, accountKind: "UNKNOWN_MICROSOFT_ACCOUNT" }).runBoundedWriteValidation({ operationId: "unknown", idempotencyKey: "unknown-key", provider: "microsoft", driveId: "drive", parentItemId: "root", testFolderName: "ONYX-NOVA-Connector-Test", artifactName: "onyx-nova-connector-test-unknown.txt", consequencePreview: "bounded", explicitTestMode: true, confirmed: true, sourcePathClass: "ONEDRIVE" });
    expect(unknown.finalReasonCode).toBe("MICROSOFT_ACCOUNT_CLASSIFICATION_FAILED");
    expect(unknownFetch).not.toHaveBeenCalled();
  });
});
