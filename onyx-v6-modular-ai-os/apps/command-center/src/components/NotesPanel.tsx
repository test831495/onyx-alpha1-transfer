import { useState, useEffect, useRef } from "react";
import type { Note, NoteDateBucket } from "@onyx/workspace-contracts";
import { noteDateBucket, notesRepository, notesUiStateKey, type NotesSearchResult, type NotesSort } from "../notesRepository";
import { selectLocalFile } from "../localFilesProvider";
import { DEFAULT_CATEGORY_GROUPS, DEFAULT_TAGS, CREATE_NEW_CATEGORY_VALUE } from "../noteDefaults";
import { VoiceNoteAudioRepository } from "../voiceNoteAudioRepository";
import { VoiceNoteRecordingRuntime, VoiceNoteRecordingError } from "../voiceNoteRecordingRuntime";
import { deleteVoiceNoteAudioAndMetadata } from "../voiceNotePersistenceService";
import { VoiceNotePlaybackController, VoiceNotePlaybackError, type VoiceNotePlaybackProjection } from "../voiceNotePlaybackController";
import { defaultTrimmedVoiceNoteTitle, friendlyVoiceNoteMediaLabel, isValidTrimRange, normalizeVoiceNoteTitle } from "../voiceNoteContracts";
import { saveTrimmedVoiceNoteClip } from "../voiceNoteTrimService";

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
  const voice = result.note.type === "VOICE_NOTE";
  const duration = voice && typeof result.note.futureFields.durationMilliseconds === "number" ? ` · ${Math.round(result.note.futureFields.durationMilliseconds / 1000)}s` : "";
  return (
    <button type="button" className="note-row" onClick={onSelect}>
      <strong>{result.note.pinned ? "★ " : ""}{result.note.title}</strong>
      <span>{result.snippet || "Empty note"}</span>
      <small>
        {voice ? <b className="voice-note-badge">Voice Note</b> : null}
        {result.note.tags.length ? `#${result.note.tags.join(" #")} · ` : ""}
        {result.note.category ?? "Uncategorised"}{duration} · {new Date(result.note.updatedAt).toLocaleString()} · {result.fileReferenceCount} file reference{result.fileReferenceCount === 1 ? "" : "s"}
      </small>
    </button>
  );
}

function formatDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function playbackErrorMessage(code?: string): string {
  if (code === "AUDIO_NOT_FOUND") return "Saved audio could not be found.";
  if (code === "PLAYBACK_NOT_ALLOWED") return "Playback was blocked by the browser. Press Play to try again.";
  if (code === "PLAYBACK_FORMAT_UNSUPPORTED") return "This device does not support the saved audio format.";
  if (code === "PLAYBACK_ABORTED") return "Audio loading was interrupted.";
  if (code === "INVALID_SEEK_TARGET") return "That playback position is not available yet.";
  if (code) return "Saved audio could not be loaded.";
  return "";
}

function recordingErrorMessage(code?: string): string {
  if (code === "FORMAT_UNSUPPORTED") return "No compatible local audio format is available on this device.";
  if (code === "RECORDER_OUTPUT_FORMAT_CONFLICT") return "The browser returned inconsistent audio format information. Nothing was saved.";
  if (code === "RECORDER_OUTPUT_FORMAT_UNKNOWN") return "The browser did not report a usable audio format. Nothing was saved.";
  return code ?? "Recording could not be started.";
}

function browserCanPlayType(mimeType: string): "probably" | "maybe" | "" | undefined {
  if (typeof document === "undefined") return undefined;
  const audio = document.createElement("audio");
  if (typeof audio.canPlayType !== "function") return undefined;
  const result = audio.canPlayType(mimeType);
  return result === "probably" || result === "maybe" ? result : "";
}

function browserIsTypeSupported(mimeType: string): boolean {
  return globalThis.MediaRecorder.isTypeSupported(mimeType);
}

