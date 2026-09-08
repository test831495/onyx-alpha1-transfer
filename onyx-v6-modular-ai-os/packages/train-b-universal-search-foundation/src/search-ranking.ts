import { type SearchResult } from "./search-model";

export function rankSearchResults(results: readonly SearchResult[], context?: { policy?: { preferredMatchClass?: string } }): SearchResult[] {
  const ordered = [...results].sort((a, b) => {
    const aWeight = a.matchClasses.includes(context?.policy?.preferredMatchClass ?? "EXACT_TITLE") ? 1 : 0;
    const bWeight = b.matchClasses.includes(context?.policy?.preferredMatchClass ?? "EXACT_TITLE") ? 1 : 0;
    if (aWeight !== bWeight) return bWeight - aWeight;
    const scoreDiff = (b.sourceRelevanceScore ?? 0) - (a.sourceRelevanceScore ?? 0);
    if (scoreDiff !== 0) return scoreDiff;
    return (a.resultId || "").localeCompare(b.resultId || "");
  });
  return ordered;
}
