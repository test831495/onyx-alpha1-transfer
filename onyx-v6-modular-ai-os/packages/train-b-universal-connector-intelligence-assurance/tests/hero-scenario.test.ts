import { describe, expect, it } from "vitest";
import { githubReadAdapter, githubSearchCandidate } from "@onyx/train-b-github-read-adapter";
import { googleReadAdapter, googleSearchCandidate } from "@onyx/train-b-google-read-adapter";
import { microsoftReadAdapter, microsoftSearchCandidate } from "@onyx/train-b-microsoft-read-adapter";
import { netlifyReadAdapter, netlifySearchCandidate } from "@onyx/train-b-netlify-read-adapter";
import { runUniversalConnectorIntelligence } from "@onyx/train-b-universal-connector-intelligence";

describe("B1 four-provider hero scenario", () => {
  it("returns attributed, non-authorizing evidence for ONYX today", async () => {
    const run = await runUniversalConnectorIntelligence({
      requestId: "request:hero:today",
      accountScopeReference: "account:synthetic",
      purposeReference: "purpose:status",
      queryTextReference: "What is happening with ONYX today?",
      searchModes: ["METADATA", "FULL_TEXT"],
      applicationScopes: ["engineering", "deployment", "productivity"],
      maximumResults: 50,
      pageSize: 50,
    }, [
      { adapter: githubReadAdapter, candidate: githubSearchCandidate },
      { adapter: netlifyReadAdapter, candidate: netlifySearchCandidate },
      { adapter: microsoftReadAdapter, candidate: microsoftSearchCandidate },
      { adapter: googleReadAdapter, candidate: googleSearchCandidate },
    ]);

    expect(run.plan.sources.filter((source) => source.sourceState === "ELIGIBLE")).toHaveLength(4);
    expect(run.results).toHaveLength(20);
    expect(run.results.every((result) => result.evidenceReferences.length > 0)).toBe(true);
    expect(run.receipt.attributionCompleteness).toBe("COMPLETE");
    expect(run.synthesis.nonAuthorizing).toBe(true);
    expect(run.synthesis.citations).toHaveLength(20);
  });
});