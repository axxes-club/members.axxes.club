-- The AXXES product catalog.
--
-- Every in-house app is a row here instead of a hard-coded array in a
-- component, so the members portal, Handshake and Lanes all describe the same
-- set of products and an app cannot be live in one and missing from another.
--
-- REVISION 2026-09-28 — positioning pass. Two things changed, and one did not.
--
-- Changed: the copy. Every line is now written for the buyer who runs rooms
-- for a living, and the whole catalog is held to one promise — everything
-- reconciles. The old copy sold a feature list per product ("Boards for every
-- team", "Room and space booking"); the new copy sells the same capability in
-- terms of the job it does. A tagline is not a spec.
--
-- Changed: visibility. The `Work` products are still here, still supported and
-- still reachable by URL, but they are no longer sold. Lanes, Folders, Nexus,
-- Pulse and Vitrine are horizontal tools that each invite a one-second
-- comparison against Linear, Notion, Drive or a dedicated art archive — and we
-- lose that comparison on brand alone. They stay in the table because that is
-- the reversible move: flip `surface_in_members` back to true and the launcher
-- shows them again. Nothing is deleted, no URL 404s, no key is renamed.
--
-- Did NOT change: `key`. It is the primary key and it is referenced by
-- developer.axxes.club's plan catalog, by Handshake's OIDC clients, by the
-- integrations providers and by lanes' suite registry. Renaming a key is how a
-- product silently disappears for a paying customer, so a rebrand changes
-- `name` and never `key`. A rename is a display change; only a deprecation is a
-- schema change, and deprecation is not something this pass is doing.

CREATE TABLE IF NOT EXISTS axxes_product (
  key                text PRIMARY KEY,
  name               text        NOT NULL,
  tagline            text        NOT NULL,
  description        text        NOT NULL,
  url                text        NOT NULL,
  color              text        NOT NULL,
  category           text        NOT NULL,
  status             text        NOT NULL DEFAULT 'beta',
  sso                boolean     NOT NULL DEFAULT false,
  icon               text,
  members_path       text,
  surface_in_members boolean     NOT NULL DEFAULT true,
  sort_order         integer     NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS axxes_product_sort_idx ON axxes_product (sort_order);
CREATE INDEX IF NOT EXISTS axxes_product_category_idx ON axxes_product (category);

-- The catalog itself. `members_path` is set wherever the portal already has a
-- surface of its own, so the launcher can keep someone inside the portal
-- instead of bouncing them out to another tab.
--
-- `color` is retained because the column is NOT NULL and other surfaces read
-- it, but it is no longer load-bearing as identity. The launcher now paints
-- icons with theme tokens, so a near-white brand colour can no longer vanish
-- against a light background (it did: #ededef at 10% alpha on a 95%-lightness
-- background). One suite should look like one suite; a product is identified by
-- its name and its icon, not by a thirteenth unrelated accent.
INSERT INTO axxes_product
  (key, name, tagline, description, url, color, category, status, sso, icon, members_path, surface_in_members, sort_order)
VALUES
  -- ---------------------------------------------------------------- Suite --
  ('suite',   'AXXES Suite', 'Everything reconciles here',
   'One workspace for the whole business: CRM, events, orders, messages and every AXXES app, all reading from the same numbers.',
   'https://members.axxes.club', '#ededef', 'Suite', 'live', true, 'LayoutGrid', '/dashboard', true, 1),

  -- --------------------------------------------------------------- Events --
  ('afters',  'afters.am', 'Sell the night, run the door',
   'Events, tickets, guest lists and scanning. The door count has to match the sales count, and here it does.',
   'https://afters.am', '#f472b6', 'Events', 'live', false, 'Ticket', '/events', true, 10),

  ('vibez',   'Vibez', 'Every room is a photobooth',
   'QR codes around the venue open a night-flash camera; every photo lands on a live feed and a TV wall, tagged to the right event.',
   'https://vibez.axxes.club', '#ff4d8d', 'Events', 'beta', true, 'Camera', NULL, true, 11),

  ('qortr',   'Rooms', 'The room, booked and paid',
   'Book rooms and venues with interactive floor maps and flexible pricing, so the calendar and the till agree.',
   'https://qortr.axxes.club', '#22d3ee', 'Events', 'beta', true, 'DoorOpen', NULL, true, 12),

  -- ------------------------------------------------------------- Commerce --
  ('manifest','Stock', 'Every number explains itself',
   'Purchasing, fulfilment, transfers and quality on one honest ledger. Immovable stock moves, mistakes reversed rather than edited, and a cost layer that can be read line by line.',
   'https://manifest.axxes.club', '#c8ff3d', 'Commerce', 'beta', true, 'ClipboardList', NULL, true, 20),

  ('krates',  'Krates', 'The straightforward stock list',
   'The plain track: products, variants and stock levels across locations. Signs in separately for now. PENDING MERGE into Stock — see AXXES-BRAND.md; the key must not change either way.',
   'https://kr8s.axxes.club', '#f59e0b', 'Commerce', 'live', false, 'Package', '/inventory', true, 21),

  ('tollbooth','Tollbooth', 'Paid, and paid out',
   'Hosted checkout, payouts to your bank, and one reconciliation of what was charged against what actually landed.',
   'https://tollbooth.axxes.club', '#a78bfa', 'Commerce', 'beta', true, 'CreditCard', NULL, true, 22),

  -- ------------------------------------------------------------ Developers --
  ('api',     'AXXES for Builders', 'Put your event on AXXES',
   'Events, ticket types, orders and check-ins as an API, plus webhooks. Built for teams shipping their own product on top of ours.',
   'https://api.axxes.club', '#94a3b8', 'Developers', 'live', false, 'Code', NULL, true, 30),

  ('developer', 'AXXES Developers', 'Build against the whole suite',
   'The API reference, app and key registration, integrations and webhooks, your usage and plan, and copy-paste prompts for building on AXXES.',
   'https://developer.axxes.club', '#22d3ee', 'Developers', 'beta', true, 'Terminal', NULL, true, 31),

  -- ----------------------------------------------------------------- Work --
  -- Retained, not sold. See the header note: this is a reversible visibility
  -- change, not a retirement. Do not delete these rows — several keys are still
  -- referenced by developer.axxes.club's plan catalog and Handshake's OIDC
  -- client registry, and a missing row there is a broken plan, not a tidy file.
  ('lanes',   'Lanes', 'Boards for every team',
   'Kanban boards, sprints and pipelines with checklists, assignees, due dates and Jira-style keys.',
   'https://lanes.axxes.club', '#60a5fa', 'Work', 'beta', true, 'KanbanSquare', '/projects', false, 2),

  ('folders', 'Folders', 'Store, organize and share files',
   'A fast, familiar file library with folders, previews, share links and upload-from-phone.',
   'https://folders.axxes.club', '#3b82f6', 'Work', 'live', true, 'FolderOpen', '/assets', false, 3),

  ('nexus',   'Nexus', 'Your team''s knowledge base',
   'Docs, wikis and an intranet your team will actually use - linked pages, a graph of everything you know.',
   'https://nexus.axxes.club', '#2dd4bf', 'Work', 'beta', true, 'Network', NULL, false, 4),

  ('pulse',   'Pulse', 'Live vital signs for your workspace',
   'Revenue, audience, events and content at a glance, across every AXXES product you use.',
   'https://pulse.axxes.club', '#ef4444', 'Work', 'beta', true, 'Activity', NULL, false, 5),

  ('vitrine', 'Vitrine', 'The collection, kept',
   'Private collection archives for serious art collections - provenance, condition and legacy in one quiet desk.',
   'https://vitrine.axxes.club', '#8a7a5c', 'Work', 'beta', true, 'Gem', NULL, false, 6)
ON CONFLICT (key) DO UPDATE SET
  name               = EXCLUDED.name,
  tagline            = EXCLUDED.tagline,
  description        = EXCLUDED.description,
  url                = EXCLUDED.url,
  color              = EXCLUDED.color,
  category           = EXCLUDED.category,
  status             = EXCLUDED.status,
  sso                = EXCLUDED.sso,
  icon               = EXCLUDED.icon,
  members_path       = EXCLUDED.members_path,
  surface_in_members = EXCLUDED.surface_in_members,
  sort_order         = EXCLUDED.sort_order,
  updated_at         = now();
