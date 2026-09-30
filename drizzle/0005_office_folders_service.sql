-- Owner-managed integration constraints. Never deletes source assets.
CREATE TABLE IF NOT EXISTS office_link_reconciliations (
  link_id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  document_id uuid NOT NULL,
  asset_id uuid NOT NULL,
  canonical_asset_id uuid NOT NULL,
  original_link jsonb NOT NULL,
  reconciled_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
WITH ranked AS (
  SELECT *, first_value(asset_id) OVER (
    PARTITION BY tenant_id, app_key, record_id ORDER BY created_at, id
  ) AS canonical_asset_id,
  row_number() OVER (
    PARTITION BY tenant_id, app_key, record_id ORDER BY created_at, id
  ) AS rank
  FROM asset_app_links WHERE app_key = 'office'
)
INSERT INTO office_link_reconciliations
  (link_id, tenant_id, document_id, asset_id, canonical_asset_id, original_link)
SELECT id, tenant_id, record_id, asset_id, canonical_asset_id, to_jsonb(ranked)
FROM ranked WHERE rank > 1 ON CONFLICT (link_id) DO NOTHING;
--> statement-breakpoint
DELETE FROM asset_app_links links
USING office_link_reconciliations archive
WHERE links.id = archive.link_id AND links.app_key = 'office';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS office_asset_canonical_idx
ON asset_app_links (tenant_id, app_key, record_id) WHERE app_key = 'office';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS office_service_requests (
  caller text NOT NULL,
  request_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (caller, request_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS office_service_requests_expiry_idx
ON office_service_requests (expires_at);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS office_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id),
  library_id text NOT NULL,
  folder text,
  name text NOT NULL,
  mime_type text NOT NULL,
  size bigint NOT NULL CHECK (size >= 0),
  storage_key text UNIQUE,
  asset_id uuid,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_id)
);
