# ONYX v6 Modular AI Operating System

This repository is the v6 architecture baseline and runnable development scaffold evolved from the attached v5.14 project. The existing v5.14 source is preserved under `legacy/v5.14/index.html`.

## Quick start
```bash
corepack enable
pnpm install
cp .env.example .env
pnpm dev
```

## Build
```bash
pnpm typecheck
pnpm test
pnpm build
```

## Architecture
- React + TypeScript command-center frontend
- Service-oriented TypeScript packages
- Netlify Functions API gateway and token endpoints
- Local-first NOVA boundary
- Explicit cloud ONYX boundary
- Plugin manifests and shared plugin SDK
- Automation workflow contracts
- Memory abstractions with classification and retention

## Important
External integrations are secure scaffolds until provider credentials, OAuth registrations and production adapters are configured. Do not expose API keys as `VITE_` environment variables.
