-- Members owns the global revocation policy. Only grants required read access.
GRANT SELECT ON public.platform_subject_policy TO atelier_editor, workspace_primary_reader;

-- Workspace remains read-only on business data; writes only admission counters.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_request_limits TO workspace_primary_reader;

-- The owner (axxes_app) keeps cross-product maintenance; Workspace can touch only its own counters.
ALTER TABLE public.security_request_limits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='security_request_limits' AND policyname='workspace_counter_only') THEN
  CREATE POLICY workspace_counter_only ON public.security_request_limits FOR ALL TO workspace_primary_reader USING (service='workspace') WITH CHECK (service='workspace');
 END IF;
END $$;
