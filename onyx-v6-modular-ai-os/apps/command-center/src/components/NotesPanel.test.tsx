/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotesPanel } from "./NotesPanel";
import { notesRepository } from "../notesRepository";

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    length: 0,
  } as unknown as Storage;
}

function makeIndexedDb() {
  const stores = new Map<string, Map<string, unknown>>();
  const databases = new Map<string, any>();
  const getStoreImpl = (dbName: string, storeName: string) => ({
    put: (value: any) => {
      const store = stores.get(`${dbName}:${storeName}`) ?? new Map<string, unknown>();
      stores.set(`${dbName}:${storeName}`, store);
      store.set(value.id, value);
      const request: any = { result: value, error: undefined, onsuccess: undefined, onerror: undefined };
      queueMicrotask(() => request.onsuccess?.call(request));
      return request;
    },
    get: (key: string) => {
      const store = stores.get(`${dbName}:${storeName}`) ?? new Map<string, unknown>();
      const request: any = { result: store.get(key), error: undefined, onsuccess: undefined, onerror: undefined };
      queueMicrotask(() => request.onsuccess?.call(request));
      return request;
    },
    delete: (key: string) => {
      const store = stores.get(`${dbName}:${storeName}`) ?? new Map<string, unknown>();
      const existed = store.delete(key);
      const request: any = { result: existed, error: undefined, onsuccess: undefined, onerror: undefined };
      queueMicrotask(() => request.onsuccess?.call(request));
      return request;
    },
  });
  return {
    open: (databaseName: string, version: number) => {
      const request: any = { result: undefined, error: undefined, onupgradeneeded: undefined, onsuccess: undefined, onerror: undefined };
      queueMicrotask(() => {
        const existing = databases.get(databaseName);
        const database = existing ?? {
          name: databaseName,
          version,
          objectStoreNames: { contains: (storeName: string) => stores.has(`${databaseName}:${storeName}`) },
          createObjectStore: (storeName: string) => { if (!stores.has(`${databaseName}:${storeName}`)) stores.set(`${databaseName}:${storeName}`, new Map()); return getStoreImpl(databaseName, storeName); },
          close: () => undefined,
          transaction: (storeName: string) => ({ objectStore: () => getStoreImpl(databaseName, storeName) }),
        };
        databases.set(databaseName, database);
        request.result = database;
        request.onupgradeneeded?.call(request);
        request.onsuccess?.call(request);
      });
      return request;
    },
  };
}

