import type {
  AssistantMode,
} from "./assistant";

import type {
  ModuleId,
} from "./module";

export type Intent =
  | {
      kind: "assistant.switch";
      assistant: AssistantMode;
    }
  | {
      kind: "module.open";
      target: ModuleId;
      assistant?: AssistantMode;
    }
  | {
      kind: "app.launch";
      target: string;
      assistant?: AssistantMode;
    }
  | {
      kind: "document.search";
      query: string;
      assistant?: AssistantMode;
    }
  | {
      kind: "settings.open";
      assistant?: AssistantMode;
    }
  | {
      kind: "unsupported";
      rawInput: string;
      reason: string;
    };