export interface VoiceNoteAudioRecord {
  readonly accountScopeId: string;
  readonly audioReferenceId: string;
  readonly noteId: string;
  readonly audio: Blob;
  readonly mediaType: string;
  readonly byteLength: number;
  readonly createdAt: string;
  readonly deletedAt?: string;
}

export interface VoiceNoteAudioRepositoryOptions {
  readonly databaseName?: string;
  readonly storeName?: string;
}

type AudioStoreValue = VoiceNoteAudioRecord & { readonly id: string };

export class VoiceNoteAudioRepository {
  private db: IDBDatabase | null = null;
  private readonly databaseName: string;
  private readonly storeName: string;

  constructor(options: VoiceNoteAudioRepositoryOptions = {}) {
    this.databaseName = options.databaseName ?? "onyx.voice-notes.audio";
    this.storeName = options.storeName ?? "voice_note_audio";
  }

  async open(): Promise<void> {
    if (this.db) return;
    if (typeof indexedDB === "undefined") {
      throw new Error("INDEXED_DB_UNAVAILABLE");
    }

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(this.storeName)) {
          database.createObjectStore(this.storeName, { keyPath: "id" });
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onerror = () => reject(request.error ?? new Error("INDEXED_DB_OPEN_FAILED"));
    });
  }

  async close(): Promise<void> {
    if (!this.db) return;
    this.db.close();
    this.db = null;
  }

  private async getStore(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    if (!this.db) throw new Error("VOICE_NOTE_AUDIO_REPOSITORY_NOT_OPEN");
    const transaction = this.db.transaction(this.storeName, mode);
    return transaction.objectStore(this.storeName);
  }

  private scopedId(accountScopeId: string, audioReferenceId: string) {
    return `${encodeURIComponent(accountScopeId)}:${audioReferenceId}`;
  }

  async putAudio(input: Omit<VoiceNoteAudioRecord, "deletedAt">): Promise<void> {
    await this.open();
    const store = await this.getStore("readwrite");
    const value: AudioStoreValue = { ...input, deletedAt: undefined, id: this.scopedId(input.accountScopeId, input.audioReferenceId) };
    await new Promise<void>((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("VOICE_NOTE_AUDIO_SAVE_FAILED"));
    });
  }

  async getAudio(accountScopeId: string, audioReferenceId: string): Promise<Blob | undefined> {
    await this.open();
    const store = await this.getStore("readonly");
    const record = await new Promise<AudioStoreValue | undefined>((resolve, reject) => {
      const request = store.get(this.scopedId(accountScopeId, audioReferenceId));
      request.onsuccess = () => resolve((request.result as AudioStoreValue | undefined) ?? undefined);
      request.onerror = () => reject(request.error ?? new Error("VOICE_NOTE_AUDIO_READ_FAILED"));
    });
    return record?.audio;
  }

  async getAudioMetadata(accountScopeId: string, audioReferenceId: string): Promise<Pick<VoiceNoteAudioRecord, "accountScopeId" | "audioReferenceId" | "noteId" | "mediaType" | "byteLength" | "createdAt"> | undefined> {
    await this.open();
    const store = await this.getStore("readonly");
    const record = await new Promise<AudioStoreValue | undefined>((resolve, reject) => {
      const request = store.get(this.scopedId(accountScopeId, audioReferenceId));
      request.onsuccess = () => resolve((request.result as AudioStoreValue | undefined) ?? undefined);
      request.onerror = () => reject(request.error ?? new Error("VOICE_NOTE_AUDIO_METADATA_READ_FAILED"));
    });
    if (!record) return undefined;
    return {
      accountScopeId: record.accountScopeId,
      audioReferenceId: record.audioReferenceId,
      noteId: record.noteId,
      mediaType: record.mediaType,
      byteLength: record.byteLength,
      createdAt: record.createdAt,
    };
  }

  async hasAudio(accountScopeId: string, audioReferenceId: string): Promise<boolean> {
    return Boolean(await this.getAudioMetadata(accountScopeId, audioReferenceId));
  }

  async deleteAudio(accountScopeId: string, audioReferenceId: string): Promise<boolean> {
    await this.open();
    const store = await this.getStore("readwrite");
    const id = this.scopedId(accountScopeId, audioReferenceId);
    const existing = await new Promise<AudioStoreValue | undefined>((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve((request.result as AudioStoreValue | undefined) ?? undefined);
      request.onerror = () => reject(request.error ?? new Error("VOICE_NOTE_AUDIO_DELETE_CHECK_FAILED"));
    });
    if (!existing) return false;
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error("VOICE_NOTE_AUDIO_DELETE_FAILED"));
    });
    return true;
  }
}
