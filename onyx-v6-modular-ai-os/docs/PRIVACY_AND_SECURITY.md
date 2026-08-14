# Privacy and Security

- NOVA owns local files, screenshot pixels, document content, telemetry and offline memory.
- ONYX owns explicitly requested cloud intelligence.
- Cross-boundary transfers require a scoped summary and user approval when content is private.
- All provider credentials are server-only environment variables.
- Microsoft Graph uses OAuth delegated permissions with least privilege.
- Home Assistant uses a server-side token; never embed a long-lived token in React.
- Encrypt persistent cloud memory at rest and maintain deletion/retention controls.
- Log tool metadata, not raw private content, by default.
