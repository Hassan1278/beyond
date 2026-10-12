-- Backend orchestration only. The independent AI service is implemented elsewhere.
CREATE TABLE private.reflection_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 entry_id uuid NOT NULL UNIQUE REFERENCES public.journal_entries(id) ON DELETE CASCADE,
 entry_revision integer NOT NULL CHECK(entry_revision>0),
 voice text NOT NULL CHECK(voice IN ('friend','mentor','future','diary')),
 timezone text NOT NULL, morning_time text NOT NULL CHECK(morning_time IN ('07:00','07:30','08:00')),
 due_at timestamptz NOT NULL, next_attempt_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','failed')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 lease_token uuid, lease_until timestamptz,
 CHECK((lease_token IS NULL)=(lease_until IS NULL))
);
ALTER TABLE private.reflection_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.reflection_jobs FROM PUBLIC,anon,authenticated,service_role;
CREATE INDEX reflection_jobs_due ON private.reflection_jobs(next_attempt_at) WHERE status='pending';
CREATE TABLE public.reflections (
 id uuid PRIMARY KEY, owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 entry_id uuid NOT NULL UNIQUE REFERENCES public.journal_entries(id) ON DELETE CASCADE,
 entry_revision integer NOT NULL, voice text NOT NULL,
 letter jsonb NOT NULL, actions jsonb NOT NULL, provenance jsonb NOT NULL,
 correction text, revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 context_ids uuid[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reflections FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT(id,owner_id,entry_id,entry_revision,voice,letter,actions,provenance,correction,revision,created_at,updated_at) ON public.reflections TO authenticated;
CREATE POLICY reflections_active_owner ON public.reflections FOR SELECT TO authenticated USING (
 owner_id=(SELECT auth.uid()) AND (SELECT public.account_session_active()) AND EXISTS(SELECT 1 FROM public.profiles WHERE id=owner_id AND status='active')
);
ALTER TABLE public.todos ADD COLUMN source_reflection_id uuid;
ALTER TABLE public.todos ADD COLUMN source_action_id uuid;
CREATE UNIQUE INDEX todos_reflection_action ON public.todos(source_reflection_id,source_action_id) WHERE source_reflection_id IS NOT NULL;
CREATE FUNCTION private.reflection_resource(p public.reflections) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('id',p.id,'entry_id',p.entry_id,'entry_revision',p.entry_revision,'voice',p.voice,
 'letter',p.letter,'actions',p.actions,'provenance',p.provenance,'correction',p.correction,'revision',p.revision,
 'created_at',to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'updated_at',to_char(p.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
$$;
CREATE FUNCTION private.next_morning(p_now timestamptz,p_zone text,p_time text) RETURNS timestamptz LANGUAGE plpgsql STABLE SET search_path='' AS $$
BEGIN
 IF NOT isfinite(p_now) OR p_now IS NULL OR p_zone IS NULL OR p_time IS NULL OR p_time NOT IN ('07:00','07:30','08:00')
 OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=p_zone) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 -- Next local calendar day, even if writing before today's morning. PostgreSQL
 -- shifts nonexistent local times forward and chooses the later overlap instant.
 RETURN (((p_now AT TIME ZONE p_zone)::date+1)+p_time::time) AT TIME ZONE p_zone;
END;
$$;
CREATE FUNCTION public.reflection_request(p_entry_id uuid,p_expected_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=private.writing_active_uid(); e public.journal_entries; s public.user_settings; j private.reflection_jobs; v_due timestamptz;
BEGIN
 SELECT * INTO e FROM public.journal_entries WHERE id=p_entry_id AND owner_id=v_uid AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 IF p_expected_revision IS NULL OR e.revision<>p_expected_revision THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 PERFORM public.settings_get(); SELECT * INTO s FROM public.user_settings WHERE owner_id=v_uid;
 v_due:=private.next_morning(statement_timestamp(),s.timezone,s.morning_time);
 INSERT INTO private.reflection_jobs(owner_id,entry_id,entry_revision,voice,timezone,morning_time,due_at,next_attempt_at)
 VALUES(v_uid,e.id,e.revision,s.voice,s.timezone,s.morning_time,v_due,v_due) ON CONFLICT(entry_id) DO NOTHING;
 SELECT * INTO j FROM private.reflection_jobs WHERE entry_id=e.id FOR UPDATE;
 IF j.entry_revision<>e.revision THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 RETURN jsonb_build_object('id',j.id,'entry_id',j.entry_id,'entry_revision',j.entry_revision,'status',j.status,
 'due_at',to_char(j.due_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
END;
$$;
CREATE FUNCTION public.reflection_list(p_limit integer,p_before_created_at timestamptz,p_before_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=private.writing_active_uid(); v_result jsonb;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 101 OR (p_before_created_at IS NULL)<>(p_before_id IS NULL)
 OR (p_before_created_at IS NOT NULL AND NOT isfinite(p_before_created_at)) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT COALESCE(jsonb_agg(private.reflection_resource(r) ORDER BY r.created_at DESC,r.id DESC),'[]'::jsonb) INTO v_result
 FROM (SELECT * FROM public.reflections WHERE owner_id=v_uid AND (p_before_created_at IS NULL OR (created_at,id)<(p_before_created_at,p_before_id)) ORDER BY created_at DESC,id DESC LIMIT p_limit) r;
 RETURN v_result;
END;
$$;
CREATE FUNCTION public.reflection_get(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=private.writing_active_uid(); r public.reflections;
BEGIN
 SELECT * INTO r FROM public.reflections WHERE id=p_id AND owner_id=v_uid;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 RETURN private.reflection_resource(r);
END;
$$;
CREATE FUNCTION private.reflection_remove(p_id uuid) RETURNS void LANGUAGE plpgsql SET search_path='' AS $$
DECLARE v_owner uuid; v_ids uuid[];
BEGIN
 SELECT owner_id INTO v_owner FROM public.reflections WHERE id=p_id;
 -- Profile locks in user RPCs and exclusive worker commits fence privacy changes.
 DELETE FROM private.reflection_jobs WHERE owner_id=v_owner AND status<>'completed';
 WITH RECURSIVE affected(id) AS (
  SELECT p_id UNION SELECT r.id FROM public.reflections r JOIN affected a ON a.id=ANY(r.context_ids)
 ) SELECT array_agg(id) INTO v_ids FROM affected;
 UPDATE public.todos SET title=NULL,original_title=NULL,completed=NULL,revision=NULL,created_at=NULL,updated_at=NULL,deleted_at=clock_timestamp(),source_reflection_id=NULL,source_action_id=NULL
 WHERE source_reflection_id=ANY(v_ids) AND deleted_at IS NULL;
 UPDATE public.todos SET source_reflection_id=NULL,source_action_id=NULL WHERE source_reflection_id=ANY(v_ids);
 DELETE FROM public.reflections WHERE id=ANY(v_ids);
END;
$$;
CREATE FUNCTION public.reflection_cancel(p_entry_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=private.writing_active_uid(); v_id uuid;
BEGIN
 PERFORM 1 FROM public.journal_entries WHERE id=p_entry_id AND owner_id=v_uid AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 DELETE FROM private.reflection_jobs WHERE entry_id=p_entry_id AND owner_id=v_uid;
 SELECT id INTO v_id FROM public.reflections WHERE entry_id=p_entry_id AND owner_id=v_uid;
 IF v_id IS NOT NULL THEN PERFORM private.reflection_remove(v_id); END IF;
 RETURN jsonb_build_object('id',p_entry_id);
END;
$$;
CREATE FUNCTION public.reflection_correct(p_id uuid,p_text text,p_expected_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=private.writing_active_uid(); r public.reflections;
BEGIN
 IF NOT private.product_text_valid(p_text) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT * INTO r FROM public.reflections WHERE id=p_id AND owner_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 IF p_expected_revision IS NULL OR r.revision<>p_expected_revision OR r.revision=2147483647 THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 DELETE FROM private.reflection_jobs WHERE owner_id=v_uid AND status<>'completed';
 UPDATE public.reflections SET correction=p_text,revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO r;
 RETURN private.reflection_resource(r);
END;
$$;
CREATE FUNCTION public.reflection_decide(p_id uuid,p_action_id uuid,p_decision text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_uid uuid:=private.writing_active_uid(); r public.reflections; a jsonb; t public.todos; v_todo jsonb;
BEGIN
 IF p_decision IS NULL OR p_decision NOT IN ('accepted','rejected') THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT * INTO r FROM public.reflections WHERE id=p_id AND owner_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 SELECT value INTO a FROM jsonb_array_elements(r.actions) WHERE value->>'id'=p_action_id::text;
 IF a IS NULL THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 IF a->>'decision'<>'pending' AND a->>'decision'<>p_decision THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 IF p_decision='accepted' THEN
  SELECT * INTO t FROM public.todos WHERE source_reflection_id=p_id AND source_action_id=p_action_id FOR UPDATE;
  IF FOUND THEN
   IF t.deleted_at IS NOT NULL THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
   v_todo:=private.todo_resource(t);
  ELSIF a->>'decision'='accepted' THEN RAISE EXCEPTION USING MESSAGE='conflict';
  ELSE
   INSERT INTO public.todos(owner_id,idempotency_key,title,original_title,completed,revision,created_at,updated_at,source_reflection_id,source_action_id)
   VALUES(v_uid,gen_random_uuid(),a->>'title',a->>'title',false,1,clock_timestamp(),clock_timestamp(),p_id,p_action_id) RETURNING * INTO t;
   v_todo:=private.todo_resource(t);
  END IF;
 END IF;
 IF a->>'decision'='pending' THEN
  IF r.revision=2147483647 THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
  UPDATE public.reflections SET actions=(SELECT jsonb_agg(CASE WHEN value->>'id'=p_action_id::text THEN value||jsonb_build_object('decision',p_decision) ELSE value END ORDER BY ord) FROM jsonb_array_elements(actions) WITH ORDINALITY q(value,ord)),revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO r;
 END IF;
 RETURN jsonb_build_object('reflection',private.reflection_resource(r),'todo',v_todo);
END;
$$;
CREATE FUNCTION private.invalidate_entry_reflection() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF TG_OP='DELETE' OR NEW.revision IS DISTINCT FROM OLD.revision OR NEW.deleted_at IS DISTINCT FROM OLD.deleted_at THEN
  SELECT id INTO v_id FROM public.reflections WHERE entry_id=OLD.id;
  IF v_id IS NOT NULL THEN PERFORM private.reflection_remove(v_id); END IF;
  DELETE FROM private.reflection_jobs WHERE entry_id=OLD.id;
 END IF;
 RETURN NULL;
END;
$$;
CREATE TRIGGER entry_reflection_invalidation AFTER UPDATE OR DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION private.invalidate_entry_reflection();
CREATE FUNCTION private.invalidate_memory_context() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_owner uuid; v_id uuid;
BEGIN
 IF TG_TABLE_NAME='user_settings' THEN
  IF NEW.memory_paused IS NOT DISTINCT FROM OLD.memory_paused THEN RETURN NULL; END IF;
 END IF;
 v_owner:=CASE WHEN TG_OP='DELETE' THEN OLD.owner_id ELSE NEW.owner_id END;
 -- Revoked/corrected approved context must never return through an in-flight job.
 DELETE FROM private.reflection_jobs WHERE owner_id=v_owner AND status<>'completed';
 FOR v_id IN SELECT id FROM public.reflections WHERE owner_id=v_owner AND cardinality(context_ids)>0 LOOP PERFORM private.reflection_remove(v_id); END LOOP;
 RETURN NULL;
END;
$$;
CREATE TRIGGER memories_reflection_invalidation AFTER INSERT OR UPDATE OR DELETE ON public.approved_memories FOR EACH ROW EXECUTE FUNCTION private.invalidate_memory_context();
CREATE TRIGGER settings_reflection_invalidation AFTER UPDATE OF memory_paused ON public.user_settings FOR EACH ROW EXECUTE FUNCTION private.invalidate_memory_context();
CREATE FUNCTION public.reflection_claim(p_limit integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_now timestamptz:=clock_timestamp(); v_result jsonb;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 UPDATE private.reflection_jobs SET status='failed',lease_token=NULL,lease_until=NULL WHERE status='pending' AND attempts=5 AND (lease_until IS NULL OR lease_until<=v_now);
 WITH candidates AS (SELECT j.id FROM private.reflection_jobs j JOIN public.profiles p ON p.id=j.owner_id AND p.status='active'
 WHERE j.status='pending' AND j.attempts<5 AND j.next_attempt_at<=v_now AND (j.lease_until IS NULL OR j.lease_until<=v_now)
 ORDER BY j.next_attempt_at,j.id FOR UPDATE OF j SKIP LOCKED LIMIT p_limit), claimed AS (
 UPDATE private.reflection_jobs j SET lease_token=gen_random_uuid(),lease_until=v_now+interval '60 seconds',attempts=j.attempts+1 FROM candidates c WHERE j.id=c.id RETURNING j.id,j.lease_token)
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'lease_token',lease_token)),'[]'::jsonb) INTO v_result FROM claimed;
 RETURN v_result;
END;
$$;
CREATE FUNCTION public.reflection_input(p_id uuid,p_lease_token uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j private.reflection_jobs; e public.journal_entries; s public.user_settings; v_context jsonb; v_corrections jsonb;
BEGIN
 SELECT * INTO j FROM private.reflection_jobs WHERE id=p_id AND status='pending' AND lease_token=p_lease_token AND lease_until>clock_timestamp();
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=j.owner_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 SELECT * INTO e FROM public.journal_entries WHERE id=j.entry_id AND owner_id=j.owner_id AND deleted_at IS NULL AND revision=j.entry_revision FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 SELECT * INTO s FROM public.user_settings WHERE owner_id=j.owner_id;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',m.id,'text',m.text)),'[]'::jsonb) INTO v_context FROM
 (SELECT id,text FROM public.approved_memories WHERE owner_id=j.owner_id AND deleted_at IS NULL AND NOT COALESCE(s.memory_paused,false) ORDER BY created_at DESC,id DESC LIMIT 20) m;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',r.id,'text',r.correction)),'[]'::jsonb) INTO v_corrections FROM (SELECT id,correction FROM public.reflections WHERE owner_id=j.owner_id AND correction IS NOT NULL ORDER BY created_at DESC,id DESC LIMIT 5) r;
 RETURN jsonb_build_object('version',1,'request_id',j.id,'entry',jsonb_build_object('id',e.id,'revision',e.revision,'text',e.text),'voice',j.voice,'memories',v_context,'corrections',v_corrections);
END;
$$;
CREATE FUNCTION public.reflection_finish(p_id uuid,p_lease_token uuid,p_output jsonb,p_context_ids uuid[]) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j private.reflection_jobs; k text; v_actions jsonb;
BEGIN
 SELECT * INTO j FROM private.reflection_jobs WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=j.owner_id AND status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 PERFORM 1 FROM public.journal_entries WHERE id=j.entry_id AND owner_id=j.owner_id AND deleted_at IS NULL AND revision=j.entry_revision FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 PERFORM 1 FROM private.reflection_jobs WHERE id=p_id AND status='pending' AND lease_token=p_lease_token AND lease_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 IF p_output IS NULL OR jsonb_typeof(p_output)<>'object' OR p_output->'version' IS DISTINCT FROM '1'::jsonb OR p_output->>'request_id' IS DISTINCT FROM p_id::text
 OR (SELECT count(*) FROM jsonb_object_keys(p_output))<>6 OR NOT (p_output ?& ARRAY['version','request_id','entry_revision','letter','actions','provenance'])
 OR p_output->'entry_revision' IS DISTINCT FROM to_jsonb(j.entry_revision) OR jsonb_typeof(p_output->'letter') IS DISTINCT FROM 'object'
 OR (SELECT count(*) FROM jsonb_object_keys(p_output->'letter'))<>5 OR NOT ((p_output->'letter') ?& ARRAY['greet','said','rec','step','sign'])
 OR jsonb_typeof(p_output->'actions') IS DISTINCT FROM 'array' OR jsonb_array_length(p_output->'actions')>5
 OR jsonb_typeof(p_output->'provenance') IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(p_output->'provenance'))<>2
 OR NOT ((p_output->'provenance') ?& ARRAY['model','prompt_version']) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 FOR k IN SELECT jsonb_object_keys(p_output->'letter') LOOP
  IF jsonb_typeof(p_output->'letter'->k)<>'string' OR length(p_output->'letter'->>k)>5000 OR COALESCE((SELECT sum(CASE WHEN ascii(c)>65535 THEN 2 ELSE 1 END) FROM unnest(string_to_array(p_output->'letter'->>k,NULL)) c),0)>5000 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 END LOOP;
 IF jsonb_typeof(p_output->'provenance'->'model') IS DISTINCT FROM 'string' OR jsonb_typeof(p_output->'provenance'->'prompt_version') IS DISTINCT FROM 'string' OR NOT private.writing_text_valid(p_output->'letter'->>'said') OR NOT private.writing_text_valid(p_output->'provenance'->>'model') OR length(p_output->'provenance'->>'model')>100
 OR NOT private.writing_text_valid(p_output->'provenance'->>'prompt_version') OR length(p_output->'provenance'->>'prompt_version')>100
 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_output->'actions') a WHERE jsonb_typeof(a)<>'object' OR (SELECT count(*) FROM jsonb_object_keys(a))<>2
 OR NOT (a ?& ARRAY['id','title']) OR jsonb_typeof(a->'id') IS DISTINCT FROM 'string' OR a->>'id' !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$'
 OR jsonb_typeof(a->'title') IS DISTINCT FROM 'string' OR NOT private.product_text_valid(a->>'title'))
 OR (SELECT count(DISTINCT a->>'id') FROM jsonb_array_elements(p_output->'actions') a)<>jsonb_array_length(p_output->'actions')
 OR p_context_ids IS NULL OR cardinality(p_context_ids)>25 OR EXISTS(SELECT 1 FROM unnest(p_context_ids) c WHERE NOT EXISTS(SELECT 1 FROM public.approved_memories WHERE id=c AND owner_id=j.owner_id AND deleted_at IS NULL) AND NOT EXISTS(SELECT 1 FROM public.reflections WHERE id=c AND owner_id=j.owner_id AND correction IS NOT NULL))
 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT COALESCE(jsonb_agg(a||jsonb_build_object('decision','pending')),'[]'::jsonb) INTO v_actions FROM jsonb_array_elements(p_output->'actions') a;
 INSERT INTO public.reflections(id,owner_id,entry_id,entry_revision,voice,letter,actions,provenance,context_ids)
 VALUES(j.id,j.owner_id,j.entry_id,j.entry_revision,j.voice,p_output->'letter',v_actions,p_output->'provenance',p_context_ids);
 UPDATE private.reflection_jobs SET status='completed',lease_token=NULL,lease_until=NULL WHERE id=p_id;
 RETURN true;
END;
$$;
CREATE FUNCTION public.reflection_retry(p_id uuid,p_lease_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE private.reflection_jobs SET status=CASE WHEN attempts>=5 THEN 'failed' ELSE 'pending' END,lease_token=NULL,lease_until=NULL,
 next_attempt_at=clock_timestamp()+make_interval(secs=>LEAST(3600,30*(2^LEAST(attempts,6))::integer))
 WHERE id=p_id AND status='pending' AND lease_token=p_lease_token AND lease_until>clock_timestamp();
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION private.reflection_resource(public.reflections),private.next_morning(timestamptz,text,text),private.reflection_remove(uuid),private.invalidate_entry_reflection(),private.invalidate_memory_context() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.reflection_request(uuid,integer),public.reflection_list(integer,timestamptz,uuid),public.reflection_get(uuid),public.reflection_cancel(uuid),public.reflection_correct(uuid,text,integer),public.reflection_decide(uuid,uuid,text),public.reflection_claim(integer),public.reflection_input(uuid,uuid),public.reflection_finish(uuid,uuid,jsonb,uuid[]),public.reflection_retry(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.reflection_request(uuid,integer),public.reflection_list(integer,timestamptz,uuid),public.reflection_get(uuid),public.reflection_cancel(uuid),public.reflection_correct(uuid,text,integer),public.reflection_decide(uuid,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reflection_claim(integer),public.reflection_input(uuid,uuid),public.reflection_finish(uuid,uuid,jsonb,uuid[]),public.reflection_retry(uuid,uuid) TO service_role;
ALTER FUNCTION public.account_export_page(text,integer,timestamptz,uuid) SET SCHEMA private;
ALTER FUNCTION private.account_export_page(text,integer,timestamptz,uuid) RENAME TO reflection_base_export;
REVOKE ALL ON FUNCTION private.reflection_base_export(text,integer,timestamptz,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.account_export_page(p_section text,p_limit integer,p_before_created_at timestamptz,p_before_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_section IS DISTINCT FROM 'reflections' THEN RETURN private.reflection_base_export(p_section,p_limit,p_before_created_at,p_before_id); END IF;
 PERFORM private.writing_active_uid();
 IF NOT private.export_recent_signin() THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 51 OR (p_before_created_at IS NOT NULL AND extract(year FROM p_before_created_at)<1) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 RETURN jsonb_build_object('format_version',1,'exported_at',to_char(clock_timestamp() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'section','reflections','items',public.reflection_list(p_limit,p_before_created_at,p_before_id));
END;
$$;
REVOKE ALL ON FUNCTION public.account_export_page(text,integer,timestamptz,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.account_export_page(text,integer,timestamptz,uuid) TO authenticated;
ALTER FUNCTION public.api_schema_ready() SET SCHEMA private;
ALTER FUNCTION private.api_schema_ready() RENAME TO reflection_base_ready;
REVOKE ALL ON FUNCTION private.reflection_base_ready() FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.api_schema_ready() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.reflection_base_ready()
 AND EXISTS(SELECT 1 FROM pg_class WHERE oid='public.reflections'::regclass AND relrowsecurity)
 AND EXISTS(SELECT 1 FROM pg_class WHERE oid='private.reflection_jobs'::regclass AND relrowsecurity)
 AND NOT has_table_privilege('authenticated','private.reflection_jobs','SELECT')
 AND NOT has_table_privilege('authenticated','public.reflections','INSERT,UPDATE,DELETE')
 AND NOT has_column_privilege('authenticated','public.reflections','context_ids','SELECT')
 AND EXISTS(SELECT 1 FROM pg_policy WHERE polrelid='public.reflections'::regclass AND pg_get_expr(polqual,polrelid) LIKE '%account_session_active()%')
 AND (SELECT count(*)=3 FROM pg_trigger WHERE tgname IN ('entry_reflection_invalidation','memories_reflection_invalidation','settings_reflection_invalidation') AND NOT tgisinternal AND tgenabled='O')
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.reflection_claim(integer)'),('public.reflection_input(uuid,uuid)'),('public.reflection_finish(uuid,uuid,jsonb,uuid[])'),('public.reflection_retry(uuid,uuid)')) required(signature)
 LEFT JOIN pg_proc p ON p.oid=to_regprocedure(signature) WHERE p.oid IS NULL OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
 OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE'))
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.reflection_request(uuid,integer)'),('public.reflection_list(integer,timestamptz,uuid)'),('public.reflection_get(uuid)'),('public.reflection_cancel(uuid)'),('public.reflection_correct(uuid,text,integer)'),('public.reflection_decide(uuid,uuid,text)')) required(signature)
 LEFT JOIN pg_proc p ON p.oid=to_regprocedure(signature) WHERE p.oid IS NULL OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
 OR NOT has_function_privilege('authenticated',p.oid,'EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE'));
$$;
REVOKE ALL ON FUNCTION public.api_schema_ready() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.api_schema_ready() TO anon,authenticated;
