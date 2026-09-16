/** @vitest-environment jsdom */
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotesPanel } from "./NotesPanel";

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

describe("NotesPanel merge-readiness polish", () => {
  beforeEach(() => {
    Object.defineProperty(window, "localStorage", { value: storage(), configurable: true });
  });
  afterEach(() => { document.body.innerHTML = ""; });

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
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Discard" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
