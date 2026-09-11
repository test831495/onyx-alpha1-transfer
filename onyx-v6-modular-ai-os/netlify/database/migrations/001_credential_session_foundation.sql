CREATE TABLE IF NOT EXISTS credential_records (
  record_id uuid PRIMARY KEY,
  canonical_account_ref text NOT NULL,
  household_scope_ref text,
  provider_id text NOT NULL,
  connector_account_ref text NOT NULL,
  credential_type text NOT NULL,
  purpose text NOT NULL,
  capability_fingerprint text NOT NULL,
  encrypted_payload jsonb NOT NULL,
  encryption_envelope_version integer NOT NULL CHECK (encryption_envelope_version > 0),
  encryption_key_version text NOT NULL,
  record_version integer NOT NULL DEFAULT 0 CHECK (record_version >= 0),
  state text NOT NULL CHECK (state IN ('ACTIVE', 'ROTATING', 'REVOKED', 'DELETED', 'REAUTHENTICATION_REQUIRED', 'QUARANTINED')),
  provider_authorization_version text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  last_used_at timestamptz,
  revoked_at timestamptz,
  deleted_at timestamptz,
  policy_version text NOT NULL,
  provenance_ref text NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS credential_records_one_active ON credential_records (canonical_account_ref, provider_id, connector_account_ref, credential_type, purpose) WHERE state IN ('ACTIVE', 'ROTATING');
CREATE INDEX IF NOT EXISTS credential_records_lookup ON credential_records (canonical_account_ref, provider_id, purpose);

CREATE TABLE IF NOT EXISTS credential_tombstones (
  tombstone_id uuid PRIMARY KEY,
  record_id uuid NOT NULL UNIQUE,
  canonical_account_ref text NOT NULL,
  provider_id text NOT NULL,
  purpose text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_pending_transactions (
  transaction_id uuid PRIMARY KEY,
  protected_state_digest text NOT NULL UNIQUE,
  encrypted_pkce_verifier jsonb NOT NULL,
  provider_id text NOT NULL,
  canonical_account_ref text NOT NULL,
  session_ref text NOT NULL,
  purpose text NOT NULL,
  capability_fingerprint text NOT NULL,
  redirect_uri_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  version integer NOT NULL DEFAULT 0 CHECK (version >= 0),
  tombstone_state text NOT NULL CHECK (tombstone_state IN ('PENDING', 'CONSUMED', 'EXPIRED'))
);

CREATE INDEX IF NOT EXISTS oauth_pending_expiry ON oauth_pending_transactions (expires_at);

CREATE TABLE IF NOT EXISTS credential_audit_events (
  event_id uuid PRIMARY KEY,
  event_name text NOT NULL,
  correlation_ref text NOT NULL,
  record_id uuid,
  canonical_account_ref text NOT NULL,
  provider_id text,
  purpose text,
  created_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS credential_audit_correlation ON credential_audit_events (correlation_ref, created_at);

CREATE TABLE IF NOT EXISTS server_sessions (
  session_ref text PRIMARY KEY,
  canonical_account_ref text NOT NULL,
  household_scope_ref text,
  account_switch_generation integer NOT NULL CHECK (account_switch_generation >= 0),
  authentication_assurance text NOT NULL,
  device_trust text NOT NULL,
  role_class text NOT NULL,
  policy_version text NOT NULL,
  issued_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  session_version integer NOT NULL CHECK (session_version >= 0),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS server_sessions_account ON server_sessions (canonical_account_ref, expires_at);