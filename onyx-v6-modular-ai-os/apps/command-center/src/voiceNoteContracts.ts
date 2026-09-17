import type { Note, NoteFileReference, VoiceNoteFutureFields, VoiceNoteRecordingErrorCode, VoiceNoteRecordingStatus, VoiceNoteTranscriptStatus } from "@onyx/workspace-contracts";

export {
  NOTE_TYPE_VOICE_NOTE,
  NOTE_SOURCE_VOICE_NOTE,
  NOTE_RECORDING_STATUS,
  NOTE_TRANSCRIPT_STATUS,
  NOTE_RECORDING_ERROR_CODES,
} from "@onyx/workspace-contracts";

export type VoiceNoteContractMetadata = Note["futureFields"] & {
  readonly audioReferenceId: string;
  readonly durationMilliseconds: number;
  readonly recordedMediaType: string;
  readonly byteLength: number;
  readonly recordingCreatedAt: string;
  readonly recordingStatus: VoiceNoteRecordingStatus;
  readonly transcriptStatus: VoiceNoteTranscriptStatus;
  readonly recordingErrorCode?: VoiceNoteRecordingErrorCode;
};

const VALID_RECORDING_STATUSES = new Set(["RECORDING", "PAUSED", "SAVED", "FAILED", "CANCELLED", "DELETED"]);

function isFinitePositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0;
}

export function isValidVoiceNoteMetadata(value: Partial<Note> | undefined): value is Note & { futureFields: VoiceNoteContractMetadata } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  if (value.type !== "VOICE_NOTE" && value.type !== "VOICE_NOTE_PLACEHOLDER") return false;
  if (typeof value.noteId !== "string" || value.noteId.length === 0) return false;
  if (typeof value.title !== "string" || value.title.length === 0) return false;
  if (typeof value.content !== "string") return false;
  if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) return false;
  if (typeof value.updatedAt !== "string" || Number.isNaN(Date.parse(value.updatedAt))) return false;
  if (typeof value.version !== "number" || !Number.isInteger(value.version) || value.version < 1) return false;
  if (!Array.isArray(value.tags)) return false;
  if (value.fileReferences !== undefined && !Array.isArray(value.fileReferences)) return false;

  const future = value.futureFields as VoiceNoteFutureFields | undefined;
  if (!future || typeof future !== "object" || Array.isArray(future)) return false;
  if (typeof future.audioReferenceId !== "string" || future.audioReferenceId.length === 0) return false;
  if (typeof future.durationMilliseconds !== "number" || !Number.isFinite(future.durationMilliseconds) || future.durationMilliseconds <= 0) return false;
  if (typeof future.recordedMediaType !== "string" || future.recordedMediaType.trim().length === 0) return false;
  if (!isFinitePositiveInteger(future.byteLength)) return false;
  if (typeof future.recordingCreatedAt !== "string" || Number.isNaN(Date.parse(future.recordingCreatedAt))) return false;
  if (future.recordingStatus === undefined || !VALID_RECORDING_STATUSES.has(future.recordingStatus)) return false;
  if (future.transcriptStatus !== undefined && future.transcriptStatus !== "NOT_REQUESTED") return false;
  if (future.aiSummaryStatus !== undefined && future.aiSummaryStatus !== "DISABLED") return false;
  if (future.recordingErrorCode !== undefined && !Object.values({
    MICROPHONE_NOT_FOUND: "MICROPHONE_NOT_FOUND",
    PERMISSION_DENIED: "PERMISSION_DENIED",
    MEDIA_CAPTURE_FAILED: "MEDIA_CAPTURE_FAILED",
    STORAGE_WRITE_FAILED: "STORAGE_WRITE_FAILED",
    UNSUPPORTED_FORMAT: "UNSUPPORTED_FORMAT",
    DECODE_FAILED: "DECODE_FAILED",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
  }).includes(future.recordingErrorCode)) return false;
  return true;
}

export function createVoiceNoteFileReference(fileId: string, provider: string, displayName: string, fileType?: string): NoteFileReference {
  return {
    referenceId: `voice-note-${fileId}-${Date.now()}`,
    fileId,
    provider,
    displayName,
    fileType,
    referencedAt: new Date().toISOString(),
  };
}

export const MAX_VOICE_NOTE_TITLE_LENGTH = 200;

export function normalizeVoiceNoteTitle(value: string): string {
  return value.trim().slice(0, MAX_VOICE_NOTE_TITLE_LENGTH);
}

export function defaultVoiceNoteTitle(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `Voice note ${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function defaultTrimmedVoiceNoteTitle(sourceTitle: string): string {
  return `${sourceTitle} - Trimmed`;
}

/** Derived-clip metadata carried in a trimmed Voice Note's futureFields (V1 non-destructive trim). */
export interface VoiceNoteClipFutureFields {
  readonly sourceNoteId: string;
  readonly sourceAudioReferenceId: string;
  readonly trimStartMilliseconds: number;
  readonly trimEndMilliseconds: number;
  readonly originalDurationMilliseconds: number;
  readonly derivedFromVoiceNote: true;
}

export const MIN_VOICE_NOTE_CLIP_DURATION_MILLISECONDS = 250;

export interface TrimRangeInput {
  readonly trimStartMilliseconds: number;
  readonly trimEndMilliseconds: number;
  readonly durationMilliseconds: number;
}

export function isValidTrimRange(input: TrimRangeInput): boolean {
  const { trimStartMilliseconds: start, trimEndMilliseconds: end, durationMilliseconds: duration } = input;
  if (![start, end, duration].every((value) => Number.isFinite(value))) return false;
  if (start < 0 || end > duration || start >= end) return false;
  return end - start >= MIN_VOICE_NOTE_CLIP_DURATION_MILLISECONDS;
}

export function isValidVoiceNoteClipMetadata(value: Partial<VoiceNoteClipFutureFields> | undefined): value is VoiceNoteClipFutureFields {
  if (!value || typeof value !== "object") return false;
  if (typeof value.sourceNoteId !== "string" || value.sourceNoteId.length === 0) return false;
  if (typeof value.sourceAudioReferenceId !== "string" || value.sourceAudioReferenceId.length === 0) return false;
  if (typeof value.originalDurationMilliseconds !== "number" || !Number.isFinite(value.originalDurationMilliseconds)) return false;
  if (typeof value.trimStartMilliseconds !== "number" || typeof value.trimEndMilliseconds !== "number") return false;
  if (!isValidTrimRange({ trimStartMilliseconds: value.trimStartMilliseconds, trimEndMilliseconds: value.trimEndMilliseconds, durationMilliseconds: value.originalDurationMilliseconds })) return false;
  return value.derivedFromVoiceNote === true;
}

const FRIENDLY_MEDIA_LABELS: readonly { readonly test: RegExp; readonly label: string }[] = [
  { test: /^audio\/webm/i, label: "WebM (Opus)" },
  { test: /^audio\/mp4/i, label: "MP4 Audio" },
  { test: /^audio\/ogg/i, label: "Ogg (Opus)" },
];

/** Presentation-only label; the exact MIME is never altered and remains available via title/tooltip. */
export function friendlyVoiceNoteMediaLabel(mediaType: string | undefined): string {
  const trimmed = (mediaType ?? "").trim();
  if (!trimmed) return "Browser-selected audio";
  return FRIENDLY_MEDIA_LABELS.find((entry) => entry.test.test(trimmed))?.label ?? trimmed;
}
