import{describe,expect,it}from"vitest";import type{Intent}from"@onyx/contracts";import{ActionDispatcher}from"./dispatcher";import{ActionHandlerRegistry}from"./registry";
const ctx=()=>({requestId:"test",signal:new AbortController().signal});describe("ActionDispatcher",()=>{
 it("executes handlers",async()=>{const r=new ActionHandlerRegistry();r.register("module.open",async i=>({status:"success",message:`${i.target} opened.`}));const x:Intent={kind:"module.open",target:"calendar"};expect(await new ActionDispatcher(r).dispatch(x,ctx())).toMatchObject({status:"success"});});
 it("returns unsupported without handler",async()=>expect(await new ActionDispatcher(new ActionHandlerRegistry()).dispatch({kind:"settings.open"},ctx())).toMatchObject({status:"unsupported",code:"NO_HANDLER"}));
 it("rejects duplicate handlers",()=>{const r=new ActionHandlerRegistry(),h=async()=>({status:"success" as const,message:"ok"});r.register("settings.open",h);expect(()=>r.register("settings.open",h)).toThrow("Handler already registered");});
 it("normalizes failures",async()=>{const r=new ActionHandlerRegistry();r.register("settings.open",async()=>{throw new Error("failed")});expect(await new ActionDispatcher(r).dispatch({kind:"settings.open"},ctx())).toMatchObject({status:"failed",code:"HANDLER_FAILURE"});});
 it("cancels before execution",async()=>{const r=new ActionHandlerRegistry(),c=new AbortController();c.abort();expect(await new ActionDispatcher(r).dispatch({kind:"settings.open"},{requestId:"x",signal:c.signal})).toMatchObject({status:"cancelled"});});
});
