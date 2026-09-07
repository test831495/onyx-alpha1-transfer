type Assistant = "nova" | "onyx";

const statusEvent = "onyx:voice-supervisor-status";
const settingEvent = "onyx:voice-supervisor-setting";

const emit = (message: string, state = "idle", assistant: Assistant = "nova") =>
	window.dispatchEvent(new CustomEvent(statusEvent, { detail: { message, state, assistant } }));

function setting(event: Event) {
	const detail = (event as CustomEvent<{ assistant?: Assistant; enabled?: boolean; wakeEnabled?: boolean }>).detail || {};
	const assistant = detail.assistant ?? "nova";

	if (detail.enabled) {
		emit(
			detail.wakeEnabled
				? "Auto Listen is saved for bounded follow-up after eligible replies. Wake-word readiness is saved; no background listener is active."
				: "Auto Listen is saved for bounded follow-up after eligible replies; no background listener is active.",
			"ready",
			assistant,
		);
		return;
	}

	emit("Push-to-talk mode is active. Wake-word readiness is saved; no background listener is active.", "idle", assistant);
}

if (typeof window !== "undefined") {
	window.addEventListener(settingEvent, setting);
}
