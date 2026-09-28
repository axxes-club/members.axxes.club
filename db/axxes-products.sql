-- The AXXES product catalog.
--
-- Every in-house app is a row here instead of a hard-coded array in a
-- component, so the members portal, Handshake and Lanes all describe the same
-- set of products and an app cannot be live in one and missing from another.

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
INSERT INTO axxes_product
  (key, name, tagline, description, url, color, category, status, sso, icon, members_path, sort_order)
VALUES
  ('suite',   'AXXES Suite', 'Your whole business in one place',
   'CRM, events, orders, website builder, newsletters, messaging and every AXXES app, integrated in one workspace.',
   'https://members.axxes.club', '#ededef', 'Suite', 'live', true, 'LayoutGrid', '/dashboard', 1),

  ('lanes',   'Lanes', 'Boards for every team',
   'Kanban boards, sprints and pipelines with checklists, assignees, due dates and Jira-style keys.',
   'https://lanes.axxes.club', '#60a5fa', 'Work', 'beta', true, 'KanbanSquare', '/projects', 2),

  ('folders', 'Folders', 'Store, organize and share files',
   'A fast, familiar file library with folders, previews, share links and upload-from-phone.',
   'https://folders.axxes.club', '#3b82f6', 'Work', 'live', true, 'FolderOpen', '/assets', 3),

  ('nexus',   'Nexus', 'Your team''s knowledge base',
   'Docs, wikis and an intranet your team will actually use - linked pages, a graph of everything you know.',
   'https://nexus.axxes.club', '#2dd4bf', 'Work', 'beta', true, 'Network', NULL, 4),

  ('pulse',   'Pulse', 'Live vital signs for your workspace',
   'Revenue, audience, events and content at a glance, across every AXXES product you use.',
   'https://pulse.axxes.club', '#ef4444', 'Work', 'beta', true, 'Activity', NULL, 5),

  ('vitrine', 'Vitrine', 'The collection, kept',
   'Private collection archives for serious art collections - provenance, condition and legacy in one quiet desk.',
   'https://vitrine.axxes.club', '#8a7a5c', 'Work', 'beta', true, 'Gem', NULL, 6),

  ('afters',  'afters.am', 'Events, tickets and afters',
   'Discover nights out, sell tickets, run guest lists and door scanning.',
   'https://afters.am', '#f472b6', 'Events', 'live', false, 'Ticket', '/events', 10),

  ('vibez',   'Vibez', 'Every room is a photobooth',
   'QR codes around the venue open a night-flash camera; every photo lands on a live feed and TV wall.',
   'https://vibez.axxes.club', '#ff4d8d', 'Events', 'beta', true, 'Camera', NULL, 11),

  ('qortr',   'Qortr', 'Room and space booking',
   'Book rooms, desks and venues with interactive floor maps and flexible pricing.',
   'https://qortr.axxes.club', '#22d3ee', 'Events', 'beta', false, 'DoorOpen', NULL, 12),

  ('tollbooth','Tollbooth', 'Payments, powered by Stripe',
   'Hosted checkout, payouts to your bank and one API for every app you run.',
   'https://tollbooth.axxes.club', '#a78bfa', 'Commerce', 'beta', true, 'CreditCard', NULL, 20),

  ('krates',  'Krates', 'Inventory and stock',
   'Track products across locations, suppliers and orders. Signs in separately for now.',
   'https://kr8s.axxes.club', '#f59e0b', 'Commerce', 'live', false, 'Package', '/inventory', 21),

  ('manifest','Manifest', 'Inventory operations',
   'Purchasing, fulfilment, transfers and quality, all in one ledger.',
   'https://manifest.axxes.club', '#c8ff3d', 'Commerce', 'beta', true, 'ClipboardList', NULL, 22),

  ('api',     'AXXES API', 'The ticketing API',
   'API-first event ticketing: events, ticket types, orders and check-ins for your own apps.',
   'https://api.axxes.club', '#94a3b8', 'Developers', 'live', false, 'Code', NULL, 30)
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
