import type { ApplicationManifest, ModuleManifest } from "./manifest";
import { ModuleRegistry } from "./registry";
export const builtinModuleManifests: readonly ModuleManifest[] = [
 {id:"files",title:"Files",description:"Search, preview, and open authorized local files.",aliases:["file","documents","document","folders","folder"],capabilities:["module.open","document.search"],availability:"available"},
 {id:"calendar",title:"Calendar",description:"Display schedules, meetings, and appointments.",aliases:["schedule","agenda","meetings","appointments"],capabilities:["module.open","calendar.view"],availability:"available"},
 {id:"tasks",title:"Tasks",description:"Display and manage task information.",aliases:["task","to do","todo","work items"],capabilities:["module.open","tasks.view"],availability:"available"},
 {id:"weather",title:"Weather",description:"Display current conditions and forecasts.",aliases:["forecast","temperature","climate"],capabilities:["module.open","weather.view"],availability:"available"},
 {id:"news",title:"News",description:"Display headlines and news briefings.",aliases:["headlines","briefing","news briefing"],capabilities:["module.open","news.view"],availability:"available"}
];
export const builtinApplicationManifests: readonly ApplicationManifest[] = [
 {id:"youtube",title:"YouTube",description:"YouTube Phase 1 placeholder.",aliases:["you tube","video app"],capabilities:["app.launch","media.search","media.play"],availability:"placeholder",launchMode:"unavailable"},
 {id:"browser",title:"Browser",description:"Browser Phase 1 placeholder.",aliases:["web browser","internet browser","chrome","google chrome"],capabilities:["app.launch","web.open"],availability:"placeholder",launchMode:"unavailable"},
 {id:"spotify",title:"Spotify",description:"Spotify Phase 1 placeholder.",aliases:["music app"],capabilities:["app.launch","media.search","media.play"],availability:"placeholder",launchMode:"unavailable"}
];
export function createBuiltinRegistry(): ModuleRegistry { const r=new ModuleRegistry(); for(const m of builtinModuleManifests)r.registerModule(m); for(const a of builtinApplicationManifests)r.registerApplication(a); return r; }
