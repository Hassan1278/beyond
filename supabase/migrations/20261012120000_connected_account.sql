-- Ordinary account controls and shared per-user API quotas. No AI processing.
CREATE TABLE private.api_request_budgets (
 owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 window_started timestamptz NOT NULL,
 reads integer NOT NULL CHECK (reads BETWEEN 0 AND 601),
 writes integer NOT NULL CHECK (writes BETWEEN 0 AND 181)
);
REVOKE ALL ON private.api_request_budgets FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.api_request_budget(p_write boolean) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_now timestamptz := clock_timestamp(); v_row private.api_request_budgets;
BEGIN
 IF p_write IS NULL THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 INSERT INTO private.api_request_budgets(owner_id,window_started,reads,writes) VALUES(v_uid,v_now,0,0) ON CONFLICT DO NOTHING;
 SELECT * INTO v_row FROM private.api_request_budgets WHERE owner_id=v_uid FOR UPDATE;
 IF v_now >= v_row.window_started + interval '60 seconds' THEN
  v_row.window_started := v_now; v_row.reads := 0; v_row.writes := 0;
 END IF;
 IF p_write THEN v_row.writes := least(v_row.writes+1,181);
 ELSE v_row.reads := least(v_row.reads+1,601); END IF;
 UPDATE private.api_request_budgets SET window_started=v_row.window_started,reads=v_row.reads,writes=v_row.writes WHERE owner_id=v_uid;
 RETURN CASE WHEN p_write THEN v_row.writes<=180 ELSE v_row.reads<=600 END;
END;
$$;

CREATE FUNCTION public.account_data_clear() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_now timestamptz := clock_timestamp();
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION USING MESSAGE='unauthorized'; END IF;
 -- Exclusive profile lock serializes clearing against every normal product RPC.
 PERFORM 1 FROM public.profiles WHERE id=v_uid AND status='active' FOR UPDATE;
 IF NOT FOUND OR NOT private.export_recent_signin() THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 UPDATE public.approved_memories SET text=NULL,source_entry_id=NULL,original_payload=NULL,created_at=NULL,revision=NULL,updated_at=NULL,deleted_at=v_now
 WHERE owner_id=v_uid AND deleted_at IS NULL;
 UPDATE public.todos SET title=NULL,original_title=NULL,completed=NULL,revision=NULL,created_at=NULL,updated_at=NULL,deleted_at=v_now
 WHERE owner_id=v_uid AND deleted_at IS NULL;
 UPDATE public.journal_entries SET text=NULL,original_text=NULL,reflection_opt_in=NULL,revision=NULL,created_at=NULL,updated_at=NULL,deleted_at=v_now
 WHERE owner_id=v_uid AND deleted_at IS NULL;
 DELETE FROM public.user_settings WHERE owner_id=v_uid;
 -- Quotas and retired idempotency keys are deliberately not reset by content clearing.
 RETURN jsonb_build_object('status','cleared');
END;
$$;
REVOKE ALL ON FUNCTION public.api_request_budget(boolean),public.account_data_clear() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.api_request_budget(boolean),public.account_data_clear() TO authenticated;

ALTER FUNCTION public.api_schema_ready() SET SCHEMA private;
ALTER FUNCTION private.api_schema_ready() RENAME TO connected_base_schema_ready;
REVOKE ALL ON FUNCTION private.connected_base_schema_ready() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.api_schema_ready() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.connected_base_schema_ready()
 AND to_regclass('private.api_request_budgets') IS NOT NULL
 AND NOT has_table_privilege('authenticated','private.api_request_budgets','SELECT,INSERT,UPDATE,DELETE')
 AND NOT has_table_privilege('anon','private.api_request_budgets','SELECT,INSERT,UPDATE,DELETE')
 AND NOT EXISTS (
  SELECT 1 FROM unnest(ARRAY['public.api_request_budget(boolean)','public.account_data_clear()']) f
  WHERE to_regprocedure(f) IS NULL
  OR NOT has_function_privilege('authenticated',f,'EXECUTE')
  OR has_function_privilege('anon',f,'EXECUTE')
  OR EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid=to_regprocedure(f) AND (NOT p.prosecdef OR NOT ('search_path=""'=ANY(COALESCE(p.proconfig,ARRAY[]::text[])))))
 );
$$;
REVOKE ALL ON FUNCTION public.api_schema_ready() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.api_schema_ready() TO anon,authenticated;
