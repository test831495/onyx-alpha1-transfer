export type NoteType = "TEXT_NOTE" | "FILE_REFERENCE_NOTE" | "VOICE_NOTE_PLACEHOLDER";
export type NoteSource = "LOCAL" | "FILE_REFERENCE" | "VOICE_PLACEHOLDER";

export interface NoteFileReference {
  readonly referenceId: string;
  readonly fileId: string;
  readonly provider: string;
  readonly displayName: string;
  readonly fileType?: string;
  readonly referencedAt: string;
}

export interface VoiceNoteFutureFields {
  readonly audioReference?: string;
  readonly transcriptReference?: string;
  readonly transcriptStatus?: "NOT_STARTED" | "PENDING" | "AVAILABLE" | "FAILED";
  readonly audioDuration?: number;
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
export const NOTES_FUTURE_CAPABILITIES: readonly NotesFutureCapability[] = (["SUMMARIZE", "GENERATE_TAGS", "EXTRACT_ACTIONS", "EXTRACT_DECISIONS", "ASK_NOTES"] as const).map((capabilityId) => ({ capabilityId, status: "FUTURE_CAPABILITY", enabled: false }));
