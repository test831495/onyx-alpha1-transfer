import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../../", import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, root), "utf8");

describe("offline preservation", () => {
  it("does not couple local shell and offline projection code to online credentials", () => {
    const localSources = [
      "packages/calendar-intelligence/src/index.ts",
      "packages/post-alpha-offline-projection-store/src/index.ts",
      "apps/command-center/src/ModeShell.tsx",
    ];
    for (const source of localSources) {
      expect(read(source)).not.toMatch(/CredentialStore|TokenBroker|provider-neutral-credential-store-session-foundation|OnyxServerSessionValidator/);
    }
  });
});