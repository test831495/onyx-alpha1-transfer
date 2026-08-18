import type { AutomationCapability } from "./contracts";

export const capabilities: AutomationCapability[] = [
  {
    id: "github.issue.draft",
    name: "Draft GitHub Issue",
    risk: "low",
    approvalRequired: false,
    enabled: true
  },
  {
    id: "github.issue.create",
    name: "Create GitHub Issue",
    risk: "medium",
    approvalRequired: true,
    enabled: true
  },
  {
    id: "github.branch.create",
    name: "Create GitHub Branch",
    risk: "high",
    approvalRequired: true,
    enabled: true
  },
  {
    id: "github.pr.merge",
    name: "Merge Pull Request",
    risk: "critical",
    approvalRequired: true,
    enabled: false
  }
];