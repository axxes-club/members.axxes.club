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
CREATE TABLE IF NOT EXISTS storage_legacy_usage (
 tenant_id uuid NOT NULL,object_key text NOT NULL,generation text NOT NULL,
 bytes bigint NOT NULL CHECK(bytes>=0),PRIMARY KEY(tenant_id,object_key,generation));
-- Serialize retained-object reference creation against permanent Google deletion.
CREATE OR REPLACE FUNCTION storage_track_asset_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE matches text[]; object_path text; charge storage_object_charges%ROWTYPE;
BEGIN
 IF TG_OP='DELETE' THEN
  PERFORM 1 FROM storage_object_charges c JOIN storage_asset_links l USING(object_key,generation) WHERE l.asset_id=OLD.id FOR UPDATE OF c;
  DELETE FROM storage_asset_links WHERE asset_id=OLD.id;
  RETURN OLD;
 END IF;
 IF TG_OP='UPDATE' AND NEW.url IS NOT DISTINCT FROM OLD.url AND NEW.tenant_id IS NOT DISTINCT FROM OLD.tenant_id THEN RETURN NEW; END IF;
 matches:=regexp_match(NEW.url,'^https://(dam\.axxes\.club|folders\.axxes\.club|members\.axxes\.club)/api/assets/gcp\?key=([^&#]+)');
 IF matches IS NOT NULL THEN
  object_path:=regexp_replace(matches[2],'%2[fF]','/','g');
  IF object_path ~ '^uploads/(dam|members)/[A-Za-z0-9/_-]+$' THEN
   SELECT * INTO charge FROM storage_object_charges WHERE object_key=object_path ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
   IF FOUND THEN
    IF charge.released_at IS NOT NULL OR charge.tenant_id<>NEW.tenant_id THEN RAISE EXCEPTION 'Stored asset is unavailable in this organization' USING ERRCODE='23514'; END IF;
    INSERT INTO storage_asset_links(asset_id,object_key,generation) VALUES(NEW.id,charge.object_key,charge.generation)
      ON CONFLICT(asset_id) DO UPDATE SET object_key=EXCLUDED.object_key,generation=EXCLUDED.generation;
    RETURN NEW;
   END IF;
  END IF;
 END IF;
 DELETE FROM storage_asset_links WHERE asset_id=NEW.id;
 RETURN NEW;
END $$;
DO $$ BEGIN
 IF to_regclass('assets') IS NOT NULL THEN
  DROP TRIGGER IF EXISTS storage_asset_reference_trigger ON assets;
  CREATE TRIGGER storage_asset_reference_trigger AFTER INSERT OR UPDATE OR DELETE ON assets FOR EACH ROW EXECUTE FUNCTION storage_track_asset_reference();
 END IF;
END $$;
