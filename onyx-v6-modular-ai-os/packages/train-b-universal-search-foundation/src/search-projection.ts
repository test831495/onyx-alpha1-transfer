export function projectSearchResult(_result: unknown, preferences?: { sharedRoom?: boolean; detail?: string }): Record<string, unknown> {
  return Object.freeze({
    detail: preferences?.detail ?? "standard",
    sharedRoom: !!preferences?.sharedRoom,
    visible: true,
  });
}

export function projectSearchCoverage(_coverage: unknown): Record<string, unknown> {
  return Object.freeze({ visible: true, sourceDisclosures: [] });
}
