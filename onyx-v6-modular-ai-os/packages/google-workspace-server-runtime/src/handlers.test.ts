import { describe, expect, it } from "vitest";
import { createGoogleCalendarHandler, createGoogleInitiateHandler } from "./handlers";
import type { GoogleServerRuntime } from "./index";

const runtime = { policy: { credentialOperationsEnabled: false } } as GoogleServerRuntime;

describe("Google Function route boundaries", () => {
  it("rejects mutation methods other than POST before runtime access", async () => {
    const response = await createGoogleInitiateHandler(runtime)({ httpMethod: "GET" });
    expect(response.statusCode).toBe(405);
    expect(response.headers?.allow).toBe("POST");
  });

  it("fails closed before provider access when activation is disabled", async () => {
    const response = await createGoogleCalendarHandler(runtime)({ httpMethod: "POST", body: "{}" });
    expect(response.statusCode).toBe(503);
    expect(response.body).toContain("UNAVAILABLE");
  });
});