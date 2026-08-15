import { AvatarStage, expressionForState, useSpeechDynamics } from "@onyx/avatar-runtime";
import type { AssistantMode, CoreState } from "@onyx/contracts";
export function AvatarExperience({ mode, state, onActivate }: { mode: AssistantMode; state: CoreState; onActivate: () => void }) { const { level, viseme } = useSpeechDynamics(state); return <AvatarStage state={{ mode, core: state, expression: expressionForState(state), speechLevel: level, viseme }} onActivate={onActivate} />; }
