import { useState, useEffect, useRef } from "react";
import type { Note, NoteDateBucket } from "@onyx/workspace-contracts";
import { noteDateBucket, notesRepository, notesUiStateKey, type NotesSearchResult, type NotesSort } from "../notesRepository";
import { selectLocalFile } from "../localFilesProvider";
import { DEFAULT_CATEGORY_GROUPS, DEFAULT_TAGS, CREATE_NEW_CATEGORY_VALUE } from "../noteDefaults";

const NAV_ITEMS: readonly { id: NoteDateBucket | "PINNED"; label: string }[] = [
  { id: "PINNED", label: "Pinned" },
  { id: "TODAY", label: "Today" },
  { id: "THIS_WEEK", label: "This Week" },
  { id: "THIS_MONTH", label: "This Month" },
  { id: "THIS_YEAR", label: "This Year" },
  { id: "ALL_NOTES", label: "All Notes" },
  { id: "ARCHIVE", label: "Archive" },
];

type NotesUiState = {
  selectedId?: string;
  query: string;
  filter: NoteDateBucket | "PINNED";
  sort: NotesSort;
  pinned: boolean;
  includeArchived: boolean;
  hasFileReferences: boolean;
  recent: boolean;
  category: string;
  tag: string;
  dateFrom: string;
  dateTo: string;
  historyYear?: number;
  historyMonth?: number;
  scrollTop?: number;
};
const defaultState: NotesUiState = { query: "", filter: "ALL_NOTES", sort: "UPDATED_DESC", pinned: false, includeArchived: false, hasFileReferences: false, recent: false, category: "", tag: "", dateFrom: "", dateTo: "" };

type SectionKey = "date" | "history" | "filters" | "categories" | "tags";
const defaultOpenSections: Record<SectionKey, boolean> = { date: true, history: false, filters: true, categories: false, tags: false };

function readUiState(accountScope: string): NotesUiState {
  try {
    return typeof localStorage === "undefined" ? defaultState : { ...defaultState, ...(JSON.parse(localStorage.getItem(notesUiStateKey(accountScope)) ?? "{}") as Partial<NotesUiState>) };
  } catch {
    return defaultState;
  }
}

// A note is a member of every date bucket at or above its actual bucket (Today counts toward This Week, This Month, and This Year too).
function isCumulativeBucket(note: Note, bucket: NoteDateBucket): boolean {
  if (note.archived) return false;
  const actual = noteDateBucket(note.updatedAt);
  if (bucket === "TODAY") return actual === "TODAY";
  if (bucket === "THIS_WEEK") return ["TODAY", "YESTERDAY", "THIS_WEEK"].includes(actual);
  if (bucket === "THIS_MONTH") return ["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH"].includes(actual);
  if (bucket === "THIS_YEAR") return ["TODAY", "YESTERDAY", "THIS_WEEK", "THIS_MONTH", "THIS_YEAR"].includes(actual);
  return true;
}

function navCount(notes: readonly Note[], id: NoteDateBucket | "PINNED"): number {
  if (id === "PINNED") return notes.filter((note) => note.pinned && !note.archived).length;
  if (id === "ARCHIVE") return notes.filter((note) => note.archived).length;
  if (id === "ALL_NOTES") return notes.filter((note) => !note.archived).length;
  return notes.filter((note) => isCumulativeBucket(note, id)).length;
}

function resultRow(result: NotesSearchResult, onSelect: () => void) {
  return (
    <button type="button" className="note-row" onClick={onSelect}>
      <strong>{result.note.pinned ? "★ " : ""}{result.note.title}</strong>
      <span>{result.snippet || "Empty note"}</span>
      <small>
        {result.note.tags.length ? `#${result.note.tags.join(" #")} · ` : ""}
        {result.note.category ?? "Uncategorised"} · {new Date(result.note.updatedAt).toLocaleString()} · {result.fileReferenceCount} file reference{result.fileReferenceCount === 1 ? "" : "s"}
      </small>
    </button>
  );
}

