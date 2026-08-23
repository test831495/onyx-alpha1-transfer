# Alpha 3.0.2 Safe Runtime UI Adapter

This release connects typed commands, voice transcripts, core actions, and footer navigation to the validated Phase 1 Intelligence Runtime.

## Safety controls

- Legacy Phase 0 routing remains available by setting localStorage key `onyx.phase1.runtime` to `legacy`.
- Each new command aborts the previous in-flight request.
- Sequence checks prevent stale asynchronous results from changing the UI.
- Unsupported applications never map to dashboard modules.
- Document search shows a prepared-search message until the local index arrives in Alpha 3.1.
- CSS, portraits, dashboards, footer layout, and responsive rules are unchanged.
