-- Additive migration. Apply before PLATFORM_ACCESS_POLICY_ENABLED / PLATFORM_ADMIN_READY.
CREATE TABLE IF NOT EXISTS platform_subject_policy (
 subject_kind text NOT NULL CHECK(subject_kind IN ('user','organization')),
 subject_id text NOT NULL, state text NOT NULL DEFAULT 'active' CHECK(state IN ('active','suspended')),
 revision bigint NOT NULL DEFAULT 0, reason text, prior_state text,
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(subject_kind,subject_id)
);
CREATE TABLE IF NOT EXISTS platform_entitlements (
 user_id text NOT NULL REFERENCES "user"(id), tenant_id uuid NOT NULL REFERENCES tenants(id),
 service_id text NOT NULL, allowed boolean NOT NULL, updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,tenant_id,service_id)
);
CREATE TABLE IF NOT EXISTS platform_admin_operations (
 id uuid PRIMARY KEY, integration_id text NOT NULL, idempotency_key text NOT NULL,
 command_hash text NOT NULL, wm_actor text NOT NULL, correlation_id text NOT NULL,
 state text NOT NULL, result jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(integration_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS platform_admin_audit (
 id uuid PRIMARY KEY, operation_id uuid NOT NULL, wm_actor text NOT NULL,
 integration_id text NOT NULL, correlation_id text NOT NULL,
 subject_kind text NOT NULL, subject_id text NOT NULL, action text NOT NULL, result text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_invitation_delivery (
 invitation_id uuid PRIMARY KEY REFERENCES tenant_invitations(id), state text NOT NULL,
 attempt_id uuid NOT NULL, payload jsonb, first_attempt_at timestamptz, last_attempt_at timestamptz,
 sent_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_admin_audit_subject ON platform_admin_audit(subject_kind,subject_id,created_at DESC);

CREATE TABLE IF NOT EXISTS platform_organization_entitlements (
 tenant_id uuid NOT NULL REFERENCES tenants(id),service_id text NOT NULL,
 allowed boolean NOT NULL,updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(tenant_id,service_id)
);

-- Serialize credential creation with user-policy mutations. Existing writers also
-- cross this boundary, so a pre-insert eligibility check cannot race revocation.
CREATE OR REPLACE FUNCTION platform_guard_credential_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE credential_user text;
BEGIN
 IF TG_TABLE_NAME='verification' THEN
  BEGIN
   credential_user := ((to_jsonb(NEW)->>'value')::jsonb)->>'userId';
  EXCEPTION WHEN invalid_text_representation THEN
   credential_user := NULL;
  END;
 ELSE
  credential_user := to_jsonb(NEW)->>'user_id';
 END IF;
 IF credential_user IS NOT NULL THEN
  PERFORM id FROM "user" WHERE id=credential_user FOR UPDATE;
  IF EXISTS(SELECT 1 FROM platform_subject_policy WHERE subject_kind='user' AND subject_id=credential_user AND state='suspended') THEN
   RAISE EXCEPTION 'Account access is suspended' USING ERRCODE='42501';
  END IF;
 END IF;
 RETURN NEW;
END;
$$;
DO $$
DECLARE credential_table text;
BEGIN
 FOREACH credential_table IN ARRAY ARRAY['session','oauth_access_token','workspace_oidc_codes','api_tokens','verification'] LOOP
  IF to_regclass(credential_table) IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid=to_regclass(credential_table) AND tgname='platform_guard_credential_insert') THEN
   EXECUTE format('CREATE TRIGGER platform_guard_credential_insert BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION platform_guard_credential_insert()',credential_table);
  END IF;
 END LOOP;
END;
$$;