function customCategories(notes: readonly Note[]): readonly string[] {
  const known = new Set(DEFAULT_CATEGORY_GROUPS.flatMap((group) => group.categories));
  const used = notes.map((note) => note.category).filter((value): value is string => typeof value === "string" && value.length > 0 && !known.has(value));
  return Array.from(new Set(used)).sort();
}

// Default tags first (stable), then locally observed tags ranked by usage frequency.
function tagSuggestions(notes: readonly Note[]): readonly string[] {
  const counts = new Map<string, number>();
  notes.forEach((note) => { if (!note.archived) note.tags.forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1)); });
  const extra = Array.from(counts.keys()).filter((tag) => !DEFAULT_TAGS.includes(tag)).sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0));
  return [...DEFAULT_TAGS, ...extra];
}

export function NotesPanel({ accountScope = "local-default" }: { readonly accountScope?: string }) {
  const repository = notesRepository.forAccount(accountScope);
  const [ui, setUi] = useState<NotesUiState>(() => readUiState(accountScope));
  const [notes, setNotes] = useState<readonly Note[]>(() => repository.getNotes({ includeArchived: true }));
  const [draft, setDraft] = useState<Pick<Note, "title" | "content"> | null>(null);
  const [referenceDraft, setReferenceDraft] = useState({ fileId: "", displayName: "", provider: "local", fileType: "" });
  const [tagDraft, setTagDraft] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [recentSearches, setRecentSearches] = useState<readonly string[]>(() => repository.getRecentSearches());
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>(defaultOpenSections);
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const scrollPersistTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refresh = () => setNotes(repository.getNotes({ includeArchived: true }));
  useEffect(() => { setUi(readUiState(accountScope)); setNotes(repository.getNotes({ includeArchived: true })); setRecentSearches(repository.getRecentSearches()); setDraft(null); }, [accountScope]);
  useEffect(() => () => { if (scrollPersistTimer.current) clearTimeout(scrollPersistTimer.current); }, []);
  useEffect(() => { try { localStorage.setItem(notesUiStateKey(accountScope), JSON.stringify(ui)); } catch { /* optional UI cache */ } }, [accountScope, ui]);

  const toggleSection = (key: SectionKey) => (event: React.SyntheticEvent<HTMLDetailsElement>) => {
    const isOpen = event.currentTarget.open;
    setOpenSections((current) => ({ ...current, [key]: isOpen }));
  };

  const options = { includeArchived: ui.includeArchived || ui.filter === "ARCHIVE", pinned: ui.pinned || ui.filter === "PINNED" ? true : undefined, hasFileReferences: ui.hasFileReferences ? true : undefined, recent: ui.recent ? true : undefined, bucket: ui.filter === "PINNED" ? undefined : ui.filter, category: ui.category || undefined, tag: ui.tag || undefined, dateFrom: ui.dateFrom || undefined, dateTo: ui.dateTo || undefined, sort: ui.sort };
  const results = ui.query.trim() ? repository.searchNotesDetailed(ui.query, options) : repository.getNotes(options).map((note) => ({ note, snippet: `${note.title}\n${note.content}`.trim().slice(0, 180), fileReferenceCount: note.fileReferences.length }));
  const selected = notes.find((note) => note.noteId === ui.selectedId);
  const related = selected ? repository.getRelatedNotes(selected.noteId, 4) : [];
  const updateUi = (change: Partial<NotesUiState>) => setUi((current) => ({ ...current, ...change }));

  const saveDraft = () => { if (!draft || !selected) return; repository.updateNote(selected.noteId, draft); refresh(); };
  const selectNote = (note: Note) => { saveDraft(); repository.recordNoteOpened(note.noteId); updateUi({ selectedId: note.noteId }); setDraft({ title: note.title, content: note.content }); setCreatingCategory(false); };
  const startNew = () => { saveDraft(); const created = repository.createNote(); updateUi({ selectedId: created.noteId }); setDraft({ title: created.title, content: created.content }); setCreatingCategory(false); refresh(); };
  const submitSearch = () => { repository.recordSearch(ui.query); setRecentSearches(repository.getRecentSearches()); };

  const addReference = () => { if (!selected) return; saveDraft(); repository.updateNote(selected.noteId, { fileReferences: [...selected.fileReferences, { referenceId: `reference-${Date.now()}`, fileId: referenceDraft.fileId, provider: referenceDraft.provider, displayName: referenceDraft.displayName, fileType: referenceDraft.fileType || undefined, referencedAt: new Date().toISOString() }] }); setReferenceDraft({ fileId: "", displayName: "", provider: "local", fileType: "" }); refresh(); };
  const linkLocalFile = async () => { if (!selected) return; setLinkBusy(true); try { const picked = await selectLocalFile(); if (picked) setReferenceDraft({ fileId: picked.projection.selectionId, displayName: picked.projection.name, provider: "local", fileType: picked.projection.mimeType }); } finally { setLinkBusy(false); } };
  const removeReference = (referenceId: string) => { if (!selected) return; repository.updateNote(selected.noteId, { fileReferences: selected.fileReferences.filter((item) => item.referenceId !== referenceId) }); refresh(); };

  const addTagValue = (value: string) => { if (!selected) return; const tag = value.trim().toLocaleLowerCase().replace(/^#/, "").slice(0, 40); if (!tag || selected.tags.includes(tag) || selected.tags.length >= 20) return; saveDraft(); repository.updateNote(selected.noteId, { tags: [...selected.tags, tag] }); setTagDraft(""); refresh(); };
  const removeTag = (tag: string) => { if (!selected) return; repository.updateNote(selected.noteId, { tags: selected.tags.filter((entry) => entry !== tag) }); refresh(); };

  const setNoteCategory = (value: string) => { if (!selected) return; if (value === CREATE_NEW_CATEGORY_VALUE) { setCreatingCategory(true); setCategoryDraft(""); return; } setCreatingCategory(false); saveDraft(); repository.updateNote(selected.noteId, { category: value || undefined }); refresh(); };
  const commitNewCategory = () => { if (!selected) return; const value = categoryDraft.trim(); setCreatingCategory(false); if (!value) return; saveDraft(); repository.updateNote(selected.noteId, { category: value }); refresh(); };

  const historyYears = Array.from(new Set(notes.map((note) => new Date(note.updatedAt).getFullYear()))).sort((a, b) => b - a);
  const historyMonths = ui.historyYear ? Array.from(new Set(notes.filter((note) => new Date(note.updatedAt).getFullYear() === ui.historyYear).map((note) => new Date(note.updatedAt).getMonth()))).sort((a, b) => b - a) : [];
  const historyCount = (year: number, month?: number) => notes.filter((note) => { const date = new Date(note.updatedAt); return !note.archived && date.getFullYear() === year && (month === undefined || date.getMonth() === month); }).length;
  const selectHistoryYear = (year: number) => updateUi({ dateFrom: `${year}-01-01`, dateTo: `${year}-12-31`, historyYear: year, historyMonth: undefined });
  const selectHistoryMonth = (year: number, month: number) => updateUi({ dateFrom: `${year}-${String(month + 1).padStart(2, "0")}-01`, dateTo: `${year}-${String(month + 1).padStart(2, "0")}-${new Date(year, month + 1, 0).getDate()}`, historyYear: year, historyMonth: month });

  const categoryCustomGroup = customCategories(notes);
  const quickTags = tagSuggestions(notes).slice(0, 24);
  const usedTagOptions = Array.from(new Set([...DEFAULT_TAGS, ...notes.flatMap((note) => note.tags)])).sort();

  return (
    <section className="notes-panel" aria-labelledby="notes-heading">
      <header className="notes-header">
        <div>
          <p className="notes-kicker">Local knowledge layer</p>
          <h2 id="notes-heading">Notes</h2>
          <p>Offline search and file references. Intelligence is disabled.</p>
        </div>
        <button type="button" onClick={startNew}>+ New Note</button>
      </header>

      <div className="notes-searchbar">
        <input aria-label="Search notes" value={ui.query} onChange={(event) => updateUi({ query: event.target.value })} onKeyDown={(event) => { if (event.key === "Enter") submitSearch(); }} placeholder="Search notes, phrases, or #tags" />
        <button type="button" onClick={submitSearch}>Search</button>
        <select aria-label="Sort notes" value={ui.sort} onChange={(event) => updateUi({ sort: event.target.value as NotesSort })}>
          <option value="UPDATED_DESC">Updated newest</option>
          <option value="UPDATED_ASC">Updated oldest</option>
          <option value="CREATED_DESC">Created newest</option>
          <option value="CREATED_ASC">Created oldest</option>
          <option value="TITLE_ASC">A-Z</option>
          <option value="TITLE_DESC">Z-A</option>
          <option value="PINNED_FIRST">Pinned first</option>
        </select>
      </div>

      <div className="notes-layout">
        <nav aria-label="Notes navigation" className="notes-nav">
          <p className="notes-nav-heading">Search Filters</p>

          <details open={openSections.date} onToggle={toggleSection("date")} className="notes-filter-group">
            <summary>Date</summary>
            <div className="notes-nav-buttons">
              {NAV_ITEMS.filter((item) => item.id !== "PINNED" && item.id !== "ARCHIVE").map((item) => (
                <button type="button" key={item.id} className={ui.filter === item.id ? "active" : ""} onClick={() => updateUi({ filter: item.id, historyYear: undefined, historyMonth: undefined })}>
                  {item.label}<span>{navCount(notes, item.id)}</span>
                </button>
              ))}
            </div>
          </details>

          <details open={openSections.history} onToggle={toggleSection("history")} className="notes-filter-group">
            <summary>History</summary>
            {historyYears.length === 0 && <p className="notes-empty-hint">No dated notes yet.</p>}
            {historyYears.map((year) => (
              <div key={year} className="notes-history-year">
                <button type="button" className={ui.historyYear === year && ui.historyMonth === undefined ? "active" : ""} onClick={() => selectHistoryYear(year)}>{year} ({historyCount(year)})</button>
                {ui.historyYear === year && historyMonths.map((month) => (
                  <button type="button" className={`notes-history-month ${ui.historyMonth === month ? "active" : ""}`} key={month} onClick={() => selectHistoryMonth(year, month)}>
                    {new Date(year, month).toLocaleString(undefined, { month: "long" })} ({historyCount(year, month)})
                  </button>
                ))}
              </div>
            ))}
          </details>

          <details open={openSections.filters} onToggle={toggleSection("filters")} className="notes-filter-group">
            <summary>Filters</summary>
            <div className="notes-nav-buttons">
              <button type="button" className={ui.filter === "PINNED" ? "active" : ""} onClick={() => updateUi({ filter: "PINNED" })}>Pinned<span>{navCount(notes, "PINNED")}</span></button>
              <button type="button" className={ui.filter === "ARCHIVE" ? "active" : ""} onClick={() => updateUi({ filter: "ARCHIVE" })}>Archive<span>{navCount(notes, "ARCHIVE")}</span></button>
            </div>
            <label className="notes-checkbox-row"><span>Has file references</span><input type="checkbox" checked={ui.hasFileReferences} onChange={(event) => updateUi({ hasFileReferences: event.target.checked })} /></label>
            <label className="notes-checkbox-row"><span>Include archived</span><input type="checkbox" checked={ui.includeArchived} onChange={(event) => updateUi({ includeArchived: event.target.checked })} /></label>
            <label className="notes-checkbox-row"><span>Recently opened</span><input type="checkbox" checked={ui.recent} onChange={(event) => updateUi({ recent: event.target.checked })} /></label>
            <label className="notes-date-range">
              Date range
              <input aria-label="Date from" type="date" value={ui.dateFrom} onChange={(event) => updateUi({ dateFrom: event.target.value, historyYear: undefined, historyMonth: undefined })} />
              <input aria-label="Date to" type="date" value={ui.dateTo} onChange={(event) => updateUi({ dateTo: event.target.value, historyYear: undefined, historyMonth: undefined })} />
            </label>
          </details>

          <details open={openSections.categories} onToggle={toggleSection("categories")} className="notes-filter-group">
            <summary>Categories</summary>
            <label>
              Category
              <select aria-label="Filter category" value={ui.category} onChange={(event) => updateUi({ category: event.target.value })}>
                <option value="">All categories</option>
                {DEFAULT_CATEGORY_GROUPS.map((group) => (
                  <optgroup label={group.group} key={group.group}>
                    {group.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </optgroup>
                ))}
                {categoryCustomGroup.length > 0 && (
                  <optgroup label="Custom">
                    {categoryCustomGroup.map((category) => <option key={category} value={category}>{category}</option>)}
                  </optgroup>
                )}
              </select>
            </label>
          </details>

          <details open={openSections.tags} onToggle={toggleSection("tags")} className="notes-filter-group">
            <summary>Tags</summary>
            <div className="notes-tag-chips">
              {quickTags.map((tag) => (
                <button type="button" key={tag} className={ui.tag === tag ? "active" : ""} onClick={() => updateUi({ tag: ui.tag === tag ? "" : tag })}>#{tag}</button>
              ))}
            </div>
            <input aria-label="Filter tag" placeholder="Search a tag" value={ui.tag} onChange={(event) => updateUi({ tag: event.target.value.replace(/^#/, "") })} list="notes-tag-options" />
          </details>

          {recentSearches.length > 0 && (
            <aside className="notes-recent-searches">
              <strong>Recent searches</strong>
              {recentSearches.map((query) => <button type="button" key={query} onClick={() => updateUi({ query })}>{query}</button>)}
              <button type="button" onClick={() => { repository.clearRecentSearches(); setRecentSearches([]); }}>Clear history</button>
            </aside>
          )}
        </nav>

        <div
          className="notes-list"
          aria-label="Notes results"
          ref={(element) => { if (element && ui.scrollTop) element.scrollTop = ui.scrollTop; }}
          onScroll={(event) => {
            const position = event.currentTarget.scrollTop;
            if (scrollPersistTimer.current) clearTimeout(scrollPersistTimer.current);
            scrollPersistTimer.current = setTimeout(() => updateUi({ scrollTop: position }), 120);
          }}
        >
          <div className="notes-result-summary" aria-live="polite">{results.length} result{results.length === 1 ? "" : "s"}</div>
          {results.length === 0 ? (
            <div className="notes-empty">
              <strong>No Notes Found</strong>
              <span>Try clearing search or filters.</span>
              <button type="button" onClick={startNew}>Create Note</button>
              <button type="button" onClick={() => updateUi({ query: "" })}>Clear Search</button>
            </div>
          ) : results.map((result) => <div key={result.note.noteId}>{resultRow(result, () => selectNote(result.note))}</div>)}
        </div>

        <article className="notes-editor" aria-label="Note editor">
          {draft ? (
            <>
              <input aria-label="Note title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} onBlur={saveDraft} />
              <textarea aria-label="Note content" value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} onBlur={saveDraft} rows={12} />
              <div className="notes-editor-meta">
                <span>{draft.content.length} characters</span>
                <span>{selected ? `Last modified ${new Date(selected.updatedAt).toLocaleString()}` : "Not saved"}</span>
              </div>

              {selected && (
                <label className="notes-category-form">
                  Category
                  <select aria-label="Note category" value={creatingCategory ? CREATE_NEW_CATEGORY_VALUE : (selected.category ?? "")} onChange={(event) => setNoteCategory(event.target.value)}>
                    <option value="">No category</option>
                    {DEFAULT_CATEGORY_GROUPS.map((group) => (
                      <optgroup label={group.group} key={group.group}>
                        {group.categories.map((category) => <option key={category} value={category}>{category}</option>)}
                      </optgroup>
                    ))}
                    {categoryCustomGroup.length > 0 && (
                      <optgroup label="Custom">
                        {categoryCustomGroup.map((category) => <option key={category} value={category}>{category}</option>)}
                      </optgroup>
                    )}
                    <option value={CREATE_NEW_CATEGORY_VALUE}>+ Create new category…</option>
                  </select>
                  {creatingCategory && <input aria-label="New category name" autoFocus value={categoryDraft} onChange={(event) => setCategoryDraft(event.target.value)} onBlur={commitNewCategory} onKeyDown={(event) => { if (event.key === "Enter") commitNewCategory(); }} placeholder="New category name" />}
                </label>
              )}

              {selected && (
                <fieldset className="notes-tag-form">
                  <legend>Tags</legend>
                  <div className="notes-tag-chips">
                    {selected.tags.map((tag) => <button type="button" key={tag} onClick={() => removeTag(tag)} aria-label={`Remove tag ${tag}`}>#{tag} ×</button>)}
                  </div>
                  <select aria-label="Add suggested tag" value="" onChange={(event) => addTagValue(event.target.value)}>
                    <option value="">Add a suggested tag…</option>
                    {quickTags.filter((tag) => !selected.tags.includes(tag)).map((tag) => <option key={tag} value={tag}>#{tag}</option>)}
                  </select>
                  <input aria-label="Add tag" placeholder="Add tag" value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") addTagValue(tagDraft); }} list="notes-tag-options" />
                  <button type="button" onClick={() => addTagValue(tagDraft)} disabled={!tagDraft.trim() || selected.tags.length >= 20}>Add tag</button>
                </fieldset>
              )}

              <div className="notes-actions">
                <button type="button" onClick={saveDraft}>Save</button>
                {selected && (
                  <>
                    <button type="button" onClick={() => { selected.pinned ? repository.unpinNote(selected.noteId) : repository.pinNote(selected.noteId); refresh(); }}>{selected.pinned ? "Unpin" : "Pin"}</button>
                    <button type="button" onClick={() => { saveDraft(); selected.archived ? repository.restoreNote(selected.noteId) : repository.archiveNote(selected.noteId); refresh(); }}>{selected.archived ? "Restore" : "Archive"}</button>
                    <button type="button" onClick={() => { repository.deleteNote(selected.noteId); updateUi({ selectedId: undefined }); setDraft(null); refresh(); }}>Delete</button>
                  </>
                )}
              </div>

              {selected && (
                <fieldset className="notes-reference-form">
                  <legend>Link a file reference</legend>
                  <button type="button" onClick={() => void linkLocalFile()} disabled={linkBusy}>{linkBusy ? "Selecting file…" : "Link File"}</button>
                  <input aria-label="File display name" placeholder="Display name" value={referenceDraft.displayName} onChange={(event) => setReferenceDraft({ ...referenceDraft, displayName: event.target.value })} />
                  <button type="button" disabled={!referenceDraft.fileId || !referenceDraft.displayName} onClick={addReference}>Save reference</button>
                </fieldset>
              )}

              {selected?.fileReferences.length ? (
                <aside>
                  <strong>References</strong>
                  {selected.fileReferences.map((reference) => (
                    <div key={reference.referenceId}>
                      <span>{reference.displayName} <small>{reference.fileType ?? reference.provider}</small></span>
                      <button type="button" onClick={() => removeReference(reference.referenceId)}>Remove Reference</button>
                    </div>
                  ))}
                </aside>
              ) : null}

              {related.length > 0 && (
                <aside className="notes-related">
                  <strong>Related notes</strong>
                  {related.map((note) => <button type="button" key={note.noteId} onClick={() => selectNote(note)}>{note.title}</button>)}
                </aside>
              )}
            </>
          ) : (
            <p>Select a note or create one to begin.</p>
          )}
        </article>
      </div>

      <datalist id="notes-tag-options">
        {usedTagOptions.map((tag) => <option key={tag} value={tag} />)}
      </datalist>
    </section>
  );
}
