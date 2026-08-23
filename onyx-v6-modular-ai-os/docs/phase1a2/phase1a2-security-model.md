# Phase 1A.2 Security Model

## Principles

- Least privilege
- Dry-run first
- Explicit approval for remote mutations
- Separate merge and production approval
- No secret values in browser state, logs, or audit events
- Protected branches remain the final enforcement boundary

## Allowed without approval

- Read repository metadata
- Read issue and pull request metadata
- Generate local implementation plans
- Prepare issue drafts
- Prepare branch plans
- Prepare Draft PR content
- Run local validation
- Generate evidence and rollback instructions

## Approval required

- Create GitHub issue
- Create branch
- Push commit
- Create Draft PR
- Post GitHub comment
- Retry a failed remote write

## Prohibited in Phase 1A.2

- Merge pull request
- Push directly to main
- Push directly to integration/onyx-nova
- Deploy to Netlify production
- Read or write GitHub secrets
- Modify repository permissions
- Modify branch protections
- Delete branches
- Create production releases

## Approval integrity

Approvals must be tied to:

- Exact capability
- Repository
- Base branch
- Working branch
- Approved scope
- Scope hash
- Approver
- Approval timestamp
- Approval expiration
