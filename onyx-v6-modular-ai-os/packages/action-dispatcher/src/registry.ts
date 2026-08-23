import type {ActionResult,Intent} from "@onyx/contracts";
export interface ActionContext{requestId:string;signal:AbortSignal;}
export type ActionHandler<T extends Intent=Intent>=(intent:T,context:ActionContext)=>Promise<ActionResult>;
export class ActionHandlerRegistry{private readonly handlers=new Map<Intent["kind"],ActionHandler>();register<K extends Intent["kind"]>(kind:K,handler:ActionHandler<Extract<Intent,{kind:K}>>):void{if(this.handlers.has(kind))throw new Error(`Handler already registered: ${kind}`);this.handlers.set(kind,handler as ActionHandler);}get(kind:Intent["kind"]){return this.handlers.get(kind);}}
