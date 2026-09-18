import type { Note, NoteDateBucket, NoteFileReference, NoteUpdate } from "@onyx/workspace-contracts";

export type NotesSort = "UPDATED_DESC" | "UPDATED_ASC" | "CREATED_DESC" | "CREATED_ASC" | "TITLE_ASC" | "TITLE_DESC" | "PINNED_FIRST";
export interface NotesSearchOptions { readonly includeArchived?: boolean; readonly pinned?: boolean; readonly hasFileReferences?: boolean; readonly recent?: boolean; readonly bucket?: NoteDateBucket; readonly category?: string; readonly tag?: string; readonly dateFrom?: string; readonly dateTo?: string; readonly sort?: NotesSort; readonly limit?: number; }
export interface NotesSearchResult { readonly note: Note; readonly snippet: string; readonly fileReferenceCount: number; }
export interface NotesIndexEntry { readonly noteId: string; readonly terms: readonly string[]; readonly contentTerms: readonly string[]; readonly tags: readonly string[]; readonly category?: string; readonly createdAt: string; readonly updatedAt: string; readonly pinned: boolean; readonly archived: boolean; readonly fileIds: readonly string[]; readonly fileNames: readonly string[]; readonly voiceMetadata: readonly string[]; }
export interface NotesRepository { createNote(input?: Partial<Pick<Note, "title" | "content" | "tags" | "category" | "source" | "type" | "futureFields" | "fileReferences">>): Note; updateNote(noteId: string, update: NoteUpdate): Note; deleteNote(noteId: string): void; archiveNote(noteId: string): Note; restoreNote(noteId: string): Note; pinNote(noteId: string): Note; unpinNote(noteId: string): Note; getNote(noteId: string): Note | undefined; getNotes(options?: NotesSearchOptions): readonly Note[]; searchNotes(query: string, options?: NotesSearchOptions): readonly Note[]; searchNotesDetailed(query: string, options?: NotesSearchOptions): readonly NotesSearchResult[]; getNotesReferencingFile(fileId: string, provider?: string): readonly Note[]; getRecentNotes(kind?: "CREATED" | "UPDATED" | "OPENED", limit?: number): readonly Note[]; recordNoteOpened(noteId: string): void; getRecentSearches(): readonly string[]; recordSearch(query: string): void; removeRecentSearch(query: string): void; clearRecentSearches(): void; getRelatedNotes(noteId: string, limit?: number): readonly Note[]; getIndexEntry(noteId: string): NotesIndexEntry | undefined; }

type StorageLike = Pick<Storage, "getItem" | "setItem">;
const BASE_KEYS = { notes: "onyx.notes.repository.v1", index: "onyx.notes.index.v1", searches: "onyx.notes.recent-searches.v1", opened: "onyx.notes.recent-opened.v1" } as const;
export const NOTES_UI_STATE_KEY = "onyx.notes.search-state.v1";
const MAX_HISTORY = 12;
const id = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
const now = () => new Date().toISOString();
const normalize = (value: string) => value.toLocaleLowerCase().normalize("NFKC");
const tokenize = (value: string) => Array.from(new Set(normalize(value).match(/[\p{L}\p{N}_-]+/gu) ?? []));
const dayOrdinal = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
const dayStart = (date: Date) => dayOrdinal(date);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const stringArray = (value: unknown) => Array.isArray(value) && value.every((entry) => typeof entry === "string");
const validReference = (value: unknown): value is NoteFileReference => isRecord(value) && typeof value.referenceId === "string" && typeof value.fileId === "string" && typeof value.provider === "string" && typeof value.displayName === "string" && (value.fileType === undefined || typeof value.fileType === "string") && typeof value.referencedAt === "string";
const validNote = (value: unknown): value is Note => isRecord(value) && typeof value.noteId === "string" && typeof value.title === "string" && typeof value.content === "string" && typeof value.createdAt === "string" && typeof value.updatedAt === "string" && typeof value.pinned === "boolean" && typeof value.archived === "boolean" && stringArray(value.tags) && (value.category === undefined || typeof value.category === "string") && ["LOCAL", "FILE_REFERENCE", "VOICE_NOTE", "VOICE_PLACEHOLDER"].includes(String(value.source)) && ["TEXT_NOTE", "FILE_REFERENCE_NOTE", "VOICE_NOTE", "VOICE_NOTE_PLACEHOLDER"].includes(String(value.type)) && typeof value.version === "number" && Number.isInteger(value.version) && value.version >= 1 && isRecord(value.futureFields) && Array.isArray(value.fileReferences) && value.fileReferences.every(validReference);
const parseArray = <T>(storage: StorageLike | undefined, key: string, validator: (value: unknown) => value is T): T[] => { try { const parsed: unknown = JSON.parse(storage?.getItem(key) ?? "[]"); return Array.isArray(parsed) ? parsed.filter(validator) : []; } catch { return []; } };

