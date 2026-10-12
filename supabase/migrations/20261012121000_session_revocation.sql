-- A still-valid JWT from a signed-out session must not read/write private data.
CREATE FUNCTION private.user_session_active() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_claims jsonb; v_id uuid; v_uid uuid := auth.uid();
BEGIN
 IF v_uid IS NULL THEN RETURN false; END IF;
 v_claims := COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
 IF jsonb_typeof(v_claims->'session_id') IS DISTINCT FROM 'string' THEN RETURN false; END IF;
 v_id := (v_claims->>'session_id')::uuid;
 RETURN EXISTS(SELECT 1 FROM auth.sessions WHERE id=v_id AND user_id=v_uid AND (not_after IS NULL OR not_after>statement_timestamp()));
EXCEPTION WHEN invalid_text_representation THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION private.user_session_active() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.account_session_active() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.user_session_active();
$$;
REVOKE ALL ON FUNCTION public.account_session_active() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.account_session_active() TO authenticated;

CREATE OR REPLACE FUNCTION private.writing_active_uid() RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid := auth.uid(); v_status text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION USING MESSAGE='unauthorized'; END IF;
 SELECT status INTO v_status FROM public.profiles WHERE id=v_uid FOR SHARE;
 IF NOT FOUND OR v_status<>'active' THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 IF NOT private.user_session_active() THEN RAISE EXCEPTION USING MESSAGE='unauthorized'; END IF;
 RETURN v_uid;
END;
$$;
ALTER POLICY profiles_read_own ON public.profiles USING(id=(SELECT auth.uid()) AND (SELECT public.account_session_active()));
ALTER POLICY journal_entries_read_own_active_live ON public.journal_entries USING(
 owner_id=(SELECT auth.uid()) AND deleted_at IS NULL AND (SELECT public.account_session_active())
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=owner_id AND p.status='active'));
ALTER POLICY settings_read_own_active ON public.user_settings USING(
 owner_id=(SELECT auth.uid()) AND (SELECT public.account_session_active())
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=owner_id AND p.status='active'));
ALTER POLICY memories_read_own_active ON public.approved_memories USING(
 owner_id=(SELECT auth.uid()) AND deleted_at IS NULL AND (SELECT public.account_session_active())
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=owner_id AND p.status='active'));
ALTER POLICY todos_read_own_active ON public.todos USING(
 owner_id=(SELECT auth.uid()) AND deleted_at IS NULL AND (SELECT public.account_session_active())
 AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=owner_id AND p.status='active'));

ALTER FUNCTION public.account_data_clear() RENAME TO account_data_clear_base;
ALTER FUNCTION public.account_data_clear_base() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.account_data_clear_base() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.account_data_clear() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT private.user_session_active() THEN RAISE EXCEPTION USING MESSAGE='unauthorized'; END IF;
 RETURN private.account_data_clear_base();
END;
$$;
REVOKE ALL ON FUNCTION public.account_data_clear() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.account_data_clear() TO authenticated;

ALTER FUNCTION public.api_schema_ready() SET SCHEMA private;
ALTER FUNCTION private.api_schema_ready() RENAME TO session_base_schema_ready;
REVOKE ALL ON FUNCTION private.session_base_schema_ready() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.api_schema_ready() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.session_base_schema_ready()
 AND to_regclass('auth.sessions') IS NOT NULL
 AND has_function_privilege('authenticated','public.account_session_active()','EXECUTE')
 AND NOT has_function_privilege('anon','public.account_session_active()','EXECUTE')
 AND NOT has_function_privilege('authenticated','private.user_session_active()','EXECUTE')
 AND (SELECT count(*)=5 FROM pg_policy p WHERE p.polrelid=ANY(ARRAY['public.profiles'::regclass,'public.journal_entries'::regclass,'public.user_settings'::regclass,'public.approved_memories'::regclass,'public.todos'::regclass])
   AND pg_get_expr(p.polqual,p.polrelid) LIKE '%account_session_active()%')
 AND NOT EXISTS(SELECT 1 FROM pg_proc p WHERE p.oid=ANY(ARRAY['public.account_session_active()'::regprocedure,'private.user_session_active()'::regprocedure])
  AND (NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]));
$$;
REVOKE ALL ON FUNCTION public.api_schema_ready() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.api_schema_ready() TO anon,authenticated;
