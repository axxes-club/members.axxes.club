-- AXXES Matter.
--
-- Succession matters: a family and its lawyers, or the owners of a business and
-- the people buying it out. One engine, two templates.
--
-- Additive and idempotent. Every statement is IF NOT EXISTS so this can be run
-- against a database that already has a partial copy (a `db push` that was
-- never migrated, a restored backup) without failing or destroying anything.
-- Nothing here drops or alters an existing table.
--
-- Run:  psql "$DATABASE_URL" -f db/matters.sql
--   or: node scripts/matter-migrate.mjs
--
-- WHY NOT A PROJECT
--
-- The portal has projects, cards and deadlines already. A matter is not one,
-- because in a project a file is an attachment and in a matter the file is the
-- subject. The question a matter answers is not "is this done" but "has
-- everyone seen this, and what did they say about it". That is matter_acks.

-- Tenants gain two values so a family or an estate can be a first-class
-- workspace. ALTER TYPE ... ADD VALUE cannot run inside a transaction block,
-- which is why the migration script below runs statements one at a time.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
                 WHERE t.typname = 'tenant_type' AND e.enumlabel = 'family') THEN
    ALTER TYPE tenant_type ADD VALUE 'family';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
                 WHERE t.typname = 'tenant_type' AND e.enumlabel = 'estate') THEN
    ALTER TYPE tenant_type ADD VALUE 'estate';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS matter_templates (
  key               text PRIMARY KEY,
  name              text        NOT NULL,
  blurb             text        NOT NULL,
  description       text        NOT NULL,
  kinds             jsonb       NOT NULL DEFAULT '[]'::jsonb,
  default_roles     jsonb       NOT NULL DEFAULT '[]'::jsonb,
  default_deadlines jsonb       NOT NULL DEFAULT '[]'::jsonb,
  icon              text,
  sort_order        integer     NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matter_templates_sort_idx ON matter_templates (sort_order);

CREATE TABLE IF NOT EXISTS matters (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  template_key text REFERENCES matter_templates (key),
  kind         text NOT NULL,
  title        text NOT NULL,
  summary      text,
  stage        text NOT NULL DEFAULT 'collecting',
  jurisdiction text,
  opened_at    timestamptz NOT NULL DEFAULT now(),
  created_by_id text REFERENCES "user" (id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz
);
CREATE INDEX IF NOT EXISTS matters_tenant_idx   ON matters (tenant_id);
CREATE INDEX IF NOT EXISTS matters_stage_idx    ON matters (tenant_id, stage);
CREATE INDEX IF NOT EXISTS matters_template_idx ON matters (template_key);

-- actor_key is "user:<id>" or "guest:<subject>". It is NOT null for guests on
-- purpose: opposing counsel arrives through a signed share link and never has
-- an account, but their acknowledgement must be as durable as the executor's.
CREATE TABLE IF NOT EXISTS matter_participants (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id    uuid NOT NULL REFERENCES matters (id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  user_id      text REFERENCES "user" (id) ON DELETE SET NULL,
  actor_key    text NOT NULL,
  display_name text NOT NULL,
  role         text NOT NULL,
  org          text,
  email        text,
  can_view_all boolean NOT NULL DEFAULT true,
  invited_at   timestamptz NOT NULL DEFAULT now(),
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS matter_participants_actor_idx
  ON matter_participants (matter_id, actor_key);
CREATE INDEX IF NOT EXISTS matter_participants_matter_idx ON matter_participants (matter_id);
CREATE INDEX IF NOT EXISTS matter_participants_tenant_idx ON matter_participants (tenant_id);

-- asset_id points at the shared `assets` table, so a file is reachable from
-- Folders and from a signed share link without a second copy existing.
CREATE TABLE IF NOT EXISTS matter_documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id     uuid NOT NULL REFERENCES matters (id) ON DELETE CASCADE,
  tenant_id     uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  title         text NOT NULL,
  kind          text NOT NULL DEFAULT 'asset',
  asset_id      uuid,
  revision      integer NOT NULL DEFAULT 1,
  status        text NOT NULL DEFAULT 'draft',
  purpose       text,
  created_by_id text REFERENCES "user" (id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);
CREATE INDEX IF NOT EXISTS matter_documents_matter_idx ON matter_documents (matter_id);
CREATE INDEX IF NOT EXISTS matter_documents_tenant_idx ON matter_documents (tenant_id);
CREATE INDEX IF NOT EXISTS matter_documents_status_idx ON matter_documents (matter_id, status);

-- ★ THE ACKNOWLEDGEMENT LEDGER — the reason this product exists.
--
-- One row: a named person, a specific document, a specific revision, a decision
-- and a timestamp. It answers "did she actually see version three, and what did
-- she say about it?" with an answer that can be printed.
--
-- 1. `revision` IS PART OF THE KEY. An ack says "I approved v3", not "I
--    approved this document". The moment v4 exists, a document-level ack
--    silently becomes a lie.
--
-- 2. APPEND ONLY, AND DELIBERATELY NO UNIQUE CONSTRAINT on
--    (document_id, revision, actor_key). The obvious index to add is one that
--    stops a person approving the same revision twice. Do not add it. Someone
--    who changes their mind is not a bug; make them fight the database to say
--    so and they will say nothing at all, and a silent person is the exact
--    failure this product exists to prevent. The current decision is the latest
--    by decided_at (see latestAcks() in src/lib/actions/matters.ts).
--
-- 3. NO deleted_at, ON PURPOSE. matter_documents soft-deletes so a superseded
--    file stops appearing in the list. Nothing in this table is ever removed.
CREATE TABLE IF NOT EXISTS matter_acks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES matter_documents (id) ON DELETE CASCADE,
  matter_id   uuid NOT NULL REFERENCES matters (id) ON DELETE CASCADE,
  revision    integer NOT NULL,
  actor_key   text NOT NULL,
  actor_name  text NOT NULL,
  actor_role  text,
  decision    text NOT NULL,
  note        text,
  decided_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matter_acks_document_idx ON matter_acks (document_id, revision);
CREATE INDEX IF NOT EXISTS matter_acks_matter_idx   ON matter_acks (matter_id);
CREATE INDEX IF NOT EXISTS matter_acks_actor_idx    ON matter_acks (actor_key);
CREATE INDEX IF NOT EXISTS matter_acks_decided_idx  ON matter_acks (decided_at);

-- Owned by the matter rather than borrowed from `events`, which is
-- nightlife-shaped (venue, doors, ticket types, minimum age). Reusing it for
-- "petition due in 14 days" would be a lie about what the table is.
CREATE TABLE IF NOT EXISTS matter_deadlines (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id    uuid NOT NULL REFERENCES matters (id) ON DELETE CASCADE,
  tenant_id    uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  title        text NOT NULL,
  kind         text NOT NULL DEFAULT 'other',
  due_at       timestamptz NOT NULL,
  actor_key    text,
  actor_name   text,
  status       text NOT NULL DEFAULT 'open',
  completed_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matter_deadlines_matter_idx ON matter_deadlines (matter_id);
CREATE INDEX IF NOT EXISTS matter_deadlines_tenant_idx ON matter_deadlines (tenant_id);
CREATE INDEX IF NOT EXISTS matter_deadlines_due_idx    ON matter_deadlines (due_at);

-- A job somebody owes, with a name against it. Separate from deadlines on
-- purpose: a deadline is a date the court set, a task is "get the birth
-- certificates to Rosa". Conflating them produces a calendar full of things
-- nobody is doing, which is the failure mode every family spreadsheet hit once.
CREATE TABLE IF NOT EXISTS matter_tasks (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id          uuid NOT NULL REFERENCES matters (id) ON DELETE CASCADE,
  tenant_id          uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  title              text NOT NULL,
  detail             text,
  actor_key          text,
  actor_name         text,
  status             text NOT NULL DEFAULT 'open',
  due_at             timestamptz,
  completed_at       timestamptz,
  completed_by_name  text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS matter_tasks_matter_idx  ON matter_tasks (matter_id);
CREATE INDEX IF NOT EXISTS matter_tasks_tenant_idx  ON matter_tasks (tenant_id);
CREATE INDEX IF NOT EXISTS matter_tasks_assignee_idx ON matter_tasks (actor_key);

-- The conversation is borrowed, not rebuilt: this points at a row in the
-- existing `conversations` table so the same thread also appears in Relay with
-- the same read receipts. Two message stores would be a bad decision.
CREATE TABLE IF NOT EXISTS matter_threads (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matter_id       uuid NOT NULL REFERENCES matters (id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL,
  label           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS matter_threads_matter_idx       ON matter_threads (matter_id);
CREATE INDEX IF NOT EXISTS matter_threads_conversation_idx        ON matter_threads (conversation_id);
