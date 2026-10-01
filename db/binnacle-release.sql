-- Additive launch migration. Portal owns the shared database schema.
CREATE TABLE IF NOT EXISTS binnacle_ticket_counters (
  tenant_id uuid PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  last_reference integer NOT NULL
);
ALTER TABLE binnacle_tickets ADD COLUMN IF NOT EXISTS sla_paused_ms bigint NOT NULL DEFAULT 0;
ALTER TABLE binnacle_tickets ADD COLUMN IF NOT EXISTS sla_paused_at timestamptz;
ALTER TABLE binnacle_tickets ADD COLUMN IF NOT EXISTS first_response_paused_ms bigint;
ALTER TABLE binnacle_tickets ALTER COLUMN sla_paused_ms TYPE bigint;
ALTER TABLE binnacle_tickets ALTER COLUMN first_response_paused_ms TYPE bigint;
