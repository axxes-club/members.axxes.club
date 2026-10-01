CREATE TABLE IF NOT EXISTS website_drafts (
 page_id uuid PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 revision integer NOT NULL DEFAULT 0,
 snapshot jsonb NOT NULL,
 actor_id text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS website_revisions (
 page_id uuid NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 revision integer NOT NULL,
 snapshot jsonb NOT NULL,
 actor_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(page_id,revision)
);
CREATE TABLE IF NOT EXISTS website_publications (
 page_id uuid PRIMARY KEY REFERENCES pages(id) ON DELETE CASCADE,
 tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 revision integer NOT NULL,
 snapshot jsonb NOT NULL,
 published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS website_publications_tenant_idx ON website_publications(tenant_id);
CREATE INDEX IF NOT EXISTS website_revisions_tenant_idx ON website_revisions(tenant_id,page_id);
