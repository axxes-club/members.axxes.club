-- Review and apply through members platform migration process; never run from Folders.
BEGIN;
ALTER TABLE assets ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE assets ADD COLUMN IF NOT EXISTS owner_user_id text REFERENCES "user"(id), ADD COLUMN IF NOT EXISTS uploaded_by_id text REFERENCES "user"(id), ADD COLUMN IF NOT EXISTS app_key text, ADD COLUMN IF NOT EXISTS storage_key text, ADD COLUMN IF NOT EXISTS upload_key text, ADD COLUMN IF NOT EXISTS expires_at timestamptz, ADD COLUMN IF NOT EXISTS trashed_at timestamptz, ADD COLUMN IF NOT EXISTS trash_reason text;
UPDATE assets SET storage_key=substring(url from '/f/([^/?#]+)') WHERE source='upload' AND storage_key IS NULL;
-- Historical uploader cannot be inferred. All existing tenant assets stay workspace-owned.
ALTER TABLE assets ADD CONSTRAINT assets_owner_exactly_one CHECK ((tenant_id IS NULL) <> (owner_user_id IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS assets_upload_key_unique ON assets(upload_key);
CREATE INDEX IF NOT EXISTS assets_owner_user_idx ON assets(owner_user_id);
CREATE TABLE IF NOT EXISTS asset_folders(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),library_id text NOT NULL,tenant_id uuid REFERENCES tenants(id),owner_user_id text REFERENCES "user"(id),path text NOT NULL,expires_at timestamptz,trashed_at timestamptz,trash_reason text,CONSTRAINT asset_folders_owner_exactly_one CHECK ((tenant_id IS NULL) <> (owner_user_id IS NULL)),UNIQUE(library_id,path));
-- Preserve orphaned historical records; create folders only for existing owners.
INSERT INTO asset_folders(library_id,tenant_id,path) SELECT DISTINCT a.tenant_id::text,a.tenant_id,a.folder FROM assets a JOIN tenants t ON t.id=a.tenant_id WHERE a.folder IS NOT NULL ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS folder_grants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),folder_id uuid NOT NULL REFERENCES asset_folders(id) ON DELETE CASCADE,recipient_user_id text REFERENCES "user"(id),recipient_tenant_id uuid REFERENCES tenants(id),can_read boolean NOT NULL DEFAULT true,can_upload boolean NOT NULL DEFAULT false,expires_at timestamptz,CHECK ((recipient_user_id IS NULL) <> (recipient_tenant_id IS NULL)));
CREATE TABLE IF NOT EXISTS asset_app_grants(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,app_key text NOT NULL,record_id uuid NOT NULL,audience_tenant_id uuid NOT NULL REFERENCES tenants(id),expires_at timestamptz,UNIQUE(asset_id,app_key,record_id,audience_tenant_id));
CREATE TABLE IF NOT EXISTS folders_upload_intents(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),app_key text NOT NULL,record_id uuid NOT NULL,audience_tenant_id uuid NOT NULL,user_id text NOT NULL,library_id text NOT NULL,folder text,expires_at timestamptz NOT NULL,asset_expires_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE upload_sessions ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE upload_sessions ADD COLUMN IF NOT EXISTS owner_user_id text REFERENCES "user"(id);
CREATE TABLE IF NOT EXISTS asset_ownership_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),asset_id uuid NOT NULL,actor_user_id text NOT NULL,from_tenant_id uuid,from_owner_user_id text,to_tenant_id uuid,to_owner_user_id text,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS folder_storage_cleanup(storage_key text PRIMARY KEY,attempts integer NOT NULL DEFAULT 0,last_error text,next_attempt_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
COMMIT;
-- Rollout: existing uploaded objects must be made private and storage_key populated
-- by a separately reviewed UploadThing inventory job. Legacy unprotected objects fail closed.
