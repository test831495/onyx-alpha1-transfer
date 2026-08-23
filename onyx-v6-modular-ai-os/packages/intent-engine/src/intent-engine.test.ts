import {describe,expect,it} from "vitest";import {createBuiltinRegistry} from "@onyx/module-registry";import {normalizeAssistantInput} from "./normalize";import {resolveIntent} from "./resolve";
const resolve=(text:string)=>resolveIntent(normalizeAssistantInput({text,source:"typed"}),createBuiltinRegistry());
describe("Intent Engine",()=>{
 it("switches assistants",()=>{expect(resolve("Switch to Onyx")).toEqual({kind:"assistant.switch",assistant:"onyx"});expect(resolve("Call Nova")).toEqual({kind:"assistant.switch",assistant:"nova"});});
 it("opens modules and aliases",()=>{expect(resolve("Open calendar")).toMatchObject({kind:"module.open",target:"calendar"});expect(resolve("Show my schedule")).toMatchObject({kind:"module.open",target:"calendar"});});
 it("launches registered apps",()=>expect(resolve("Launch YouTube")).toMatchObject({kind:"app.launch",target:"youtube"}));
 it("searches documents",()=>expect(resolve("Find architecture baseline")).toMatchObject({kind:"document.search",query:"architecture baseline"}));
 it("opens settings",()=>expect(resolve("Open settings")).toMatchObject({kind:"settings.open"}));
 it("returns unsupported",()=>expect(resolve("Perform an unknown action")).toMatchObject({kind:"unsupported"}));
 it("never maps YouTube to Finance",()=>{const x=resolve("Open YouTube");expect(x).toMatchObject({kind:"app.launch",target:"youtube"});expect(x).not.toMatchObject({kind:"module.open",target:"finance"});});
});
