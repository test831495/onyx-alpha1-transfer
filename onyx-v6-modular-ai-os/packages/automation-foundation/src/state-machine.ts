import type { AutomationStatus } from "./contracts";

const transitions: Record<
  AutomationStatus,
  AutomationStatus[]
> = {
  draft: ["approved"],
  approved: ["planning"],
  planning: ["executing"],
  executing: ["validating", "failed"],
  validating: ["evidence-ready", "failed"],
  "evidence-ready": ["draft-pr-ready"],
  "draft-pr-ready": ["awaiting-review"],
  "awaiting-review": [
    "completed",
    "cancelled"
  ],
  completed: [],
  failed: [],
  cancelled: []
};

export function canTransition(
  from: AutomationStatus,
  to: AutomationStatus
): boolean {
  return transitions[from].includes(to);
}