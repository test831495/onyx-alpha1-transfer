import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { LIVE_CONFIRMATION, runLiveDraftPr } from "../src/live-draft-pr";

const wrapperPath = new URL("../../../scripts/run-phase1a4d-live-draft-pr.sh", import.meta.url);

describe("Phase 1A.4D wrapper confirmation boundary", () => {
  it("requires an externally supplied non-empty confirmation without assigning it", async () => {
    const wrapper = await readFile(wrapperPath, "utf8");

    expect(wrapper).toContain("PHASE1A4D_LIVE_CONFIRMATION-");
    expect(wrapper).not.toMatch(/export\s+PHASE1A4D_LIVE_CONFIRMATION/);
    expect(wrapper).not.toMatch(/PHASE1A4D_LIVE_CONFIRMATION\s*=/);
  });

  it("keeps absent and incorrect confirmation failures in the TypeScript gate", async () => {
    await expect(runLiveDraftPr({ env: {} })).rejects.toThrow("PHASE1A4D_LIVE_CONFIRMATION");
    await expect(runLiveDraftPr({ env: { PHASE1A4D_LIVE_CONFIRMATION: "WRONG" } })).rejects.toThrow("PHASE1A4D_LIVE_CONFIRMATION");
  });

  it("accepts the correct external value only at the mocked boundary", async () => {
    const calls: string[] = [];
    const checks = {
      actor: () => "coolscorpiorahul",
      repository: () => "test831495/onyx-alpha1-transfer",
      issue: async () => ({ number: 7, state: "OPEN" as const, title: "Phase 1A.4A Live Smoke Test" }),
      worktree: async () => ({ clean: true, detached: false }),
      remoteBranch: async () => ({ exists: true, commit: "2222222222222222222222222222222222222222" }),
      localHeadCommit: () => "2222222222222222222222222222222222222222",
      baseBranchCommit: async () => "1111111111111111111111111111111111111111",
      headDiff: async () => ({ identicalCommits: false, ahead: true, diffNonEmpty: true }),
      implementationBranch: () => "feature/phase1a4d-draft-pr-bridge",
      githubAuthenticated: () => true,
    };
    type DraftInput = { repository: string; baseBranch: string; headBranch: string; headCommit: string; idempotencyKey: string };
    let createdInput: DraftInput | null = null;
    const adapter = {
      findByRepositoryBaseHead: async () => createdInput && {
        number: 1,
        url: "https://example.invalid/1",
        draft: true,
        repository: createdInput.repository,
        baseBranch: createdInput.baseBranch,
        headBranch: createdInput.headBranch,
        headCommit: createdInput.headCommit,
        idempotencyKey: createdInput.idempotencyKey,
      },
      findByIdempotencyKey: async () => createdInput && {
        number: 1,
        url: "https://example.invalid/1",
        draft: true,
        repository: createdInput.repository,
        baseBranch: createdInput.baseBranch,
        headBranch: createdInput.headBranch,
        headCommit: createdInput.headCommit,
        idempotencyKey: createdInput.idempotencyKey,
      },
      createDraft: async (input: DraftInput) => {
        calls.push("mock-create-draft");
        createdInput = input;
        return { number: 1, url: "https://example.invalid/1", draft: true };
      },
    };

    await runLiveDraftPr({
      env: { PHASE1A4D_LIVE_CONFIRMATION: LIVE_CONFIRMATION },
      checks,
      adapter,
      repositoryRoot: "/tmp",
      writeEvidence: async () => undefined,
      now: () => new Date("2026-01-01T00:00:00.000Z"),
    });

    expect(calls).toEqual(["mock-create-draft"]);
  });
});