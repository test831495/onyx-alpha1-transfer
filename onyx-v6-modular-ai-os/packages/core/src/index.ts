import type { AssistantMode, CommandEnvelope, CoreState } from '@onyx/contracts';
import { classifyCommand } from '@onyx/privacy';
export type CoreEvent={type:'WAKE';mode:AssistantMode}|{type:'TRANSCRIPT';text:string}|{type:'TOOL_START'}|{type:'TOOL_END'}|{type:'SPEAK_START'}|{type:'SPEAK_END'}|{type:'ERROR'}|{type:'RESET'};
export class AICore {
 state:CoreState='wake-armed'; mode:AssistantMode='nova'; transcript='';
 private listeners=new Set<(core:AICore)=>void>();
 subscribe(listener:(core:AICore)=>void){this.listeners.add(listener);return()=>this.listeners.delete(listener)}
 dispatch(event:CoreEvent){
  switch(event.type){case'WAKE':this.mode=event.mode;this.state='listening';this.transcript='';break;case'TRANSCRIPT':this.transcript=event.text;this.state='thinking';break;case'TOOL_START':this.state='executing';break;case'TOOL_END':this.state='thinking';break;case'SPEAK_START':this.state='speaking';break;case'SPEAK_END':this.state='wake-armed';break;case'ERROR':this.state='error';break;case'RESET':this.state='wake-armed';this.transcript='';break}this.listeners.forEach(x=>x(this));
 }
 route(text:string){const command:CommandEnvelope={id:crypto.randomUUID(),mode:this.mode,text,timestamp:new Date().toISOString(),context:{},requestedScopes:[]};return{command,decision:classifyCommand(command)}}
}
export function modeFromWake(text:string):AssistantMode|null{const normalized=text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s]/g," ").replace(/\s+/g," ").trim();const match=normalized.match(/^(?:hey\s+)?(nova|onyx)\b/);return match?.[1]==="nova"?"nova":match?.[1]==="onyx"?"onyx":null;}
