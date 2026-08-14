# Plugin Authoring

Each plugin contains a `manifest.json` and an implementation exporting `OnyxPlugin`. Manifests declare runtime, scopes, tools, approval behavior and optional dashboard modules. The gateway must deny undeclared scopes. Sensitive and write tools require explicit approval.

## Add a plugin
1. Copy an existing plugin folder.
2. Assign a globally unique ID.
3. Declare minimal scopes.
4. Define JSON input schemas.
5. Implement `execute` and `health`.
6. Add contract tests and failure handling.
7. Register dashboard modules separately from tool execution.
