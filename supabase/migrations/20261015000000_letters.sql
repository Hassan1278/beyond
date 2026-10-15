-- Letters: one sealed night -> one morning letter, written by the independent AI
-- service right after sealing and shown at the person's chosen time.
-- Replaces the earlier per-entry reflection workflow (never used in production).

-- ---------------------------------------------------------------- remove old
DROP TRIGGER IF EXISTS entry_reflection_invalidation ON public.journal_entries;
DROP TRIGGER IF EXISTS memories_reflection_invalidation ON public.approved_memories;
DROP TRIGGER IF EXISTS settings_reflection_invalidation ON public.user_settings;
DROP FUNCTION public.reflection_request(uuid,integer);
DROP FUNCTION public.reflection_list(integer,timestamptz,uuid);
DROP FUNCTION public.reflection_get(uuid);
DROP FUNCTION public.reflection_cancel(uuid);
DROP FUNCTION public.reflection_correct(uuid,text,integer);
DROP FUNCTION public.reflection_decide(uuid,uuid,text);
DROP FUNCTION public.reflection_claim(integer);
DROP FUNCTION public.reflection_input(uuid,uuid);
DROP FUNCTION public.reflection_finish(uuid,uuid,jsonb,uuid[]);
DROP FUNCTION public.reflection_retry(uuid,uuid);
DROP FUNCTION private.reflection_remove(uuid);
DROP FUNCTION private.invalidate_entry_reflection();
DROP FUNCTION private.invalidate_memory_context();
DROP FUNCTION private.reflection_resource(public.reflections);
DROP FUNCTION private.next_morning(timestamptz,text,text);
DROP INDEX public.todos_reflection_action;
ALTER TABLE public.todos DROP COLUMN source_reflection_id, DROP COLUMN source_action_id;
DROP TABLE public.reflections;
DROP TABLE private.reflection_jobs;
ALTER FUNCTION private.reflection_base_ready() RENAME TO core_schema_ready;
ALTER FUNCTION private.reflection_base_export(text,integer,timestamptz,uuid) RENAME TO export_base_section;

-- ---------------------------------------------------------------- settings
ALTER TABLE public.user_settings
  ADD COLUMN letter_language text NOT NULL DEFAULT 'auto' CHECK (letter_language IN ('auto','en','zh-hant','zh-hans')),
  ADD COLUMN delivery_time text NOT NULL DEFAULT '08:00' CHECK (delivery_time ~ '^(0[5-9]|1[0-2]):(00|15|30|45)$'),
  ADD COLUMN allow_early boolean NOT NULL DEFAULT true,
  ADD COLUMN onboarded boolean NOT NULL DEFAULT false,
  ADD COLUMN directions jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(directions)='object'),
  -- Hashes of memories the person told Beyond to forget, so letters never relearn them.
  ADD COLUMN forgotten_hashes text[] NOT NULL DEFAULT '{}' CHECK (cardinality(forgotten_hashes)<=200);
GRANT SELECT (letter_language, delivery_time, allow_early, onboarded, directions) ON public.user_settings TO authenticated;

