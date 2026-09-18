import type { Note } from "@onyx/workspace-contracts";

import type { LocalNotesRepository } from "./notesRepository";
import type { VoiceNoteAudioRepository } from "./voiceNoteAudioRepository";
import { NOTE_TRANSCRIPT_STATUS, NOTE_TYPE_VOICE_NOTE, isValidTrimRange, normalizeVoiceNoteTitle, type VoiceNoteClipFutureFields } from "./voiceNoteContracts";

export interface SaveTrimmedVoiceNoteClipRequest {
  readonly accountScopeId: string;
  readonly sourceNote: Note;
  readonly title: string;
  readonly trimStartMilliseconds: number;
  readonly trimEndMilliseconds: number;
  readonly notesRepository: LocalNotesRepository;
  readonly audioRepository: VoiceNoteAudioRepository;
  readonly idFactory?: () => string;
  readonly maxCollisionRetries?: number;
}

function createClipReferenceIdFactory(idFactory?: () => string): () => string {
  const fallback = () => {
    if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
      return `voice-note-clip-${globalThis.crypto.randomUUID()}`;
    }
    return `voice-note-clip-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };
  return idFactory ?? fallback;
}

/**
 * V1 non-destructive trim: duplicates the original audio Blob (same bytes, same MIME, no
 * transcoding) under a brand-new audioReferenceId so the source Note/audio remain fully
 * independent and deletion of either note never risks the other's audio.
 */
export async function saveTrimmedVoiceNoteClip({
  accountScopeId,
  sourceNote,
  title,
  trimStartMilliseconds,
  trimEndMilliseconds,
  notesRepository,
  audioRepository,
  idFactory,
  maxCollisionRetries = 8,
}: SaveTrimmedVoiceNoteClipRequest): Promise<{ note: Note }> {
  if (!accountScopeId || accountScopeId.trim().length === 0) throw new Error("VOICE_NOTE_ACCOUNT_SCOPE_REQUIRED");
  if (sourceNote.type !== "VOICE_NOTE") throw new Error("VOICE_NOTE_SOURCE_REQUIRED");

  const sourceAudioReferenceId = String(sourceNote.futureFields.audioReferenceId ?? "");
  if (!sourceAudioReferenceId) throw new Error("VOICE_NOTE_AUDIO_REQUIRED");

  const originalDurationMilliseconds = Number(sourceNote.futureFields.durationMilliseconds ?? NaN);
  if (!isValidTrimRange({ trimStartMilliseconds, trimEndMilliseconds, durationMilliseconds: originalDurationMilliseconds })) {
    throw new Error("INVALID_TRIM_RANGE");
  }

  const trimmedTitle = normalizeVoiceNoteTitle(title);
  if (!trimmedTitle) throw new Error("VOICE_NOTE_TITLE_REQUIRED");

  const sourceAudio = await audioRepository.getAudio(accountScopeId, sourceAudioReferenceId);
  if (!(sourceAudio instanceof Blob) || sourceAudio.size === 0) throw new Error("AUDIO_NOT_FOUND");

  const idFactoryFn = createClipReferenceIdFactory(idFactory);
  let audioReferenceId = idFactoryFn();
  let attempts = 0;
  while (await audioRepository.hasAudio(accountScopeId, audioReferenceId)) {
    attempts += 1;
    if (attempts >= maxCollisionRetries) throw new Error("VOICE_NOTE_AUDIO_REFERENCE_COLLISION");
    audioReferenceId = idFactoryFn();
  }

  const mediaType = sourceAudio.type || String(sourceNote.futureFields.recordedMediaType ?? "");
  const duplicatedAudio = new Blob([sourceAudio], { type: mediaType });
  const createdAt = new Date().toISOString();

  await audioRepository.putAudio({ accountScopeId, audioReferenceId, noteId: "draft", audio: duplicatedAudio, mediaType, byteLength: duplicatedAudio.size, createdAt });

  const clipFutureFields: VoiceNoteClipFutureFields = {
    sourceNoteId: sourceNote.noteId,
    sourceAudioReferenceId,
    trimStartMilliseconds,
    trimEndMilliseconds,
    originalDurationMilliseconds,
    derivedFromVoiceNote: true,
  };

  try {
    const note = notesRepository.createNote({
      title: trimmedTitle,
      content: "",
      tags: [],
      category: sourceNote.category,
      source: "VOICE_NOTE",
      type: NOTE_TYPE_VOICE_NOTE,
      futureFields: {
        audioReferenceId,
        durationMilliseconds: trimEndMilliseconds - trimStartMilliseconds,
        recordedMediaType: mediaType,
        byteLength: duplicatedAudio.size,
        recordingCreatedAt: createdAt,
        recordingStatus: "SAVED",
        transcriptStatus: NOTE_TRANSCRIPT_STATUS.NOT_REQUESTED,
        ...clipFutureFields,
      },
      fileReferences: [],
    });

    await audioRepository.putAudio({ accountScopeId, audioReferenceId, noteId: note.noteId, audio: duplicatedAudio, mediaType, byteLength: duplicatedAudio.size, createdAt });
    return { note };
  } catch (error) {
    await audioRepository.deleteAudio(accountScopeId, audioReferenceId).catch(() => undefined);
    throw error;
  }
}
