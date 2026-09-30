-- Binnacle — support desk tables.
--
-- Authored HERE, in the portal, and copied into the product repo's schema.
-- That is the suite convention: the portal owns the database and a product app
-- runs no migrations of its own. Binnacle ships the Drizzle schema at
-- src/lib/db/schema/binnacle.ts as a copy of this file, not as the original.
--
-- Every table is prefixed binnacle_. All AXXES products share one Neon database,
-- so a new product writing into an unprefixed namespace can break Lanes, Stock
-- or the portal.
--
-- Two decisions are load-bearing and worth stating plainly.
--
-- 1. `binnacle_messages` holds notes and events in the same table as replies.
--    A thread a person reads must be one ordered list; splitting internal notes
--    into a parallel table means every renderer grows a union and a filter, and
--    the first one that forgets the filter leaks an internal note to a customer.
--    Visibility is a column, and the query always filters on it.
--
-- 2. Nothing here is ever deleted. `binnacle_events` is append-only, and a
--    closed ticket keeps its history. This is the same promise Keel makes, and
--    it is why an agent can undo a mis-clicked status change without a support
--    ticket about the support tool.
--
-- Apply with: node scripts/apply-binnacle.mjs

-- =============================================================================
-- Channels
-- =============================================================================

-- An inbound email channel. A ticket can arrive without one, so nothing may
-- depend on this existing.
CREATE TABLE IF NOT EXISTS binnacle_mailboxes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name          text NOT NULL,
  email         text NOT NULL,
  -- Aliases a sender can use and still land here. JSON array of lowercase
  -- strings, matched before the primary address.
  aliases       jsonb NOT NULL DEFAULT '[]'::jsonb,

  imap_host     text,
  imap_port     integer,
  imap_user     text,
  -- Encrypted at rest by the portal, never selected into a client payload.
  imap_password text,
  imap_tls      boolean NOT NULL DEFAULT true,

  smtp_host     text,
  smtp_port     integer,
  smtp_user     text,
  smtp_password text,

  -- Last successful poll, so a stalled mailbox is visible rather than silent.
  last_polled_at timestamptz,
  -- Set when a poll failed, cleared on the next success. Never cleared by a
  -- retry that did not work, because a desk that silently stopped reading mail
  -- is the worst failure this product has.
  last_error    text,

  is_active     boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS binnacle_mailboxes_tenant_email_idx
  ON binnacle_mailboxes (tenant_id, email);
CREATE INDEX IF NOT EXISTS binnacle_mailboxes_tenant_idx
  ON binnacle_mailboxes (tenant_id);

