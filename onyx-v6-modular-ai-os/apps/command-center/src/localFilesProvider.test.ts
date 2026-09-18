import { describe, expect, it } from "vitest";
import { convertersFor } from "./localFileConverters";
import { MAX_DIRECTORY_ITEMS, MAX_TEXT_PREVIEW_BYTES, buildFallbackDirectorySelection, captureInputFiles, detectLocalFileCapabilities, projectLocalFile, readLocalDirectory, readTextPreview, resolveLocalFileIdentity, selectLocalFileFromInput, supportedPreview, validateLocalSignature, writeToHandle } from "./localFilesProvider";

describe("Local Files provider", () => {
  it("projects truthful metadata and distinguishes writable handles", () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain", lastModified: 123 });
    const fallback = projectLocalFile(file, "FILE_INPUT");
    const handle = { createWritable: async () => ({ write: async () => undefined, close: async () => undefined }) } as never;
    const writable = projectLocalFile(file, "FILE_SYSTEM_HANDLE", handle);
    expect(projectLocalFile(file, "FILE_INPUT").selectionId).toBe(fallback.selectionId);
    expect(fallback.selectionId).toContain("local:");
    expect(fallback).toMatchObject({ sourceId: "local", extension: ".txt", size: 5, mimeType: "text/plain", originalSaveCapability: false, saveAsCapability: true, editCapability: true });
    expect(writable.originalSaveCapability).toBe(true);
    expect(JSON.stringify(fallback)).not.toContain("hello");
  });

  it("models the local file identity as a versioned, provider-neutral, metadata-only fingerprint with residual collision risk", () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain", lastModified: 123 });
    const duplicate = new File(["world"], "note.txt", { type: "text/plain", lastModified: 123 });
    const renamed = new File(["hello"], "other.txt", { type: "text/plain", lastModified: 123 });
    const resized = new File(["hello!"], "note.txt", { type: "text/plain", lastModified: 123 });
    const touched = new File(["hello"], "note.txt", { type: "text/plain", lastModified: 456 });
    const retyped = new File(["hello"], "note.txt", { type: "text/markdown", lastModified: 123 });

    const identity = resolveLocalFileIdentity(file);
    expect(identity).toMatchObject({ identityVersion: 1, identityStrength: "METADATA_FINGERPRINT", sourceProvider: "local", collisionPossible: true });
    expect(identity.fileId).not.toContain("hello");

    // Same facts produce the same ID; each independently changed fact produces a different ID.
    expect(resolveLocalFileIdentity(new File(["hello"], "note.txt", { type: "text/plain", lastModified: 123 })).fileId).toBe(identity.fileId);
    expect(resolveLocalFileIdentity(renamed).fileId).not.toBe(identity.fileId);
    expect(resolveLocalFileIdentity(resized).fileId).not.toBe(identity.fileId);
    expect(resolveLocalFileIdentity(touched).fileId).not.toBe(identity.fileId);
    expect(resolveLocalFileIdentity(retyped).fileId).not.toBe(identity.fileId);

    // Residual, documented collision: distinct files with identical metadata share an ID absent a stronger fact.
    expect(resolveLocalFileIdentity(duplicate).fileId).toBe(identity.fileId);
  });

  it("prefers a directory-relative identity over the metadata fingerprint when the browser supplies one", () => {
    const nested = new File(["content"], "note.txt", { type: "text/plain", lastModified: 123 });
    Object.defineProperty(nested, "webkitRelativePath", { value: "project/notes/note.txt" });
    const sibling = new File(["content"], "note.txt", { type: "text/plain", lastModified: 123 });
    Object.defineProperty(sibling, "webkitRelativePath", { value: "project/archive/note.txt" });
    const plain = new File(["content"], "note.txt", { type: "text/plain", lastModified: 123 });

    const nestedIdentity = resolveLocalFileIdentity(nested);
    const siblingIdentity = resolveLocalFileIdentity(sibling);
    expect(nestedIdentity.identityStrength).toBe("DIRECTORY_RELATIVE");
    expect(nestedIdentity.collisionPossible).toBe(false);
    // Metadata-identical files in different folders no longer collide once a relative path is available.
    expect(nestedIdentity.fileId).not.toBe(siblingIdentity.fileId);
    // A plain File selection (no relative path) still resolves to the pre-existing metadata fingerprint format.
    expect(resolveLocalFileIdentity(plain).fileId).toBe(resolveLocalFileIdentity(new File(["content"], "note.txt", { type: "text/plain", lastModified: 123 })).fileId);
  });

  it("keeps a fallback File as a first-class selection with empty MIME support", async () => {
    const file = new File(["hello"], "note.txt", { type: "" });
    const selection = await selectLocalFileFromInput(file);
    expect(selection.projection.selectionMechanism).toBe("FILE_INPUT");
    expect(selection.projection.mimeType).toBe("application/octet-stream");
    expect(selection.projection.originalSaveCapability).toBe(false);
    expect(selection.projection.saveAsCapability).toBe(true);
    expect(selection.file).toBe(file);
  });

  it("captures FileList entries before the input is cleared", () => {
    const file = new File(["hello"], "note.txt", { type: "text/plain" });
    const captured = captureInputFiles({ files: { 0: file, length: 1, item: (index: number) => index === 0 ? file : null } as unknown as FileList });
    expect(captured).toEqual([file]);
  });

  it("distinguishes handle and input capabilities instead of disabling all mobile folders", () => {
    const input = { type: "file", webkitdirectory: true } as unknown as HTMLInputElement;
    const capabilities = detectLocalFileCapabilities({
      showOpenFilePicker: undefined,
      showDirectoryPicker: undefined,
      createFileInput: () => input,
    });
    expect(capabilities.filePicker).toBe("FILE_INPUT_SUPPORTED");
    expect(capabilities.directoryPicker).toBe("DIRECTORY_INPUT_SUPPORTED");
  });

  it("reconstructs bounded nested fallback folders without absolute paths", () => {
    const files = [
      new File(["root"], "readme.txt", { type: "text/plain" }),
      new File(["nested"], "deep.txt", { type: "text/plain" }),
      new File(["deeper"], "leaf.txt", { type: "text/plain" }),
    ];
    Object.defineProperties(files[0], { webkitRelativePath: { value: "project/readme.txt" } });
    Object.defineProperties(files[1], { webkitRelativePath: { value: "project/one/deep.txt" } });
    Object.defineProperties(files[2], { webkitRelativePath: { value: "project/one/two/leaf.txt" } });
    const root = buildFallbackDirectorySelection(files);
    expect(root.name).toBe("project");
    expect(root.items.map((item) => item.name)).toEqual(["one", "readme.txt"]);
    expect(root.items[0]?.fallbackNodeId).toBeDefined();
    expect(root.items[0]?.kind).toBe("directory");
    expect(root.items.some((item) => item.name.includes("/") || item.name.includes("\\"))).toBe(false);
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