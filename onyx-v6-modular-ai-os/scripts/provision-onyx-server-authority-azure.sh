#!/usr/bin/env bash
# ==============================================================================
# Script: provision-onyx-server-authority-azure.sh
# Purpose: Idempotent Owner-run Azure CLI script to provision ONYX NOVA Server Authority API
# Governance: Phase 1A.11 Contract Freeze compliant.
# Invariant: Dry-run by default. Requires --execute flag to perform Azure mutation.
# ==============================================================================

set -euo pipefail

EXECUTE=false
SPA_APP_NAME="Onyx Workplace"
API_APP_NAME="ONYX NOVA Server Authority API"
DELEGATED_SCOPE="account.preference.readwrite"

for arg in "$@"; do
  case $arg in
    --execute)
      EXECUTE=true
      shift
      ;;
    *)
      ;;
  esac
done

echo "=========================================================================="
echo "ONYX NOVA Server Authority API Azure Provisioning Tool"
echo "Execution Mode: $(if [ "$EXECUTE" = true ]; then echo "MUTATION (--execute)"; else echo "DRY RUN (Read-Only)"; fi)"
echo "=========================================================================="

if ! command -v az &> /dev/null; then
  echo "Error: Azure CLI ('az') is not installed or not available in PATH." >&2
  exit 1
fi

echo "[1/5] Verifying Azure authentication state..."
ACCOUNT_INFO=$(az account show --output json 2>/dev/null || true)
if [ -z "$ACCOUNT_INFO" ]; then
  echo "Error: Not logged into Azure. Run 'az login' first." >&2
  exit 1
fi

TENANT_ID=$(echo "$ACCOUNT_INFO" | grep -o '"tenantId": "[^"]*' | cut -d'"' -f4 || true)
echo "Connected Tenant ID: ${TENANT_ID:-unknown}"

echo "[2/5] Discovering existing SPA application: '${SPA_APP_NAME}'..."
SPA_APPS_JSON=$(az ad app list --display-name "$SPA_APP_NAME" --output json)
SPA_COUNT=$(echo "$SPA_APPS_JSON" | grep -c '"appId"' || true)

if [ "$SPA_COUNT" -eq 0 ]; then
  echo "Error: Zero applications found matching display name '${SPA_APP_NAME}'." >&2
  exit 1
elif [ "$SPA_COUNT" -gt 1 ]; then
  echo "Error: Multiple applications (${SPA_COUNT}) found matching display name '${SPA_APP_NAME}'. Refusing to proceed ambiguously." >&2
  exit 1
fi

SPA_CLIENT_ID=$(echo "$SPA_APPS_JSON" | grep -o '"appId": "[^"]*' | head -n 1 | cut -d'"' -f4)
SPA_OBJECT_ID=$(echo "$SPA_APPS_JSON" | grep -o '"id": "[^"]*' | head -n 1 | cut -d'"' -f4)
echo "Discovered SPA Client ID: ${SPA_CLIENT_ID}"

echo "[3/5] Checking Server Authority API application: '${API_APP_NAME}'..."
API_APPS_JSON=$(az ad app list --display-name "$API_APP_NAME" --output json)
API_COUNT=$(echo "$API_APPS_JSON" | grep -c '"appId"' || true)

API_CLIENT_ID=""
API_OBJECT_ID=""

if [ "$API_COUNT" -gt 1 ]; then
  echo "Error: Multiple applications (${API_COUNT}) found matching display name '${API_APP_NAME}'." >&2
  exit 1
elif [ "$API_COUNT" -eq 1 ]; then
  API_CLIENT_ID=$(echo "$API_APPS_JSON" | grep -o '"appId": "[^"]*' | head -n 1 | cut -d'"' -f4)
  API_OBJECT_ID=$(echo "$API_APPS_JSON" | grep -o '"id": "[^"]*' | head -n 1 | cut -d'"' -f4)
  echo "Existing API Application found. Client ID: ${API_CLIENT_ID}"
else
  echo "API Application does not exist."
fi

