import type { Note, NoteFileReference } from "@onyx/workspace-contracts";

import { NOTE_TYPE_VOICE_NOTE, NOTE_RECORDING_STATUS, NOTE_TRANSCRIPT_STATUS } from "@onyx/workspace-contracts";

import type { LocalNotesRepository } from "./notesRepository";
import type { VoiceNoteAudioRepository } from "./voiceNoteAudioRepository";

export interface VoiceNoteSaveRequest {
  readonly accountScopeId: string;
  readonly noteDraft: {
    readonly title: string;
    readonly tags?: readonly string[];
    readonly category?: string;
    readonly content?: string;
    readonly source?: "LOCAL";
    readonly fileReferences?: readonly NoteFileReference[];
    readonly audio: Blob;
    readonly mediaType?: string;
    readonly byteLength?: number;
    readonly createdAt?: string;
    readonly updatedAt?: string;
    readonly durationMilliseconds: number;
    readonly recordingCreatedAt?: string;
    readonly recordingStatus?: typeof NOTE_RECORDING_STATUS.SAVED;
    readonly transcriptStatus?: typeof NOTE_TRANSCRIPT_STATUS.NOT_REQUESTED;
  };
  readonly notesRepository: LocalNotesRepository;
  readonly audioRepository: VoiceNoteAudioRepository;
  readonly idFactory?: () => string;
  readonly maxCollisionRetries?: number;
}

export interface VoiceNoteDeleteRequest {
  readonly accountScopeId: string;
  readonly noteId: string;
  readonly notesRepository: LocalNotesRepository;
  readonly audioRepository: VoiceNoteAudioRepository;
}

function createAudioReferenceIdFactory(idFactory?: () => string): () => string {
  const fallback = () => {
    if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
      return `voice-note-${globalThis.crypto.randomUUID()}`;
    }
    return `voice-note-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };
  return idFactory ?? fallback;
}

async function generateUniqueAudioReferenceId({
  accountScopeId,
  audioRepository,
  idFactory,
  maxCollisionRetries = 8,
}: {
  accountScopeId: string;
  audioRepository: VoiceNoteAudioRepository;
  idFactory: () => string;
  maxCollisionRetries: number;
}): Promise<string> {
  if (!accountScopeId || accountScopeId.trim().length === 0) {
    throw new Error("VOICE_NOTE_ACCOUNT_SCOPE_REQUIRED");
  }

  let attempts = 0;
  while (attempts < maxCollisionRetries) {
    const candidate = idFactory();
    if (!candidate || candidate.trim().length === 0) {
      attempts += 1;
      continue;
    }
    const exists = await audioRepository.hasAudio(accountScopeId, candidate);
    if (!exists) return candidate;
    attempts += 1;
  }

  throw new Error("VOICE_NOTE_AUDIO_REFERENCE_COLLISION");
}

export async function saveVoiceNoteAudioAndMetadata({ accountScopeId, noteDraft, notesRepository, audioRepository, idFactory, maxCollisionRetries = 8 }: VoiceNoteSaveRequest): Promise<{ note: Note; audioReferenceId: string; deleted: boolean }> {
  if (!accountScopeId || accountScopeId.trim().length === 0) {
    throw new Error("VOICE_NOTE_ACCOUNT_SCOPE_REQUIRED");
  }
  if (!(noteDraft.audio instanceof Blob)) {
    throw new Error("VOICE_NOTE_AUDIO_REQUIRED");
  }
  if (!Number.isFinite(noteDraft.durationMilliseconds) || noteDraft.durationMilliseconds <= 0) {
    throw new Error("VOICE_NOTE_DURATION_REQUIRED");
  }
  if (!Number.isFinite(noteDraft.byteLength ?? noteDraft.audio.size) || (noteDraft.byteLength ?? noteDraft.audio.size) <= 0) {
    throw new Error("VOICE_NOTE_BYTE_LENGTH_REQUIRED");
  }
  if (!noteDraft.title || !noteDraft.title.trim()) {
    throw new Error("VOICE_NOTE_TITLE_REQUIRED");
  }

  const audio = noteDraft.audio;
  const blobMediaType = audio.type.trim();
  const requestedMediaType = (noteDraft.mediaType ?? "").trim();
  if (requestedMediaType && blobMediaType && requestedMediaType !== blobMediaType) {
    throw new Error("AUDIO_FORMAT_METADATA_MISMATCH");
  }
  const mediaType = blobMediaType || requestedMediaType;
  const byteLength = noteDraft.byteLength ?? audio.size;
  const recordingCreatedAt = noteDraft.recordingCreatedAt ?? new Date().toISOString();
  const idFactoryFn = createAudioReferenceIdFactory(idFactory);
  const audioReferenceId = await generateUniqueAudioReferenceId({
    accountScopeId,
    audioRepository,
    idFactory: idFactoryFn,
    maxCollisionRetries,
  });

  try {
    await audioRepository.putAudio({
      accountScopeId,
      audioReferenceId,
      noteId: "draft",
      audio,
      mediaType,
      byteLength,
      createdAt: noteDraft.createdAt ?? new Date().toISOString(),
    });

    try {
      const note = notesRepository.createNote({
        title: noteDraft.title,
        content: noteDraft.content ?? "",
        tags: noteDraft.tags ?? [],
        category: noteDraft.category,
        source: noteDraft.source ?? "LOCAL",
        type: NOTE_TYPE_VOICE_NOTE,
        futureFields: {
          audioReferenceId,
          durationMilliseconds: noteDraft.durationMilliseconds,
          recordedMediaType: mediaType,
          byteLength,
          recordingCreatedAt,
          recordingStatus: noteDraft.recordingStatus ?? NOTE_RECORDING_STATUS.SAVED,
          transcriptStatus: noteDraft.transcriptStatus ?? NOTE_TRANSCRIPT_STATUS.NOT_REQUESTED,
        },
        fileReferences: noteDraft.fileReferences ?? [],
      });

      await audioRepository.putAudio({
        accountScopeId,
        audioReferenceId,
        noteId: note.noteId,
        audio,
        mediaType,
        byteLength,
        createdAt: noteDraft.createdAt ?? note.createdAt,
      });

      return { note, audioReferenceId, deleted: false };
    } catch (error) {
      await audioRepository.deleteAudio(accountScopeId, audioReferenceId).catch(() => undefined);
      notesRepository.getNotes().some((entry) => entry.futureFields.audioReferenceId === audioReferenceId && notesRepository.deleteNote(entry.noteId));
      throw error;
    }
  } catch (error) {
    throw error;
  }
}

export async function deleteVoiceNoteAudioAndMetadata({ accountScopeId, noteId, notesRepository, audioRepository }: VoiceNoteDeleteRequest): Promise<{ deleted: boolean; noteId: string }> {
  if (!accountScopeId || accountScopeId.trim().length === 0) {
    throw new Error("VOICE_NOTE_ACCOUNT_SCOPE_REQUIRED");
  }

  const note = notesRepository.getNote(noteId);
  if (!note) return { deleted: false, noteId };
  if (note.type !== NOTE_TYPE_VOICE_NOTE) return { deleted: false, noteId };

  const audioReferenceId = String(note.futureFields.audioReferenceId ?? "");
  const audioDeleted = audioReferenceId ? await audioRepository.deleteAudio(accountScopeId, audioReferenceId) : true;
  if (!audioDeleted && audioReferenceId) {
    return { deleted: false, noteId };
  }

  notesRepository.deleteNote(noteId);
  return { deleted: true, noteId };
}
