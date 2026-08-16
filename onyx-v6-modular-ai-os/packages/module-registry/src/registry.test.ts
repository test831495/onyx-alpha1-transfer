import { describe, expect, it } from "vitest";
import { createBuiltinRegistry, ModuleRegistry } from "./index";
import type { ModuleManifest } from "./manifest";
describe("ModuleRegistry",()=>{
 it("registers and resolves builtins",()=>{const r=createBuiltinRegistry();expect(r.resolveModule("schedule")?.id).toBe("calendar");expect(r.resolveApplication("google chrome")?.id).toBe("browser");});
 it("keeps applications separate from modules",()=>{const r=createBuiltinRegistry();expect(r.resolveModule("youtube")).toBeUndefined();expect(r.resolveApplication("youtube")?.availability).toBe("placeholder");});
 it("rejects duplicate IDs",()=>{const r=new ModuleRegistry();const m:ModuleManifest={id:"calendar",title:"Calendar",description:"Test",aliases:[],capabilities:[],availability:"available"};r.registerModule(m);expect(()=>r.registerModule(m)).toThrow("Module already registered");});
 it("returns undefined for unknown aliases",()=>expect(createBuiltinRegistry().resolveModule("unknown")).toBeUndefined());
});
