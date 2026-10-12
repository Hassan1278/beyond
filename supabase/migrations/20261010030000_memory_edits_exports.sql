-- Explicit corrections and portability; no AI jobs or stored export copies.
ALTER TABLE public.approved_memories ADD COLUMN revision integer, ADD COLUMN updated_at timestamptz;
UPDATE public.approved_memories SET revision=1,updated_at=created_at WHERE deleted_at IS NULL;
ALTER TABLE public.approved_memories ALTER COLUMN revision SET DEFAULT 1, ALTER COLUMN updated_at SET DEFAULT clock_timestamp();
ALTER TABLE public.approved_memories ADD CONSTRAINT memories_revision_state CHECK (
 CASE WHEN deleted_at IS NULL THEN revision IS NOT NULL AND revision>0 AND updated_at IS NOT NULL AND isfinite(updated_at)
 ELSE revision IS NULL AND updated_at IS NULL END
);
GRANT SELECT(revision,updated_at) ON public.approved_memories TO authenticated;
CREATE OR REPLACE FUNCTION private.memory_resource(p public.approved_memories) RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT jsonb_build_object('id',p.id,'text',p.text,'source_entry_id',p.source_entry_id,
 'revision',p.revision,'created_at',to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'updated_at',to_char(p.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
$$;
CREATE FUNCTION public.memory_update(p_id uuid,p_text text,p_approved boolean,p_expected_revision integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.approved_memories;
BEGIN
 IF p_id IS NULL OR NOT private.product_text_valid(p_text) OR p_approved IS DISTINCT FROM true
 OR p_expected_revision IS NULL OR p_expected_revision<1 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT * INTO v_row FROM public.approved_memories WHERE id=p_id AND owner_id=v_uid AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 IF v_row.revision<>p_expected_revision OR v_row.revision=2147483647 THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 UPDATE public.approved_memories SET text=p_text,revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_row;
 RETURN private.memory_resource(v_row);
END;
$$;
CREATE OR REPLACE FUNCTION private.memory_source_deleted() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
 UPDATE public.approved_memories SET text=NULL,source_entry_id=NULL,original_payload=NULL,created_at=NULL,revision=NULL,updated_at=NULL,deleted_at=NEW.deleted_at
 WHERE source_entry_id=NEW.id AND deleted_at IS NULL;
 END IF;
 RETURN NEW;
END;
$$;

-- PostgREST verifies the JWT before authenticated RPC execution. The API also
-- freshly verifies the SAME bearer with Auth before inspecting these claims.
CREATE FUNCTION private.export_recent_signin() RETURNS boolean LANGUAGE plpgsql STABLE SET search_path = '' AS $$
DECLARE v_claims jsonb; v_item jsonb; v_timestamp numeric; v_now numeric := extract(epoch FROM statement_timestamp());
BEGIN
 v_claims := COALESCE(NULLIF(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
 IF jsonb_typeof(v_claims->'amr') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
 FOR v_item IN SELECT value FROM jsonb_array_elements(v_claims->'amr') LOOP
  IF jsonb_typeof(v_item)='object' AND (v_item->>'method') IN ('password','oauth','totp','sso','webauthn')
  AND jsonb_typeof(v_item->'timestamp')='number' THEN
   v_timestamp := (v_item->>'timestamp')::numeric;
   IF v_timestamp=trunc(v_timestamp) AND v_timestamp<=v_now+30 AND v_now-v_timestamp<=300 THEN RETURN true; END IF;
  END IF;
 END LOOP;
 RETURN false;
EXCEPTION WHEN OTHERS THEN RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION private.export_recent_signin() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.account_export_page(p_section text,p_limit integer,p_before_created_at timestamptz,p_before_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_rows jsonb; v_result jsonb;
BEGIN
 IF NOT private.export_recent_signin() THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 IF p_section IS NULL OR p_section NOT IN ('settings','entries','memories','todos') THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 v_result := jsonb_build_object('format_version',1,'exported_at',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'section',p_section);
 IF p_section='settings' THEN
  IF p_limit IS NOT NULL OR p_before_created_at IS NOT NULL OR p_before_id IS NOT NULL THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
  RETURN v_result||jsonb_build_object('settings',public.settings_get());
 END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 51 OR (p_before_created_at IS NULL)<>(p_before_id IS NULL)
 OR (p_before_created_at IS NOT NULL AND (NOT isfinite(p_before_created_at) OR extract(year FROM p_before_created_at)<1)) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_section='entries' THEN v_rows:=public.entry_list(p_limit,p_before_created_at,p_before_id);
 ELSE v_rows:=public.product_list(p_section,p_limit,p_before_created_at,p_before_id); END IF;
 RETURN v_result||jsonb_build_object('items',v_rows);
END;
$$;
REVOKE ALL ON FUNCTION public.memory_update(uuid,text,boolean,integer),public.account_export_page(text,integer,timestamptz,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.memory_update(uuid,text,boolean,integer),public.account_export_page(text,integer,timestamptz,uuid) TO authenticated;

ALTER FUNCTION public.api_schema_ready() SET SCHEMA private;
ALTER FUNCTION private.api_schema_ready() RENAME TO product_schema_ready;
REVOKE ALL ON FUNCTION private.product_schema_ready() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.api_schema_ready() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT private.product_schema_ready()
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_constraint c WHERE c.conrelid=pg_catalog.to_regclass('public.approved_memories') AND c.conname='memories_revision_state' AND c.convalidated)
 AND pg_catalog.has_column_privilege('authenticated','public.approved_memories','revision','SELECT')
 AND pg_catalog.has_column_privilege('authenticated','public.approved_memories','updated_at','SELECT')
 AND NOT EXISTS(SELECT 1 FROM (VALUES('public.memory_update(uuid,text,boolean,integer)'),('public.account_export_page(text,integer,timestamp with time zone,uuid)')) required(signature)
 LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(required.signature)
 WHERE p.oid IS NULL OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
 OR NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') OR pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'))
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_proc p WHERE p.oid=pg_catalog.to_regprocedure('private.export_recent_signin()') AND p.proconfig=ARRAY['search_path=""']::text[]
 AND NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE') AND NOT pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'));
$$;
REVOKE ALL ON FUNCTION public.api_schema_ready() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.api_schema_ready() TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.memory_create(p_text text, p_source_entry_id uuid, p_approved boolean, p_idempotency_key uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.approved_memories; v_payload jsonb; v_now timestamptz := clock_timestamp();
BEGIN
 IF NOT private.product_text_valid(p_text) OR p_approved IS DISTINCT FROM true OR p_idempotency_key IS NULL THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 v_payload := jsonb_build_object('text',p_text,'source_entry_id',p_source_entry_id);
 -- Lock the source before the insertion/replay, coordinating with journal deletion.
 IF p_source_entry_id IS NOT NULL THEN
   PERFORM 1 FROM public.journal_entries WHERE id=p_source_entry_id AND owner_id=v_uid AND deleted_at IS NULL FOR SHARE;
   IF NOT FOUND THEN
    IF EXISTS (SELECT 1 FROM public.approved_memories WHERE owner_id=v_uid AND idempotency_key=p_idempotency_key AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
    RAISE EXCEPTION USING MESSAGE='not_found';
   END IF;
 END IF;
 INSERT INTO public.approved_memories(owner_id,idempotency_key,text,source_entry_id,original_payload,created_at,revision,updated_at)
 VALUES(v_uid,p_idempotency_key,p_text,p_source_entry_id,v_payload,v_now,1,v_now) ON CONFLICT DO NOTHING RETURNING * INTO v_row;
 IF NOT FOUND THEN
  SELECT * INTO v_row FROM public.approved_memories WHERE owner_id=v_uid AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF NOT FOUND OR v_row.deleted_at IS NOT NULL OR convert_to(v_row.original_payload::text,'UTF8') <> convert_to(v_payload::text,'UTF8') THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 END IF;
 RETURN private.memory_resource(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.product_delete(p_kind text,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_id uuid;
BEGIN
 IF p_id IS NULL THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_kind='memories' THEN
 UPDATE public.approved_memories SET text=NULL,source_entry_id=NULL,original_payload=NULL,created_at=NULL,revision=NULL,updated_at=NULL,deleted_at=clock_timestamp()
 WHERE id=p_id AND owner_id=v_uid AND deleted_at IS NULL RETURNING id INTO v_id;
 ELSIF p_kind='todos' THEN
 UPDATE public.todos SET title=NULL,original_title=NULL,completed=NULL,revision=NULL,created_at=NULL,updated_at=NULL,deleted_at=clock_timestamp()
 WHERE id=p_id AND owner_id=v_uid AND deleted_at IS NULL RETURNING id INTO v_id;
 ELSE RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF v_id IS NULL THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 RETURN jsonb_build_object('id',v_id);
END;
$$;
