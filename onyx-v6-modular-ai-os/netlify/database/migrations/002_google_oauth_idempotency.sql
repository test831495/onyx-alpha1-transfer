CREATE TABLE IF NOT EXISTS oauth_idempotency_receipts (
  receipt_id uuid PRIMARY KEY,
  idempotency_key_digest text NOT NULL UNIQUE,
  provider_id text NOT NULL,
  canonical_account_ref text NOT NULL,
  session_ref text NOT NULL,
  purpose text NOT NULL,
  capability_fingerprint text NOT NULL,
  redirect_uri_fingerprint text NOT NULL,
  transaction_id uuid NOT NULL UNIQUE,
  encrypted_authorization_url jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  state text NOT NULL CHECK (state IN ('ACTIVE', 'EXPIRED', 'CONSUMED'))
);

CREATE INDEX IF NOT EXISTS oauth_idempotency_expiry ON oauth_idempotency_receipts (expires_at);