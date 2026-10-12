-- Product data only. AI, reflection scheduling and voice remain disabled.
CREATE FUNCTION private.product_text_valid(p_text text) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT private.writing_text_valid(p_text) AND COALESCE((SELECT sum(CASE WHEN ascii(c)>65535 THEN 2 ELSE 1 END) FROM unnest(string_to_array(p_text,NULL)) c),0) <= 2000;
$$;
REVOKE ALL ON FUNCTION private.product_text_valid(text) FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE public.user_settings (
  owner_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  timezone text NOT NULL DEFAULT 'Etc/UTC',
  morning_time text NOT NULL DEFAULT '07:30' CHECK (morning_time IN ('07:00','07:30','08:00')),
  voice text NOT NULL DEFAULT 'friend' CHECK (voice IN ('friend','mentor','future','diary')),
  memory_paused boolean NOT NULL DEFAULT false,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.approved_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  text text,
  source_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  original_payload jsonb,
  created_at timestamptz,
  deleted_at timestamptz,
  UNIQUE (owner_id, idempotency_key),
  CHECK (CASE WHEN deleted_at IS NULL THEN
    private.product_text_valid(text)
    AND original_payload IS NOT NULL AND created_at IS NOT NULL AND isfinite(created_at)
  ELSE text IS NULL AND source_entry_id IS NULL AND original_payload IS NULL AND created_at IS NULL AND isfinite(deleted_at) END)
);
CREATE TABLE public.todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  title text,
  original_title text,
  completed boolean,
  revision integer,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  UNIQUE (owner_id, idempotency_key),
  CHECK (CASE WHEN deleted_at IS NULL THEN
    private.product_text_valid(title)
    AND private.product_text_valid(original_title)
    AND completed IS NOT NULL AND revision IS NOT NULL AND revision > 0
    AND created_at IS NOT NULL AND updated_at IS NOT NULL AND isfinite(created_at) AND isfinite(updated_at)
  ELSE title IS NULL AND original_title IS NULL AND completed IS NULL AND revision IS NULL
    AND created_at IS NULL AND updated_at IS NULL AND isfinite(deleted_at) END)
);
CREATE INDEX memories_live_page ON public.approved_memories(owner_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
CREATE INDEX todos_live_page ON public.todos(owner_id, created_at DESC, id DESC) WHERE deleted_at IS NULL;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approved_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_settings, public.approved_memories, public.todos FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT (owner_id, timezone, morning_time, voice, memory_paused, revision, updated_at) ON public.user_settings TO authenticated;
GRANT SELECT (id, owner_id, text, source_entry_id, created_at) ON public.approved_memories TO authenticated;
GRANT SELECT (id, owner_id, title, completed, revision, created_at, updated_at) ON public.todos TO authenticated;
CREATE POLICY settings_read_own_active ON public.user_settings FOR SELECT TO authenticated
USING (owner_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = owner_id AND p.status = 'active'));
CREATE POLICY memories_read_own_active ON public.approved_memories FOR SELECT TO authenticated
USING (owner_id = (SELECT auth.uid()) AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = owner_id AND p.status = 'active'));
CREATE POLICY todos_read_own_active ON public.todos FOR SELECT TO authenticated
USING (owner_id = (SELECT auth.uid()) AND deleted_at IS NULL AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = owner_id AND p.status = 'active'));

