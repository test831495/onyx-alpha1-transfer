export interface LocalFileConverterRegistration { readonly id: string; readonly sourceMimeTypes: readonly string[]; readonly destinationMimeType: string; readonly destinationExtension: string; readonly label: string; readonly lossless: boolean; readonly available: boolean; readonly sizeBound: number; }

export const LocalFileConverterRegistry: readonly LocalFileConverterRegistration[] = [
  { id: "image-to-png", sourceMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"], destinationMimeType: "image/png", destinationExtension: ".png", label: "Export PNG", lossless: false, available: true, sizeBound: 25_000_000 },
  { id: "image-to-jpeg", sourceMimeTypes: ["image/png", "image/webp", "image/gif", "image/bmp"], destinationMimeType: "image/jpeg", destinationExtension: ".jpg", label: "Export JPEG (lossy)", lossless: false, available: true, sizeBound: 25_000_000 },
  { id: "image-to-webp", sourceMimeTypes: ["image/png", "image/jpeg", "image/gif", "image/bmp"], destinationMimeType: "image/webp", destinationExtension: ".webp", label: "Export WebP (lossy)", lossless: false, available: true, sizeBound: 25_000_000 },
];

export const LOCAL_FILE_CONVERTER_REGISTRY = LocalFileConverterRegistry;
export function convertersFor(mimeType: string): readonly LocalFileConverterRegistration[] { return LocalFileConverterRegistry.filter((converter) => converter.available && converter.sourceMimeTypes.includes(mimeType)); }