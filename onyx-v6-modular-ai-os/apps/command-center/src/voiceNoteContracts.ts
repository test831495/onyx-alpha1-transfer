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

export function isValidVoiceNoteMetadata(value: Partial<Note> | undefined): value is Note & { futureFields: VoiceNoteContractMetadata } {
  if (!value || typeof value !== "object") return false;
  if (value.type !== "VOICE_NOTE" && value.type !== "VOICE_NOTE_PLACEHOLDER") return false;
  const future = value.futureFields as VoiceNoteFutureFields | undefined;
  if (!future || typeof future !== "object") return false;
  if (typeof future.audioReferenceId !== "string" || future.audioReferenceId.length === 0) return false;
  if (typeof future.durationMilliseconds !== "number" || !Number.isFinite(future.durationMilliseconds) || future.durationMilliseconds <= 0) return false;
  if (typeof future.recordedMediaType !== "string" || future.recordedMediaType.length === 0) return false;
  if (typeof future.byteLength !== "number" || !Number.isFinite(future.byteLength) || future.byteLength <= 0) return false;
  if (typeof future.recordingCreatedAt !== "string" || Number.isNaN(Date.parse(future.recordingCreatedAt))) return false;
  if (!Object.values({ RECORDING: "RECORDING", PAUSED: "PAUSED", SAVED: "SAVED", FAILED: "FAILED", CANCELLED: "CANCELLED", DELETED: "DELETED" }).includes(future.recordingStatus ?? "")) return false;
  if (future.transcriptStatus !== undefined && future.transcriptStatus !== "NOT_REQUESTED") return false;
  if (future.aiSummaryStatus !== undefined && future.aiSummaryStatus !== "DISABLED") return false;
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
