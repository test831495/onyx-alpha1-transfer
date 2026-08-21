# Phase 1A.7 — Connector and Permission Projection

## Connector scope, metadata only

`ConnectorScopeProjection` fields: `connectorProvider`, `connectorAccountId`,
`connectorAccountLabel`, `connectorScope`, `permissionMode`, `readOnly`,
`actionApprovalRequired`. Supported providers:
`Outlook`, `Gmail`, `Yahoo`, `OneDrive`, `SharePoint`, `Google Drive`,
`UNKNOWN`.

`AutomationConnectorScopePanel`:

- never reads connector content
- never executes a connector action
- never stores a connector credential
- never merges two connector-account identities

`buildAutomationRuntimeProjection` enforces account isolation by rejecting
any projection whose connectors share a `connectorProvider:connectorAccountId`
key. The `CONNECTOR_ISOLATED_PROJECTION` fixture exercises two distinct
Outlook accounts plus one Gmail account, each with its own account ID and
label, proving isolation and source attribution.

## Permission summary

`RuntimePermissionSummary` always reports:

```
mergeAllowed: false
productionDeployAllowed: false
forcePushAllowed: false
branchDeletionAllowed: false
connectorContentReadable: false
connectorActionExecutable: false
connectorCredentialsStored: false
```

`defaultRuntimePermissionSummary()` is the single source for this shape; it
is never constructed with a `true` value for any field.

## Budget and model-routing projection

`RuntimeBudgetProjection` is entirely optional and mock-only: `tokenBudget`,
`tokensUsed`, `estimatedCost`, `currency`, `modelRoutingClass`,
`cacheHitRate`, `contextTier`, `budgetStatus`
(`UNDER_BUDGET | AT_BUDGET | OVER_BUDGET | NOT_APPLICABLE`).
`AutomationRuntimeBudgetPanel` never invokes a paid service; every value
displayed is either a fixed mock number or an explicit "Not projected"
placeholder. `modelRoutingClass` and
`voiceMetadataProviderNeutralReady` are provider-neutral: no voice or avatar
provider is hard-coded.

The `BUDGET_PROJECTION` fixture exercises every optional budget field with
deterministic mock values (`tokenBudget: 200000`, `tokensUsed: 48213`,
`estimatedCost: 1.42`, `budgetStatus: "UNDER_BUDGET"`).
