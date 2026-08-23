export function requiresApproval(
  capabilityId: string
): boolean {
  return [
    "github.issue.create",
    "github.branch.create",
    "github.commit.create",
    "github.pr.create-draft"
  ].includes(capabilityId);
}