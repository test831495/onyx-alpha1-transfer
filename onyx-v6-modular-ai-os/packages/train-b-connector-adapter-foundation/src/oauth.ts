import type { VaultReferenceId } from "@onyx/train-b-connector-foundation";

export interface OAuthAuthorizationRequestReference {
  readonly authorizationReference: string;
  readonly accountScopeReference: string;
  readonly sessionReference: string;
  readonly purposeReference: string;
  readonly redirectUriAllowlistReference: string;
  readonly requestedScopes: readonly string[];
  readonly pkce: { readonly required: true; readonly challengeReference: string };
  readonly stateReference: string;
  readonly nonceReference?: string;
  readonly nonAuthorizing: true;
}

export interface OAuthCallbackRequest {
  readonly callbackReference: string;
  readonly authorizationReference: string;
  readonly accountScopeReference: string;
  readonly sessionReference: string;
  readonly purposeReference: string;
  readonly stateReference: string;
  readonly verifierReference: string;
  readonly redirectUriAllowlistReference: string;
  readonly authorizationResultReference?: string;
}

export interface OAuthAuthorizationResult {
  readonly resultReference: string;
  readonly grantedScopes: readonly string[];
  readonly credentialReference?: VaultReferenceId;
  readonly reauthorizationRequired: boolean;
  readonly expiresAtReference?: string;
  readonly revoked: boolean;
  readonly consentWithdrawn: boolean;
  readonly authenticationFailed: boolean;
  readonly scopeEscalated: boolean;
  readonly nonAuthorizing: true;
}

export const OAUTH_CONTRACT_BOUNDARY = Object.freeze({
  appCreated: false,
  tokenExchangeImplemented: false,
  tokenRefreshImplemented: false,
  rawTokenFields: 0,
  pkceRequired: true,
  stateBindingRequired: true,
  nonceSupported: true,
  redirectAllowlistRequired: true,
  providerNeutral: true,
} as const);