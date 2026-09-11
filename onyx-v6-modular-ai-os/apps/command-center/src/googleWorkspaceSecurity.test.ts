import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./workspaceController.ts", import.meta.url), "utf8");

describe("Google Workspace browser security", () => {
  it("uses server-issued CSRF bootstrap and has no predictable fallback or browser storage", () => {
    expect(source).toContain("/.netlify/functions/google-csrf");
    expect(source).toContain('"x-csrf-token": csrf.csrfToken');
    expect(source).not.toContain('meta[name="csrf-token"]');
    expect(source).not.toMatch(/localStorage|sessionStorage|indexedDB/i);
    expect(source).not.toMatch(/csrf[^\n]*(connect|reconnect|disconnect|refresh)/i);
  });
});