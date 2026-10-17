-- Letter format version 3 (the new letter writer prompt): one flowing letter, one
-- reflection question and one small step (none on an urgent night), plus per-night
-- Growth fields (activities, compass, interests) kept inside the letter's content.
--
-- Version 3 content still carries headline, steps, openQuestions, tone and
-- safetyConcern, so letter_input, the to-do states and memory learning are unchanged.
-- What changes here:
--   * letter_finish accepts a version 3 letter with zero or one step and a body;
--     version 2 letters still need exactly three steps.
--   * note_input also reads a version 3 letter's checked evidence phrases as the
--     person's words (version 3 letters have no quoted analysis).

CREATE OR REPLACE FUNCTION public.letter_finish(p_id uuid, p_lease_token uuid, p_content jsonb, p_model text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j private.letter_jobs; l public.letters; s public.user_settings; r jsonb; v_text text; v_hash text; v_now timestamptz := clock_timestamp();
BEGIN
 IF p_content IS NULL OR jsonb_typeof(p_content)<>'object' OR jsonb_typeof(p_content->'steps')<>'array'
 OR (COALESCE(p_content->>'version','2')='3' AND (jsonb_array_length(p_content->'steps')>1 OR COALESCE(p_content->>'body','')=''))
 OR (COALESCE(p_content->>'version','2')<>'3' AND jsonb_array_length(p_content->'steps')<>3)
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

CREATE OR REPLACE FUNCTION public.note_input(p_key text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); s public.user_settings; v_from date; v_to date; v_rows jsonb; v_now timestamptz := clock_timestamp();
BEGIN
 IF p_key IS NULL OR p_key !~ '^([0-9]{4}-(0[1-9]|1[0-2])|Y[0-9]{4})$' THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF left(p_key,1)='Y' THEN v_from := make_date(substr(p_key,2)::int,1,1); v_to := v_from + interval '1 year' - interval '1 day';
 ELSE v_from := (p_key||'-01')::date; v_to := v_from + interval '1 month' - interval '1 day'; END IF;
 PERFORM public.settings_get(); SELECT * INTO s FROM public.user_settings WHERE owner_id=v_uid;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',l.id,'date',to_char(l.journal_date,'YYYY-MM-DD'),
   'headline',l.content->>'headline','tone',l.content->>'tone','themes',COALESCE(l.content->'themes','[]'::jsonb),
   'theirWords',COALESCE((SELECT jsonb_agg(w) FROM (SELECT a->>'quote' w FROM jsonb_array_elements(COALESCE(l.content->'analysis','[]'::jsonb)) a WHERE COALESCE(a->>'quote','')<>''
     UNION ALL SELECT e FROM jsonb_array_elements_text(COALESCE(l.content->'evidence','[]'::jsonb)) e) q),'[]'::jsonb),
   'openQuestions',COALESCE(l.content->'openQuestions','[]'::jsonb),
   'todos',COALESCE((SELECT jsonb_agg(jsonb_build_object('text',st->>'text','status',COALESCE(l.steps->>('step.'||(o-1)),'untouched')) ORDER BY o)
     FROM jsonb_array_elements(COALESCE(l.content->'steps','[]'::jsonb)) WITH ORDINALITY q(st,o)),'[]'::jsonb)) ORDER BY l.journal_date, l.created_at),'[]'::jsonb)
 INTO v_rows FROM public.letters l
 WHERE l.owner_id=v_uid AND l.status='ready' AND NOT l.private AND (l.early OR l.deliver_at<=v_now) AND l.journal_date BETWEEN v_from AND v_to;
 RETURN jsonb_build_object('key',p_key,'voice',s.voice,'language',s.letter_language,'letters',v_rows);
END;
$$;