describe("NotesPanel merge-readiness polish", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: storage(), configurable: true });
    Object.defineProperty(globalThis, "indexedDB", { value: makeIndexedDb(), configurable: true, writable: true });
    vi.spyOn(HTMLMediaElement.prototype, "canPlayType").mockReturnValue("probably");
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); document.body.innerHTML = ""; });

  it("offers curated default categories grouped for selection", () => {
    render(<NotesPanel />);
    fireEvent.click(screen.getByRole("button", { name: "+ New Note" }));
    const select = screen.getByLabelText("Note category") as HTMLSelectElement;
    expect(within(select).getByText("Architecture")).toBeInTheDocument();
    expect(within(select).getByText("Personal")).toBeInTheDocument();
    expect(within(select).getByText("Track A")).toBeInTheDocument();
    expect(within(select).getByText("Reference")).toBeInTheDocument();
    expect(within(select).getByText("+ Create new category…")).toBeInTheDocument();
  });

  it("allows selecting an existing default category and persists it", () => {
    render(<NotesPanel />);
    fireEvent.click(screen.getByRole("button", { name: "+ New Note" }));
    const select = screen.getByLabelText("Note category") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "Research" } });
    expect(select.value).toBe("Research");
  });

  it("supports creating a new category without losing dropdown behavior", () => {
    render(<NotesPanel />);
    fireEvent.click(screen.getByRole("button", { name: "+ New Note" }));
    const select = screen.getByLabelText("Note category") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "__create_new_category__" } });
    const input = screen.getByLabelText("New category name");
    fireEvent.change(input, { target: { value: "Custom Topic" } });
    fireEvent.blur(input);
    expect((screen.getByLabelText("Note category") as HTMLSelectElement).value).toBe("Custom Topic");
    expect(within(select).getByText("Custom Topic")).toBeInTheDocument();
  });

  it("offers curated default tags via the suggested-tag select", () => {
    render(<NotesPanel />);
    fireEvent.click(screen.getByRole("button", { name: "+ New Note" }));
    const suggestion = screen.getByLabelText("Add suggested tag") as HTMLSelectElement;
    expect(within(suggestion).getByText("#important")).toBeInTheDocument();
    expect(within(suggestion).getByText("#architecture")).toBeInTheDocument();
  });

  it("adds an existing default tag as a chip and supports free-form custom tags", () => {
    render(<NotesPanel />);
    fireEvent.click(screen.getByRole("button", { name: "+ New Note" }));
    fireEvent.change(screen.getByLabelText("Add suggested tag"), { target: { value: "important" } });
    expect(screen.getByRole("button", { name: "Remove tag important" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Add tag"), { target: { value: "custom-topic" } });
    fireEvent.click(screen.getByRole("button", { name: "Add tag" }));
    expect(screen.getByRole("button", { name: "Remove tag custom-topic" })).toBeInTheDocument();
  });

  it("aligns filter checkboxes using a consistent label/control row", () => {
    render(<NotesPanel />);
    const row = screen.getByText("Has file references").closest("label");
    expect(row).toHaveClass("notes-checkbox-row");
    expect(within(row as HTMLElement).getByRole("checkbox")).toBeInTheDocument();
  });

  it("groups filters into collapsible sections that expand and collapse", () => {
    render(<NotesPanel />);
    const historyDetails = screen.getByText("History").closest("details") as HTMLDetailsElement;
    expect(historyDetails.open).toBe(false);
    fireEvent.click(screen.getByText("History"));
    expect(historyDetails.open).toBe(true);
  });

  it("persists an assigned category and tag across a note reselect", () => {
    render(<NotesPanel />);
    fireEvent.click(screen.getByRole("button", { name: "+ New Note" }));
    fireEvent.change(screen.getByLabelText("Note category"), { target: { value: "Research" } });
    fireEvent.change(screen.getByLabelText("Add suggested tag"), { target: { value: "todo" } });
    fireEvent.click(screen.getByRole("button", { name: "+ New Note" }));
    expect(screen.getByLabelText("Note category")).toHaveValue("");
  });

  it("renders Voice Note controls without requesting microphone permission on startup", () => {
    render(<NotesPanel />);
    expect(screen.getByRole("heading", { name: "Voice Notes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Pause" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Resume" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Stop" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.queryByText("Review Ready")).not.toBeInTheDocument();
  });

  it("shows the review action surface after a runtime stop", async () => {
    const track = { readyState: "live", stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaStreamTrack;
    const stream = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
    const recorder = { mimeType: "audio/webm", state: "inactive", start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), ondataavailable: undefined as ((event: BlobEvent) => void) | undefined, onerror: undefined as (() => void) | undefined, onstop: undefined as (() => void) | undefined };
    vi.stubGlobal("MediaRecorder", vi.fn(() => recorder));
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    vi.stubGlobal("isSecureContext", true);
    render(<NotesPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    recorder.ondataavailable?.({ data: new Blob(["voice"], { type: "audio/webm" }) } as BlobEvent);
    recorder.onstop?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.getByText("Review Ready")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save to Notes" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("supports a custom title before initial Save and renaming a saved Voice Note afterwards", async () => {
    const track = { readyState: "live", stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaStreamTrack;
    const stream = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
    const recorder = { mimeType: "audio/webm", state: "inactive", start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), ondataavailable: undefined as ((event: BlobEvent) => void) | undefined, onerror: undefined as (() => void) | undefined, onstop: undefined as (() => void) | undefined };
    vi.stubGlobal("MediaRecorder", vi.fn(() => recorder));
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    vi.stubGlobal("isSecureContext", true);
    render(<NotesPanel accountScope="rename-test-scope" />);

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    recorder.ondataavailable?.({ data: new Blob(["voice"], { type: "audio/webm" }) } as BlobEvent);
    recorder.onstop?.();
    await waitFor(() => expect(screen.getByLabelText("Voice note title")).toBeInTheDocument());

    const titleInput = screen.getByLabelText("Voice note title") as HTMLInputElement;
    expect(titleInput.value).toMatch(/^Voice note \d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
    fireEvent.change(titleInput, { target: { value: "My custom title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save to Notes" }));
    const savedList = screen.getByLabelText("Saved Voice Notes");
    await waitFor(() => expect(within(savedList).getByText("My custom title")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Rename My custom title" }));
    const renameInput = screen.getByLabelText("Rename My custom title");
    fireEvent.change(renameInput, { target: { value: "Should not persist" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel Rename" }));
    expect(within(savedList).getByText("My custom title")).toBeInTheDocument();
    expect(within(savedList).queryByText("Should not persist")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Rename My custom title" }));
    fireEvent.change(screen.getByLabelText("Rename My custom title"), { target: { value: "Renamed later" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Rename" }));
    expect(within(savedList).getByText("Renamed later")).toBeInTheDocument();
    expect(within(savedList).queryByText("My custom title")).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("opens Trim on a saved Voice Note and creates an independent trimmed clip via Save As, preserving the original", async () => {
    const track = { readyState: "live", stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaStreamTrack;
    const stream = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
    const recorder = { mimeType: "audio/webm", state: "inactive", start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), ondataavailable: undefined as ((event: BlobEvent) => void) | undefined, onerror: undefined as (() => void) | undefined, onstop: undefined as (() => void) | undefined };
    vi.stubGlobal("MediaRecorder", vi.fn(() => recorder));
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    vi.stubGlobal("isSecureContext", true);
    render(<NotesPanel accountScope="trim-test-scope" />);

    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    recorder.ondataavailable?.({ data: new Blob(["twenty-second-clip"], { type: "audio/webm" }) } as BlobEvent);
    recorder.onstop?.();
    await waitFor(() => expect(screen.getByLabelText("Voice note title")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Voice note title"), { target: { value: "Original recording" } });
    fireEvent.click(screen.getByRole("button", { name: "Save to Notes" }));
    const savedList = screen.getByLabelText("Saved Voice Notes");
    await waitFor(() => expect(within(savedList).getByText("Original recording")).toBeInTheDocument());

    // The recorded clip is effectively instantaneous under jsdom; give it a realistic duration
    // (without touching the global clock, which would also disrupt React's own scheduler) so the
    // default full-range Trim selection clears the minimum-clip-duration bound.
    const scopedRepository = notesRepository.forAccount("trim-test-scope");
    const savedNote = scopedRepository.getNotes()[0];
    if (!savedNote) throw new Error("expected a saved voice note");
    scopedRepository.updateNote(savedNote.noteId, { futureFields: { ...savedNote.futureFields, durationMilliseconds: 20000 } });
    // Force NotesPanel to re-render so it constructs a fresh repository instance that re-reads the update above.
    fireEvent.change(screen.getByLabelText("Search notes"), { target: { value: "Original" } });
    fireEvent.change(screen.getByLabelText("Search notes"), { target: { value: "" } });

    fireEvent.click(screen.getByRole("button", { name: "Trim Original recording" }));
    expect(screen.getByLabelText("Trim start")).toBeInTheDocument();
    expect(screen.getByLabelText("Trim end")).toBeInTheDocument();

    const titleField = screen.getByLabelText("Trimmed voice note title") as HTMLInputElement;
    expect(titleField.value).toBe("Original recording - Trimmed");
    fireEvent.change(titleField, { target: { value: "Original recording - Trimmed" } });
    fireEvent.click(screen.getByRole("button", { name: "Save As New Voice Note" }));

    await waitFor(() => expect(within(savedList).getByText("Original recording - Trimmed")).toBeInTheDocument());
    expect(within(savedList).getByText("Original recording")).toBeInTheDocument();
    expect(within(savedList).getAllByText("Trimmed clip")).toHaveLength(1);
    expect(screen.queryByLabelText("Trim start")).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  async function recordAndSaveVoiceNote(accountScope: string, title: string) {
    const track = { readyState: "live", stop: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() } as unknown as MediaStreamTrack;
    const stream = { getAudioTracks: () => [track], getTracks: () => [track] } as unknown as MediaStream;
    const recorder = { mimeType: "audio/webm", state: "inactive", start: vi.fn(), stop: vi.fn(), pause: vi.fn(), resume: vi.fn(), ondataavailable: undefined as ((event: BlobEvent) => void) | undefined, onerror: undefined as (() => void) | undefined, onstop: undefined as (() => void) | undefined };
    vi.stubGlobal("MediaRecorder", vi.fn(() => recorder));
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
    vi.stubGlobal("isSecureContext", true);
    render(<NotesPanel accountScope={accountScope} />);
    fireEvent.click(screen.getByRole("button", { name: "Record" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    recorder.ondataavailable?.({ data: new Blob(["voice-bytes"], { type: "audio/webm" }) } as BlobEvent);
    recorder.onstop?.();
    await waitFor(() => expect(screen.getByLabelText("Voice note title")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Voice note title"), { target: { value: title } });
    fireEvent.click(screen.getByRole("button", { name: "Save to Notes" }));
    const savedList = screen.getByLabelText("Saved Voice Notes");
    await waitFor(() => expect(within(savedList).getByText(title)).toBeInTheDocument());
    return savedList;
  }

  it("opens the Export dialog with a truthful destination list and saves the original audio to device via the native picker", async () => {
    const savedList = await recordAndSaveVoiceNote("export-device-scope", "Testing file");

    const write = vi.fn().mockResolvedValue(undefined);
    const close = vi.fn().mockResolvedValue(undefined);
    const showSaveFilePicker = vi.fn().mockResolvedValue({ createWritable: vi.fn().mockResolvedValue({ write, close }) });
    vi.stubGlobal("showSaveFilePicker", showSaveFilePicker);

    fireEvent.click(within(savedList).getByRole("button", { name: "Export Testing file" }));
    const exportDialog = screen.getByLabelText("Export options for Testing file");
    expect(within(exportDialog).getByText(/Saved in ONYX Notes on this account\/device/)).toBeInTheDocument();
    const filenameInput = within(exportDialog).getByLabelText("Export filename") as HTMLInputElement;
    expect(filenameInput.value).toBe("Testing file.webm");

    const filesButton = within(exportDialog).getByRole("button", { name: /Save to Files/ });
    expect(filesButton).toBeDisabled();
    const oneDriveButton = within(exportDialog).getByRole("button", { name: /OneDrive/ });
    expect(oneDriveButton).toBeDisabled();
    expect(oneDriveButton).toHaveAttribute("title", "Write support not available yet.");
    expect(within(exportDialog).getByRole("button", { name: /Google Drive/ })).toBeDisabled();
    expect(within(exportDialog).getByRole("button", { name: /SharePoint/ })).toBeDisabled();

    fireEvent.click(within(exportDialog).getByRole("button", { name: /Save to Device/ }));
    await waitFor(() => expect(write).toHaveBeenCalledWith(expect.any(Blob)));
    expect(close).toHaveBeenCalled();
    expect(showSaveFilePicker).toHaveBeenCalledWith(expect.objectContaining({ suggestedName: "Testing file.webm" }));
    await waitFor(() => expect(within(exportDialog).getByText(/Saved Testing file\.webm to your device\./)).toBeInTheDocument());

    fireEvent.click(within(exportDialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByLabelText("Export filename")).not.toBeInTheDocument();
    expect(within(savedList).getByText("Testing file")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("shares the exact saved audio via the native Share API without fabricating a destination", async () => {
    const savedList = await recordAndSaveVoiceNote("export-share-scope", "Share me");
    let sharedFile: File | undefined;
    const share = vi.fn(async (data: { files: readonly File[] }) => { sharedFile = data.files[0]; });
    const canShare = vi.fn(() => true);
    vi.stubGlobal("navigator", { ...navigator, share, canShare });

    fireEvent.click(within(savedList).getByRole("button", { name: "Export Share me" }));
    const exportDialog = screen.getByLabelText("Export options for Share me");
    fireEvent.click(within(exportDialog).getByRole("button", { name: "Share" }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(sharedFile?.name).toBe("Share me.webm");
    expect(await sharedFile?.text()).toBe("voice-bytes");
    await waitFor(() => expect(screen.getByText("Share sheet opened.")).toBeInTheDocument());

    vi.unstubAllGlobals();
  });

  it("offers truthful export options for a trimmed derived Voice Note without enabling a physical trimmed-file export", async () => {
    const savedList = await recordAndSaveVoiceNote("export-trim-scope", "Original recording");
    const scopedRepository = notesRepository.forAccount("export-trim-scope");
    const savedNote = scopedRepository.getNotes()[0];
    if (!savedNote) throw new Error("expected a saved voice note");
    scopedRepository.updateNote(savedNote.noteId, { futureFields: { ...savedNote.futureFields, durationMilliseconds: 20000 } });
    fireEvent.change(screen.getByLabelText("Search notes"), { target: { value: "Original" } });
    fireEvent.change(screen.getByLabelText("Search notes"), { target: { value: "" } });

    fireEvent.click(within(savedList).getByRole("button", { name: "Trim Original recording" }));
    fireEvent.click(screen.getByRole("button", { name: "Save As New Voice Note" }));
    await waitFor(() => expect(within(savedList).getByText("Original recording - Trimmed")).toBeInTheDocument());

    fireEvent.click(within(savedList).getByRole("button", { name: "Export Original recording - Trimmed" }));
    expect(screen.getByText("Export Original Audio (full recording)")).toBeInTheDocument();
    expect(screen.getByText("Export Clip Definition (trim metadata only)")).toBeInTheDocument();
    const disabledOption = screen.getByRole("radio", { name: /Export Trimmed Audio File/ });
    expect(disabledOption).toBeDisabled();
    expect(screen.getByText(/Physical trimmed-file export requires audio rendering\/transcoding/)).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
