export const builtinModules = [
  "files",
  "calendar",
  "tasks",
  "weather",
  "news",
] as const;

export type ModuleId =
  (typeof builtinModules)[number];

export interface ModuleManifest {
  id: ModuleId;
  title: string;
  description?: string;
  aliases: string[];
}