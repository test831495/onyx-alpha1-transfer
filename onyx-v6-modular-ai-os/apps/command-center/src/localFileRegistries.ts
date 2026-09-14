export type LocalCapabilityId = "image-viewer" | "audio-player" | "video-player" | "text-editor" | "code-editor" | "pdf-viewer" | "zip-explorer" | "office-preview" | "database-inspector" | "log-viewer";
export type LocalSecurityClassification = "SAFE_NATIVE" | "ESCAPED_TEXT" | "PARSER_REQUIRED" | "READ_ONLY_RESTRICTED";

export interface LocalFileViewerRegistration {
  readonly capabilityId: LocalCapabilityId;
  readonly mimeTypes: readonly string[];
  readonly extensions: readonly string[];
  readonly metadataSupport: boolean;
  readonly previewSupport: "FULL" | "LIMITED" | "METADATA_ONLY";
  readonly editSupport: boolean;
  readonly directSaveSupport: boolean;
  readonly saveAsSupport: boolean;
  readonly maxPreviewSize: number;
  readonly lazyLoadEntryPoint: string;
  readonly mobileSupport: "NATIVE" | "FALLBACK" | "LIMITED";
  readonly desktopSupport: "NATIVE" | "FALLBACK" | "LIMITED";
  readonly accessibilitySupport: boolean;
  readonly cleanupContract: string;
  readonly securityClassification: LocalSecurityClassification;
  readonly fallbackBehaviour: string;
}

export const LocalFileCapabilityRegistry: readonly LocalCapabilityId[] = ["image-viewer", "audio-player", "video-player", "text-editor", "code-editor", "pdf-viewer", "zip-explorer", "office-preview", "database-inspector", "log-viewer"];
export const LocalFileEditorRegistry: readonly LocalCapabilityId[] = ["text-editor", "code-editor"];

const textExtensions = [".txt", ".md", ".markdown", ".json", ".csv", ".tsv", ".xml", ".html", ".yaml", ".yml", ".toml", ".ini", ".cfg", ".conf", ".properties", ".sql", ".sh", ".bash"];
const codeExtensions = [".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cs", ".c", ".h", ".cpp", ".hpp", ".go", ".rs", ".php", ".rb", ".swift", ".kt", ".kts", ".css", ".scss", ".less", ".vue", ".svelte", ".sh", ".bash", ".ps1", ".yaml", ".yml", ".json", ".xml", ".toml", ".dockerfile", ".gitignore", ".editorconfig", ".env"];
const logExtensions = [".log", ".out", ".trace", ".ndjson", ".jsonl"];

const base = (capabilityId: LocalCapabilityId, extensions: readonly string[], mimeTypes: readonly string[], previewSupport: LocalFileViewerRegistration["previewSupport"], securityClassification: LocalSecurityClassification, fallbackBehaviour: string): LocalFileViewerRegistration => ({ capabilityId, extensions, mimeTypes, metadataSupport: true, previewSupport, editSupport: capabilityId === "text-editor" || capabilityId === "code-editor", directSaveSupport: capabilityId === "text-editor" || capabilityId === "code-editor", saveAsSupport: true, maxPreviewSize: capabilityId === "log-viewer" ? 2_000_000 : 1_000_000, lazyLoadEntryPoint: `local/${capabilityId}`, mobileSupport: capabilityId === "code-editor" ? "FALLBACK" : "NATIVE", desktopSupport: "NATIVE", accessibilitySupport: true, cleanupContract: "Revoke object URLs and release viewer resources on replacement or unmount.", securityClassification, fallbackBehaviour });

