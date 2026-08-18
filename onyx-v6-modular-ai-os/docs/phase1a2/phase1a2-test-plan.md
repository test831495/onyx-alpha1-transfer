# Phase 1A.2 Test Plan

## Automation Foundation tests

- Capability identifiers are unique
- Safe drafts can run without approval
- Remote writes require approval
- Pull request merge remains disabled
- Production deployment remains blocked
- Secret operations remain blocked
- Permission modifications remain blocked
- Valid state transitions are accepted
- Invalid state transitions are rejected
- Terminal states remain terminal

## Future GitHub adapter tests

- Repository metadata read
- Issue draft generation
- Issue create dry-run
- Branch create dry-run
- Draft PR create dry-run
- Duplicate issue handling
- Existing branch handling
- Permission denial
- API rate-limit response
- Network failure
- Conflict response

## Regression validation

- Configuration Runtime tests
- Identity Runtime tests
- Voice Runtime tests
- Workspace Connector tests
- Calendar Intelligence tests
- Provider Health smoke test
- Command Center typecheck
- Command Center production build

## Security validation

- No secret values in audit events
- No remote mutation during dry-run
- No merge capability
- No deployment capability
- No permission or secret capability
