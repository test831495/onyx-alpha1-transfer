# Contracts And State Model

Contract version: `1.0.0`. The workflow contract contains 32 stable states and six ordered capabilities: issue, isolated branch, push, validation, evidence, and draft PR.

The state machine rejects transitions outside the governed sequence. The approval package is invalid if actor, repository, version, workflow ID, scope hash, ordered capabilities, boundary, input, or expiry does not match.
