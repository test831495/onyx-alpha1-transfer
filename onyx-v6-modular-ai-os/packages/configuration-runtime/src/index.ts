export type ProviderState = "disabled" | "unconfigured" | "configured" | "healthy" | "error";
export interface ProviderDefinition { enabled:boolean; role:string; publicEnv:string[]; secretEnv:string[] }
export interface OnyxConfiguration { version:string; environment:"development"|"test"|"production"; production:{deploymentAllowed:boolean;liveNetlifyUpdatesAllowed:boolean}; providers:Record<string,ProviderDefinition>; routing:Record<string,string[]>; policies:Record<string,boolean> }
export interface ProviderHealth { provider:string; role:string; state:ProviderState; missing:string[]; credentialDetected:boolean; diagnostic:string }
export interface EnvironmentReader { get(name:string): string|undefined }
type ProcessLikeGlobal = typeof globalThis & {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

export const processEnvironment: EnvironmentReader = {
  get: (name) =>
    (globalThis as ProcessLikeGlobal).process?.env?.[name],
};
export function validateConfiguration(config:OnyxConfiguration):string[]{const errors:string[]=[];if(!config.version)errors.push("version is required");if(!config.providers)errors.push("providers are required");if(config.production?.deploymentAllowed)errors.push("production deployment must remain blocked during prototype development");if(config.production?.liveNetlifyUpdatesAllowed)errors.push("live Netlify updates must remain blocked during prototype development");return errors}
export function evaluateProviderHealth(name:string,definition:ProviderDefinition,env:EnvironmentReader=processEnvironment):ProviderHealth{if(!definition.enabled)return{provider:name,role:definition.role,state:"disabled",missing:[],credentialDetected:false,diagnostic:"Provider is disabled by configuration."};const required=[...definition.publicEnv,...definition.secretEnv];const missing=required.filter(k=>!env.get(k));const credentialDetected=definition.secretEnv.length===0||definition.secretEnv.every(k=>Boolean(env.get(k)));return{provider:name,role:definition.role,state:missing.length?"unconfigured":"configured",missing,credentialDetected,diagnostic:missing.length?`Missing ${missing.length} required configuration item(s).`:"Required configuration references are available."}}
export function evaluateAllProviders(config:OnyxConfiguration,env?:EnvironmentReader):ProviderHealth[]{return Object.entries(config.providers).map(([name,d])=>evaluateProviderHealth(name,d,env))}
export function maskedEnvironmentSummary(names:string[],env:EnvironmentReader=processEnvironment):Record<string,string>{return Object.fromEntries(names.map(name=>[name,env.get(name)?"[configured]":"[missing]"]))}