CREATE OR REPLACE FUNCTION private.settings_resource(p public.user_settings) RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT jsonb_build_object('timezone',p.timezone,'morning_time',p.morning_time,'voice',p.voice,'memory_paused',p.memory_paused,
 'reflection_enabled',false,'letter_language',p.letter_language,'delivery_time',p.delivery_time,'allow_early',p.allow_early,
 'onboarded',p.onboarded,'directions',p.directions,
 'revision',p.revision,'updated_at',to_char(p.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
$$;

CREATE OR REPLACE FUNCTION public.settings_update(p_patch jsonb, p_expected_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.user_settings; v_dirs jsonb;
BEGIN
 IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb
 OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k NOT IN ('timezone','morning_time','voice','memory_paused','letter_language','delivery_time','allow_early','onboarded','directions'))
 OR p_expected_revision IS NULL OR p_expected_revision < 1 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'timezone' AND (jsonb_typeof(p_patch->'timezone') <> 'string'
 OR length(p_patch->>'timezone') > 100 OR (p_patch->>'timezone') !~ '^(UTC|[A-Za-z_]+(/[A-Za-z0-9_+\-]+)+)$'
 OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = p_patch->>'timezone')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'morning_time' AND (jsonb_typeof(p_patch->'morning_time') <> 'string' OR (p_patch->>'morning_time') NOT IN ('07:00','07:30','08:00')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'voice' AND (jsonb_typeof(p_patch->'voice') <> 'string' OR (p_patch->>'voice') NOT IN ('friend','mentor','future','diary')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'letter_language' AND (jsonb_typeof(p_patch->'letter_language') <> 'string' OR (p_patch->>'letter_language') NOT IN ('auto','en','zh-hant','zh-hans')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'delivery_time' AND (jsonb_typeof(p_patch->'delivery_time') <> 'string' OR (p_patch->>'delivery_time') !~ '^(0[5-9]|1[0-2]):(00|15|30|45)$') THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF EXISTS (SELECT 1 FROM unnest(ARRAY['memory_paused','allow_early','onboarded']) k WHERE p_patch ? k AND jsonb_typeof(p_patch->k) <> 'boolean') THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'directions' THEN
  v_dirs := p_patch->'directions';
  IF jsonb_typeof(v_dirs) <> 'object' OR EXISTS (SELECT 1 FROM jsonb_each(v_dirs) d
   WHERE d.key NOT IN ('young-entrepreneur','maker-builder','creative-explorer','curious-learner','community-builder','world-explorer')
   OR jsonb_typeof(d.value) <> 'string' OR (d.value #>> '{}') NOT IN ('suggested','confirmed','dismissed','removed')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 END IF;
 INSERT INTO public.user_settings(owner_id) VALUES (v_uid) ON CONFLICT DO NOTHING;
 SELECT * INTO v_row FROM public.user_settings WHERE owner_id = v_uid FOR UPDATE;
 IF v_row.revision <> p_expected_revision OR v_row.revision = 2147483647 THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 UPDATE public.user_settings SET timezone=COALESCE(p_patch->>'timezone',timezone), morning_time=COALESCE(p_patch->>'morning_time',morning_time),
 voice=COALESCE(p_patch->>'voice',voice),memory_paused=COALESCE((p_patch->>'memory_paused')::boolean,memory_paused),
 letter_language=COALESCE(p_patch->>'letter_language',letter_language),delivery_time=COALESCE(p_patch->>'delivery_time',delivery_time),
 allow_early=COALESCE((p_patch->>'allow_early')::boolean,allow_early),onboarded=COALESCE((p_patch->>'onboarded')::boolean,onboarded),
 directions=COALESCE(p_patch->'directions',directions),
 revision=revision+1,updated_at=clock_timestamp() WHERE owner_id=v_uid RETURNING * INTO v_row;
 RETURN private.settings_resource(v_row);
END;
$$;

-- ---------------------------------------------------------------- memories
ALTER TABLE public.approved_memories ADD COLUMN kind text NOT NULL DEFAULT 'told' CHECK (kind IN ('told','learned','edited'));
GRANT SELECT (kind) ON public.approved_memories TO authenticated;

CREATE FUNCTION private.memory_hash(p_text text) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT encode(sha256(convert_to(btrim(regexp_replace(lower(COALESCE(p_text,'')),'[[:space:].。,，!！?？]+',' ','g')),'UTF8')),'hex');
$$;
REVOKE ALL ON FUNCTION private.memory_hash(text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.memory_resource(p public.approved_memories) RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT jsonb_build_object('id',p.id,'text',p.text,'source_entry_id',p.source_entry_id,'kind',p.kind,
 'revision',p.revision,'created_at',to_char(p.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
 'updated_at',to_char(p.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
$$;

CREATE OR REPLACE FUNCTION public.memory_update(p_id uuid, p_text text, p_approved boolean, p_expected_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.approved_memories;
BEGIN
 IF p_id IS NULL OR NOT private.product_text_valid(p_text) OR p_approved IS DISTINCT FROM true
 OR p_expected_revision IS NULL OR p_expected_revision<1 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT * INTO v_row FROM public.approved_memories WHERE id=p_id AND owner_id=v_uid AND deleted_at IS NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 IF v_row.revision<>p_expected_revision OR v_row.revision=2147483647 THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 UPDATE public.approved_memories SET text=p_text,kind=CASE WHEN kind='learned' THEN 'edited' ELSE kind END,
 revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_row;
 RETURN private.memory_resource(v_row);
END;
$$;

-- A memory the person forgets (not a whole-account clear) is never learned again.
CREATE FUNCTION private.memory_forgotten() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL AND OLD.text IS NOT NULL
 AND current_setting('beyond.clearing', true) IS DISTINCT FROM 'on'
 -- Removing a whole night removes what was learned from it without blocking it forever.
 AND NOT EXISTS(SELECT 1 FROM public.journal_entries e WHERE e.id=OLD.source_entry_id AND e.deleted_at IS NOT NULL) THEN
  UPDATE public.user_settings SET forgotten_hashes=(SELECT COALESCE(array_agg(h ORDER BY o),'{}') FROM (
   SELECT h, o FROM unnest(array_append(array_remove(forgotten_hashes, private.memory_hash(OLD.text)), private.memory_hash(OLD.text))) WITH ORDINALITY u(h,o)
   ORDER BY o DESC LIMIT 200) t)
  WHERE owner_id=OLD.owner_id;
 END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER memory_forgotten AFTER UPDATE OF deleted_at ON public.approved_memories FOR EACH ROW EXECUTE FUNCTION private.memory_forgotten();

-- ---------------------------------------------------------------- letters
CREATE TABLE public.letters (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 entry_id uuid NOT NULL UNIQUE REFERENCES public.journal_entries(id) ON DELETE CASCADE,
 entry_revision integer NOT NULL CHECK (entry_revision>0),
 journal_date date NOT NULL,
 voice text NOT NULL CHECK (voice IN ('friend','mentor','future','diary')),
 language text NOT NULL CHECK (language IN ('auto','en','zh-hant','zh-hans')),
 status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','ready','failed')),
 content jsonb, model text CHECK (model IS NULL OR model ~ '^[A-Za-z0-9_.:/-]{1,100}$'),
 written_at timestamptz,
 deliver_at timestamptz NOT NULL CHECK (isfinite(deliver_at)),
 read_at timestamptz, early boolean NOT NULL DEFAULT false, private boolean NOT NULL DEFAULT false,
 steps jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(steps)='object'),
 error text CHECK (error IS NULL OR error IN ('unavailable','invalid_output','refused')),
 revision integer NOT NULL DEFAULT 1 CHECK (revision>0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT letters_ready_content CHECK ((status='ready') = (content IS NOT NULL AND jsonb_typeof(content)='object' AND written_at IS NOT NULL)),
 CONSTRAINT letters_failed_error CHECK ((status='failed') = (error IS NOT NULL))
);
CREATE INDEX letters_owner_page ON public.letters(owner_id, created_at DESC, id DESC);
CREATE TABLE private.letter_jobs (
 letter_id uuid PRIMARY KEY REFERENCES public.letters(id) ON DELETE CASCADE,
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 6),
 next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 lease_token uuid, lease_until timestamptz,
 CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);
CREATE INDEX letter_jobs_due ON private.letter_jobs(next_attempt_at);
CREATE INDEX letter_jobs_owner ON private.letter_jobs(owner_id);
CREATE TABLE public.letter_notes (
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 key text NOT NULL CHECK (key ~ '^([0-9]{4}-(0[1-9]|1[0-2])|Y[0-9]{4})$'),
 text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 2000),
 letter_count integer NOT NULL CHECK (letter_count BETWEEN 1 AND 400),
 model text CHECK (model IS NULL OR model ~ '^[A-Za-z0-9_.:/-]{1,100}$'),
 source_ids uuid[] NOT NULL CHECK (cardinality(source_ids) BETWEEN 1 AND 400),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY (owner_id, key)
);
CREATE TABLE private.ai_daily_usage (
 owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 day date NOT NULL, kind text NOT NULL CHECK (kind IN ('letter','note','transcribe')),
 used integer NOT NULL DEFAULT 0 CHECK (used>=0),
 PRIMARY KEY (owner_id, day, kind)
);
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.letter_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.letter_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.ai_daily_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.letters, public.letter_notes FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON private.letter_jobs, private.ai_daily_usage FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT (id,owner_id,entry_id,journal_date,voice,language,status,content,model,written_at,deliver_at,read_at,early,private,steps,error,revision,created_at,updated_at) ON public.letters TO authenticated;
GRANT SELECT (owner_id,key,text,letter_count,model,created_at) ON public.letter_notes TO authenticated;
CREATE POLICY letters_read_own_active ON public.letters FOR SELECT TO authenticated USING (
 owner_id=(SELECT auth.uid()) AND (SELECT public.account_session_active()) AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=owner_id AND p.status='active'));
CREATE POLICY notes_read_own_active ON public.letter_notes FOR SELECT TO authenticated USING (
 owner_id=(SELECT auth.uid()) AND (SELECT public.account_session_active()) AND EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=owner_id AND p.status='active'));

CREATE FUNCTION private.ts(p timestamptz) RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT to_char(p AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
$$;
REVOKE ALL ON FUNCTION private.ts(timestamptz) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.letter_resource(p public.letters) RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT jsonb_build_object('id',p.id,'entry_id',p.entry_id,'journal_date',to_char(p.journal_date,'YYYY-MM-DD'),
 'voice',p.voice,'language',p.language,'status',p.status,'content',p.content,'model',p.model,
 'written_at',private.ts(p.written_at),'deliver_at',private.ts(p.deliver_at),'read_at',private.ts(p.read_at),
 'early',p.early,'private',p.private,'steps',p.steps,'error',p.error,'revision',p.revision,
 'created_at',private.ts(p.created_at),'updated_at',private.ts(p.updated_at),
 'entry',(SELECT jsonb_build_object('id',e.id,'text',e.text,'created_at',private.ts(e.created_at))
   FROM public.journal_entries e WHERE e.id=p.entry_id AND e.deleted_at IS NULL));
$$;
REVOKE ALL ON FUNCTION private.letter_resource(public.letters) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION private.note_resource(p public.letter_notes) RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT jsonb_build_object('key',p.key,'text',p.text,'letter_count',p.letter_count,'model',p.model,'created_at',private.ts(p.created_at));
$$;
REVOKE ALL ON FUNCTION private.note_resource(public.letter_notes) FROM PUBLIC,anon,authenticated,service_role;

-- Daily AI allowance per person. Raises rate_limited when spent.
CREATE FUNCTION private.ai_take(p_uid uuid, p_kind text) RETURNS void LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE v_cap integer := CASE p_kind WHEN 'letter' THEN 6 WHEN 'note' THEN 10 WHEN 'transcribe' THEN 40 END; v_used integer;
BEGIN
 IF v_cap IS NULL THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 INSERT INTO private.ai_daily_usage(owner_id,day,kind,used) VALUES(p_uid,(clock_timestamp() AT TIME ZONE 'UTC')::date,p_kind,1)
 ON CONFLICT (owner_id,day,kind) DO UPDATE SET used=private.ai_daily_usage.used+1 RETURNING used INTO v_used;
 IF v_used>v_cap THEN RAISE EXCEPTION USING MESSAGE='rate_limited'; END IF;
 DELETE FROM private.ai_daily_usage WHERE owner_id=p_uid AND day<(clock_timestamp() AT TIME ZONE 'UTC')::date-2;
END;
$$;
REVOKE ALL ON FUNCTION private.ai_take(uuid,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.ai_spend(p_kind text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid();
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('note','transcribe') THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 PERFORM private.ai_take(v_uid,p_kind);
 RETURN true;
END;
$$;

-- Seal: ask for a letter about one saved entry. This is the explicit consent.
CREATE FUNCTION public.letter_request(p_entry_id uuid, p_expected_revision integer, p_journal_date date, p_deliver_at timestamptz) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); e public.journal_entries; s public.user_settings; v_row public.letters; v_now timestamptz := clock_timestamp();
BEGIN
 IF p_entry_id IS NULL OR p_expected_revision IS NULL OR p_journal_date IS NULL OR p_deliver_at IS NULL OR NOT isfinite(p_deliver_at)
 OR p_journal_date NOT BETWEEN (v_now AT TIME ZONE 'UTC')::date-2 AND (v_now AT TIME ZONE 'UTC')::date+1
 OR p_deliver_at NOT BETWEEN v_now-interval '2 days' AND v_now+interval '3 days' THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT * INTO e FROM public.journal_entries WHERE id=p_entry_id AND owner_id=v_uid AND deleted_at IS NULL FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 IF e.revision<>p_expected_revision THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 SELECT * INTO v_row FROM public.letters WHERE entry_id=e.id FOR UPDATE;
 IF FOUND THEN
  IF v_row.entry_revision<>e.revision THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
  RETURN private.letter_resource(v_row);
 END IF;
 PERFORM public.settings_get(); SELECT * INTO s FROM public.user_settings WHERE owner_id=v_uid;
 PERFORM private.ai_take(v_uid,'letter');
 INSERT INTO public.letters(owner_id,entry_id,entry_revision,journal_date,voice,language,deliver_at)
 VALUES(v_uid,e.id,e.revision,p_journal_date,s.voice,s.letter_language,p_deliver_at) RETURNING * INTO v_row;
 INSERT INTO private.letter_jobs(letter_id,owner_id) VALUES(v_row.id,v_uid);
 RETURN private.letter_resource(v_row);
END;
$$;

CREATE FUNCTION public.letter_list(p_limit integer, p_before_created_at timestamptz, p_before_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_result jsonb;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 101 OR (p_before_created_at IS NULL)<>(p_before_id IS NULL)
 OR (p_before_created_at IS NOT NULL AND NOT isfinite(p_before_created_at)) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT COALESCE(jsonb_agg(private.letter_resource(l) ORDER BY l.created_at DESC,l.id DESC),'[]'::jsonb) INTO v_result
 FROM (SELECT * FROM public.letters WHERE owner_id=v_uid AND (p_before_created_at IS NULL OR (created_at,id)<(p_before_created_at,p_before_id))
 ORDER BY created_at DESC,id DESC LIMIT p_limit) l;
 RETURN v_result;
END;
$$;

CREATE FUNCTION public.letter_get(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.letters;
BEGIN
 SELECT * INTO v_row FROM public.letters WHERE id=p_id AND owner_id=v_uid;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 RETURN private.letter_resource(v_row);
END;
$$;

-- What the person does with a letter: open it, open it early, keep it out of
-- Patterns, tick or skip its to-dos, or move a still-sealed letter's time.
CREATE FUNCTION public.letter_update(p_id uuid, p_patch jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.letters; v_now timestamptz := clock_timestamp(); v_allow boolean; v_steps jsonb; v_at timestamptz;
BEGIN
 IF p_id IS NULL OR p_patch IS NULL OR jsonb_typeof(p_patch)<>'object' OR p_patch='{}'::jsonb
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k NOT IN ('read','early','private','steps','deliver_at')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'read' AND p_patch->'read' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'early' AND p_patch->'early' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'private' AND jsonb_typeof(p_patch->'private')<>'boolean' THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'steps' THEN
  v_steps := p_patch->'steps';
  IF jsonb_typeof(v_steps)<>'object' OR EXISTS(SELECT 1 FROM jsonb_each(v_steps) s WHERE s.key NOT IN ('step.0','step.1','step.2')
   OR jsonb_typeof(s.value)<>'string' OR (s.value #>> '{}') NOT IN ('tried','skipped')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 END IF;
 IF p_patch ? 'deliver_at' THEN
  BEGIN v_at := (p_patch->>'deliver_at')::timestamptz; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END;
  IF jsonb_typeof(p_patch->'deliver_at')<>'string' OR v_at IS NULL OR NOT isfinite(v_at) OR v_at NOT BETWEEN v_now-interval '2 days' AND v_now+interval '3 days' THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 END IF;
 SELECT * INTO v_row FROM public.letters WHERE id=p_id AND owner_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 IF p_patch ? 'early' AND NOT v_row.early THEN
  SELECT allow_early INTO v_allow FROM public.user_settings WHERE owner_id=v_uid;
  IF v_allow IS FALSE THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 END IF;
 IF (p_patch ? 'read' OR p_patch ? 'steps' OR p_patch ? 'private') AND v_row.status<>'ready' THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 IF p_patch ? 'deliver_at' AND (v_row.read_at IS NOT NULL OR (v_row.status='ready' AND (v_row.early OR v_row.deliver_at<=v_now))) THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 IF v_row.revision=2147483647 THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 UPDATE public.letters SET
  read_at=CASE WHEN p_patch ? 'read' THEN COALESCE(read_at,v_now) ELSE read_at END,
  early=early OR p_patch ? 'early',
  private=COALESCE((p_patch->>'private')::boolean,private),
  steps=COALESCE(v_steps,steps),
  deliver_at=COALESCE(v_at,deliver_at),
  revision=revision+1, updated_at=v_now
 WHERE id=p_id RETURNING * INTO v_row;
 RETURN private.letter_resource(v_row);
END;
$$;

-- Try a failed letter again (the person asked; it counts as a new letter today).
CREATE FUNCTION public.letter_retry(p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.letters;
BEGIN
 SELECT * INTO v_row FROM public.letters WHERE id=p_id AND owner_id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='not_found'; END IF;
 IF v_row.status<>'failed' THEN RETURN private.letter_resource(v_row); END IF;
 PERFORM private.ai_take(v_uid,'letter');
 UPDATE public.letters SET status='queued',error=NULL,revision=revision+1,updated_at=clock_timestamp() WHERE id=p_id RETURNING * INTO v_row;
 INSERT INTO private.letter_jobs(letter_id,owner_id) VALUES(p_id,v_uid)
 ON CONFLICT (letter_id) DO UPDATE SET attempts=0,next_attempt_at=clock_timestamp(),lease_token=NULL,lease_until=NULL;
 RETURN private.letter_resource(v_row);
END;
$$;

-- Patterns notes: the letters a month (YYYY-MM) or year (Y2026) note may read.
CREATE FUNCTION public.note_input(p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); s public.user_settings; v_from date; v_to date; v_rows jsonb; v_now timestamptz := clock_timestamp();
BEGIN
 IF p_key IS NULL OR p_key !~ '^([0-9]{4}-(0[1-9]|1[0-2])|Y[0-9]{4})$' THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF left(p_key,1)='Y' THEN v_from := make_date(substr(p_key,2)::int,1,1); v_to := v_from + interval '1 year' - interval '1 day';
 ELSE v_from := (p_key||'-01')::date; v_to := v_from + interval '1 month' - interval '1 day'; END IF;
 PERFORM public.settings_get(); SELECT * INTO s FROM public.user_settings WHERE owner_id=v_uid;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',l.id,'date',to_char(l.journal_date,'YYYY-MM-DD'),
   'headline',l.content->>'headline','tone',l.content->>'tone','themes',COALESCE(l.content->'themes','[]'::jsonb),
   'theirWords',COALESCE((SELECT jsonb_agg(a->>'quote') FROM jsonb_array_elements(COALESCE(l.content->'analysis','[]'::jsonb)) a WHERE COALESCE(a->>'quote','')<>''),'[]'::jsonb),
   'openQuestions',COALESCE(l.content->'openQuestions','[]'::jsonb),
   'todos',COALESCE((SELECT jsonb_agg(jsonb_build_object('text',st->>'text','status',COALESCE(l.steps->>('step.'||(o-1)),'untouched')) ORDER BY o)
     FROM jsonb_array_elements(COALESCE(l.content->'steps','[]'::jsonb)) WITH ORDINALITY q(st,o)),'[]'::jsonb)) ORDER BY l.journal_date, l.created_at),'[]'::jsonb)
 INTO v_rows FROM public.letters l
 WHERE l.owner_id=v_uid AND l.status='ready' AND NOT l.private AND (l.early OR l.deliver_at<=v_now) AND l.journal_date BETWEEN v_from AND v_to;
 RETURN jsonb_build_object('key',p_key,'voice',s.voice,'language',s.letter_language,'letters',v_rows);
END;
$$;

CREATE FUNCTION public.note_save(p_key text, p_text text, p_model text, p_source_ids uuid[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.letter_notes; v_count integer;
BEGIN
 IF p_key IS NULL OR p_key !~ '^([0-9]{4}-(0[1-9]|1[0-2])|Y[0-9]{4})$' OR p_text IS NULL OR char_length(btrim(p_text)) NOT BETWEEN 1 AND 2000
 OR NOT private.writing_text_valid(p_text) OR (p_model IS NOT NULL AND p_model !~ '^[A-Za-z0-9_.:/-]{1,100}$')
 OR p_source_ids IS NULL OR cardinality(p_source_ids) NOT BETWEEN 1 AND 400 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT count(*) INTO v_count FROM (SELECT 1 FROM public.letters WHERE owner_id=v_uid AND id=ANY(p_source_ids) AND status='ready' AND NOT private FOR SHARE) x;
 IF v_count<>cardinality(ARRAY(SELECT DISTINCT unnest(p_source_ids))) THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 INSERT INTO public.letter_notes(owner_id,key,text,letter_count,model,source_ids) VALUES(v_uid,p_key,btrim(p_text),v_count,p_model,p_source_ids)
 ON CONFLICT (owner_id,key) DO UPDATE SET text=EXCLUDED.text,letter_count=EXCLUDED.letter_count,model=EXCLUDED.model,source_ids=EXCLUDED.source_ids,created_at=clock_timestamp()
 RETURNING * INTO v_row;
 RETURN private.note_resource(v_row);
END;
$$;

CREATE FUNCTION public.note_list() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid();
BEGIN
 RETURN (SELECT COALESCE(jsonb_agg(private.note_resource(n) ORDER BY n.key),'[]'::jsonb) FROM public.letter_notes n WHERE n.owner_id=v_uid);
END;
$$;

-- ---------------------------------------------------------------- worker (service role)
CREATE FUNCTION public.letter_claim(p_limit integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_now timestamptz := clock_timestamp(); v_result jsonb;
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 WITH candidates AS (SELECT j.letter_id FROM private.letter_jobs j JOIN public.profiles p ON p.id=j.owner_id AND p.status='active'
  WHERE j.attempts<6 AND j.next_attempt_at<=v_now AND (j.lease_until IS NULL OR j.lease_until<=v_now)
  ORDER BY j.next_attempt_at, j.letter_id FOR UPDATE OF j SKIP LOCKED LIMIT p_limit), claimed AS (
  UPDATE private.letter_jobs j SET lease_token=gen_random_uuid(), lease_until=v_now+interval '240 seconds', attempts=j.attempts+1
  FROM candidates c WHERE j.letter_id=c.letter_id RETURNING j.letter_id, j.lease_token)
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',letter_id,'lease_token',lease_token)),'[]'::jsonb) INTO v_result FROM claimed;
 RETURN v_result;
END;
$$;

-- The only things the AI service ever sees: this night's words, the voice and
-- language, usable memories (unless paused), and a few earlier kept letters' outlines.
CREATE FUNCTION public.letter_input(p_id uuid, p_lease_token uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j private.letter_jobs; l public.letters; e public.journal_entries; s public.user_settings; v_memories jsonb; v_earlier jsonb;
BEGIN
 SELECT * INTO j FROM private.letter_jobs WHERE letter_id=p_id AND lease_token=p_lease_token AND lease_until>clock_timestamp();
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=j.owner_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 SELECT * INTO l FROM public.letters WHERE id=p_id;
 SELECT * INTO e FROM public.journal_entries WHERE id=l.entry_id AND deleted_at IS NULL AND revision=l.entry_revision;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 SELECT * INTO s FROM public.user_settings WHERE owner_id=j.owner_id;
 IF COALESCE(s.memory_paused,false) THEN v_memories := '[]'::jsonb;
 ELSE
  SELECT COALESCE(jsonb_agg(m.text ORDER BY m.created_at DESC),'[]'::jsonb) INTO v_memories FROM (
   SELECT m.text, m.created_at FROM public.approved_memories m WHERE m.owner_id=j.owner_id AND m.deleted_at IS NULL
   AND (m.kind<>'learned' OR EXISTS(SELECT 1 FROM public.letters x WHERE x.entry_id=m.source_entry_id AND x.status='ready' AND NOT x.private))
   ORDER BY m.created_at DESC LIMIT 20) m;
 END IF;
 SELECT COALESCE(jsonb_agg(x.o ORDER BY x.d DESC),'[]'::jsonb) INTO v_earlier FROM (
  SELECT p.journal_date d, jsonb_build_object('date',to_char(p.journal_date,'YYYY-MM-DD'),'headline',p.content->>'headline',
   'themes',COALESCE(p.content->'themes','[]'::jsonb),'openQuestions',COALESCE(p.content->'openQuestions','[]'::jsonb),
   'stepsTheyMarkedNotForMe',COALESCE((SELECT jsonb_agg(st->>'text') FROM jsonb_array_elements(COALESCE(p.content->'steps','[]'::jsonb)) WITH ORDINALITY q(st,o)
     WHERE p.steps->>('step.'||(o-1))='skipped'),'[]'::jsonb)) o
  FROM public.letters p WHERE p.owner_id=j.owner_id AND p.id<>l.id AND p.status='ready' AND NOT p.private AND p.journal_date<=l.journal_date
  ORDER BY p.journal_date DESC, p.created_at DESC LIMIT 4) x;
 RETURN jsonb_build_object('version',2,'request_id',l.id,'journal_date',to_char(l.journal_date,'YYYY-MM-DD'),
  'language',l.language,'voice',l.voice,'memories',v_memories,'earlier_letters',v_earlier,
  'entries',jsonb_build_array(jsonb_build_object('id',e.id,'written_at',to_char(e.created_at AT TIME ZONE COALESCE(s.timezone,'UTC'),'HH24:MI'),'text',e.text)));
END;
$$;

CREATE FUNCTION public.letter_finish(p_id uuid, p_lease_token uuid, p_content jsonb, p_model text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j private.letter_jobs; l public.letters; s public.user_settings; r jsonb; v_text text; v_hash text; v_now timestamptz := clock_timestamp();
BEGIN
 IF p_content IS NULL OR jsonb_typeof(p_content)<>'object' OR jsonb_typeof(p_content->'steps')<>'array' OR jsonb_array_length(p_content->'steps')<>3
 OR COALESCE(p_content->>'headline','')='' OR pg_column_size(p_content)>60000
 OR (p_model IS NOT NULL AND p_model !~ '^[A-Za-z0-9_.:/-]{1,100}$') THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT * INTO j FROM private.letter_jobs WHERE letter_id=p_id AND lease_token=p_lease_token AND lease_until>v_now FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=j.owner_id AND status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 SELECT * INTO l FROM public.letters WHERE id=p_id FOR UPDATE;
 PERFORM 1 FROM public.journal_entries WHERE id=l.entry_id AND deleted_at IS NULL AND revision=l.entry_revision;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 UPDATE public.letters SET status='ready',content=p_content,model=p_model,written_at=v_now,error=NULL,revision=revision+1,updated_at=v_now WHERE id=p_id;
 DELETE FROM private.letter_jobs WHERE letter_id=p_id;
 -- Up to two small, checked things to remember, each linked to this night.
 SELECT * INTO s FROM public.user_settings WHERE owner_id=j.owner_id;
 IF COALESCE((p_content->>'safetyConcern')::boolean,false) IS FALSE AND jsonb_typeof(p_content->'remember')='array' THEN
  FOR r IN SELECT value FROM jsonb_array_elements(p_content->'remember') LIMIT 2 LOOP
   v_text := btrim(COALESCE(r->>'text',''));
   IF NOT private.product_text_valid(v_text) OR char_length(v_text)>140 THEN CONTINUE; END IF;
   v_hash := private.memory_hash(v_text);
   IF v_hash=ANY(COALESCE(s.forgotten_hashes,'{}')) OR EXISTS(SELECT 1 FROM public.approved_memories m WHERE m.owner_id=j.owner_id AND m.deleted_at IS NULL AND private.memory_hash(m.text)=v_hash) THEN CONTINUE; END IF;
   INSERT INTO public.approved_memories(owner_id,idempotency_key,text,source_entry_id,original_payload,created_at,kind)
   VALUES(j.owner_id,gen_random_uuid(),v_text,l.entry_id,jsonb_build_object('text',v_text,'source_entry_id',l.entry_id),v_now,'learned');
  END LOOP;
 END IF;
 RETURN true;
END;
$$;

-- A failed attempt waits 1, 5, 15, 60 and 180 minutes; after six attempts the
-- letter shows "couldn't be written" with a Try again button.
CREATE FUNCTION public.letter_fail(p_id uuid, p_lease_token uuid, p_error text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j private.letter_jobs; v_now timestamptz := clock_timestamp();
BEGIN
 IF p_error IS NULL OR p_error NOT IN ('unavailable','invalid_output','refused') THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 SELECT * INTO j FROM private.letter_jobs WHERE letter_id=p_id AND lease_token=p_lease_token AND lease_until>v_now FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 IF j.attempts>=6 OR p_error='refused' THEN
  DELETE FROM private.letter_jobs WHERE letter_id=p_id;
  UPDATE public.letters SET status='failed',error=p_error,revision=revision+1,updated_at=v_now WHERE id=p_id;
 ELSE
  UPDATE private.letter_jobs SET lease_token=NULL,lease_until=NULL,
   next_attempt_at=v_now+make_interval(mins => (ARRAY[1,5,15,60,180,180])[j.attempts]) WHERE letter_id=p_id;
 END IF;
 RETURN true;
END;
$$;

-- Put a claimed job back without spending an attempt (AI not configured yet).
CREATE FUNCTION public.letter_release(p_id uuid, p_lease_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 UPDATE private.letter_jobs SET lease_token=NULL,lease_until=NULL,attempts=GREATEST(attempts-1,0),next_attempt_at=clock_timestamp()+interval '1 minute'
 WHERE letter_id=p_id AND lease_token=p_lease_token AND lease_until>clock_timestamp();
 RETURN FOUND;
END;
$$;

-- ---------------------------------------------------------------- privacy cascades
-- Editing or deleting the night's words removes its letter (quotes come from them).
CREATE FUNCTION private.letter_source_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.revision IS DISTINCT FROM OLD.revision THEN
  DELETE FROM public.letters WHERE entry_id=OLD.id;
 END IF;
 RETURN NULL;
END;
$$;
CREATE TRIGGER entry_letter_invalidation AFTER UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION private.letter_source_changed();
-- A note built on a letter that is later kept private or removed is removed too.
CREATE FUNCTION private.note_source_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF TG_OP='DELETE' OR (NEW.private AND NOT OLD.private) THEN
  DELETE FROM public.letter_notes WHERE owner_id=OLD.owner_id AND OLD.id=ANY(source_ids);
 END IF;
 RETURN NULL;
END;
$$;
CREATE TRIGGER letter_note_invalidation AFTER UPDATE OF private OR DELETE ON public.letters FOR EACH ROW EXECUTE FUNCTION private.note_source_changed();
REVOKE ALL ON FUNCTION private.letter_source_changed(), private.note_source_changed(), private.memory_forgotten() FROM PUBLIC,anon,authenticated,service_role;

-- Changing or forgetting a memory, or pausing memory, cancels any letter that is
-- being written with the old context; it is picked up again with the new one.
CREATE FUNCTION private.letter_context_changed() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 IF TG_TABLE_NAME='user_settings' THEN
  IF NEW.memory_paused IS NOT DISTINCT FROM OLD.memory_paused THEN RETURN NULL; END IF;
 ELSIF NEW.text IS NOT DISTINCT FROM OLD.text AND NEW.deleted_at IS NOT DISTINCT FROM OLD.deleted_at THEN RETURN NULL; END IF;
 UPDATE private.letter_jobs SET lease_token=NULL,lease_until=NULL,attempts=GREATEST(attempts-1,0),next_attempt_at=clock_timestamp()
 WHERE owner_id=OLD.owner_id AND lease_token IS NOT NULL;
 RETURN NULL;
END;
$$;
CREATE TRIGGER memories_letter_context AFTER UPDATE OF text, deleted_at ON public.approved_memories FOR EACH ROW EXECUTE FUNCTION private.letter_context_changed();
CREATE TRIGGER settings_letter_context AFTER UPDATE OF memory_paused ON public.user_settings FOR EACH ROW EXECUTE FUNCTION private.letter_context_changed();
REVOKE ALL ON FUNCTION private.letter_context_changed() FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.account_data_clear_base() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := auth.uid(); v_now timestamptz := clock_timestamp();
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION USING MESSAGE='unauthorized'; END IF;
 -- Exclusive profile lock serializes clearing against every normal product RPC.
 PERFORM 1 FROM public.profiles WHERE id=v_uid AND status='active' FOR UPDATE;
 IF NOT FOUND OR NOT private.export_recent_signin() THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 PERFORM set_config('beyond.clearing','on',true);
 DELETE FROM public.letter_notes WHERE owner_id=v_uid;
 DELETE FROM public.letters WHERE owner_id=v_uid;
 UPDATE public.approved_memories SET text=NULL,source_entry_id=NULL,original_payload=NULL,created_at=NULL,revision=NULL,updated_at=NULL,deleted_at=v_now
 WHERE owner_id=v_uid AND deleted_at IS NULL;
 UPDATE public.todos SET title=NULL,original_title=NULL,completed=NULL,revision=NULL,created_at=NULL,updated_at=NULL,deleted_at=v_now
 WHERE owner_id=v_uid AND deleted_at IS NULL;
 UPDATE public.journal_entries SET text=NULL,original_text=NULL,reflection_opt_in=NULL,revision=NULL,created_at=NULL,updated_at=NULL,deleted_at=v_now
 WHERE owner_id=v_uid AND deleted_at IS NULL;
 DELETE FROM public.user_settings WHERE owner_id=v_uid;
 PERFORM set_config('beyond.clearing','off',true);
 -- Quotas and retired idempotency keys are deliberately not reset by content clearing.
 RETURN jsonb_build_object('status','cleared');
END;
$$;

CREATE OR REPLACE FUNCTION public.account_delete_purge(p_user_id uuid,p_lease_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_status text;
BEGIN
 -- Fence every stage. No payloads, tokens or email addresses are persisted in this queue.
 PERFORM 1 FROM private.account_deletions WHERE user_id=p_user_id AND lease_token=p_lease_token AND lease_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 SELECT status INTO v_status FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF v_status IS DISTINCT FROM 'deleting' AND EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 PERFORM set_config('beyond.clearing','on',true);
 DELETE FROM public.letter_notes WHERE owner_id=p_user_id;
 DELETE FROM public.letters WHERE owner_id=p_user_id;
 DELETE FROM private.ai_daily_usage WHERE owner_id=p_user_id;
 DELETE FROM public.approved_memories WHERE owner_id=p_user_id;
 DELETE FROM public.todos WHERE owner_id=p_user_id;
 DELETE FROM public.user_settings WHERE owner_id=p_user_id;
 DELETE FROM public.journal_entries WHERE owner_id=p_user_id;
 PERFORM set_config('beyond.clearing','off',true);
 RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.account_export_page(p_section text,p_limit integer,p_before_created_at timestamptz,p_before_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_head jsonb;
BEGIN
 IF p_section IS NULL OR p_section NOT IN ('letters','notes') THEN RETURN private.export_base_section(p_section,p_limit,p_before_created_at,p_before_id); END IF;
 PERFORM private.writing_active_uid();
 IF NOT private.export_recent_signin() THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 v_head := jsonb_build_object('format_version',1,'exported_at',private.ts(clock_timestamp()),'section',p_section);
 IF p_section='notes' THEN
  IF p_limit IS NOT NULL OR p_before_created_at IS NOT NULL OR p_before_id IS NOT NULL THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
  RETURN v_head||jsonb_build_object('items',public.note_list());
 END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 51 OR (p_before_created_at IS NOT NULL AND extract(year FROM p_before_created_at)<1) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 RETURN v_head||jsonb_build_object('items',public.letter_list(p_limit,p_before_created_at,p_before_id));
END;
$$;

-- ---------------------------------------------------------------- grants
REVOKE ALL ON FUNCTION public.ai_spend(text), public.letter_request(uuid,integer,date,timestamptz), public.letter_list(integer,timestamptz,uuid),
 public.letter_get(uuid), public.letter_update(uuid,jsonb), public.letter_retry(uuid), public.note_input(text),
 public.note_save(text,text,text,uuid[]), public.note_list(), public.letter_claim(integer), public.letter_input(uuid,uuid),
 public.letter_finish(uuid,uuid,jsonb,text), public.letter_fail(uuid,uuid,text), public.letter_release(uuid,uuid)
 FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.ai_spend(text), public.letter_request(uuid,integer,date,timestamptz), public.letter_list(integer,timestamptz,uuid),
 public.letter_get(uuid), public.letter_update(uuid,jsonb), public.letter_retry(uuid), public.note_input(text),
 public.note_save(text,text,text,uuid[]), public.note_list() TO authenticated;
GRANT EXECUTE ON FUNCTION public.letter_claim(integer), public.letter_input(uuid,uuid), public.letter_finish(uuid,uuid,jsonb,text),
 public.letter_fail(uuid,uuid,text), public.letter_release(uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION private.memory_resource(public.approved_memories), private.settings_resource(public.user_settings) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.account_export_page(text,integer,timestamptz,uuid), public.settings_update(jsonb,integer), public.memory_update(uuid,text,boolean,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.account_export_page(text,integer,timestamptz,uuid), public.settings_update(jsonb,integer), public.memory_update(uuid,text,boolean,integer) TO authenticated;
REVOKE ALL ON FUNCTION public.account_delete_purge(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.account_delete_purge(uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION private.account_data_clear_base() FROM PUBLIC,anon,authenticated,service_role;

-- ---------------------------------------------------------------- readiness
CREATE OR REPLACE FUNCTION public.api_schema_ready() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT private.core_schema_ready()
 AND (SELECT count(*)=4 FROM pg_class c WHERE c.oid IN ('public.letters'::regclass,'private.letter_jobs'::regclass,'public.letter_notes'::regclass,'private.ai_daily_usage'::regclass) AND c.relrowsecurity)
 AND NOT has_table_privilege('authenticated','private.letter_jobs','SELECT,INSERT,UPDATE,DELETE')
 AND NOT has_table_privilege('authenticated','private.ai_daily_usage','SELECT,INSERT,UPDATE,DELETE')
 AND NOT has_table_privilege('authenticated','public.letters','INSERT,UPDATE,DELETE')
 AND NOT has_table_privilege('authenticated','public.letter_notes','INSERT,UPDATE,DELETE')
 AND NOT has_column_privilege('authenticated','public.letters','entry_revision','SELECT')
 AND NOT has_column_privilege('authenticated','public.letter_notes','source_ids','SELECT')
 AND NOT has_column_privilege('authenticated','public.user_settings','forgotten_hashes','SELECT')
 AND (SELECT count(*)=2 FROM pg_policy WHERE polrelid IN ('public.letters'::regclass,'public.letter_notes'::regclass) AND pg_get_expr(polqual,polrelid) LIKE '%account_session_active()%')
 AND (SELECT count(*)=5 FROM pg_trigger WHERE tgname IN ('entry_letter_invalidation','letter_note_invalidation','memory_forgotten','memories_letter_context','settings_letter_context') AND NOT tgisinternal AND tgenabled='O')
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.letter_claim(integer)'),('public.letter_input(uuid,uuid)'),('public.letter_finish(uuid,uuid,jsonb,text)'),('public.letter_fail(uuid,uuid,text)'),('public.letter_release(uuid,uuid)')) required(signature)
  LEFT JOIN pg_proc p ON p.oid=to_regprocedure(signature) WHERE p.oid IS NULL OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
  OR NOT has_function_privilege('service_role',p.oid,'EXECUTE') OR has_function_privilege('authenticated',p.oid,'EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE'))
 AND NOT EXISTS(SELECT 1 FROM (VALUES ('public.ai_spend(text)'),('public.letter_request(uuid,integer,date,timestamptz)'),('public.letter_list(integer,timestamptz,uuid)'),('public.letter_get(uuid)'),
  ('public.letter_update(uuid,jsonb)'),('public.letter_retry(uuid)'),('public.note_input(text)'),('public.note_save(text,text,text,uuid[])'),('public.note_list()')) required(signature)
  LEFT JOIN pg_proc p ON p.oid=to_regprocedure(signature) WHERE p.oid IS NULL OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
  OR NOT has_function_privilege('authenticated',p.oid,'EXECUTE') OR has_function_privilege('anon',p.oid,'EXECUTE'));
$$;
CREATE OR REPLACE FUNCTION public.api_release_ready(p_release text) RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT COALESCE(p_release = 'beyond-letters-v1' AND public.api_schema_ready(), false);
$$;
