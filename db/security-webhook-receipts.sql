-- Members-owned durable replay gate. Apply before deploying webhook consumers.
CREATE TABLE IF NOT EXISTS security_webhook_receipts (
 provider text NOT NULL,
 digest text NOT NULL,
 lease_id uuid NOT NULL,
 state text NOT NULL CHECK(state IN ('processing','done')),
 expires_at timestamptz NOT NULL,
 PRIMARY KEY(provider,digest)
);
CREATE INDEX IF NOT EXISTS security_webhook_receipts_expiry_idx ON security_webhook_receipts(expires_at);
