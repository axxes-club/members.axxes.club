-- Matter: access control and the audit trail.
--
-- Phase A of the security work, and the part everything else depends on. Two
-- tables, and a handful of columns on matter_documents (below).
--
--   matter_grants     explicit, default-deny permission. Absence is denial.
--   matter_activity   append-only record of who did what, INCLUDING who looked.
--
-- Additive and idempotent. Every statement is IF NOT EXISTS, so this is safe to
-- run against a database that already has a partial copy. Nothing drops data.
--
-- Run: node scripts/matter-migrate.mjs

-- ─────────────────────────────────────────────────────────────── access control
--
-- A grant is one person's permission over one thing. document_id NULL covers the
-- whole matter; set, it covers that document alone. There is no wildcard row and
-- no "everyone" — if you can name it, you can grant it.
CREATE TABLE IF NOT EXISTS matter_grants (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id            uuid NOT NULL REFERENCES matters (id) ON DELETE CASCADE,
  tenant_id            uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  document_id          uuid REFERENCES matter_documents (id) ON DELETE CASCADE,
  actor_key            text NOT NULL,
  can_view             boolean NOT NULL DEFAULT true,
  can_acknowledge      boolean NOT NULL DEFAULT false,
  can_sign             boolean NOT NULL DEFAULT false,
  can_manage           boolean NOT NULL DEFAULT false,
  reason               text,
  granted_by_actor_key text,
  granted_at           timestamptz NOT NULL DEFAULT now(),
  revoked_at           timestamptz,
  revoked_by_actor_key text,
  expires_at           timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness applies to active grants; revoked history remains append-only.
DROP INDEX IF EXISTS matter_grants_target_idx;
CREATE UNIQUE INDEX matter_grants_target_idx
  ON matter_grants (matter_id, document_id, actor_key) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS matter_grants_matter_actor_idx
  ON matter_grants (matter_id, actor_key) WHERE revoked_at IS NULL AND document_id IS NULL;
CREATE INDEX IF NOT EXISTS matter_grants_actor_idx    ON matter_grants (actor_key);
CREATE INDEX IF NOT EXISTS matter_grants_matter_idx   ON matter_grants (matter_id);
CREATE INDEX IF NOT EXISTS matter_grants_document_idx ON matter_grants (document_id);
CREATE INDEX IF NOT EXISTS matter_grants_tenant_idx   ON matter_grants (tenant_id);

-- The creator keeps a matter-wide manage grant from the moment the matter
-- exists, so there is never a window where nobody can hand out access.
INSERT INTO matter_grants (matter_id, tenant_id, document_id, actor_key, can_view, can_acknowledge, can_sign, can_manage, reason)
SELECT m.id, m.tenant_id, NULL, 'user:' || m.created_by_id, true, true, true, true,
       'Executor — created the matter'
FROM matters m
WHERE m.created_by_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM matter_grants g WHERE g.matter_id = m.id
    AND g.document_id IS NULL AND g.actor_key = 'user:' || m.created_by_id)
ON CONFLICT DO NOTHING;

-- ───────────────────────────────────────────────────────────────── audit trail
--
-- Written on reads as well as writes. "Who opened the will, and when" cannot be
-- answered if viewing is not recorded, and that question is the reason this
-- product exists.
CREATE TABLE IF NOT EXISTS matter_activity (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id   uuid NOT NULL REFERENCES matters (id) ON DELETE CASCADE,
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  action      text NOT NULL,
  document_id uuid REFERENCES matter_documents (id) ON DELETE SET NULL,
  actor_key   text NOT NULL,
  actor_name  text,
  actor_role  text,
  decision    text,
  detail      text,
  target      text,
  ip_address  text,
  user_agent  text,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matter_activity_matter_idx   ON matter_activity (matter_id, occurred_at);
CREATE INDEX IF NOT EXISTS matter_activity_actor_idx    ON matter_activity (actor_key);
CREATE INDEX IF NOT EXISTS matter_activity_document_idx ON matter_activity (document_id);
CREATE INDEX IF NOT EXISTS matter_activity_action_idx   ON matter_activity (matter_id, action);
CREATE INDEX IF NOT EXISTS matter_activity_tenant_idx   ON matter_activity (tenant_id);

-- ──────────────────────────────────── matter_documents: privacy and integrity
--
-- Added to an existing table, so each is conditional. `document_type` decides
-- how a document may be signed (wills and trusts are excluded from electronic
-- signature by ESIGN 101(c) and the UETA); `visibility` decides who may see it
-- at all; `sha256` is the integrity half of a signature and the tag that ties a
-- wet-ink original back to the exact revision it came from.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='matter_documents' AND column_name='document_type') THEN
    ALTER TABLE matter_documents ADD COLUMN document_type text NOT NULL DEFAULT 'other';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='matter_documents' AND column_name='visibility') THEN
    ALTER TABLE matter_documents ADD COLUMN visibility text NOT NULL DEFAULT 'participants';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='matter_documents' AND column_name='allow_download') THEN
    ALTER TABLE matter_documents ADD COLUMN allow_download boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='matter_documents' AND column_name='sha256') THEN
    ALTER TABLE matter_documents ADD COLUMN sha256 text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='matter_documents' AND column_name='superseded_by_id') THEN
    ALTER TABLE matter_documents ADD COLUMN superseded_by_id uuid;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='matter_documents' AND column_name='file_name') THEN
    ALTER TABLE matter_documents ADD COLUMN file_name text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='matter_documents' AND column_name='file_size') THEN
    ALTER TABLE matter_documents ADD COLUMN file_size integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='matter_documents' AND column_name='mime_type') THEN
    ALTER TABLE matter_documents ADD COLUMN mime_type text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='matter_documents' AND column_name='extracted_text') THEN
    ALTER TABLE matter_documents ADD COLUMN extracted_text text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS matter_documents_visibility_idx
  ON matter_documents (matter_id, visibility);

-- Full-text search over document content, for the search feature. The
-- expression index is GIN on a simple to_tsvector because Postgres's default
-- parser is language-agnostic here and we are matching legal English; a
-- dedicated legal-corpus parser is a later decision, not a launch blocker.
CREATE INDEX IF NOT EXISTS matter_documents_search_idx
  ON matter_documents USING GIN (to_tsvector('english',
       coalesce(title,'') || ' ' || coalesce(purpose,'') || ' ' || coalesce(extracted_text,'')));
