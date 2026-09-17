export type NoteType = "TEXT_NOTE" | "FILE_REFERENCE_NOTE" | "VOICE_NOTE" | "VOICE_NOTE_PLACEHOLDER";
export type NoteSource = "LOCAL" | "FILE_REFERENCE" | "VOICE_NOTE" | "VOICE_PLACEHOLDER";

export interface NoteFileReference {
  readonly referenceId: string;
  readonly fileId: string;
  readonly provider: string;
  readonly displayName: string;
  readonly fileType?: string;
  readonly referencedAt: string;
}

export type VoiceNoteRecordingStatus = "RECORDING" | "PAUSED" | "SAVED" | "FAILED" | "CANCELLED" | "DELETED";
export type VoiceNoteTranscriptStatus = "NOT_REQUESTED";
export type VoiceNoteRecordingErrorCode = "MICROPHONE_NOT_FOUND" | "PERMISSION_DENIED" | "MEDIA_CAPTURE_FAILED" | "STORAGE_WRITE_FAILED" | "UNSUPPORTED_FORMAT" | "DECODE_FAILED" | "UNKNOWN_ERROR";

export interface VoiceNoteFutureFields {
  readonly audioReferenceId?: string;
  readonly transcriptReferenceId?: string;
  readonly durationMilliseconds?: number;
  readonly recordedMediaType?: string;
  readonly byteLength?: number;
  readonly recordingCreatedAt?: string;
  readonly recordingStatus?: VoiceNoteRecordingStatus;
  readonly transcriptStatus?: VoiceNoteTranscriptStatus;
  readonly recordingErrorCode?: VoiceNoteRecordingErrorCode;
  readonly transcriptErrorCode?: string;
  readonly aiSummaryStatus?: "DISABLED";
  readonly recordingMetadata?: Readonly<Record<string, unknown>>;
}

export interface Note {
  readonly noteId: string;
  readonly title: string;
  readonly content: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly pinned: boolean;
  readonly archived: boolean;
  readonly tags: readonly string[];
  readonly category?: string;
  readonly source: NoteSource;
  readonly type: NoteType;
  readonly version: number;
  readonly futureFields: VoiceNoteFutureFields & Readonly<Record<string, unknown>>;
  readonly fileReferences: readonly NoteFileReference[];
}

export type NoteUpdate = Partial<Pick<Note, "title" | "content" | "tags" | "category" | "fileReferences" | "futureFields">>;
export type NoteDateBucket = "TODAY" | "YESTERDAY" | "THIS_WEEK" | "THIS_MONTH" | "THIS_YEAR" | "ALL_NOTES" | "ARCHIVE";

export type NotesFutureCapabilityId = "SUMMARIZE" | "GENERATE_TAGS" | "EXTRACT_ACTIONS" | "EXTRACT_DECISIONS" | "ASK_NOTES";
export interface NotesFutureCapability { readonly capabilityId: NotesFutureCapabilityId; readonly status: "DISABLED" | "FUTURE_CAPABILITY"; readonly enabled: false; }
export const NOTES_FUTURE_CAPABILITIES: readonly NotesFutureCapability[] = Object.freeze((["SUMMARIZE", "GENERATE_TAGS", "EXTRACT_ACTIONS", "EXTRACT_DECISIONS", "ASK_NOTES"] as const).map((capabilityId) => Object.freeze({ capabilityId, status: "FUTURE_CAPABILITY" as const, enabled: false as const })));
export const NOTE_TYPE_VOICE_NOTE = "VOICE_NOTE" as const;
export const NOTE_SOURCE_VOICE_NOTE = "VOICE_NOTE" as const;
export const NOTE_RECORDING_STATUS = Object.freeze({ RECORDING: "RECORDING", PAUSED: "PAUSED", SAVED: "SAVED", FAILED: "FAILED", CANCELLED: "CANCELLED", DELETED: "DELETED" } as const);
export const NOTE_TRANSCRIPT_STATUS = Object.freeze({ NOT_REQUESTED: "NOT_REQUESTED" } as const);
export const NOTE_RECORDING_ERROR_CODES = Object.freeze(["MICROPHONE_NOT_FOUND", "PERMISSION_DENIED", "MEDIA_CAPTURE_FAILED", "STORAGE_WRITE_FAILED", "UNSUPPORTED_FORMAT", "DECODE_FAILED", "UNKNOWN_ERROR"] as const);