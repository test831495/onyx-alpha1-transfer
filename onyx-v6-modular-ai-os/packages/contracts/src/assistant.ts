export const assistantModes = ["nova", "onyx"] as const;
export type AssistantMode = (typeof assistantModes)[number];
export function isAssistantMode(value: unknown): value is AssistantMode {
  return typeof value === "string" && assistantModes.includes(value as AssistantMode);
}
