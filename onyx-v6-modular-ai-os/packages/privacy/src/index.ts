import type { CommandEnvelope, PrivacyDecision } from '@onyx/contracts';
const LOCAL_PATTERNS = [/my files?/i,/screenshot/i,/this (screen|document)/i,/system (status|health)/i,/offline/i,/local memory/i];
const CLOUD_PATTERNS = [/latest/i,/news/i,/market/i,/stock/i,/finance/i,/email/i,/calendar/i,/smart home/i,/business analytics/i];
const SECRET_PATTERNS = [/api[_ -]?key/i,/password/i,/secret/i,/token/i];
export function classifyCommand(command: CommandEnvelope): PrivacyDecision {
 const text=command.text;
 if(SECRET_PATTERNS.some(x=>x.test(text))) return {allowed:false,reason:'Secrets cannot be sent through conversational tools.',route:'ask-user',redactions:['secret-like content']};
 if(LOCAL_PATTERNS.some(x=>x.test(text))) return {allowed:true,reason:'Local/private context remains with NOVA.',route:'local',redactions:[]};
 if(CLOUD_PATTERNS.some(x=>x.test(text))) return command.mode==='onyx'
   ? {allowed:true,reason:'Cloud intelligence explicitly requested through ONYX.',route:'cloud',redactions:[]}
   : {allowed:false,reason:'This request needs live cloud data. Ask the user to switch to ONYX.',route:'ask-user',redactions:[]};
 return {allowed:true,reason:'No sensitive boundary detected.',route:command.mode==='nova'?'local':'cloud',redactions:[]};
}
export const PRIVACY_BOUNDARY = Object.freeze({
 nova:['local files','screenshots','documents','system telemetry','offline memory'],
 onyx:['finance','business analytics','news','email','calendar','smart home'],
 shared:['user-approved summaries','plugin metadata','non-secret preferences'],
 prohibited:['raw passwords','API keys','private files without explicit approval']
});
