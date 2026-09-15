import type { Note, NoteDateBucket, NoteFileReference, NoteUpdate } from "@onyx/workspace-contracts";

export interface NotesRepository {
  createNote(input?: Partial<Pick<Note, "title" | "content" | "tags" | "category" | "source" | "type" | "futureFields" | "fileReferences">>): Note;
  updateNote(noteId: string, update: NoteUpdate): Note;
  deleteNote(noteId: string): void;
  archiveNote(noteId: string): Note;
  restoreNote(noteId: string): Note;
  pinNote(noteId: string): Note;
  unpinNote(noteId: string): Note;
  getNote(noteId: string): Note | undefined;
    getNotes(options?: NotesSearchOptions): readonly Note[];
    searchNotes(query: string, options?: NotesSearchOptions): readonly Note[];
    searchNotesDetailed(query: string, options?: NotesSearchOptions): readonly NotesSearchResult[];
    getRecentNotes(kind?: "CREATED" | "UPDATED" | "OPENED", limit?: number): readonly Note[];
    recordNoteOpened(noteId: string): void;
    getRecentSearches(): readonly string[];
    recordSearch(query: string): void;
    removeRecentSearch(query: string): void;
    clearRecentSearches(): void;
    getRelatedNotes(noteId: string, limit?: number): readonly Note[];
    getIndexEntry(noteId: string): NotesIndexEntry | undefined;
  }

  export type NotesSort = "UPDATED_DESC" | "UPDATED_ASC" | "CREATED_DESC" | "CREATED_ASC" | "TITLE_ASC" | "TITLE_DESC" | "PINNED_FIRST";
  export interface NotesSearchOptions {
    readonly includeArchived?: boolean;
    readonly pinned?: boolean;
    readonly hasFileReferences?: boolean;
    readonly recent?: boolean;
    readonly bucket?: NoteDateBucket;
    readonly category?: string;
    readonly tag?: string;
    readonly dateFrom?: string;
    readonly dateTo?: string;
    readonly sort?: NotesSort;
    readonly limit?: number;
  }
  export interface NotesSearchResult { readonly note: Note; readonly snippet: string; readonly fileReferenceCount: number; }
  export interface NotesIndexEntry { readonly noteId: string; readonly terms: readonly string[]; readonly tags: readonly string[]; readonly category?: string; readonly createdAt: string; readonly updatedAt: string; readonly pinned: boolean; readonly archived: boolean; readonly fileIds: readonly string[]; readonly fileNames: readonly string[]; readonly voiceMetadata: readonly string[]; }

  const STORAGE_KEY = "onyx.notes.repository.v1";
  const INDEX_KEY = "onyx.notes.index.v1";
  const RECENT_SEARCHES_KEY = "onyx.notes.recent-searches.v1";
  const RECENT_OPENED_KEY = "onyx.notes.recent-opened.v1";
  const MAX_HISTORY = 12;
  const id = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  const now = () => new Date().toISOString();
  const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFKC");
  const tokenize = (value: string) => Array.from(new Set(normalize(value).match(/[\p{L}\p{N}_-]+/gu) ?? []));

  function createIndexEntry(note: Note): NotesIndexEntry {
    const referenceTerms = note.fileReferences.flatMap((reference) => [reference.fileId, reference.displayName, reference.fileType ?? "", reference.provider]);
    return { noteId: note.noteId, terms: tokenize([note.title, note.content, note.category ?? "", note.source, note.type, note.createdAt, note.updatedAt, ...referenceTerms, ...Object.values(note.futureFields).map(String)].join(" ")), tags: note.tags.map(normalize), category: note.category ? normalize(note.category) : undefined, createdAt: note.createdAt, updatedAt: note.updatedAt, pinned: note.pinned, archived: note.archived, fileIds: note.fileReferences.map((reference) => reference.fileId), fileNames: note.fileReferences.map((reference) => normalize(reference.displayName)), voiceMetadata: Object.values(note.futureFields).map(String).map(normalize) };
  }

  function parseQuery(query: string) {
    const phrases = Array.from(query.matchAll(/"([^\"]+)"/g), (match) => normalize(match[1] ?? "")).filter(Boolean);
    const withoutPhrases = query.replace(/"[^\"]+"/g, " ");
    const tags = Array.from(withoutPhrases.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu), (match) => normalize(match[1] ?? "")).filter(Boolean);
    const dateToken = normalize(withoutPhrases).match(/\b(today|yesterday|this week|this month|this year)\b/)?.[1];
    const bucket: Exclude<NoteDateBucket, "ARCHIVE" | "ALL_NOTES"> | undefined = dateToken === "today" ? "TODAY" : dateToken === "yesterday" ? "YESTERDAY" : dateToken === "this week" ? "THIS_WEEK" : dateToken === "this month" ? "THIS_MONTH" : dateToken === "this year" ? "THIS_YEAR" : undefined;
    const terms = tokenize(withoutPhrases.replace(/#[\p{L}\p{N}_-]+/gu, " ").replace(/\b(today|yesterday|this week|this month|this year)\b/gi, " "));
    return { phrases, tags, terms, bucket };
  }

  function snippet(note: Note, query: string): string {
    const text = `${note.title}\n${note.content}`.trim();
    const index = parseQuery(query).terms.reduce((best, term) => { const position = normalize(text).indexOf(term); return position >= 0 && (best < 0 || position < best) ? position : best; }, -1);
    const start = Math.max(0, (index < 0 ? 0 : index) - 48);
    return `${start > 0 ? "..." : ""}${text.slice(start, start + 180)}${text.length > start + 180 ? "..." : ""}`;
  }

  export function noteDateBucket(value: string, reference = new Date()): Exclude<NoteDateBucket, "ARCHIVE"> {
    const target = new Date(value);
    const days = Math.floor((dayStart(reference) - dayStart(target)) / 86_400_000);
    if (days === 0) return "TODAY";
    if (days === 1) return "YESTERDAY";
    if (days >= 0 && days < 7) return "THIS_WEEK";
    if (target.getFullYear() === reference.getFullYear() && target.getMonth() === reference.getMonth()) return "THIS_MONTH";
    if (target.getFullYear() === reference.getFullYear()) return "THIS_YEAR";
    return "ALL_NOTES";
  }

  function isInDateBucket(value: string, requested: Exclude<NoteDateBucket, "ARCHIVE" | "ALL_NOTES">): boolean {
    const actual = noteDateBucket(value);
    if (requested === "TODAY") return actual === "TODAY";
    if (requested === "YESTERDAY") return actual === "YESTERDAY";
    if (requested === "THIS_WEEK") return ["TODAY", "YESTERDAY", "THIS_WEEK"].includes(actual);
    if (requested === "THIS_MONTH") return ["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH"].includes(actual);
    return ["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH", "THIS_YEAR"].includes(actual);
  }

  export class LocalNotesRepository implements NotesRepository {
    private notes: Note[];
    private index = new Map<string, NotesIndexEntry>();
    private recentOpened: string[];
    private recentSearches: string[];
    constructor(private readonly storage: Storage | undefined = typeof localStorage === "undefined" ? undefined : localStorage) {
      try { this.notes = JSON.parse(storage?.getItem(STORAGE_KEY) ?? "[]") as Note[]; } catch { this.notes = []; }
      try { this.recentOpened = JSON.parse(storage?.getItem(RECENT_OPENED_KEY) ?? "[]") as string[]; } catch { this.recentOpened = []; }
      try { this.recentSearches = JSON.parse(storage?.getItem(RECENT_SEARCHES_KEY) ?? "[]") as string[]; } catch { this.recentSearches = []; }
      let storedIndex: NotesIndexEntry[] = [];
      try { storedIndex = JSON.parse(storage?.getItem(INDEX_KEY) ?? "[]") as NotesIndexEntry[]; } catch { storedIndex = []; }
      this.notes.forEach((note) => { const stored = storedIndex.find((entry) => entry.noteId === note.noteId && entry.updatedAt === note.updatedAt); this.index.set(note.noteId, stored ?? createIndexEntry(note)); });
      if (this.index.size !== storedIndex.length || this.notes.some((note) => !storedIndex.some((entry) => entry.noteId === note.noteId && entry.updatedAt === note.updatedAt))) this.persistIndex();
    }
    private persist() { this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.notes)); this.persistIndex(); }
    private persistIndex() { this.storage?.setItem(INDEX_KEY, JSON.stringify([...this.index.values()])); }
    private persistHistory() { this.storage?.setItem(RECENT_OPENED_KEY, JSON.stringify(this.recentOpened)); this.storage?.setItem(RECENT_SEARCHES_KEY, JSON.stringify(this.recentSearches)); }
    private require(noteId: string) { const note = this.getNote(noteId); if (!note) throw new Error(`Note not found: ${noteId}`); return note; }
    private replace(note: Note) { this.notes = this.notes.map((entry) => entry.noteId === note.noteId ? note : entry); this.index.set(note.noteId, createIndexEntry(note)); this.persist(); return note; }
    createNote(input: Partial<Pick<Note, "title" | "content" | "tags" | "category" | "source" | "type" | "futureFields" | "fileReferences">> = {}) { const timestamp = now(); const note: Note = { noteId: id("note"), title: input.title ?? "Untitled note", content: input.content ?? "", createdAt: timestamp, updatedAt: timestamp, pinned: false, archived: false, tags: input.tags ?? [], category: input.category, source: input.source ?? "LOCAL", type: input.type ?? "TEXT_NOTE", version: 1, futureFields: input.futureFields ?? {}, fileReferences: input.fileReferences ?? [] }; this.notes = [note, ...this.notes]; this.index.set(note.noteId, createIndexEntry(note)); this.persist(); return note; }
    updateNote(noteId: string, update: NoteUpdate) { const current = this.require(noteId); return this.replace({ ...current, ...update, updatedAt: now(), version: current.version + 1 }); }
    deleteNote(noteId: string) { this.require(noteId); this.notes = this.notes.filter((note) => note.noteId !== noteId); this.index.delete(noteId); this.recentOpened = this.recentOpened.filter((idValue) => idValue !== noteId); this.persist(); this.persistHistory(); }
    archiveNote(noteId: string) { const current = this.require(noteId); return this.replace({ ...current, archived: true, updatedAt: now(), version: current.version + 1 }); }
    restoreNote(noteId: string) { const current = this.require(noteId); return this.replace({ ...current, archived: false, updatedAt: now(), version: current.version + 1 }); }
    pinNote(noteId: string) { const current = this.require(noteId); return this.replace({ ...current, pinned: true, updatedAt: now(), version: current.version + 1 }); }
    unpinNote(noteId: string) { const current = this.require(noteId); return this.replace({ ...current, pinned: false, updatedAt: now(), version: current.version + 1 }); }
    getNote(noteId: string) { return this.notes.find((note) => note.noteId === noteId); }
    private matches(entry: NotesIndexEntry, options: NotesSearchOptions) { if (!options.includeArchived && entry.archived) return false; if (options.pinned !== undefined && entry.pinned !== options.pinned) return false; if (options.hasFileReferences !== undefined && (entry.fileIds.length > 0) !== options.hasFileReferences) return false; if (options.category && entry.category !== normalize(options.category)) return false; if (options.tag && !entry.tags.includes(normalize(options.tag))) return false; if (options.bucket && (options.bucket === "ARCHIVE" ? !entry.archived : entry.archived || (options.bucket !== "ALL_NOTES" && noteDateBucket(entry.updatedAt) !== options.bucket))) return false; if (options.dateFrom && entry.updatedAt < options.dateFrom) return false; if (options.dateTo && entry.updatedAt > options.dateTo) return false; if (options.recent && !this.recentOpened.includes(entry.noteId)) return false; return true; }
    private sort(notes: Note[], sort: NotesSort = "UPDATED_DESC") { return notes.sort((left, right) => { if (sort === "TITLE_ASC" || sort === "TITLE_DESC") return (sort === "TITLE_ASC" ? 1 : -1) * left.title.localeCompare(right.title); if (sort === "CREATED_ASC" || sort === "CREATED_DESC") return (sort === "CREATED_ASC" ? 1 : -1) * left.createdAt.localeCompare(right.createdAt); if (sort === "UPDATED_ASC" || sort === "UPDATED_DESC") return (sort === "UPDATED_ASC" ? 1 : -1) * left.updatedAt.localeCompare(right.updatedAt); return Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt); }); }
    getNotes(options: NotesSearchOptions = {}) { const results = this.notes.filter((note) => { const entry = this.index.get(note.noteId); return entry ? this.matches(entry, options) : false; }); return this.sort(results, options.sort).slice(0, options.limit); }
    searchNotesDetailed(query: string, options: NotesSearchOptions = {}) { const parsed = parseQuery(query); const results = this.notes.filter((note) => { const entry = this.index.get(note.noteId); if (!entry || !this.matches(entry, options) || (parsed.bucket && !isInDateBucket(entry.updatedAt, parsed.bucket))) return false; const text = normalize(`${note.title} ${note.content} ${note.category ?? ""} ${entry.fileNames.join(" ")} ${entry.voiceMetadata.join(" ")}`); return parsed.phrases.every((phrase) => text.includes(phrase)) && parsed.tags.every((tag) => entry.tags.includes(tag)) && parsed.terms.every((term) => entry.terms.some((indexed) => indexed.includes(term))); }).map((note) => ({ note, snippet: snippet(note, query), fileReferenceCount: note.fileReferences.length })); const ordered = options.sort ? this.sort(results.map((result) => result.note), options.sort).map((note) => results.find((result) => result.note.noteId === note.noteId)!) : results.sort((left, right) => Number(normalize(left.note.title).includes(normalize(query))) - Number(normalize(right.note.title).includes(normalize(query)))).reverse(); return ordered.slice(0, options.limit); }
    searchNotes(query: string, options: NotesSearchOptions = {}) { return this.searchNotesDetailed(query, options).map((result) => result.note); }
    getRecentNotes(kind: "CREATED" | "UPDATED" | "OPENED" = "UPDATED", limit = MAX_HISTORY) { if (kind === "OPENED") return this.recentOpened.map((noteId) => this.getNote(noteId)).filter((note): note is Note => Boolean(note)).slice(0, limit); return this.sort(this.notes.filter((note) => !note.archived), kind === "CREATED" ? "CREATED_DESC" : "UPDATED_DESC").slice(0, limit); }
    recordNoteOpened(noteId: string) { this.require(noteId); this.recentOpened = [noteId, ...this.recentOpened.filter((idValue) => idValue !== noteId)].slice(0, MAX_HISTORY); this.persistHistory(); }
    getRecentSearches() { return [...this.recentSearches]; }
    recordSearch(query: string) { const value = query.trim(); if (!value) return; this.recentSearches = [value, ...this.recentSearches.filter((entry) => entry !== value)].slice(0, MAX_HISTORY); this.persistHistory(); }
    removeRecentSearch(query: string) { this.recentSearches = this.recentSearches.filter((entry) => entry !== query); this.persistHistory(); }
    clearRecentSearches() { this.recentSearches = []; this.persistHistory(); }
    getRelatedNotes(noteId: string, limit = 5) { const source = this.require(noteId); const sourceIndex = this.index.get(noteId)!; return this.sort(this.notes.filter((note) => note.noteId !== noteId && !note.archived).map((note) => ({ note, score: this.relatedScore(source, sourceIndex, note) })).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score || right.note.updatedAt.localeCompare(left.note.updatedAt)).map((entry) => entry.note), "UPDATED_DESC").slice(0, limit); }
    private relatedScore(source: Note, sourceIndex: NotesIndexEntry, candidate: Note) { const index = this.index.get(candidate.noteId)!; return source.tags.filter((tag) => candidate.tags.some((item) => normalize(item) === normalize(tag))).length * 5 + (source.category && candidate.category && normalize(source.category) === normalize(candidate.category) ? 3 : 0) + source.fileReferences.filter((reference) => candidate.fileReferences.some((item) => item.fileId === reference.fileId)).length * 6 + (noteDateBucket(source.updatedAt) === noteDateBucket(candidate.updatedAt) ? 1 : 0) + sourceIndex.terms.filter((term) => term.length > 3 && index.terms.includes(term)).slice(0, 8).length; }
    getIndexEntry(noteId: string) { return this.index.get(noteId); }
  }

  export const notesRepository = new LocalNotesRepository();