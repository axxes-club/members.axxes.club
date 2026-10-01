-- Additive quota ledger; apply explicitly, never shared schema-push.
CREATE TABLE IF NOT EXISTS storage_accounts (
 tenant_id uuid NOT NULL,user_id text NOT NULL,
 base_bytes bigint NOT NULL DEFAULT 5000000000 CHECK(base_bytes>=0),
 used_bytes bigint NOT NULL DEFAULT 0 CHECK(used_bytes>=0),
 reserved_bytes bigint NOT NULL DEFAULT 0 CHECK(reserved_bytes>=0),
 updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(tenant_id,user_id));
CREATE TABLE IF NOT EXISTS storage_reservations (
 upload_id uuid PRIMARY KEY,tenant_id uuid NOT NULL,user_id text NOT NULL,
 bytes bigint NOT NULL CHECK(bytes>0),expires_at timestamptz NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','complete','cancelled','expired')),
 enforcement text NOT NULL CHECK(enforcement IN ('shadow','enforce')),
 FOREIGN KEY(tenant_id,user_id) REFERENCES storage_accounts(tenant_id,user_id));
CREATE INDEX IF NOT EXISTS storage_reservations_expiry_idx ON storage_reservations(expires_at) WHERE state='pending';
CREATE TABLE IF NOT EXISTS storage_object_charges (
 object_key text NOT NULL,generation text NOT NULL,tenant_id uuid NOT NULL,user_id text,
 bytes bigint NOT NULL CHECK(bytes>=0),released_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(object_key,generation));
CREATE TABLE IF NOT EXISTS storage_asset_links (
 asset_id uuid PRIMARY KEY,object_key text NOT NULL,generation text NOT NULL,
 FOREIGN KEY(object_key,generation) REFERENCES storage_object_charges(object_key,generation));
CREATE TABLE IF NOT EXISTS storage_entitlements (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL,user_id text NOT NULL,
 bytes bigint NOT NULL CHECK(bytes>0),starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,
 status text NOT NULL CHECK(status IN ('active','revoked')),provider_purchase_id text NOT NULL UNIQUE,
 CHECK(ends_at>starts_at));
CREATE INDEX IF NOT EXISTS storage_entitlements_account_idx ON storage_entitlements(tenant_id,user_id);
CREATE TABLE IF NOT EXISTS storage_billing_events (
 provider_event_id text PRIMARY KEY,provider_purchase_id text NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),event_type text NOT NULL);
CREATE TABLE IF NOT EXISTS storage_override_audit (
 id uuid PRIMARY KEY,tenant_id uuid NOT NULL,user_id text NOT NULL,
 actor_kind text NOT NULL CHECK(actor_kind IN ('member','platform','webmaster')),actor_id text NOT NULL,
 old_base_bytes bigint NOT NULL CHECK(old_base_bytes>=0),new_base_bytes bigint NOT NULL CHECK(new_base_bytes>=0),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 1 AND 1000),created_at timestamptz NOT NULL DEFAULT now());
