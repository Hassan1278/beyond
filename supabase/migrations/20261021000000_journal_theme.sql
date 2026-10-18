-- The journal's colour theme is kept on the account, not in the browser, so it follows
-- the person between devices and the site can hand it over in a link (?theme=gold|blue).
-- midnight (default), candle or ink.

ALTER TABLE public.user_settings
  ADD COLUMN journal_theme text NOT NULL DEFAULT 'midnight'
    CHECK (journal_theme IN ('midnight','candle','ink'));
GRANT SELECT (journal_theme) ON public.user_settings TO authenticated;

CREATE OR REPLACE FUNCTION private.settings_resource(p public.user_settings) RETURNS jsonb LANGUAGE sql STABLE SET search_path = '' AS $$
 SELECT jsonb_build_object('timezone',p.timezone,'morning_time',p.morning_time,'voice',p.voice,'memory_paused',p.memory_paused,
 'reflection_enabled',false,'letter_language',p.letter_language,'delivery_time',p.delivery_time,'allow_early',p.allow_early,
 'onboarded',p.onboarded,'directions',p.directions,
 'welcome_seen',p.welcome_seen,'welcome_reasons',to_jsonb(p.welcome_reasons),'welcome_other',p.welcome_other,'letter_name',p.letter_name,'draft',p.draft,'direction_labels',p.direction_labels,'journal_theme',p.journal_theme,
 'revision',p.revision,'updated_at',to_char(p.updated_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'));
$$;

CREATE OR REPLACE FUNCTION public.settings_update(p_patch jsonb, p_expected_revision integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := private.writing_active_uid(); v_row public.user_settings; v_dirs jsonb; v_reasons jsonb; v_labels jsonb;
BEGIN
 IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'object' OR p_patch = '{}'::jsonb
 OR EXISTS (SELECT 1 FROM jsonb_object_keys(p_patch) k WHERE k NOT IN ('timezone','morning_time','voice','memory_paused','letter_language','delivery_time','allow_early','onboarded','directions','welcome_seen','welcome_reasons','welcome_other','letter_name','draft','direction_labels','journal_theme'))
 OR p_expected_revision IS NULL OR p_expected_revision < 1 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'timezone' AND (jsonb_typeof(p_patch->'timezone') <> 'string'
 OR length(p_patch->>'timezone') > 100 OR (p_patch->>'timezone') !~ '^(UTC|[A-Za-z_]+(/[A-Za-z0-9_+\-]+)+)$'
 OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = p_patch->>'timezone')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'morning_time' AND (jsonb_typeof(p_patch->'morning_time') <> 'string' OR (p_patch->>'morning_time') NOT IN ('07:00','07:30','08:00')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'voice' AND (jsonb_typeof(p_patch->'voice') <> 'string' OR (p_patch->>'voice') NOT IN ('friend','mentor','future','diary')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'letter_language' AND (jsonb_typeof(p_patch->'letter_language') <> 'string' OR (p_patch->>'letter_language') NOT IN ('auto','en','zh-hant','zh-hans')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'delivery_time' AND (jsonb_typeof(p_patch->'delivery_time') <> 'string' OR (p_patch->>'delivery_time') !~ '^(0[5-9]|1[0-2]):(00|15|30|45)$') THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF EXISTS (SELECT 1 FROM unnest(ARRAY['memory_paused','allow_early','onboarded','welcome_seen']) k WHERE p_patch ? k AND jsonb_typeof(p_patch->k) <> 'boolean') THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'directions' THEN
  v_dirs := p_patch->'directions';
  IF jsonb_typeof(v_dirs) <> 'object' OR EXISTS (SELECT 1 FROM jsonb_each(v_dirs) d
   WHERE d.key NOT IN ('young-entrepreneur','maker-builder','creative-explorer','curious-learner','community-builder','world-explorer')
   OR jsonb_typeof(d.value) <> 'string' OR (d.value #>> '{}') NOT IN ('suggested','confirmed','dismissed','removed')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 END IF;
 IF p_patch ? 'welcome_reasons' THEN
  v_reasons := p_patch->'welcome_reasons';
  IF jsonb_typeof(v_reasons) <> 'array' OR jsonb_array_length(v_reasons) > 6
   OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_reasons) r WHERE jsonb_typeof(r) <> 'string' OR (r #>> '{}') NOT IN ('want','mind','behind','write','lookback','other'))
   OR (SELECT count(DISTINCT r) FROM jsonb_array_elements_text(v_reasons) r) <> jsonb_array_length(v_reasons) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 END IF;
 IF p_patch ? 'welcome_other' AND NOT (jsonb_typeof(p_patch->'welcome_other') = 'null'
   OR (jsonb_typeof(p_patch->'welcome_other') = 'string' AND char_length(btrim(p_patch->>'welcome_other')) BETWEEN 1 AND 150)) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'letter_name' AND NOT (jsonb_typeof(p_patch->'letter_name') = 'null'
   OR (jsonb_typeof(p_patch->'letter_name') = 'string' AND char_length(btrim(p_patch->>'letter_name')) BETWEEN 1 AND 40)) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'draft' AND NOT (jsonb_typeof(p_patch->'draft') = 'null'
   OR (jsonb_typeof(p_patch->'draft') = 'string' AND char_length(p_patch->>'draft') <= 20000 AND btrim(p_patch->>'draft') <> '')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 IF p_patch ? 'direction_labels' THEN
  v_labels := p_patch->'direction_labels';
  IF jsonb_typeof(v_labels) <> 'object' OR EXISTS (SELECT 1 FROM jsonb_each(v_labels) d
   WHERE d.key NOT IN ('young-entrepreneur','maker-builder','creative-explorer','curious-learner','community-builder','world-explorer')
   OR jsonb_typeof(d.value) <> 'object'
   OR EXISTS (SELECT 1 FROM jsonb_object_keys(d.value) k WHERE k NOT IN ('name','line'))
   OR jsonb_typeof(d.value->'name') <> 'string' OR char_length(btrim(d.value->>'name')) NOT BETWEEN 1 AND 40
   OR jsonb_typeof(d.value->'line') <> 'string' OR char_length(btrim(d.value->>'line')) NOT BETWEEN 1 AND 160) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 END IF;
 IF p_patch ? 'journal_theme' AND (jsonb_typeof(p_patch->'journal_theme') <> 'string' OR (p_patch->>'journal_theme') NOT IN ('midnight','candle','ink')) THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 INSERT INTO public.user_settings(owner_id) VALUES (v_uid) ON CONFLICT DO NOTHING;
 SELECT * INTO v_row FROM public.user_settings WHERE owner_id = v_uid FOR UPDATE;
 IF v_row.revision <> p_expected_revision OR v_row.revision = 2147483647 THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 UPDATE public.user_settings SET timezone=COALESCE(p_patch->>'timezone',timezone), morning_time=COALESCE(p_patch->>'morning_time',morning_time),
 voice=COALESCE(p_patch->>'voice',voice),memory_paused=COALESCE((p_patch->>'memory_paused')::boolean,memory_paused),
 letter_language=COALESCE(p_patch->>'letter_language',letter_language),delivery_time=COALESCE(p_patch->>'delivery_time',delivery_time),
 allow_early=COALESCE((p_patch->>'allow_early')::boolean,allow_early),onboarded=COALESCE((p_patch->>'onboarded')::boolean,onboarded),
 directions=COALESCE(p_patch->'directions',directions),
 welcome_seen=COALESCE((p_patch->>'welcome_seen')::boolean,welcome_seen),
 welcome_reasons=CASE WHEN p_patch ? 'welcome_reasons' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'welcome_reasons')) ELSE welcome_reasons END,
 welcome_other=CASE WHEN p_patch ? 'welcome_other' THEN NULLIF(btrim(p_patch->>'welcome_other'),'') ELSE welcome_other END,
 letter_name=CASE WHEN p_patch ? 'letter_name' THEN NULLIF(btrim(p_patch->>'letter_name'),'') ELSE letter_name END,
 draft=CASE WHEN p_patch ? 'draft' THEN p_patch->>'draft' ELSE draft END,
 direction_labels=COALESCE(p_patch->'direction_labels',direction_labels),
 journal_theme=COALESCE(p_patch->>'journal_theme',journal_theme),
 revision=revision+1,updated_at=clock_timestamp() WHERE owner_id=v_uid RETURNING * INTO v_row;
 RETURN private.settings_resource(v_row);
END;
$$;