CREATE FUNCTION private.settings_resource(p public.user_settings) RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT jsonb_build_object('timezone',p.timezone,'morning_time',p.morning_time,'voice',p.voice,'memory_paused',p.memory_paused,
 'reflection_enabled',false,'revision',p.revision,'updated_at',to_char(p.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
$$;
CREATE FUNCTION private.memory_resource(p public.approved_memories) RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT jsonb_build_object('id',p.id,'text',p.text,'source_entry_id',p.source_entry_id,'created_at',to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
$$;
CREATE FUNCTION private.todo_resource(p public.todos) RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT jsonb_build_object('id',p.id,'title',p.title,'completed',p.completed,'revision',p.revision,
 'created_at',to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'updated_at',to_char(p.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
$$;
CREATE FUNCTION public.settings_get() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.user_settings;
BEGIN
 INSERT INTO public.user_settings(owner_id) VALUES (v_uid) ON CONFLICT DO NOTHING;
 SELECT * INTO v_row FROM public.user_settings WHERE owner_id = v_uid;
 RETURN private.settings_resource(v_row);
END;
$$;
CREATE FUNCTION public.settings_update(p_patch jsonb, p_expected_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.user_settings;
BEGIN
 IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb
 OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k NOT IN ('timezone','morning_time','voice','memory_paused'))
 OR p_expected_revision IS NULL OR p_expected_revision < 1 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'timezone' AND (jsonb_typeof(p_patch->'timezone') <> 'string'
 OR length(p_patch->>'timezone') > 100 OR (p_patch->>'timezone') !~ '^(UTC|[A-Za-z_]+(/[A-Za-z0-9_+\-]+)+)$'
 OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = p_patch->>'timezone')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'morning_time' AND (jsonb_typeof(p_patch->'morning_time') <> 'string' OR (p_patch->>'morning_time') NOT IN ('07:00','07:30','08:00')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'voice' AND (jsonb_typeof(p_patch->'voice') <> 'string' OR (p_patch->>'voice') NOT IN ('friend','mentor','future','diary')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'memory_paused' AND jsonb_typeof(p_patch->'memory_paused') <> 'boolean' THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 INSERT INTO public.user_settings(owner_id) VALUES (v_uid) ON CONFLICT DO NOTHING;
 SELECT * INTO v_row FROM public.user_settings WHERE owner_id = v_uid FOR UPDATE;
 IF v_row.revision <> p_expected_revision OR v_row.revision = 2147483647 THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 UPDATE public.user_settings SET timezone=COALESCE(p_patch->>'timezone',timezone), morning_time=COALESCE(p_patch->>'morning_time',morning_time),
 voice=COALESCE(p_patch->>'voice',voice),memory_paused=COALESCE((p_patch->>'memory_paused')::boolean,memory_paused),
 revision=revision+1,updated_at=clock_timestamp() WHERE owner_id=v_uid RETURNING * INTO v_row;
 RETURN private.settings_resource(v_row);
END;
$$;
CREATE FUNCTION public.memory_create(p_text text, p_source_entry_id uuid, p_approved boolean, p_idempotency_key uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.approved_memories; v_payload jsonb;
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
 INSERT INTO public.approved_memories(owner_id,idempotency_key,text,source_entry_id,original_payload,created_at)
 VALUES(v_uid,p_idempotency_key,p_text,p_source_entry_id,v_payload,clock_timestamp()) ON CONFLICT DO NOTHING RETURNING * INTO v_row;
 IF NOT FOUND THEN
  SELECT * INTO v_row FROM public.approved_memories WHERE owner_id=v_uid AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF NOT FOUND OR v_row.deleted_at IS NOT NULL OR convert_to(v_row.original_payload::text,'UTF8') <> convert_to(v_payload::text,'UTF8') THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 END IF;
 RETURN private.memory_resource(v_row);
END;
$$;
CREATE FUNCTION public.todo_create(p_title text, p_idempotency_key uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.todos; v_now timestamptz := clock_timestamp();
BEGIN
 IF NOT private.product_text_valid(p_title) OR p_idempotency_key IS NULL THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 INSERT INTO public.todos(owner_id,idempotency_key,title,original_title,completed,revision,created_at,updated_at)
 VALUES(v_uid,p_idempotency_key,p_title,p_title,false,1,v_now,v_now) ON CONFLICT DO NOTHING RETURNING * INTO v_row;
 IF NOT FOUND THEN
  SELECT * INTO v_row FROM public.todos WHERE owner_id=v_uid AND idempotency_key=p_idempotency_key FOR UPDATE;
  IF NOT FOUND OR v_row.deleted_at IS NOT NULL OR convert_to(v_row.original_title,'UTF8') <> convert_to(p_title,'UTF8') THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 END IF;
 RETURN private.todo_resource(v_row);
END;
$$;
CREATE FUNCTION public.todo_update(p_id uuid,p_patch jsonb,p_expected_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.todos;
BEGIN
 IF p_id IS NULL OR p_patch IS NULL OR jsonb_typeof(p_patch)<>'object' OR p_patch='{}'::jsonb
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k NOT IN ('title','completed')) OR p_expected_revision IS NULL OR p_expected_revision<1 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'title' AND (jsonb_typeof(p_patch->'title')<>'string' OR NOT private.product_text_valid(p_patch->>'title')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'completed' AND jsonb_typeof(p_patch->'completed')<>'boolean' THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT * INTO v_row FROM public.todos WHERE id=p_id AND owner_id=v_uid AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 IF v_row.revision<>p_expected_revision OR v_row.revision=2147483647 THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 UPDATE public.todos SET title=COALESCE(p_patch->>'title',title),completed=COALESCE((p_patch->>'completed')::boolean,completed),revision=revision+1,updated_at=clock_timestamp()
 WHERE id=p_id RETURNING * INTO v_row;
 RETURN private.todo_resource(v_row);
END;
$$;
CREATE FUNCTION public.product_get(p_kind text,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_result jsonb;
BEGIN
 IF p_id IS NULL THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_kind='memories' THEN SELECT private.memory_resource(m) INTO v_result FROM public.approved_memories m WHERE id=p_id AND owner_id=v_uid AND deleted_at IS NULL;
 ELSIF p_kind='todos' THEN SELECT private.todo_resource(t) INTO v_result FROM public.todos t WHERE id=p_id AND owner_id=v_uid AND deleted_at IS NULL;
 ELSE RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF v_result IS NULL THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 RETURN v_result;
END;
$$;
CREATE FUNCTION public.product_delete(p_kind text,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_id uuid;
BEGIN
 IF p_id IS NULL THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_kind='memories' THEN
 UPDATE public.approved_memories SET text=NULL,source_entry_id=NULL,original_payload=NULL,created_at=NULL,deleted_at=clock_timestamp()
 WHERE id=p_id AND owner_id=v_uid AND deleted_at IS NULL RETURNING id INTO v_id;
 ELSIF p_kind='todos' THEN
 UPDATE public.todos SET title=NULL,original_title=NULL,completed=NULL,revision=NULL,created_at=NULL,updated_at=NULL,deleted_at=clock_timestamp()
 WHERE id=p_id AND owner_id=v_uid AND deleted_at IS NULL RETURNING id INTO v_id;
 ELSE RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF v_id IS NULL THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 RETURN jsonb_build_object('id',v_id);
END;
$$;
CREATE FUNCTION public.product_list(p_kind text,p_limit integer DEFAULT 20,p_before_created_at timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_table text; v_function text; v_result jsonb;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 101 OR (p_before_created_at IS NULL)<>(p_before_id IS NULL)
 OR (p_before_created_at IS NOT NULL AND NOT isfinite(p_before_created_at)) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_kind='memories' THEN v_table:='approved_memories';v_function:='memory_resource';
 ELSIF p_kind='todos' THEN v_table:='todos';v_function:='todo_resource'; ELSE RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 EXECUTE format('SELECT COALESCE(jsonb_agg(private.%I(p.row) ORDER BY p.created_at DESC,p.id DESC),''[]''::jsonb) FROM
 (SELECT t AS row,t.created_at,t.id FROM public.%I t WHERE owner_id=$1 AND deleted_at IS NULL
 AND ($2 IS NULL OR (created_at,id)<($2,$3)) ORDER BY created_at DESC,id DESC LIMIT $4) p',v_function,v_table)
 INTO v_result USING v_uid,p_before_created_at,p_before_id,p_limit;
 RETURN v_result;
END;
$$;
CREATE FUNCTION private.memory_source_deleted() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
 UPDATE public.approved_memories SET text=NULL,source_entry_id=NULL,original_payload=NULL,created_at=NULL,deleted_at=NEW.deleted_at
 WHERE source_entry_id=NEW.id AND deleted_at IS NULL;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER scrub_source_memories AFTER UPDATE OF deleted_at ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION private.memory_source_deleted();
REVOKE ALL ON FUNCTION private.settings_resource(public.user_settings),private.memory_resource(public.approved_memories),private.todo_resource(public.todos),private.memory_source_deleted() FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.settings_get(),public.settings_update(jsonb,integer),public.memory_create(text,uuid,boolean,uuid),public.todo_create(text,uuid),public.todo_update(uuid,jsonb,integer),public.product_get(text,uuid),public.product_delete(text,uuid),public.product_list(text,integer,timestamptz,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.settings_get(),public.settings_update(jsonb,integer),public.memory_create(text,uuid,boolean,uuid),public.todo_create(text,uuid),public.todo_update(uuid,jsonb,integer),public.product_get(text,uuid),public.product_delete(text,uuid),public.product_list(text,integer,timestamptz,uuid) TO authenticated;
