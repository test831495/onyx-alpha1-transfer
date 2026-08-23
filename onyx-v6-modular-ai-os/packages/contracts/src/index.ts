export type AssistantMode = 'nova' | 'onyx';
export type CoreState = 'idle' | 'wake-armed' | 'listening' | 'thinking' | 'executing' | 'speaking' | 'error';
export type DataClassification = 'public' | 'local-private' | 'cloud-approved' | 'secret';
export type CapabilityScope = 'local.read'|'local.write'|'cloud.read'|'cloud.write'|'device.control'|'memory.read'|'memory.write';
export interface CommandEnvelope { id:string; mode:AssistantMode; text:string; timestamp:string; context:Record<string,unknown>; requestedScopes:CapabilityScope[] }
export interface ToolExecution { id:string; commandId:string; pluginId:string; tool:string; state:'queued'|'running'|'succeeded'|'failed'; startedAt:string; completedAt?:string; output?:unknown; error?:string }
export interface MemoryRecord { id:string; namespace:string; owner:'nova'|'onyx'|'shared'; classification:DataClassification; content:string; metadata:Record<string,unknown>; createdAt:string; expiresAt?:string }
export interface PluginManifest { id:string; name:string; version:string; description:string; runtime:'browser'|'server'|'hybrid'; scopes:CapabilityScope[]; tools:ToolDefinition[]; dashboard?:DashboardModule[] }
export interface ToolDefinition { name:string; description:string; inputSchema:Record<string,unknown>; approval:'never'|'sensitive'|'always' }
export interface DashboardModule { id:string; title:string; zone:'executive'|'finance'|'news'|'social'|'email'|'calendar'|'automation'|'local'|'health'; component:string }
export interface AutomationWorkflow { id:string; name:string; enabled:boolean; trigger:WorkflowTrigger; steps:WorkflowStep[]; privacy:'local-only'|'cloud-approved' }
export interface WorkflowTrigger { type:'schedule'|'event'|'voice'|'manual'; config:Record<string,unknown> }
export interface WorkflowStep { pluginId:string; tool:string; input:Record<string,unknown>; onError:'stop'|'continue' }
export interface PrivacyDecision { allowed:boolean; reason:string; route:'local'|'cloud'|'ask-user'; redactions:string[] }
export interface SystemSnapshot { cpu:number; memory:number; storage:number; network:number; online:boolean; wakeArmed:boolean; activeMode:AssistantMode; coreState:CoreState }
export interface ExecutiveSnapshot { revenue:number; activeProjects:number; clients:number; tasksCompleted:number; portfolio:number; news:string[]; calendar:{time:string;title:string}[] }
export * from "./assistant";
export * from "./input";
export * from "./module";
export * from "./intent";
export * from "./action";
