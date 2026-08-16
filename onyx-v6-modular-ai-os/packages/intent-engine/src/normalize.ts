import type {
  NormalizedAssistantInput,
  RawAssistantInput,
} from "@onyx/contracts";

const defaultLocale = "en-IN";

function normalizeText(
  value: string,
): string {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAssistantInput(
  input: RawAssistantInput,
): NormalizedAssistantInput {
  const normalizedText =
    normalizeText(input.text);

  return {
    rawText: input.text,
    normalizedText,
    tokens: normalizedText
      ? normalizedText.split(" ")
      : [],
    source: input.source,
    locale:
      input.locale?.trim() ||
      defaultLocale,
    requestedAssistant:
      input.requestedAssistant,
    timestamp:
      input.timestamp ??
      Date.now(),
  };
}