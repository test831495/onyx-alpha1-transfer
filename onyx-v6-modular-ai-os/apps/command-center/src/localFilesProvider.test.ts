import { describe, expect, it } from "vitest";
import { convertersFor } from "./localFileConverters";
import { MAX_DIRECTORY_ITEMS, MAX_TEXT_PREVIEW_BYTES, projectLocalFile, readLocalDirectory, readTextPreview, supportedPreview, validateLocalSignature, writeToHandle } from "./localFilesProvider";

describe("Local Files provider", () => {
  it("projects truthful metadata and distinguishes writable handles", () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain", lastModified: 123 });
    const fallback = projectLocalFile(file, "FILE_INPUT");
    const handle = { createWritable: async () => ({ write: async () => undefined, close: async () => undefined }) } as never;
    const writable = projectLocalFile(file, "FILE_SYSTEM_HANDLE", handle);
    expect(fallback).toMatchObject({ sourceId: "local", extension: ".txt", size: 5, mimeType: "text/plain", originalSaveCapability: false, saveAsCapability: true, editCapability: true });
    expect(writable.originalSaveCapability).toBe(true);
    expect(JSON.stringify(fallback)).not.toContain("hello");
  });

  it("bounds text preview and does not guess binary content", async () => {
    const text = new File(["hello"], "note.txt", { type: "text/plain" });
    expect((await readTextPreview(text)).text).toBe("hello");
    const oversized = new File([new Uint8Array(MAX_TEXT_PREVIEW_BYTES + 1)], "large.txt", { type: "text/plain" });
    expect((await readTextPreview(oversized)).state).toBe("TOO_LARGE");
    expect(supportedPreview("application/octet-stream", ".bin")).toBe(false);
  });

  it("only advertises registered image conversions", () => {
    expect(convertersFor("image/png").map((converter) => converter.destinationMimeType)).toEqual(["image/png", "image/jpeg", "image/webp"]);
    expect(convertersFor("application/octet-stream")).toEqual([]);
  });

  it("requires permission and verifies the bounded original save", async () => {
    let contents = "hello";
    const file = new File([contents], "note.txt", { type: "text/plain", lastModified: 123 });
    const handle = { queryPermission: async () => "granted", createWritable: async () => ({ write: async (value: Blob | string) => { contents = typeof value === "string" ? value : await value.text(); }, close: async () => undefined }), getFile: async () => new File([contents], "note.txt", { type: "text/plain", lastModified: 123 }) } as never;
    await writeToHandle(handle, "updated", file);
    expect(contents).toBe("updated");
  });

  it("rejects parser-dependent files with invalid bounded signatures", async () => {
    const pdf = new File(["not a pdf"], "sample.pdf", { type: "application/pdf" });
    const projection = projectLocalFile(pdf, "FILE_INPUT");
    expect(await validateLocalSignature(pdf, { capabilityId: projection.viewerId! } as never)).toBe("INVALID");
  });

  it("lists only immediate authorized children with bounded folder-first ordering", async () => {
    const entries = Array.from({ length: MAX_DIRECTORY_ITEMS + 2 }, (_, index) => ({ name: `file-${index}.txt`, kind: "file" as const, getFile: async () => new File([String(index)], `file-${index}.txt`, { type: "text/plain" }) }));
    const directory = { name: "root", values: async function* () { yield { name: "child", kind: "directory" as const }; yield* entries; } };
    const result = await readLocalDirectory(directory);
    expect(result.items.length).toBe(MAX_DIRECTORY_ITEMS);
    expect(result.items[0]?.kind).toBe("directory");
    expect(result.stack).toEqual([]);
  });
});