function scopedKey(base: string, accountScope: string) { return accountScope === "local-default" ? base : `${base}.${encodeURIComponent(accountScope)}`; }
export function notesUiStateKey(accountScope = "local-default") { return scopedKey(NOTES_UI_STATE_KEY, accountScope); }

function createIndexEntry(note: Note): NotesIndexEntry {
  const references = note.fileReferences.flatMap((reference) => [reference.fileId, reference.displayName, reference.fileType ?? "", reference.provider]);
  const contentTerms = tokenize([note.title, note.content, ...note.fileReferences.map((reference) => reference.displayName)].join(" "));
  return { noteId: note.noteId, terms: tokenize([note.title, note.content, note.category ?? "", note.source, note.type, note.createdAt, note.updatedAt, ...references, ...Object.values(note.futureFields).map(String)].join(" ")), contentTerms, tags: note.tags.map(normalize), category: note.category ? normalize(note.category) : undefined, createdAt: note.createdAt, updatedAt: note.updatedAt, pinned: note.pinned, archived: note.archived, fileIds: note.fileReferences.map((reference) => reference.fileId), fileNames: note.fileReferences.map((reference) => normalize(reference.displayName)), voiceMetadata: Object.values(note.futureFields).map(String).map(normalize) };
}

function parseQuery(query: string) {
  const phrases = Array.from(query.matchAll(/"([^\"]+)"/g), (match) => normalize(match[1] ?? "")).filter(Boolean);
  const withoutPhrases = query.replace(/"[^\"]+"/g, " ");
  const tags = Array.from(withoutPhrases.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]+)/gu), (match) => normalize(match[1] ?? "")).filter(Boolean);
  const dateToken = normalize(withoutPhrases).match(/\b(today|yesterday|this week|this month|this year)\b/)?.[1];
  const bucket: Exclude<NoteDateBucket, "ARCHIVE" | "ALL_NOTES"> | undefined = dateToken === "today" ? "TODAY" : dateToken === "yesterday" ? "YESTERDAY" : dateToken === "this week" ? "THIS_WEEK" : dateToken === "this month" ? "THIS_MONTH" : dateToken === "this year" ? "THIS_YEAR" : undefined;
  return { phrases, tags, terms: tokenize(withoutPhrases.replace(/#[\p{L}\p{N}_-]+/gu, " ").replace(/\b(today|yesterday|this week|this month|this year)\b/gi, " ")), bucket };
}

export function noteDateBucket(value: string, reference = new Date()): Exclude<NoteDateBucket, "ARCHIVE"> {
  const target = new Date(value);
  const days = Math.floor(dayStart(reference) - dayStart(target));
  if (days === 0) return "TODAY";
  if (days === 1) return "YESTERDAY";
  if (days >= 0 && days < 7) return "THIS_WEEK";
  if (target.getFullYear() === reference.getFullYear() && target.getMonth() === reference.getMonth()) return "THIS_MONTH";
  if (target.getFullYear() === reference.getFullYear()) return "THIS_YEAR";
  return "ALL_NOTES";
}
function isInDateBucket(value: string, requested: Exclude<NoteDateBucket, "ARCHIVE" | "ALL_NOTES">) { const actual = noteDateBucket(value); return requested === "TODAY" ? actual === "TODAY" : requested === "YESTERDAY" ? actual === "YESTERDAY" : requested === "THIS_WEEK" ? ["TODAY", "YESTERDAY", "THIS_WEEK"].includes(actual) : requested === "THIS_MONTH" ? ["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH"].includes(actual) : ["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH", "THIS_YEAR"].includes(actual); }
function snippet(note: Note, query: string) { const text = `${note.title}\n${note.content}`.trim(); const index = parseQuery(query).terms.reduce((best, term) => { const position = normalize(text).indexOf(term); return position >= 0 && (best < 0 || position < best) ? position : best; }, -1); const start = Math.max(0, (index < 0 ? 0 : index) - 48); return `${start > 0 ? "..." : ""}${text.slice(start, start + 180)}${text.length > start + 180 ? "..." : ""}`; }

export class LocalNotesRepository implements NotesRepository {
  private notes: Note[];
  private index = new Map<string, NotesIndexEntry>();
  private recentOpened: string[];
  private recentSearches: string[];
  private readonly keys: Record<keyof typeof BASE_KEYS, string>;
  constructor(private readonly storage: StorageLike | undefined = typeof localStorage === "undefined" ? undefined : localStorage, private readonly accountScope = "local-default") {
    this.keys = { notes: scopedKey(BASE_KEYS.notes, accountScope), index: scopedKey(BASE_KEYS.index, accountScope), searches: scopedKey(BASE_KEYS.searches, accountScope), opened: scopedKey(BASE_KEYS.opened, accountScope) };
    this.notes = parseArray(storage, this.keys.notes, validNote);
    this.recentOpened = parseArray(storage, this.keys.opened, (value): value is string => typeof value === "string").slice(0, MAX_HISTORY);
    this.recentSearches = parseArray(storage, this.keys.searches, (value): value is string => typeof value === "string").slice(0, MAX_HISTORY);
    const storedIndex = parseArray(storage, this.keys.index, (value): value is NotesIndexEntry => isRecord(value) && typeof value.noteId === "string" && Array.isArray(value.terms) && Array.isArray(value.contentTerms) && Array.isArray(value.tags) && typeof value.updatedAt === "string");
    this.notes.forEach((note) => { const stored = storedIndex.find((entry) => entry.noteId === note.noteId && entry.updatedAt === note.updatedAt); this.index.set(note.noteId, stored ?? createIndexEntry(note)); });
    if (this.index.size !== storedIndex.length || this.notes.some((note) => !storedIndex.some((entry) => entry.noteId === note.noteId && entry.updatedAt === note.updatedAt))) this.persistIndex();
  }
  forAccount(accountScope: string) { return new LocalNotesRepository(this.storage, accountScope || "local-default"); }
  private set(key: string, value: unknown) { try { this.storage?.setItem(key, JSON.stringify(value)); } catch { throw new Error("NOTES_STORAGE_WRITE_FAILED"); } }
  private persist() { this.set(this.keys.notes, this.notes); this.persistIndex(); }
  private persistIndex() { this.set(this.keys.index, [...this.index.values()]); }
  private persistHistory() { this.set(this.keys.opened, this.recentOpened); this.set(this.keys.searches, this.recentSearches); }
  private require(noteId: string) { const note = this.getNote(noteId); if (!note) throw new Error(`Note not found: ${noteId}`); return note; }
  private replace(note: Note) { this.notes = this.notes.map((entry) => entry.noteId === note.noteId ? note : entry); this.index.set(note.noteId, createIndexEntry(note)); this.persist(); return note; }
  createNote(input: Partial<Pick<Note, "title" | "content" | "tags" | "category" | "source" | "type" | "futureFields" | "fileReferences">> = {}) { const timestamp = now(); const note: Note = { noteId: id("note"), title: input.title ?? "Untitled note", content: input.content ?? "", createdAt: timestamp, updatedAt: timestamp, pinned: false, archived: false, tags: input.tags ?? [], category: input.category, source: input.source ?? "LOCAL", type: input.type ?? "TEXT_NOTE", version: 1, futureFields: input.futureFields ?? {}, fileReferences: input.fileReferences ?? [] }; this.notes = [note, ...this.notes]; this.index.set(note.noteId, createIndexEntry(note)); this.persist(); return note; }
  updateNote(noteId: string, update: NoteUpdate) { const current = this.require(noteId); return this.replace({ ...current, ...update, updatedAt: now(), version: current.version + 1 }); }
  deleteNote(noteId: string) { this.require(noteId); this.notes = this.notes.filter((note) => note.noteId !== noteId); this.index.delete(noteId); this.recentOpened = this.recentOpened.filter((idValue) => idValue !== noteId); this.persist(); this.persistHistory(); }
  archiveNote(noteId: string) { const current = this.require(noteId); return this.replace({ ...current, archived: true, updatedAt: now(), version: current.version + 1 }); }
  restoreNote(noteId: string) { const current = this.require(noteId); return this.replace({ ...this.require(noteId), archived: false, updatedAt: now(), version: current.version + 1 }); }
  pinNote(noteId: string) { const current = this.require(noteId); return this.replace({ ...current, pinned: true, updatedAt: now(), version: current.version + 1 }); }
  unpinNote(noteId: string) { const current = this.require(noteId); return this.replace({ ...current, pinned: false, updatedAt: now(), version: current.version + 1 }); }
  getNote(noteId: string) { return this.notes.find((note) => note.noteId === noteId); }
  private matches(entry: NotesIndexEntry, options: NotesSearchOptions) { if (!options.includeArchived && options.bucket !== "ARCHIVE" && entry.archived) return false; if (options.pinned !== undefined && entry.pinned !== options.pinned) return false; if (options.hasFileReferences !== undefined && (entry.fileIds.length > 0) !== options.hasFileReferences) return false; if (options.category && entry.category !== normalize(options.category)) return false; if (options.tag && !entry.tags.includes(normalize(options.tag))) return false; if (options.bucket && (options.bucket === "ARCHIVE" ? !entry.archived : entry.archived || (options.bucket !== "ALL_NOTES" && noteDateBucket(entry.updatedAt) !== options.bucket))) return false; if (options.dateFrom && entry.updatedAt < options.dateFrom) return false; if (options.dateTo && entry.updatedAt > options.dateTo) return false; if (options.recent && !this.recentOpened.includes(entry.noteId)) return false; return true; }
  private sort(notes: Note[], sort: NotesSort = "UPDATED_DESC") { return notes.sort((left, right) => { if (sort === "TITLE_ASC" || sort === "TITLE_DESC") return (sort === "TITLE_ASC" ? 1 : -1) * left.title.localeCompare(right.title) || left.noteId.localeCompare(right.noteId); if (sort === "CREATED_ASC" || sort === "CREATED_DESC") return (sort === "CREATED_ASC" ? 1 : -1) * left.createdAt.localeCompare(right.createdAt) || left.noteId.localeCompare(right.noteId); if (sort === "UPDATED_ASC" || sort === "UPDATED_DESC") return (sort === "UPDATED_ASC" ? 1 : -1) * left.updatedAt.localeCompare(right.updatedAt) || left.noteId.localeCompare(right.noteId); return Number(right.pinned) - Number(left.pinned) || right.updatedAt.localeCompare(left.updatedAt) || left.noteId.localeCompare(right.noteId); }); }
  getNotes(options: NotesSearchOptions = {}) { return this.sort(this.notes.filter((note) => { const entry = this.index.get(note.noteId); return entry ? this.matches(entry, options) : false; }), options.sort).slice(0, options.limit); }
  searchNotesDetailed(query: string, options: NotesSearchOptions = {}) { const parsed = parseQuery(query); const results = this.notes.filter((note) => { const entry = this.index.get(note.noteId); if (!entry || !this.matches(entry, options) || (parsed.bucket && !isInDateBucket(entry.updatedAt, parsed.bucket))) return false; const text = normalize(`${note.title} ${note.content} ${note.category ?? ""} ${entry.fileNames.join(" ")} ${entry.voiceMetadata.join(" ")}`); return parsed.phrases.every((phrase) => text.includes(phrase)) && parsed.tags.every((tag) => entry.tags.includes(tag)) && parsed.terms.every((term) => entry.terms.some((indexed) => indexed.includes(term))); }).map((note) => ({ note, snippet: snippet(note, query), fileReferenceCount: note.fileReferences.length })); if (options.sort) { const ordered = this.sort(results.map((result) => result.note), options.sort); return ordered.map((note) => results.find((result) => result.note.noteId === note.noteId)!); } return results.sort((left, right) => Number(normalize(left.note.title).includes(normalize(query))) - Number(normalize(right.note.title).includes(normalize(query))) || right.note.updatedAt.localeCompare(left.note.updatedAt)).reverse().slice(0, options.limit); }
  searchNotes(query: string, options: NotesSearchOptions = {}) { return this.searchNotesDetailed(query, options).map((result) => result.note); }
  getNotesReferencingFile(fileId: string, provider?: string) { if (!fileId) return []; return this.notes.filter((note) => !note.archived && note.fileReferences.some((reference) => reference.fileId === fileId && (provider === undefined || reference.provider === provider))); }
  getRecentNotes(kind: "CREATED" | "UPDATED" | "OPENED" = "UPDATED", limit = MAX_HISTORY) { if (kind === "OPENED") return this.recentOpened.map((noteId) => this.getNote(noteId)).filter((note): note is Note => Boolean(note)).slice(0, limit); return this.sort(this.notes.filter((note) => !note.archived), kind === "CREATED" ? "CREATED_DESC" : "UPDATED_DESC").slice(0, limit); }
  recordNoteOpened(noteId: string) { this.require(noteId); this.recentOpened = [noteId, ...this.recentOpened.filter((idValue) => idValue !== noteId)].slice(0, MAX_HISTORY); this.persistHistory(); }
  getRecentSearches() { return [...this.recentSearches]; }
  recordSearch(query: string) { const value = query.trim(); if (!value) return; this.recentSearches = [value, ...this.recentSearches.filter((entry) => entry !== value)].slice(0, MAX_HISTORY); this.persistHistory(); }
  removeRecentSearch(query: string) { this.recentSearches = this.recentSearches.filter((entry) => entry !== query); this.persistHistory(); }
  clearRecentSearches() { this.recentSearches = []; this.persistHistory(); }
  getRelatedNotes(noteId: string, limit = 5) { const source = this.require(noteId); const sourceIndex = this.index.get(noteId)!; return this.notes.filter((note) => note.noteId !== noteId && !note.archived).map((note) => ({ note, score: this.relatedScore(source, sourceIndex, note) })).filter((entry) => entry.score > 0).sort((left, right) => right.score - left.score || right.note.updatedAt.localeCompare(left.note.updatedAt) || left.note.noteId.localeCompare(right.note.noteId)).slice(0, limit).map((entry) => entry.note); }
  private relatedScore(source: Note, sourceIndex: NotesIndexEntry, candidate: Note) { const index = this.index.get(candidate.noteId)!; return source.tags.filter((tag) => candidate.tags.some((item) => normalize(item) === normalize(tag))).length * 5 + (source.category && candidate.category && normalize(source.category) === normalize(candidate.category) ? 3 : 0) + source.fileReferences.filter((reference) => candidate.fileReferences.some((item) => item.fileId === reference.fileId)).length * 6 + (noteDateBucket(source.updatedAt) === noteDateBucket(candidate.updatedAt) ? 1 : 0) + sourceIndex.contentTerms.filter((term) => term.length > 3 && index.contentTerms.includes(term)).slice(0, 8).length; }
  getIndexEntry(noteId: string) { return this.index.get(noteId); }
}

export const notesRepository = new LocalNotesRepository();
