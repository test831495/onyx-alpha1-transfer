type Assistant = "nova" | "onyx";

const statusEvent = "onyx:voice-supervisor-status";
const settingEvent = "onyx:voice-supervisor-setting";

const emit = (message: string, state = "idle", assistant: Assistant = "nova") =>
	window.dispatchEvent(new CustomEvent(statusEvent, { detail: { message, state, assistant } }));

export function describeVoiceSupervisorStatus(enabled?: boolean, wakeEnabled?: boolean): string {
	if (!enabled) return "Voice recognition standby is paused. No background listener is active.";
	return wakeEnabled
		? "Auto Listen is saved for bounded follow-up after eligible replies. Wake-word readiness is saved; no background listener is active."
		: "Auto Listen is saved for bounded follow-up after eligible replies; no background listener is active.";
}

function setting(event: Event) {
	const detail = (event as CustomEvent<{ assistant?: Assistant; enabled?: boolean; wakeEnabled?: boolean }>).detail || {};
	const assistant = detail.assistant ?? "nova";

	if (detail.enabled) {
		emit(describeVoiceSupervisorStatus(true, detail.wakeEnabled), "ready", assistant);
		return;
	}

	emit(describeVoiceSupervisorStatus(false, detail.wakeEnabled), "idle", assistant);
}

if (typeof window !== "undefined") {
	window.addEventListener(settingEvent, setting);
}
