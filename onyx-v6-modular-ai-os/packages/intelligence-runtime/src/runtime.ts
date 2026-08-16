import type {ActionResult,RawAssistantInput} from "@onyx/contracts";import {ActionDispatcher,ActionHandlerRegistry} from "@onyx/action-dispatcher";import {createBuiltinRegistry} from "@onyx/module-registry";import {normalizeAssistantInput,resolveIntent} from "@onyx/intent-engine";
export interface RuntimeResult{requestId:string;intent:ReturnType<typeof resolveIntent>;result:ActionResult;diagnostics:readonly string[];}
export function createIntelligenceRuntime(){const modules=createBuiltinRegistry(),handlers=new ActionHandlerRegistry();
 handlers.register("assistant.switch",async i=>({status:"success",message:`Switched to ${i.assistant.toUpperCase()}.`,data:{assistant:i.assistant}}));
 handlers.register("module.open",async i=>({status:"success",message:`${modules.getModule(i.target)?.title??i.target} opened.`,data:{moduleId:i.target}}));
 handlers.register("app.launch",async i=>{const app=modules.getApplication(i.target);return app?.availability==="available"?{status:"success",message:`${app.title} launched.`,data:{appId:i.target}}:{status:"unsupported",code:"APP_NOT_IMPLEMENTED",message:`${app?.title??i.target} is registered but not implemented.`};});
 handlers.register("document.search",async i=>({status:"success",message:`Document search prepared for: ${i.query}`,data:{query:i.query,matches:[]}}));
 handlers.register("settings.open",async()=>({status:"success",message:"Settings opened.",data:{moduleId:"settings"}}));
 handlers.register("unsupported",async i=>({status:"unsupported",code:"UNSUPPORTED_INTENT",message:i.reason}));
 const dispatcher=new ActionDispatcher(handlers);
 return{async processInput(input:RawAssistantInput,signal=new AbortController().signal):Promise<RuntimeResult>{const requestId=globalThis.crypto?.randomUUID?.()??`request-${Date.now()}`;const normalized=normalizeAssistantInput(input),intent=resolveIntent(normalized,modules),result=await dispatcher.dispatch(intent,{requestId,signal});return{requestId,intent,result,diagnostics:[`source:${input.source}`,`intent:${intent.kind}`,`status:${result.status}`]};}};
}
