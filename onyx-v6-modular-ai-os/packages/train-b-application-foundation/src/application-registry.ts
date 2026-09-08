import { APPROVED_APPLICATION_IDS, type ApplicationAction, type ApplicationDefinition, type ApplicationId, type ApplicationRegistrySnapshot } from "./application-model";
import { normalizeAlias, validateApplicationDefinition, APPLICATION_BOUNDS } from "./validators";
export interface ApplicationRegistry { register(definition: ApplicationDefinition): ApplicationDefinition; get(id: string): ApplicationDefinition | undefined; resolve(value: string): ApplicationDefinition | undefined; list(): readonly ApplicationDefinition[]; snapshot(): ApplicationRegistrySnapshot; }
function makeDefinition(id: ApplicationId, displayName: string, aliases: string[], category: ApplicationDefinition["category"], capabilities: string[], actions: readonly ApplicationAction[] = ["OPEN","CLOSE","SHOW","HIDE","EXPLAIN","DESCRIBE_AVAILABILITY","DESCRIBE_SOURCES","DESCRIBE_FRESHNESS","DESCRIBE_HEALTH"]): ApplicationDefinition { return { applicationId:id, version:"1.0.0", displayName, aliases, category, lifecycleState:"ACTIVE", shellTarget:`shell:${id}`, parentView:"command-center", requiredCapabilities:capabilities, optionalCapabilities:[], supportedActions:actions, privacyClass:id === "memory" || id === "messages" ? "OWNER_ONLY" : "PERSONAL", sharedRoomPolicy:id === "messages" || id === "memory" ? "HIDE" : "REDUCE", devices:["WEB","DESKTOP","MOBILE","TABLET","TV","FUTURE_XR"], placeholderAllowed:true, attributionRequired:true, freshnessRequired:true, nonAuthorizing:true }; }
export const CANONICAL_APPLICATION_DEFINITIONS: readonly ApplicationDefinition[] = Object.freeze([
 makeDefinition("workspace","Workspace",["workspace","work space"],"OPERATIONS",["application.read"]), makeDefinition("automation","Automation",["automation","automations"],"OPERATIONS",["application.read"]), makeDefinition("calendar","Calendar",["calendar","schedule","agenda","meetings"],"PRODUCTIVITY",["calendar.read"]), makeDefinition("tasks","Tasks",["tasks","task","to do","todo"],"PRODUCTIVITY",["tasks.read"]), makeDefinition("news","News",["news","headlines","briefing"],"INFORMATION",["news.read"]), makeDefinition("messages","Messages",["messages","message","inbox"],"COMMUNICATION",["messages.read"]), makeDefinition("health","Health",["health","system health"],"SYSTEM",["application.read"]), makeDefinition("settings","Settings",["settings","preferences"],"SYSTEM",["application.read"]), makeDefinition("files","Files",["files","file","documents","folders"],"PRODUCTIVITY",["files.read"]), makeDefinition("executive","Executive",["executive","overview"],"OPERATIONS",["application.read"]), makeDefinition("finance","Finance",["finance","finances"],"PERSONAL",["finance.read"]), makeDefinition("notes","Notes",["notes","note"],"PERSONAL",["notes.read"]), makeDefinition("memory","Memory",["memory","memories"],"PERSONAL",["memory.read"]),
]);
export function createApplicationRegistry(definitions: readonly ApplicationDefinition[] = CANONICAL_APPLICATION_DEFINITIONS): ApplicationRegistry {
	const initialEntries = new Map<string, ApplicationDefinition>();
	const initialAliases = new Map<string, string>();
	const validated = definitions.map(validateApplicationDefinition);
	if (validated.length > APPLICATION_BOUNDS.maxApplications) throw new Error("Application limit exceeded");
	const index = (definition: ApplicationDefinition, entries: Map<string, ApplicationDefinition>, aliases: Map<string, string>): void => {
		if (entries.has(definition.applicationId)) throw new Error("Duplicate application ID");
		const keys = [definition.applicationId, definition.displayName, ...definition.aliases].map(normalizeAlias);
		for (const key of keys) {
			const prior = aliases.get(key);
			if (prior && prior !== definition.applicationId) throw new Error("Alias collision");
		}
		entries.set(definition.applicationId, definition);
		for (const key of keys) aliases.set(key, definition.applicationId);
	};
	for (const definition of validated) index(definition, initialEntries, initialAliases);
	const entries = new Map(initialEntries);
	const aliases = new Map(initialAliases);
	return {
		register(definition) {
			if (entries.size >= APPLICATION_BOUNDS.maxApplications) throw new Error("Application limit exceeded");
			const checked = validateApplicationDefinition(definition);
			const nextEntries = new Map(entries);
			const nextAliases = new Map(aliases);
			index(checked, nextEntries, nextAliases);
			entries.clear();
			nextEntries.forEach((value, key) => entries.set(key, value));
			aliases.clear();
			nextAliases.forEach((value, key) => aliases.set(key, value));
			return checked;
		},
		get: (id) => entries.get(id),
		resolve: (value) => entries.get(aliases.get(normalizeAlias(value)) ?? ""),
		list: () => Object.freeze([...entries.values()].sort((a,b)=>a.applicationId.localeCompare(b.applicationId))),
		snapshot: () => { const list=[...entries.values()].sort((a,b)=>a.applicationId.localeCompare(b.applicationId)); return Object.freeze({ entries:Object.freeze(list), ids:Object.freeze(list.map(x=>x.applicationId)), byId:Object.freeze(Object.fromEntries(list.map(x=>[x.applicationId,x]))) }); },
	};
}
export { APPROVED_APPLICATION_IDS };