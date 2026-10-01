-- Source-owned; apply through the members migration release, never API startup.
CREATE TABLE IF NOT EXISTS workspace_membership_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL, user_id text,
 occurred_at timestamptz NOT NULL DEFAULT now(), available_at timestamptz NOT NULL DEFAULT now(),
 leased_until timestamptz, lease_owner uuid, completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS workspace_outbox_pending ON workspace_membership_outbox(available_at) WHERE completed_at IS NULL;
CREATE OR REPLACE FUNCTION workspace_emit_membership_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE before_row jsonb; after_row jsonb; org_id uuid; member_id text;
BEGIN
 IF TG_OP <> 'INSERT' THEN before_row := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN after_row := to_jsonb(NEW); END IF;
 IF TG_OP='UPDATE' AND before_row=after_row THEN RETURN NEW; END IF;
 IF TG_TABLE_NAME='tenant_memberships' THEN
   IF before_row IS NOT NULL THEN
     org_id := (before_row->>'tenant_id')::uuid; member_id := before_row->>'user_id';
     INSERT INTO workspace_membership_outbox(organization_id,user_id) VALUES (org_id,member_id);
   END IF;
   IF after_row IS NOT NULL AND (before_row IS NULL OR before_row->>'tenant_id' IS DISTINCT FROM after_row->>'tenant_id' OR before_row->>'user_id' IS DISTINCT FROM after_row->>'user_id') THEN
     INSERT INTO workspace_membership_outbox(organization_id,user_id) VALUES ((after_row->>'tenant_id')::uuid,after_row->>'user_id');
   END IF;
 ELSE
   INSERT INTO workspace_membership_outbox(organization_id,user_id) VALUES ((coalesce(after_row,before_row)->>'id')::uuid,NULL);
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
DROP TRIGGER IF EXISTS workspace_membership_event ON tenant_memberships;
CREATE TRIGGER workspace_membership_event AFTER INSERT OR UPDATE OR DELETE ON tenant_memberships FOR EACH ROW EXECUTE FUNCTION workspace_emit_membership_event();
DROP TRIGGER IF EXISTS workspace_tenant_event ON tenants;
CREATE TRIGGER workspace_tenant_event AFTER INSERT OR UPDATE OR DELETE ON tenants FOR EACH ROW EXECUTE FUNCTION workspace_emit_membership_event();
