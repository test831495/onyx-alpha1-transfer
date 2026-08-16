import type { AssistantMode } from "./assistant";
export const inputSources = ["typed", "voice", "core", "navigation", "gesture", "system"] as const;
export type InputSource = (typeof inputSources)[number];
export interface RawAssistantInput { text: string; source: InputSource; locale?: string; requestedAssistant?: AssistantMode; timestamp?: number; }
export interface NormalizedAssistantInput { rawText: string; normalizedText: string; tokens: string[]; source: InputSource; locale: string; requestedAssistant?: AssistantMode; timestamp: number; }
