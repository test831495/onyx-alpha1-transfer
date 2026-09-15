import { describe, expect, it } from "vitest";
import { LocalNotesRepository, noteDateBucket } from "./notesRepository";

function storage() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key), clear: () => values.clear(), key: () => null, length: 0 } as unknown as Storage; }

describe("LocalNotesRepository", () => {
  it("supports create, edit, delete, pin, archive, and restore offline", () => {
    const repository = new LocalNotesRepository(storage());
    const created = repository.createNote({ title: "Plan", content: "Draft" });
    expect(repository.updateNote(created.noteId, { content: "Ready" }).content).toBe("Ready");
    expect(repository.pinNote(created.noteId).pinned).toBe(true);
    expect(repository.archiveNote(created.noteId).archived).toBe(true);
    expect(repository.getNotes()).toHaveLength(0);
    expect(repository.restoreNote(created.noteId).archived).toBe(false);
    expect(repository.unpinNote(created.noteId).pinned).toBe(false);
    repository.deleteNote(created.noteId);
    expect(repository.getNote(created.noteId)).toBeUndefined();
  });
  it("searches metadata and preserves file references without copying files", () => {
    const repository = new LocalNotesRepository(storage());
    const note = repository.createNote({ title: "Architecture Discussion", tags: ["roadmap"], fileReferences: [{ referenceId: "ref-1", fileId: "file-1", provider: "local", displayName: "roadmap.pdf", fileType: "application/pdf", referencedAt: new Date().toISOString() }] });
    expect(repository.searchNotes("roadmap.pdf")[0]?.noteId).toBe(note.noteId);
    expect(repository.getNote(note.noteId)?.fileReferences[0]?.fileId).toBe("file-1");
  });
  it("supports phrase, tag, category, combined filters, sorting, and snippets", () => {
    const repository = new LocalNotesRepository(storage());
    const first = repository.createNote({ title: "Mobile review", content: "mobile file selection works", tags: ["architecture"], category: "Research" });
    repository.createNote({ title: "Other", content: "mobile file selection works", tags: ["personal"], category: "Personal" });
    expect(repository.searchNotes('"mobile file selection"', { tag: "architecture", category: "Research" })).toEqual([first]);
    expect(repository.searchNotes("#architecture")).toEqual([first]);
    expect(repository.searchNotes("This Month")).toContain(first);
    expect(repository.searchNotesDetailed("mobile")[0]?.snippet).toContain("Mobile review");
    expect(repository.getNotes({ sort: "TITLE_ASC" })[0]?.title).toBe("Mobile review");
  });
  it("maintains bounded recent searches, opened notes, index entries, and related notes", () => {
    const repository = new LocalNotesRepository(storage());
    const first = repository.createNote({ title: "Roadmap", tags: ["architecture"], category: "Research" });
    const related = repository.createNote({ title: "Architecture", tags: ["architecture"], category: "Research" });
    repository.recordNoteOpened(first.noteId);
    repository.recordSearch("roadmap.pdf");
    expect(repository.getRecentNotes("OPENED")[0]?.noteId).toBe(first.noteId);
    expect(repository.getRecentSearches()).toEqual(["roadmap.pdf"]);
    expect(repository.getIndexEntry(first.noteId)?.tags).toContain("architecture");
    expect(repository.getRelatedNotes(first.noteId)[0]?.noteId).toBe(related.noteId);
    repository.clearRecentSearches();
    expect(repository.getRecentSearches()).toEqual([]);
  });
  it("indexes dates into the required history buckets", () => {
    const reference = new Date("2026-09-15T12:00:00.000Z");
    expect(noteDateBucket("2026-09-15T08:00:00.000Z", reference)).toBe("TODAY");
    expect(noteDateBucket("2026-09-14T08:00:00.000Z", reference)).toBe("YESTERDAY");
    expect(noteDateBucket("2026-09-01T08:00:00.000Z", reference)).toBe("THIS_MONTH");
    expect(noteDateBucket("2026-07-01T08:00:00.000Z", reference)).toBe("THIS_YEAR");
  });
});