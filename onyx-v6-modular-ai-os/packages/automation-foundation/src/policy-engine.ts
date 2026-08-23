export function isAllowed(
  capabilityId: string
): boolean {
  const blocked = [
    "github.pr.merge",
    "netlify.deploy.production",
    "github.permissions.update",
    "github.secrets.read",
    "github.secrets.write"
  ];

  return !blocked.includes(capabilityId);
}