export type AssistantIdentity="nova"|"onyx";
export type AssistantVerbosity="brief"|"detailed";
export type AssistantExecutionBias="local-first"|"cloud-augmented";

export interface AssistantProfile {
  id:AssistantIdentity;
  name:string;
  role:string;
  shortRole:string;
  description:string;
  greeting:string;
  tone:string;
  verbosity:AssistantVerbosity;
  executionBias:AssistantExecutionBias;
  voicePersona:"female"|"male";
  capabilities:string[];
}

export const assistantProfiles:Record<AssistantIdentity,AssistantProfile>={
  nova:{
    id:"nova",name:"NOVA",role:"Local Personal Assistant",shortRole:"LOCAL ASSISTANT",
    description:"Fast, private, action-oriented assistance for everyday productivity, devices, local context, and delegated workspace retrieval.",
    greeting:"NOVA ready.",tone:"precise and action-oriented",verbosity:"brief",executionBias:"local-first",voicePersona:"female",
    capabilities:["local actions","personal productivity","voice interaction","device context","workspace retrieval"]
  },
  onyx:{
    id:"onyx",name:"ONYX",role:"Cloud Intelligence Partner",shortRole:"CLOUD INTELLIGENCE",
    description:"Analytical, research-oriented intelligence for architecture, strategy, synthesis, creation, and cloud-connected reasoning.",
    greeting:"ONYX online.",tone:"professional and analytical",verbosity:"detailed",executionBias:"cloud-augmented",voicePersona:"male",
    capabilities:["deep reasoning","research","strategic analysis","artifact generation","cloud orchestration"]
  }
};

export const getAssistantProfile=(identity:AssistantIdentity):AssistantProfile=>assistantProfiles[identity];

export function styleAssistantResponse(identity:AssistantIdentity,text:string,context:"general"|"calendar"|"action"="general"):string{
  const clean=text.trim();if(!clean)return clean;
  if(identity==="nova")return clean;
  if(context==="calendar")return `${clean}

ONYX insight: Review the event context and preparation items before the meeting.`;
  if(context==="action")return `${clean}

ONYX has retained the execution context for review.`;
  return clean;
}

export function assistantStatus(identity:AssistantIdentity):string{
  const profile=getAssistantProfile(identity);
  return `${profile.name} · ${profile.shortRole}`;
}
