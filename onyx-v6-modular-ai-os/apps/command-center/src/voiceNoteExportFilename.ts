const EXTENSION_BY_MEDIA_TYPE: ReadonlyArray<{ readonly test: RegExp; readonly extension: string }> = [
  { test: /^audio\/webm/i, extension: ".webm" },
  { test: /^audio\/mp4/i, extension: ".m4a" },
  { test: /^audio\/ogg/i, extension: ".ogg" },
  { test: /^audio\/mpeg/i, extension: ".mp3" },
];

/** Extension is derived from the actual stored Blob.type; never assumed from a UI label. */
export function extensionForVoiceNoteMediaType(mediaType: string | undefined): string {
  const trimmed = (mediaType ?? "").trim();
  if (!trimmed) return ".audio";
  return EXTENSION_BY_MEDIA_TYPE.find((entry) => entry.test.test(trimmed))?.extension ?? ".audio";
}

const UNSAFE_FILENAME_CHARS = /[\\/:*?"<>|\u0000-\u001f]/g;
const MAX_FILENAME_BASE_LENGTH = 120;

export function sanitizeVoiceNoteExportFilenameBase(value: string): string {
  const cleaned = value.replace(UNSAFE_FILENAME_CHARS, " ").replace(/\s+/g, " ").trim().replace(/^[.\s]+|[.\s]+$/g, "");
  const bounded = cleaned.slice(0, MAX_FILENAME_BASE_LENGTH).trim();
  return bounded || "Voice note";
}

/** Filename sanitization is for the exported file only; it never renames the Note itself. */
export function resolveVoiceNoteExportFilename(title: string, mediaType: string | undefined): string {
  return `${sanitizeVoiceNoteExportFilenameBase(title)}${extensionForVoiceNoteMediaType(mediaType)}`;
}