function VoiceNoteSection({ accountScope, repository, selected, refresh, audioRepository }: { readonly accountScope: string; readonly repository: ReturnType<typeof notesRepository.forAccount>; readonly selected?: Note; readonly refresh: () => void; readonly audioRepository: VoiceNoteAudioRepository }) {
  const runtime = useRef<VoiceNoteRecordingRuntime | undefined>(undefined);
  const playbackController = useRef<VoiceNotePlaybackController | undefined>(undefined);
  const [state, setState] = useState("IDLE");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [playbackError, setPlaybackError] = useState("");
  const [playback, setPlayback] = useState<VoiceNotePlaybackProjection>({ state: "IDLE", current: 0, duration: 0 });
  const [reviewTitle, setReviewTitle] = useState("");
  const [renamingNoteId, setRenamingNoteId] = useState<string | undefined>(undefined);
  const [renameDraft, setRenameDraft] = useState("");
  const [trimNoteId, setTrimNoteId] = useState<string | undefined>(undefined);
  const [trimStartMs, setTrimStartMs] = useState(0);
  const [trimEndMs, setTrimEndMs] = useState(0);
  const [trimTitle, setTrimTitle] = useState("");
  const [trimError, setTrimError] = useState("");
  const voiceNotes = repository.getNotes({ includeArchived: false }).filter((note) => note.type === "VOICE_NOTE");

  const mediaRecorderTypeSupported = typeof globalThis.MediaRecorder !== "undefined" && typeof globalThis.MediaRecorder.isTypeSupported === "function" ? browserIsTypeSupported : undefined;
  if (!runtime.current) runtime.current = new VoiceNoteRecordingRuntime({ accountScopeId: accountScope, notesRepository: repository, audioRepository, mediaRecorderTypeSupported, mediaCanPlayType: browserCanPlayType });
  if (!playbackController.current) playbackController.current = new VoiceNotePlaybackController({ accountScopeId: accountScope, audioRepository });
  useEffect(() => {
    runtime.current?.dispose();
    runtime.current = new VoiceNoteRecordingRuntime({ accountScopeId: accountScope, notesRepository: repository, audioRepository, mediaRecorderTypeSupported, mediaCanPlayType: browserCanPlayType });
    const timer = typeof window === "undefined" ? undefined : window.setInterval(() => { if (typeof window !== "undefined" && runtime.current) { setState(runtime.current.state); setElapsed(runtime.current.elapsedMilliseconds); } }, 100);
    const unsubscribe = playbackController.current?.subscribe((projection) => { setPlayback(projection); if (projection.errorCode) setPlaybackError(playbackErrorMessage(projection.errorCode)); });
    return () => { if (timer !== undefined && typeof window !== "undefined") window.clearInterval(timer); runtime.current?.dispose(); playbackController.current?.dispose(); unsubscribe?.(); };
  }, [accountScope]);
  useEffect(() => {
    if (selected && selected.type !== "VOICE_NOTE") playbackController.current?.dispose();
  }, [selected?.noteId, selected?.type]);
  useEffect(() => {
    if (playback.noteId && !voiceNotes.some((note) => note.noteId === playback.noteId)) playbackController.current?.dispose();
  }, [playback.noteId, voiceNotes.length]);
  useEffect(() => {
    if (state === "REVIEW_READY" && runtime.current?.reviewDraft) setReviewTitle(runtime.current.reviewDraft.suggestedTitle);
  }, [state]);

  const start = async () => { setError(""); playbackController.current?.pause(); try { await runtime.current?.start(); setState(runtime.current?.state ?? "IDLE"); } catch (value) { setError(recordingErrorMessage(value instanceof VoiceNoteRecordingError ? value.code : "UNKNOWN_RECORDING_FAILURE")); setState(runtime.current?.state ?? "FAILED"); } };
  const stop = async () => { setError(""); try { await runtime.current?.stop(); setState(runtime.current?.state ?? "STOPPING"); } catch (value) { setError(value instanceof VoiceNoteRecordingError ? value.code : "UNKNOWN_RECORDING_FAILURE"); } };
  const save = async () => {
    const trimmedTitle = reviewTitle.trim();
    if (!trimmedTitle) { setError("VOICE_NOTE_TITLE_REQUIRED"); return; }
    try { runtime.current?.setReviewTitle(trimmedTitle); await runtime.current?.save(); setState(runtime.current?.state ?? "SAVED"); refresh(); }
    catch (value) { setError(value instanceof VoiceNoteRecordingError ? value.code : "AUDIO_SAVE_FAILED"); setState(runtime.current?.state ?? "REVIEW_READY"); }
  };
  const discard = () => { runtime.current?.discard(); setState(runtime.current?.state ?? "IDLE"); };
  const loadPlayback = async (note: Note) => {
    setPlaybackError("");
    try { await playbackController.current?.play(note); } catch (value) { setPlaybackError(playbackErrorMessage(value instanceof VoiceNotePlaybackError ? value.code : playbackController.current?.getProjection().errorCode)); }
  };
  const togglePlayback = async (note: Note) => { if (playback.state === "PLAYING") playbackController.current?.pause(); else await loadPlayback(note); };
  const restartPlayback = async (note: Note) => { if (playback.noteId !== note.noteId) await loadPlayback(note); try { await playbackController.current?.restart(); } catch (value) { setPlaybackError(playbackErrorMessage(value instanceof VoiceNotePlaybackError ? value.code : playback.errorCode)); } };
  const review = runtime.current?.reviewDraft;
  const active = ["REQUESTING_PERMISSION", "RECORDING", "PAUSED", "STOPPING", "SAVING"].includes(state);

  const beginRename = (note: Note) => { setRenamingNoteId(note.noteId); setRenameDraft(note.title); };
  const cancelRename = () => { setRenamingNoteId(undefined); setRenameDraft(""); };
  const commitRename = (note: Note) => { const trimmed = normalizeVoiceNoteTitle(renameDraft); if (!trimmed) return; repository.updateNote(note.noteId, { title: trimmed }); setRenamingNoteId(undefined); setRenameDraft(""); refresh(); };

  const trimSourceNote = voiceNotes.find((note) => note.noteId === trimNoteId);
  const beginTrim = (note: Note) => { playbackController.current?.pause(); setTrimNoteId(note.noteId); setTrimStartMs(0); setTrimEndMs(Number(note.futureFields.durationMilliseconds ?? 0)); setTrimTitle(defaultTrimmedVoiceNoteTitle(note.title)); setTrimError(""); };
  const cancelTrim = () => { playbackController.current?.pause(); setTrimNoteId(undefined); setTrimError(""); };
  const resetTrim = () => { if (!trimSourceNote) return; playbackController.current?.pause(); setTrimStartMs(0); setTrimEndMs(Number(trimSourceNote.futureFields.durationMilliseconds ?? 0)); };
  const previewTrim = async () => { if (!trimSourceNote) return; setTrimError(""); try { await playbackController.current?.play(trimSourceNote, { startMilliseconds: trimStartMs, endMilliseconds: trimEndMs }); } catch (value) { setTrimError(value instanceof VoiceNotePlaybackError ? value.code : "AUDIO_LOAD_FAILED"); } };
  const stopTrimPreview = () => playbackController.current?.pause();
  const saveAsTrimmed = async () => {
    if (!trimSourceNote) return;
    const title = trimTitle.trim();
    if (!title) { setTrimError("VOICE_NOTE_TITLE_REQUIRED"); return; }
    const durationMilliseconds = Number(trimSourceNote.futureFields.durationMilliseconds ?? 0);
    if (!isValidTrimRange({ trimStartMilliseconds: trimStartMs, trimEndMilliseconds: trimEndMs, durationMilliseconds })) { setTrimError("INVALID_TRIM_RANGE"); return; }
    try {
      await saveTrimmedVoiceNoteClip({ accountScopeId: accountScope, sourceNote: trimSourceNote, title, trimStartMilliseconds: trimStartMs, trimEndMilliseconds: trimEndMs, notesRepository: repository, audioRepository });
      playbackController.current?.pause();
      setTrimNoteId(undefined);
      refresh();
    } catch (value) { setTrimError(value instanceof Error ? value.message : "SAVE_AS_FAILED"); }
  };

  return <section className="voice-note-section" aria-labelledby="voice-notes-heading">
    <div className="voice-note-heading"><div><p className="notes-kicker">Track A audio</p><h3 id="voice-notes-heading">Voice Notes</h3><p>Record locally, review before saving, and keep the original audio.</p></div><span className="voice-note-state">{state}</span></div>
    <div className="voice-note-controls">
      <button type="button" onClick={() => void start()} disabled={state !== "IDLE" && state !== "SAVED" && state !== "CANCELLED" && state !== "FAILED"}>Record</button>
      <button type="button" onClick={() => { runtime.current?.pause(); setState(runtime.current?.state ?? state); }} disabled={state !== "RECORDING"}>Pause</button>
      <button type="button" onClick={() => { runtime.current?.resume(); setState(runtime.current?.state ?? state); }} disabled={state !== "PAUSED"}>Resume</button>
      <button type="button" onClick={() => void stop()} disabled={!(["RECORDING", "PAUSED"].includes(state))}>Stop</button>
      <button type="button" onClick={() => { runtime.current?.cancel(); setState(runtime.current?.state ?? "CANCELLED"); }} disabled={!active}>Cancel</button>
    </div>
    {active || state === "RECORDING" || state === "PAUSED" ? <div className="voice-note-status" aria-live="polite"><span>Elapsed {formatDuration(elapsed)}</span><span>Microphone {state === "RECORDING" || state === "PAUSED" ? "active" : "pending"}</span><span title={runtime.current?.reviewDraft?.actualMediaType ?? ""}>Format {friendlyVoiceNoteMediaLabel(runtime.current?.reviewDraft?.actualMediaType)}</span><span>Interrupted {runtime.current?.interrupted ? "yes" : "no"}</span></div> : null}
    {review && state === "REVIEW_READY" ? <div className="voice-note-review" aria-label="Voice Note review"><strong>Review Ready</strong><label className="voice-note-title-field">Title<input aria-label="Voice note title" value={reviewTitle} maxLength={200} onChange={(event) => setReviewTitle(event.target.value)} /></label><span>Duration {formatDuration(review.durationMilliseconds)}</span><span>Size {review.byteLength} bytes</span><span title={review.actualMediaType}>Media {friendlyVoiceNoteMediaLabel(review.actualMediaType)}</span><span>Interrupted {review.interrupted ? "yes" : "no"}</span><div><button type="button" onClick={() => void save()} disabled={!reviewTitle.trim()}>Save</button><button type="button" onClick={discard}>Discard</button></div></div> : null}
    {error ? <p className="voice-note-error" role="alert">{error}</p> : null}
    <div className="voice-note-list" aria-label="Saved Voice Notes">{voiceNotes.map((note) => {
      const activeNote = playback.noteId === note.noteId;
      const duration = activeNote ? playback.duration : 0;
      const current = activeNote ? playback.current : 0;
      const loading = activeNote && playback.state === "LOADING";
      const isRenaming = renamingNoteId === note.noteId;
      const isDerived = note.futureFields.derivedFromVoiceNote === true;
      return <div className="voice-note-saved" key={note.noteId}>
        <div>
          {isRenaming ? (
            <div className="voice-note-rename">
              <input aria-label={`Rename ${note.title}`} value={renameDraft} maxLength={200} autoFocus onChange={(event) => setRenameDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") commitRename(note); if (event.key === "Escape") cancelRename(); }} />
              <button type="button" onClick={() => commitRename(note)} disabled={!renameDraft.trim()}>Save Rename</button>
              <button type="button" onClick={cancelRename}>Cancel Rename</button>
            </div>
          ) : (
            <>
              <strong>{note.title}</strong>
              <button type="button" aria-label={`Rename ${note.title}`} onClick={() => beginRename(note)}>Rename</button>
            </>
          )}
          <span className="voice-note-badge">Voice Note</span>
          {isDerived ? <span className="voice-note-badge voice-note-derived-badge">Trimmed clip</span> : null}
          <small>{new Date(note.updatedAt).toLocaleString()} · {note.category ?? "Uncategorised"} · {note.tags.length ? `#${note.tags.join(" #")}` : "No tags"} · {formatDuration(Number(note.futureFields.durationMilliseconds ?? 0))}</small>
        </div>
        <div className="voice-note-playback">
          <button type="button" aria-label={`${activeNote && playback.state === "PLAYING" ? "Pause" : activeNote && playback.state === "ENDED" ? "Replay" : "Play"} ${note.title}`} onClick={() => void togglePlayback(note)}>{activeNote && playback.state === "PLAYING" ? "Pause" : activeNote && playback.state === "ENDED" ? "Replay" : loading ? "Loading" : "Play"}</button>
          <button type="button" aria-label={`Restart ${note.title}`} onClick={() => void restartPlayback(note)}>Restart</button>
          <input aria-label={`Seek ${note.title}`} type="range" min="0" max={duration} step="0.1" value={current} disabled={!activeNote || duration <= 0} title={duration > 0 ? "Seek playback" : "Playback duration is loading"} onChange={(event) => { try { playbackController.current?.seek(Number(event.target.value)); } catch (value) { setPlaybackError(playbackErrorMessage(value instanceof VoiceNotePlaybackError ? value.code : playback.errorCode)); } }} />
          <span aria-label={`Elapsed ${formatDuration(current * 1000)} of ${formatDuration(duration * 1000)}`}>{formatDuration(current * 1000)} / {formatDuration(duration * 1000)}</span>
          {!isDerived ? <button type="button" aria-label={`Trim ${note.title}`} onClick={() => beginTrim(note)}>Trim</button> : null}
          {activeNote && playbackError ? <span className="voice-note-error" role="alert">{playbackError}</span> : null}
        </div>
      </div>;
    })}</div>
    {trimSourceNote ? (
      <div className="voice-note-trim" aria-label={`Trim ${trimSourceNote.title}`}>
        <strong>Trim &quot;{trimSourceNote.title}&quot;</strong>
        <span>Original duration {formatDuration(Number(trimSourceNote.futureFields.durationMilliseconds ?? 0))}</span>
        <label>Trim start (seconds)<input aria-label="Trim start" type="number" min={0} step={0.1} value={(trimStartMs / 1000).toFixed(1)} onChange={(event) => setTrimStartMs(Math.max(0, Math.round(Number(event.target.value) * 1000)))} /></label>
        <label>Trim end (seconds)<input aria-label="Trim end" type="number" min={0} step={0.1} value={(trimEndMs / 1000).toFixed(1)} onChange={(event) => setTrimEndMs(Math.max(0, Math.round(Number(event.target.value) * 1000)))} /></label>
        <span>Selected clip {formatDuration(Math.max(0, trimEndMs - trimStartMs))}</span>
        <label>New title<input aria-label="Trimmed voice note title" value={trimTitle} maxLength={200} onChange={(event) => setTrimTitle(event.target.value)} /></label>
        <div>
          <button type="button" onClick={() => void previewTrim()}>Preview Trim</button>
          <button type="button" onClick={stopTrimPreview}>Stop Preview</button>
          <button type="button" onClick={resetTrim}>Reset Trim</button>
          <button type="button" onClick={cancelTrim}>Cancel</button>
          <button type="button" onClick={() => void saveAsTrimmed()} disabled={!trimTitle.trim()}>Save As New Voice Note</button>
        </div>
        {trimError ? <p className="voice-note-error" role="alert">{trimError}</p> : null}
      </div>
    ) : null}
  </section>;
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
  const audioRepository = useRef(new VoiceNoteAudioRepository()).current;
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

      <VoiceNoteSection key={accountScope} accountScope={accountScope} repository={repository} selected={selected} refresh={refresh} audioRepository={audioRepository} />

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
                    <button type="button" onClick={() => { void (selected.type === "VOICE_NOTE" ? deleteVoiceNoteAudioAndMetadata({ accountScopeId: accountScope, noteId: selected.noteId, notesRepository: repository, audioRepository }) : Promise.resolve(repository.deleteNote(selected.noteId))).then(() => { updateUi({ selectedId: undefined }); setDraft(null); refresh(); }); }}>Delete</button>
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
