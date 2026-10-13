-- An early migration's catalog gate can report ready for an older API release.
-- This marker is installed only after the connected account/session/reflection schema.
CREATE FUNCTION public.api_release_ready(p_release text) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = '' AS $$
 SELECT COALESCE(p_release = 'connected-text-v1' AND public.api_schema_ready(), false);
$$;
REVOKE ALL ON FUNCTION public.api_release_ready(text) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.api_release_ready(text) TO anon, authenticated;

-- Source deletion and its privacy cascades must find linked memories without a full scan.
CREATE INDEX approved_memories_source_entry_idx ON public.approved_memories(source_entry_id);
