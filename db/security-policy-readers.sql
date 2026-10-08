-- Members owns the global revocation policy. Only grants required read access.
GRANT SELECT ON public.platform_subject_policy TO atelier_editor, workspace_primary_reader;

-- Workspace remains read-only on business data; writes only admission counters.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.security_request_limits TO workspace_primary_reader;
