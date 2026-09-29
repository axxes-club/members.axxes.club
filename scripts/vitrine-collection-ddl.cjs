const fs = require("fs");
const env = fs.readFileSync("/Users/admin/Developer/members.axxes.club/.env.local","utf8");
const m = env.match(/^DATABASE_URL="?([^"\n]+)"?/m);
const { neon } = require("@neondatabase/serverless");
const sql = neon(m[1]);

// Additive only. Every statement is CREATE ... IF NOT EXISTS, so this is safe to
// re-run and cannot touch an existing row.

(async () => {
const DDL = `
CREATE TABLE IF NOT EXISTS vitrine_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_id uuid NOT NULL,
  kind text NOT NULL,
  occurred_on text NOT NULL,
  occurred_on_text text,
  title text,
  notes text,
  detail jsonb DEFAULT '{}'::jsonb,
  actor_key text NOT NULL,
  actor_name text,
  superseded_by uuid,
  superseded_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_events_work_idx ON vitrine_events (work_id);
CREATE INDEX IF NOT EXISTS vitrine_events_tenant_idx ON vitrine_events (tenant_id);
CREATE INDEX IF NOT EXISTS vitrine_events_kind_idx ON vitrine_events (tenant_id, kind);

CREATE TABLE IF NOT EXISTS vitrine_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id uuid,
  artist_id uuid,
  accession text NOT NULL,
  title text,
  status text NOT NULL DEFAULT 'draft',
  location text,
  location_kind text,
  insured_value_cents integer,
  currency text DEFAULT 'USD',
  on_site boolean DEFAULT true,
  deaccessioned_at timestamptz,
  deaccession_method text,
  deaccession_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS vitrine_works_accession_idx ON vitrine_works (tenant_id, accession);
CREATE INDEX IF NOT EXISTS vitrine_works_tenant_idx ON vitrine_works (tenant_id);
CREATE INDEX IF NOT EXISTS vitrine_works_product_idx ON vitrine_works (product_id);
CREATE INDEX IF NOT EXISTS vitrine_works_artist_idx ON vitrine_works (artist_id);

CREATE TABLE IF NOT EXISTS vitrine_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  climate_controlled boolean,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_locations_tenant_idx ON vitrine_locations (tenant_id);

CREATE TABLE IF NOT EXISTS vitrine_valuations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_id uuid NOT NULL,
  value_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  basis text NOT NULL,
  valued_on text NOT NULL,
  valuer text,
  valuation_firm text,
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_valuations_work_idx ON vitrine_valuations (work_id);
CREATE INDEX IF NOT EXISTS vitrine_valuations_tenant_idx ON vitrine_valuations (tenant_id);

CREATE TABLE IF NOT EXISTS vitrine_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_id uuid NOT NULL,
  event_id uuid,
  observed_on text NOT NULL,
  observed_by text,
  grade text,
  summary text,
  detail jsonb DEFAULT '[]'::jsonb,
  images jsonb DEFAULT '[]'::jsonb,
  treated boolean DEFAULT false,
  treated_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_conditions_work_idx ON vitrine_conditions (work_id);
CREATE INDEX IF NOT EXISTS vitrine_conditions_tenant_idx ON vitrine_conditions (tenant_id);

CREATE TABLE IF NOT EXISTS vitrine_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_id uuid NOT NULL,
  direction text NOT NULL,
  counterparty text NOT NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  starts_on text NOT NULL,
  ends_on text,
  insurance_value_cents integer,
  currency text DEFAULT 'USD',
  insurance_policy text,
  status text NOT NULL DEFAULT 'out_going',
  condition_out uuid,
  condition_in uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_loans_work_idx ON vitrine_loans (work_id);
CREATE INDEX IF NOT EXISTS vitrine_loans_tenant_idx ON vitrine_loans (tenant_id);
CREATE INDEX IF NOT EXISTS vitrine_loans_status_idx ON vitrine_loans (tenant_id, status);

CREATE TABLE IF NOT EXISTS vitrine_showings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'exhibition',
  venue text,
  city text,
  country text,
  opens_on text,
  closes_on text,
  catalogue_reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_showings_tenant_idx ON vitrine_showings (tenant_id);

CREATE TABLE IF NOT EXISTS vitrine_showing_works (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  showing_id uuid NOT NULL REFERENCES vitrine_showings(id) ON DELETE CASCADE,
  work_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'exhibited',
  display_title text,
  position text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_showing_works_showing_idx ON vitrine_showing_works (showing_id);
CREATE INDEX IF NOT EXISTS vitrine_showing_works_work_idx ON vitrine_showing_works (work_id);

CREATE TABLE IF NOT EXISTS vitrine_provenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  work_id uuid NOT NULL,
  period_from text,
  period_to text,
  period_text text,
  owner_name text,
  location text,
  transfer_type text,
  source_type text,
  source_reference text,
  notes text,
  certainty text DEFAULT 'attributed',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vitrine_provenance_work_idx ON vitrine_provenance (work_id);
CREATE INDEX IF NOT EXISTS vitrine_provenance_tenant_idx ON vitrine_provenance (tenant_id);
`;

const stmts = DDL.split(";").map(s=>s.trim()).filter(Boolean);
let ok=0;
for (const s of stmts) {
  try { await sql.query(s); ok++; }
  catch(e) { console.error("FAILED:", s.slice(0,70), "->", e.message); }
}
console.log(`applied ${ok}/${stmts.length} statements`);

const t = await sql`SELECT tablename FROM pg_tables WHERE tablename LIKE 'vitrine_%' ORDER BY tablename`;
console.log("vitrine tables:", t.map(r=>r.tablename).join(", "));

})().catch((e) => { console.error(e); process.exit(1); });
