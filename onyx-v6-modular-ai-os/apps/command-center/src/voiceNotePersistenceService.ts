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
}

export interface VoiceNoteDeleteRequest {
  readonly accountScopeId: string;
  readonly noteId: string;
  readonly notesRepository: LocalNotesRepository;
  readonly audioRepository: VoiceNoteAudioRepository;
}

export async function saveVoiceNoteAudioAndMetadata({ accountScopeId, noteDraft, notesRepository, audioRepository }: VoiceNoteSaveRequest): Promise<{ note: Note; audioReferenceId: string; deleted: boolean }> {
  const audio = noteDraft.audio;
  const mediaType = noteDraft.mediaType ?? (audio.type || "audio/webm");
  const byteLength = noteDraft.byteLength ?? audio.size;
  const recordingCreatedAt = noteDraft.recordingCreatedAt ?? new Date().toISOString();
  const audioReferenceId = `voice-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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
      throw error;
    }
  } catch (error) {
    throw error;
  }
}

export async function deleteVoiceNoteAudioAndMetadata({ accountScopeId, noteId, notesRepository, audioRepository }: VoiceNoteDeleteRequest): Promise<{ deleted: boolean; noteId: string }> {
  const note = notesRepository.getNote(noteId);
  if (!note) return { deleted: false, noteId };

  const audioReferenceId = String(note.futureFields.audioReferenceId ?? "");
  if (audioReferenceId) {
    const deleted = await audioRepository.deleteAudio(accountScopeId, audioReferenceId);
    if (!deleted) {
      return { deleted: false, noteId };
    }
  }

  notesRepository.deleteNote(noteId);
  return { deleted: true, noteId };
}