if [ "$EXECUTE" = false ]; then
  echo ""
  echo "[DRY RUN SUMMARY]"
  echo "  - SPA Registration: '${SPA_APP_NAME}' (${SPA_CLIENT_ID})"
  echo "  - Server API Action: $(if [ -n "$API_CLIENT_ID" ]; then echo "Configure existing app (${API_CLIENT_ID})"; else echo "Create new app registration '${API_APP_NAME}'"; fi)"
  echo "  - Application ID URI: api://<API_CLIENT_ID>"
  echo "  - Delegated Scope: ${DELEGATED_SCOPE}"
  echo "  - Client Permission: Add ${DELEGATED_SCOPE} to '${SPA_APP_NAME}'"
  echo ""
  echo "To perform Azure provisioning, run:"
  echo "  $0 --execute"
  exit 0
fi

echo "[4/5] Provisioning Server Authority API registration..."
if [ -z "$API_CLIENT_ID" ]; then
  echo "Creating application '${API_APP_NAME}'..."
  CREATE_OUTPUT=$(az ad app create \
    --display-name "$API_APP_NAME" \
    --sign-in-audience "AzureADandPersonalMicrosoftAccount" \
    --output json)
  API_CLIENT_ID=$(echo "$CREATE_OUTPUT" | grep -o '"appId": "[^"]*' | head -n 1 | cut -d'"' -f4)
  API_OBJECT_ID=$(echo "$CREATE_OUTPUT" | grep -o '"id": "[^"]*' | head -n 1 | cut -d'"' -f4)
  echo "Created API Client ID: ${API_CLIENT_ID}"
fi

APP_ID_URI="api://${API_CLIENT_ID}"
echo "Setting Application ID URI: ${APP_ID_URI}"
az ad app update --id "$API_OBJECT_ID" --identifier-uris "$APP_ID_URI"

SCOPE_ID="11111111-2222-3333-4444-555555555555"
echo "Configuring delegated scope '${DELEGATED_SCOPE}' and access token v2..."

az ad app update --id "$API_OBJECT_ID" --set \
  api="{\"oauth2PermissionScopes\":[{\"adminConsentDescription\":\"Allow ONYX user session management\",\"adminConsentDisplayName\":\"Manage ONYX Preferences\",\"id\":\"${SCOPE_ID}\",\"isEnabled\":true,\"type\":\"User\",\"userConsentDescription\":\"Allow ONYX user session management\",\"userConsentDisplayName\":\"Manage ONYX Preferences\",\"value\":\"${DELEGATED_SCOPE}\"}]}" \
  requestedAccessTokenVersion=2

echo "[5/5] Authorizing SPA to access API scope..."
az ad app permission add --id "$SPA_OBJECT_ID" --api "$API_CLIENT_ID" --api-permissions "${SCOPE_ID}=Scope" || true

echo ""
echo "=========================================================================="
echo "PROVISIONING COMPLETE SUMMARY"
echo "=========================================================================="
echo "API App Display Name:    ${API_APP_NAME}"
echo "API Client ID:          ${API_CLIENT_ID}"
echo "Application ID URI:     ${APP_ID_URI}"
echo "Scope URI:              ${APP_ID_URI}/${DELEGATED_SCOPE}"
echo "Issuer Template:        https://login.microsoftonline.com/${TENANT_ID}/v2.0"
echo "Required Netlify Vars:"
echo "  - ONYX_AUTH_ISSUER=https://login.microsoftonline.com/${TENANT_ID}/v2.0"
echo "  - ONYX_AUTH_AUDIENCE=${API_CLIENT_ID}"
echo "  - ONYX_AUTH_REQUIRED_SCOPE=${DELEGATED_SCOPE}"
echo "  - ONYX_AUTH_SCOPE_SALT=<generate-random-32-char-salt>"
echo "  - ONYX_AUTH_JWKS_KEYS_REQUIRED=false"
echo ""
echo "[ROLLBACK COMMANDS]"
echo "To revert resources created by this script, run:"
echo "  az ad app delete --id ${API_OBJECT_ID}"
echo "=========================================================================="
