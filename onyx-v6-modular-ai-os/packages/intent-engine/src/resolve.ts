import type { AssistantMode, Intent, NormalizedAssistantInput } from "@onyx/contracts";
import type { ModuleRegistry } from "@onyx/module-registry";
import { joinTokens, removeFillerWords } from "./aliases";
const openVerbs=new Set(["open","show","display"]), launchVerbs=new Set(["launch","start"]), searchVerbs=new Set(["find","search","locate"]);
const detectAssistant=(tokens:readonly string[]):AssistantMode|undefined=>tokens.includes("nova")?"nova":tokens.includes("onyx")?"onyx":undefined;
const removeAssistantTokens=(tokens:readonly string[])=>tokens.filter(t=>!["nova","onyx","hey","hi","hello","call"].includes(t));
const removeSwitchTokens=(tokens:readonly string[])=>tokens.filter(t=>!["switch","change","to","assistant"].includes(t));
export function resolveIntent(input:NormalizedAssistantInput,registry:ModuleRegistry):Intent {
 const assistant=input.requestedAssistant??detectAssistant(input.tokens); const tokens=removeFillerWords(removeAssistantTokens(input.tokens));
 if(assistant && removeSwitchTokens(tokens).length===0)return{kind:"assistant.switch",assistant};
 if(assistant && (tokens.includes("switch")||tokens.includes("change")))return{kind:"assistant.switch",assistant};
 const verb=tokens[0];
 if((verb==="open"&&tokens[1]==="settings")||(tokens.length===1&&verb==="settings"))return{kind:"settings.open",assistant};
 if(verb&&searchVerbs.has(verb)){const query=joinTokens(tokens.slice(1));if(query)return{kind:"document.search",query,assistant};}
 const target=joinTokens(tokens.slice(1));
 if(verb&&openVerbs.has(verb)){const m=registry.resolveModule(target);if(m)return{kind:"module.open",target:m.id,assistant};const a=registry.resolveApplication(target);if(a)return{kind:"app.launch",target:a.id,assistant};}
 if(verb&&launchVerbs.has(verb)){const a=registry.resolveApplication(target);if(a)return{kind:"app.launch",target:a.id,assistant};}
 const direct=joinTokens(tokens),m=registry.resolveModule(direct);if(m)return{kind:"module.open",target:m.id,assistant};const a=registry.resolveApplication(direct);if(a)return{kind:"app.launch",target:a.id,assistant};
 return{kind:"unsupported",rawInput:input.rawText,reason:"No registered intent matched"};
}
