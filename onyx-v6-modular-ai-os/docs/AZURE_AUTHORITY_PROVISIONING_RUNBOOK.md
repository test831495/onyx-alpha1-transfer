# ONYX Server Authority Azure Provisioning Runbook

**Date:** 2026-09-11  
**Author:** Rahul (Primary Owner)  
**Governance:** Phase 1A.11 Contract Freeze Compliant  

---

## 1. Overview

This runbook documents the exact owner procedure for provisioning the **ONYX NOVA Server Authority API** app registration in Azure Active Directory (Entra ID) and configuring Netlify environment variables to complete Google Workspace activation.

### Canonical Registrations

* **SPA Client App:** `Onyx Workplace` (Existing)
* **Server Authority API:** `ONYX NOVA Server Authority API` (To be created)
* **Delegated API Scope:** `account.preference.readwrite`
* **Application ID URI Pattern:** `api://<SERVER_AUTHORITY_API_CLIENT_ID>`

---

## 2. Automated Azure CLI Provisioning Script

The repository includes an owner-runnable, idempotent Azure CLI script:
`scripts/provision-onyx-server-authority-azure.sh`

### Execution Safety Invariants

* **Dry-Run Default:** Running without flags executes in read-only analysis mode without mutating Azure.
* **Mutation Flag:** Mutation requires the explicit `--execute` flag.
* **No Secrets Created:** Client secrets are never generated. Public PKCE and OIDC token validation are used.
* **No Graph Over-privileging:** Only the specific `account.preference.readwrite` API scope is delegated.

### Usage Instructions

```bash
# 1. Login to Azure CLI
az login

# 2. Perform dry-run verification
./scripts/provision-onyx-server-authority-azure.sh

# 3. Execute Azure provisioning (when authorized)
./scripts/provision-onyx-server-authority-azure.sh --execute
```

---

## 3. Required Netlify Environment Variables

Configure the following environment variables in the Netlify Dashboard (**Site Settings > Environment Variables**):

| Variable Name | Source / Value | Target Scope |
|---|---|---|
| `ONYX_AUTH_ISSUER` | `https://login.microsoftonline.com/<TENANT_ID>/v2.0` | Netlify Functions & Production |
| `ONYX_AUTH_AUDIENCE` | `<API_CLIENT_ID>` (or `api://<API_CLIENT_ID>`) | Netlify Functions & Production |
| `ONYX_AUTH_REQUIRED_SCOPE` | `account.preference.readwrite` | Netlify Functions & Production |
| `ONYX_AUTH_SCOPE_SALT` | Cryptographically random 32-character hex/base64 string | Netlify Functions & Production |
| `ONYX_AUTH_JWKS_KEYS_REQUIRED` | `false` | Netlify Functions & Production |

---

## 4. Rollback Plan

If Azure resources need to be removed:

```bash
# Delete created API App Registration by Object ID
az ad app delete --id <API_OBJECT_ID>
```