-- A team is a group of agents a ticket can be assigned to.
CREATE TABLE IF NOT EXISTS binnacle_teams (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name          text NOT NULL,
  slug          text NOT NULL,
  description   text,
  -- Agent emails. Denormalised rather than a join table because it is only ever
  -- read whole, and an assignment rule needs the list in hand.
  members       jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- round_robin | least_loaded | manual
  strategy      text NOT NULL DEFAULT 'manual',
  -- How many open tickets count an agent as loaded, for least_loaded.
  capacity      integer NOT NULL DEFAULT 10,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS binnacle_teams_tenant_slug_idx
  ON binnacle_teams (tenant_id, slug);
CREATE INDEX IF NOT EXISTS binnacle_teams_tenant_idx
  ON binnacle_teams (tenant_id);

-- =============================================================================
-- The ticket
-- =============================================================================

CREATE TABLE IF NOT EXISTS binnacle_tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Human reference. What a person says out loud on a busy floor. Sequential
  -- per tenant, so TK-1042 is unambiguous inside one workspace.
  reference     integer NOT NULL,
  subject       text NOT NULL,
  -- One line of the first message, denormalised so the list renders a preview
  -- without a join and a group-by.
  preview       text,

  -- new | open | pending | on_hold | solved | closed
  status        text NOT NULL DEFAULT 'new',
  -- low | normal | high | urgent
  priority      text NOT NULL DEFAULT 'normal',

  -- The requester. Free text rather than a foreign key to contacts, because a
  -- support desk must accept a ticket from someone who is not yet a contact and
  -- never lose it for want of a row.
  requester_name  text,
  requester_email text,
  -- Set when the requester matches a CRM contact, so the ticket can show their
  -- history without a join on every list render.
  contact_id      uuid,

  -- Which mailbox it arrived on, and the thread it belongs to. Both nullable: a
  -- ticket created in-app or from the web form has neither.
  mailbox_id       uuid REFERENCES binnacle_mailboxes(id) ON DELETE SET NULL,
  email_thread_id  text,
  email_message_id text,

  team_id       uuid REFERENCES binnacle_teams(id) ON DELETE SET NULL,
  assignee_id   text,
  assignee_name text,

  tags          text[] NOT NULL DEFAULT '{}',

  -- SLA. Copied onto the ticket when a policy matched, so the target cannot
  -- silently change under an open ticket if the policy is edited later.
  sla_policy_id        uuid,
  first_response_due_at timestamptz,
  resolution_due_at     timestamptz,
  first_response_at     timestamptz,
  resolved_at           timestamptz,

  -- Agent-facing notes to self. Never rendered on the customer portal.
  internal_summary text,

  -- Set while a snooze is running; the ticket is hidden from open views until
  -- this passes. Null means not snoozed, rather than a bool that can disagree
  -- with its own timestamp.
  snoozed_until timestamptz,

  starred       boolean NOT NULL DEFAULT false,
  -- Bumped on any write. The list sorts on it, and the thread warns when two
  -- agents are looking at a ticket that has moved underneath them.
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  -- Bumped only on customer-visible messages, so "new reply" is a real signal
  -- rather than an agent's internal note pretending to be one.
  last_public_at   timestamptz,

  created_by_id text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- The list query is "this tenant, open, newest activity first", so that is the
-- index. The partial predicate keeps solved and closed out of it entirely: they
-- are the majority of rows and never appear in the hot query.
CREATE INDEX IF NOT EXISTS binnacle_tickets_queue_idx
  ON binnacle_tickets (tenant_id, last_activity_at DESC)
  WHERE status NOT IN ('solved', 'closed');
CREATE INDEX IF NOT EXISTS binnacle_tickets_tenant_status_idx
  ON binnacle_tickets (tenant_id, status);
CREATE INDEX IF NOT EXISTS binnacle_tickets_assignee_idx
  ON binnacle_tickets (tenant_id, assignee_id);
CREATE INDEX IF NOT EXISTS binnacle_tickets_requester_email_idx
  ON binnacle_tickets (tenant_id, requester_email);
-- One reference number per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS binnacle_tickets_reference_idx
  ON binnacle_tickets (tenant_id, reference);

-- Replies, internal notes and system events share this table. See the note at
-- the top of the file: one ordered list a thread renders, one visibility column
-- the query always filters on.
CREATE TABLE IF NOT EXISTS binnacle_messages (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id     uuid NOT NULL REFERENCES binnacle_tickets(id) ON DELETE CASCADE,

  -- reply (customer-visible) | note (internal) | event (system line)
  kind          text NOT NULL DEFAULT 'reply',

  author_id     text,
  author_name   text,
  author_email  text,
  -- agent | customer | system
  author_type   text NOT NULL DEFAULT 'agent',

  subject       text,
  body          text NOT NULL,
  -- Tiptap/ProseMirror JSON when the body is rich, so a formatted reply keeps
  -- its formatting through a round trip instead of degrading to plain text.
  body_json     jsonb,

  -- Idempotency for inbound mail. A retried poll must not create a second
  -- reply, and this is the one place a duplicate is genuinely harmful.
  external_id   text,

  -- Set when this message expanded a canned response or a macro, so the thread
  -- can show which one it came from.
  canned_id     uuid,

  is_public     boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now(),
  edited_at     timestamptz
);

CREATE INDEX IF NOT EXISTS binnacle_messages_ticket_idx
  ON binnacle_messages (ticket_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS binnacle_messages_external_idx
  ON binnacle_messages (tenant_id, external_id)
  WHERE external_id IS NOT NULL;

-- =============================================================================
-- History — append-only
-- =============================================================================

-- Written on every mutation, never updated, never deleted. This is what makes an
-- agent's work auditable and what lets a status change be explained rather than
-- merely reversed. A ticket with no history is a bug, not a new ticket.
CREATE TABLE IF NOT EXISTS binnacle_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id     uuid NOT NULL REFERENCES binnacle_tickets(id) ON DELETE CASCADE,

  -- created | status | assigned | priority | tagged | replied | noted |
  -- snoozed | merged | rating
  kind          text NOT NULL,
  -- The field that changed, for a field-level event.
  field         text,
  -- The before/after pair, denormalised because the sentence an agent reads
  -- years later is written from these, not from a diff it can no longer run.
  from_value    text,
  to_value      text,
  actor_id      text,
  actor_name    text,

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS binnacle_events_ticket_idx
  ON binnacle_events (ticket_id, created_at);

-- =============================================================================
-- Reuse
-- =============================================================================

CREATE TABLE IF NOT EXISTS binnacle_canned (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  title         text NOT NULL,
  body          text NOT NULL,
  -- reply renders into the composer, note into the note box. They are separate
  -- because pasting an internal note into a customer reply is the single worst
  -- thing a support tool can help with.
  visibility    text NOT NULL DEFAULT 'reply',
  -- Slash command, e.g. "refund" for /refund.
  shortcut      text,
  -- Folder grouping in the picker.
  folder        text,
  usage_count   integer NOT NULL DEFAULT 0,

  created_by_id text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS binnacle_canned_tenant_idx ON binnacle_canned (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS binnacle_canned_shortcut_idx
  ON binnacle_canned (tenant_id, shortcut)
  WHERE shortcut IS NOT NULL;

CREATE TABLE IF NOT EXISTS binnacle_macros (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  title         text NOT NULL,
  body          text NOT NULL,
  shortcut      text,
  -- Actions applied when the macro runs, as a list of field/value pairs.
  -- Deliberately narrow: a macro can set status, priority and tags. It cannot
  -- delete, and it cannot act on another ticket.
  actions       jsonb NOT NULL DEFAULT '[]'::jsonb,
  usage_count   integer NOT NULL DEFAULT 0,

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS binnacle_macros_shortcut_idx
  ON binnacle_macros (tenant_id, shortcut)
  WHERE shortcut IS NOT NULL;

-- A saved filter. Stored as a structured clause list rather than raw SQL, so a
-- view can never become a way to read another tenant's tickets.
CREATE TABLE IF NOT EXISTS binnacle_views (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name          text NOT NULL,
  slug          text NOT NULL,
  -- The clause list: a JSON array of field/op/value objects.
  filters       jsonb NOT NULL DEFAULT '[]'::jsonb,
  sort          text NOT NULL DEFAULT 'activity',
  is_system     boolean NOT NULL DEFAULT false,
  position      integer NOT NULL DEFAULT 0,

  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS binnacle_views_tenant_slug_idx
  ON binnacle_views (tenant_id, slug);
CREATE INDEX IF NOT EXISTS binnacle_views_tenant_idx ON binnacle_views (tenant_id);

-- =============================================================================
-- Commitments — SLA, automation, knowledge, satisfaction
-- =============================================================================

CREATE TABLE IF NOT EXISTS binnacle_slas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name          text NOT NULL,
  -- Minutes. An SLA is never ambiguous about a timezone if it is an integer.
  first_response_minutes integer NOT NULL,
  resolution_minutes     integer NOT NULL,

  -- all | a team slug | a tag
  applies_to_kind  text NOT NULL DEFAULT 'all',
  applies_to_value text,

  -- pause stops the clock when the ticket is waiting on the customer; stop ends
  -- the SLA entirely. There is no third behaviour, because a policy that quietly
  -- resets on reopen is a policy nobody trusts.
  on_pending      text NOT NULL DEFAULT 'pause',
  business_hours_id uuid,

  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS binnacle_slas_tenant_idx ON binnacle_slas (tenant_id);

CREATE TABLE IF NOT EXISTS binnacle_automations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  name          text NOT NULL,
  -- on_create | on_status_change | on_public_reply
  trigger       text NOT NULL,
  -- all, or a JSON array of field/op/value objects.
  conditions    jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- A JSON array of field/value pairs: assign, set status, set priority, tag.
  actions       jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Higher runs first, and the first writer wins. The order is a number rather
  -- than a timestamp because two automations created in the same millisecond
  -- must still have a deterministic order.
  priority      integer NOT NULL DEFAULT 0,
  run_count     integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS binnacle_automations_tenant_idx
  ON binnacle_automations (tenant_id, trigger, priority DESC);

CREATE TABLE IF NOT EXISTS binnacle_articles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  title         text NOT NULL,
  slug          text NOT NULL,
  body          text NOT NULL,
  -- Plain text of the body, kept in step on write. The AI answers from this and
  -- it must never be the formatted version: a customer should never be quoted
  -- their own HTML back at them.
  body_text     text NOT NULL,
  -- draft | published
  status        text NOT NULL DEFAULT 'draft',
  -- public means anyone who asks; private means portal-only, and is how a
  -- workspace documents its own internal processes without publishing them.
  visibility    text NOT NULL DEFAULT 'public',

  view_count    integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0,
  unhelpful_count integer NOT NULL DEFAULT 0,

  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS binnacle_articles_tenant_slug_idx
  ON binnacle_articles (tenant_id, slug);
CREATE INDEX IF NOT EXISTS binnacle_articles_tenant_status_idx
  ON binnacle_articles (tenant_id, status);

CREATE TABLE IF NOT EXISTS binnacle_csat (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ticket_id     uuid NOT NULL REFERENCES binnacle_tickets(id) ON DELETE CASCADE,

  -- 1 through 5
  rating        integer NOT NULL,
  comment       text,
  -- Recorded at the time of rating, so a later change to the ticket's state does
  -- not change what the customer was actually responding to.
  ticket_status text,
  resolved_at   timestamptz,

  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One rating per ticket. A customer can change their mind, and the latest answer
-- is the one that counts.
CREATE UNIQUE INDEX IF NOT EXISTS binnacle_csat_ticket_idx
  ON binnacle_csat (ticket_id);

-- =============================================================================
-- AXXES Folders
-- =============================================================================

-- Registers the folder Binnacle owns in each workspace's Folders account.
--
-- Why this exists: AXXES Folders derives its folder list from the values in
-- assets.folder (see src/lib/dam/queries.ts, which groups the distinct folder
-- column). That works for a folder someone has already put a file in, and it
-- cannot express a folder that is empty. A workspace that has never had an
-- upload would have no Support folder at all, and the promise that the app's
-- folder appears automatically would only be true after the first attachment.
-- This table is the missing half: a row per tenant, so the folder is real
-- before anything is filed in it. The DAM unions these into its folder list.
--
-- path is the root only. Ticket folders are nested beneath it and are
-- materialised by the first upload into them, which is the correct time for a
-- folder to come into existence.
CREATE TABLE IF NOT EXISTS binnacle_folders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- The root folder path, e.g. Support. Must not end in a slash.
  path          text NOT NULL,
  -- Shown in the folder's own header.
  label         text NOT NULL,
  -- Where Open on the folder goes.
  href          text NOT NULL DEFAULT '/',

  created_at    timestamptz NOT NULL DEFAULT now()
);

-- One registered root per app per tenant, so re-provisioning is a no-op rather
-- than a second row that would render the folder twice.
CREATE UNIQUE INDEX IF NOT EXISTS binnacle_folders_tenant_path_idx
  ON binnacle_folders (tenant_id, path);

-- =============================================================================
-- Platform
-- =============================================================================

-- Rate limiting for the public intake form.
--
-- A dedicated table rather than an in-memory counter, and the reason is
-- deployment: this product runs on serverless, where each invocation gets its
-- own memory. An in-process counter is per-instance, so the real limit is
-- limit times the instance count, and it grows every time the platform scales
-- out, which is precisely when an abuse attempt is most likely.
--
-- One row per tenant, scope and client, overwritten rather than appended, so the
-- table's size is bounded by the number of distinct callers and not by the
-- number of requests.
CREATE TABLE IF NOT EXISTS binnacle_rate_limits (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- The client address, scoped to the tenant so two workspaces cannot read or
  -- exhaust each other's buckets.
  client_key    text NOT NULL,
  -- What the bucket is for: intake today. Separate buckets per feature so one
  -- cannot starve another.
  scope         text NOT NULL DEFAULT 'intake',
  hits          integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS binnacle_rate_limits_bucket_idx
  ON binnacle_rate_limits (tenant_id, scope, client_key);
