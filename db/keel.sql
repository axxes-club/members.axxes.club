-- Keel — source control tables.
--
-- Authored HERE, in the portal, and copied into the product repo's schema. That
-- is the convention across the suite: the portal owns the database, and a
-- product app runs no migrations of its own. Keel therefore ships the Drizzle
-- schema at src/lib/db/schema/keel.ts as a copy of this file, not as the
-- original.
--
-- Every table is prefixed keel_. All AXXES products share one Neon database, so
-- a new product writing into an unprefixed namespace can break Lanes, Stock or
-- the portal. Namespacing is cheap insurance and makes "which tables are
-- Keel's" answerable with one query.
--
-- The model: content-addressed snapshots.
--
--   keel_blobs       file content, keyed by the SHA-256 of that content
--   keel_checkpoints one row per point in a repo's life
--   keel_entries     the full path -> blob set at a checkpoint
--   keel_repos       the projects
--   keel_undone      the undo drawer
--
-- A checkpoint stores the whole snapshot rather than a patch. That is what
-- makes undo exact (it points at blobs that already exist, so it cannot fail
-- halfway) and what makes a checkpoint one query, which the timeline scrubber
-- depends on. The cost is a row per file per checkpoint; see the storage card
-- on the Keel board for when that stops being the right trade.

CREATE TABLE IF NOT EXISTS keel_repos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text NOT NULL,
  description     text,
  is_private      boolean NOT NULL DEFAULT true,
  linked_records  jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by_id   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS keel_repos_tenant_slug_idx ON keel_repos (tenant_id, slug);
CREATE INDEX IF NOT EXISTS keel_repos_tenant_idx ON keel_repos (tenant_id);

-- Content is addressed by its own hash, so identical files across repos are
-- stored once. That is what makes a one-line change in a large repo cheap.
CREATE TABLE IF NOT EXISTS keel_blobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hash        text NOT NULL,
  content     text NOT NULL,
  size        integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS keel_blobs_tenant_hash_idx ON keel_blobs (tenant_id, hash);

CREATE TABLE IF NOT EXISTS keel_checkpoints (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id      uuid NOT NULL REFERENCES keel_repos(id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- The plain-language label. "Tue 2am — door count fix". Never a SHA.
  message      text NOT NULL,
  summary      text,
  -- A chain, not a graph. parent_id is the previous checkpoint.
  parent_id    uuid,
  -- Set when this checkpoint was created by an undo, naming what it restored.
  restores_id  uuid,
  -- Monotonic per repo, so ordering never depends on timestamp ties.
  seq          integer NOT NULL,
  author_id    text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS keel_cp_repo_idx ON keel_checkpoints (repo_id, seq);
CREATE INDEX IF NOT EXISTS keel_cp_tenant_idx ON keel_checkpoints (tenant_id);

CREATE TABLE IF NOT EXISTS keel_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkpoint_id  uuid NOT NULL REFERENCES keel_checkpoints(id) ON DELETE CASCADE,
  repo_id        uuid NOT NULL REFERENCES keel_repos(id) ON DELETE CASCADE,
  path           text NOT NULL,
  -- RESTRICT, not CASCADE: losing a blob a live checkpoint points at would
  -- make that checkpoint unreadable. Blobs are kept, not garbage collected.
  blob_id        uuid NOT NULL REFERENCES keel_blobs(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS keel_entries_cp_path_idx ON keel_entries (checkpoint_id, path);
CREATE INDEX IF NOT EXISTS keel_entries_repo_idx ON keel_entries (repo_id);

-- The undo drawer. Undo inserts here and appends a restoring checkpoint; it
-- never deletes, which is what lets the drawer be trusted and re-opened.
CREATE TABLE IF NOT EXISTS keel_undone (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id        uuid NOT NULL REFERENCES keel_repos(id) ON DELETE CASCADE,
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  checkpoint_id  uuid NOT NULL REFERENCES keel_checkpoints(id) ON DELETE CASCADE,
  undone_by_id   text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS keel_undone_cp_idx ON keel_undone (checkpoint_id);
CREATE INDEX IF NOT EXISTS keel_undone_repo_idx ON keel_undone (repo_id);