export const LocalFileViewerRegistry: readonly LocalFileViewerRegistration[] = [
  base("image-viewer", [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".ico", ".avif"], ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp", "image/x-icon", "image/avif"], "FULL", "SAFE_NATIVE", "Metadata and download copy when the browser cannot decode the image."),
  base("audio-player", [".mp3", ".mp4", ".aac", ".wav", ".ogg", ".webm", ".flac"], ["audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/flac"], "FULL", "SAFE_NATIVE", "Metadata and download copy when the codec is unsupported."),
  base("video-player", [".mp4", ".webm", ".ogv", ".ogg", ".mov"], ["video/mp4", "video/webm", "video/ogg", "video/quicktime"], "FULL", "SAFE_NATIVE", "Metadata and download copy when the codec is unsupported."),
  base("text-editor", textExtensions, ["text/plain", "text/markdown", "application/json", "text/csv", "text/tab-separated-values", "application/xml", "text/xml", "text/html", "application/yaml"], "FULL", "ESCAPED_TEXT", "Read-only metadata and Save As when the text exceeds the editor bound."),
  base("code-editor", codeExtensions, ["text/javascript", "application/javascript", "application/typescript", "text/x-python", "text/css"], "FULL", "ESCAPED_TEXT", "Accessible textarea fallback; source is never executed."),
  base("pdf-viewer", [".pdf"], ["application/pdf"], "LIMITED", "SAFE_NATIVE", "Use the browser PDF viewer or download copy; no PDF parser is bundled."),
  base("zip-explorer", [".zip"], ["application/zip", "application/x-zip-compressed"], "METADATA_ONLY", "PARSER_REQUIRED", "ZIP contents require a reviewed bounded archive parser; download copy remains available."),
  base("office-preview", [".docx", ".xlsx", ".xls", ".pptx", ".ppsx", ".odt", ".ods", ".odp"], ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.openxmlformats-officedocument.presentationml.presentation"], "METADATA_ONLY", "PARSER_REQUIRED", "Office content remains metadata-only until a reviewed local parser is adopted."),
  base("database-inspector", [".sqlite", ".sqlite3", ".db"], ["application/vnd.sqlite3"], "METADATA_ONLY", "READ_ONLY_RESTRICTED", "SQLite inspection requires an approved read-only WASM parser; signature metadata remains available."),
  base("log-viewer", [".log", ".out", ".trace", ".ndjson", ".jsonl"], ["text/plain", "application/json"], "LIMITED", "ESCAPED_TEXT", "Large logs remain bounded and read-only; display masking is applied to common secrets."),
];

export interface LocalFileMetadataRegistration { readonly field: "name" | "extension" | "mimeType" | "size" | "lastModified" | "source" | "selection" | "capabilities"; readonly label: string; }
export const LocalFileMetadataRegistry: readonly LocalFileMetadataRegistration[] = [
  { field: "name", label: "Name" }, { field: "extension", label: "Extension" }, { field: "mimeType", label: "MIME type" }, { field: "size", label: "Size" }, { field: "lastModified", label: "Last modified" }, { field: "source", label: "Source" }, { field: "selection", label: "Selection" }, { field: "capabilities", label: "Capabilities" },
];

export function findLocalViewer(extension: string, mimeType: string): LocalFileViewerRegistration | undefined {
  const normalizedExtension = extension.toLowerCase();
  const normalizedMime = mimeType.toLowerCase();
  if ([".log", ".out", ".trace", ".ndjson", ".jsonl"].includes(normalizedExtension)) return LocalFileViewerRegistry.find((viewer) => viewer.capabilityId === "log-viewer");
  const mimeMatch = LocalFileViewerRegistry.find((viewer) => viewer.mimeTypes.includes(normalizedMime));
  if (mimeMatch) return mimeMatch;
  return LocalFileViewerRegistry.find((viewer) => viewer.extensions.includes(normalizedExtension));
}

export function classifyLocalFileName(name: string, mimeType: string): { readonly extension: string; readonly viewer?: LocalFileViewerRegistration } {
  const extension = name.includes(".") ? `.${name.split(".").pop()?.toLowerCase() ?? ""}` : "";
  return { extension, viewer: findLocalViewer(extension, mimeType) };
}