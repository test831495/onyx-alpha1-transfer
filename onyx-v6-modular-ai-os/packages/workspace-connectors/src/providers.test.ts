import { describe, expect, it } from "vitest";
import { googleDisconnectedProviderSnapshot, plannedProviderSnapshots } from "./providers";

describe("workspace providers", () => {
	it("keeps Google disconnected without presenting it as a future placeholder", () => {
		const google = googleDisconnectedProviderSnapshot();
		expect(google).toMatchObject({ provider: "google", label: "Google", state: "disconnected" });
		expect(google.diagnostic).toContain("Connect Google");
		expect(google.capabilities).toEqual([
			{ id: "profile", label: "Google profile", enabled: false },
			{ id: "mail", label: "Gmail", enabled: false },
			{ id: "calendar", label: "Google Calendar", enabled: false },
			{ id: "files", label: "Google Drive", enabled: false },
		]);
	});

	it("retains unrelated planned providers", () => {
		const values = plannedProviderSnapshots();
		expect(values.map((value) => value.provider)).toEqual(["google", "yahoo"]);
		expect(values.find((value) => value.provider === "yahoo")?.state).toBe("unconfigured");
	});
});
