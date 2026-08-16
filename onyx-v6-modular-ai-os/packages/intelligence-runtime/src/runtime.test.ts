import{describe,expect,it}from"vitest";import{createIntelligenceRuntime}from"./runtime";const run=(text:string)=>createIntelligenceRuntime().processInput({text,source:"typed"});
describe("Intelligence Runtime",()=>{
 it("opens Calendar end to end",async()=>{const x=await run("Open Calendar");expect(x.intent).toMatchObject({kind:"module.open",target:"calendar"});expect(x.result).toMatchObject({status:"success",message:"Calendar opened."});});
 it("returns truthful YouTube placeholder",async()=>{const x=await run("Open YouTube");expect(x.intent).toMatchObject({kind:"app.launch",target:"youtube"});expect(x.result).toMatchObject({status:"unsupported",code:"APP_NOT_IMPLEMENTED"});});
 it("prepares document search",async()=>{const x=await run("Find architecture baseline");expect(x.intent).toMatchObject({kind:"document.search",query:"architecture baseline"});expect(x.result).toMatchObject({status:"success",data:{query:"architecture baseline",matches:[]}});});
 it("switches assistants",async()=>expect((await run("Switch to Onyx")).result).toMatchObject({status:"success",data:{assistant:"onyx"}}));
 it("does not execute unrelated unknown commands",async()=>{const x=await run("Perform an unknown action");expect(x.intent.kind).toBe("unsupported");expect(x.result).toMatchObject({status:"unsupported",code:"UNSUPPORTED_INTENT"});});
 it("provides diagnostics",async()=>expect((await run("Open Calendar")).diagnostics).toContain("intent:module.open"));
});
