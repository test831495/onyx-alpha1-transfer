import type { PluginManifest, CommandEnvelope, ToolExecution } from '@onyx/contracts';
export interface PluginContext { command:CommandEnvelope; signal:AbortSignal; secrets:{get(name:string):Promise<string|undefined>}; memory:{query(namespace:string,q:string):Promise<unknown[]>;put(record:unknown):Promise<void>}; emit(event:string,payload:unknown):void }
export interface OnyxPlugin { manifest:PluginManifest; execute(tool:string,input:Record<string,unknown>,context:PluginContext):Promise<unknown>; health?():Promise<{ok:boolean;detail?:string}> }
export class PluginRegistry {
 private plugins=new Map<string,OnyxPlugin>();
 register(plugin:OnyxPlugin){if(this.plugins.has(plugin.manifest.id))throw new Error(`Plugin ${plugin.manifest.id} already registered`);this.plugins.set(plugin.manifest.id,plugin)}
 list(){return [...this.plugins.values()].map(x=>x.manifest)}
 get(id:string){return this.plugins.get(id)}
 async invoke(pluginId:string,tool:string,input:Record<string,unknown>,context:PluginContext):Promise<ToolExecution>{
  const id=crypto.randomUUID(),startedAt=new Date().toISOString(),plugin=this.plugins.get(pluginId);
  if(!plugin)return {id,commandId:context.command.id,pluginId,tool,state:'failed',startedAt,error:'Plugin not registered'};
  try{const output=await plugin.execute(tool,input,context);return{id,commandId:context.command.id,pluginId,tool,state:'succeeded',startedAt,completedAt:new Date().toISOString(),output}}
  catch(error){return{id,commandId:context.command.id,pluginId,tool,state:'failed',startedAt,completedAt:new Date().toISOString(),error:error instanceof Error?error.message:String(error)}}
 }
}
