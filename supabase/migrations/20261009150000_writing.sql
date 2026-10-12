-- Writing only: no scheduling, AI, jobs, or voice primitives.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

-- PostgreSQL UTF8 text already rejects NUL and surrogate code points at input.
-- Count supplementary characters as two UTF-16 units; JS trim is not POSIX space.
CREATE FUNCTION private.writing_text_valid(p_text text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_units integer := 0;
  v_code integer;
  v_character text;
BEGIN
  IF p_text IS NULL OR pg_catalog.char_length(p_text) NOT BETWEEN 1 AND 20000 THEN
    RETURN false;
  END IF;

  IF pg_catalog.octet_length(pg_catalog.btrim(
    p_text,
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'
  )) = 0 THEN
    RETURN false;
  END IF;

  FOREACH v_character IN ARRAY pg_catalog.string_to_array(p_text, NULL) LOOP
    v_code := pg_catalog.ascii(v_character);
    IF v_code = 0 OR v_code BETWEEN 55296 AND 57343 THEN
      RETURN false;
    END IF;
    v_units := v_units + CASE WHEN v_code > 65535 THEN 2 ELSE 1 END;
    IF v_units > 20000 THEN
      RETURN false;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

DO $$
BEGIN
  IF pg_catalog.current_setting('server_encoding') <> 'UTF8' THEN
    RAISE EXCEPTION 'writing requires UTF8';
  END IF;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  CONSTRAINT profiles_status_check CHECK (status IN ('active', 'deleting'))
);

CREATE FUNCTION private.writing_profile_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER writing_profile_after_auth_insert
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.writing_profile_created();

-- The trigger is installed before backfill, and no Auth metadata grants authority.
INSERT INTO public.profiles (id)
SELECT u.id FROM auth.users AS u
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT pg_catalog.gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  text text,
  original_text text,
  reflection_opt_in boolean,
  revision integer,
  created_at timestamptz,
  updated_at timestamptz,
  deleted_at timestamptz,
  CONSTRAINT journal_entries_owner_key_unique UNIQUE (owner_id, idempotency_key),
  CONSTRAINT journal_entries_state_check CHECK (
    CASE WHEN deleted_at IS NULL THEN
      private.writing_text_valid(text)
      AND private.writing_text_valid(original_text)
      AND reflection_opt_in IS FALSE
      AND revision IS NOT NULL AND revision > 0
      AND created_at IS NOT NULL AND pg_catalog.isfinite(created_at)
      AND updated_at IS NOT NULL AND pg_catalog.isfinite(updated_at)
    ELSE
      pg_catalog.isfinite(deleted_at)
      AND text IS NULL AND original_text IS NULL
      AND reflection_opt_in IS NULL AND revision IS NULL
      AND created_at IS NULL AND updated_at IS NULL
    END
  )
);

CREATE INDEX journal_entries_live_page_idx
ON public.journal_entries (owner_id, created_at DESC, id DESC)
WHERE deleted_at IS NULL;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profiles, public.journal_entries
FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT (id, status) ON public.profiles TO authenticated;
GRANT SELECT (id, owner_id, text, reflection_opt_in, revision, created_at, updated_at, deleted_at)
ON public.journal_entries TO authenticated;

CREATE POLICY profiles_read_own ON public.profiles
FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

-- Inline the active-profile test so no private helper is executable by clients.
CREATE POLICY journal_entries_read_own_active_live ON public.journal_entries
FOR SELECT TO authenticated
USING (
  owner_id = (SELECT auth.uid()) AND deleted_at IS NULL
  AND EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = journal_entries.owner_id AND p.status = 'active'
  )
);

CREATE FUNCTION private.writing_active_uid()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_status text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'unauthorized';
  END IF;

  -- SHARE, not KEY SHARE: a concurrent deleting-status update must wait.
  SELECT p.status INTO v_status
  FROM public.profiles AS p WHERE p.id = v_uid
  FOR SHARE;
  IF NOT FOUND OR v_status <> 'active' THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'forbidden';
  END IF;
  RETURN v_uid;
END;
$$;

CREATE FUNCTION private.writing_resource(p_entry public.journal_entries)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT pg_catalog.jsonb_build_object(
    'id', p_entry.id,
    'text', p_entry.text,
    'revision', p_entry.revision,
    'reflection_opt_in', false,
    'created_at', pg_catalog.to_char(p_entry.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'updated_at', pg_catalog.to_char(p_entry.updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
  );
$$;

CREATE FUNCTION public.entry_create(p_text text, p_idempotency_key uuid, p_reflection_opt_in boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := private.writing_active_uid();
  v_entry public.journal_entries;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF NOT private.writing_text_valid(p_text)
    OR p_idempotency_key IS NULL OR p_reflection_opt_in IS DISTINCT FROM false THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;

  INSERT INTO public.journal_entries (
    owner_id, idempotency_key, text, original_text, reflection_opt_in,
    revision, created_at, updated_at
  ) VALUES (v_uid, p_idempotency_key, p_text, p_text, false, 1, v_now, v_now)
  ON CONFLICT (owner_id, idempotency_key) DO NOTHING
  RETURNING * INTO v_entry;

  IF FOUND THEN
    RETURN pg_catalog.jsonb_build_object('entry', private.writing_resource(v_entry), 'created', true);
  END IF;

  -- A separate statement sees the winner after a concurrent unique-key wait.
  SELECT e.* INTO v_entry FROM public.journal_entries AS e
  WHERE e.owner_id = v_uid AND e.idempotency_key = p_idempotency_key
  FOR UPDATE;
  IF NOT FOUND OR v_entry.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'conflict';
  END IF;
  -- Compare bytes, never collation equality, normalization, or the edited text.
  IF pg_catalog.convert_to(v_entry.original_text, 'UTF8') <> pg_catalog.convert_to(p_text, 'UTF8') THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'conflict';
  END IF;
  RETURN pg_catalog.jsonb_build_object('entry', private.writing_resource(v_entry), 'created', false);
END;
$$;

CREATE FUNCTION public.entry_update(p_id uuid, p_text text, p_expected_revision integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := private.writing_active_uid();
  v_entry public.journal_entries;
BEGIN
  IF p_id IS NULL OR NOT private.writing_text_valid(p_text)
    OR p_expected_revision IS NULL OR p_expected_revision < 1 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;
  SELECT e.* INTO v_entry FROM public.journal_entries AS e
  WHERE e.id = p_id AND e.owner_id = v_uid AND e.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'not_found';
  END IF;
  IF v_entry.revision <> p_expected_revision OR v_entry.revision = 2147483647 THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'conflict';
  END IF;
  UPDATE public.journal_entries AS e
  SET text = p_text, revision = v_entry.revision + 1, updated_at = pg_catalog.clock_timestamp()
  WHERE e.id = v_entry.id
  RETURNING e.* INTO v_entry;
  RETURN private.writing_resource(v_entry);
END;
$$;

CREATE FUNCTION public.entry_delete(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := private.writing_active_uid();
  v_entry public.journal_entries;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;
  SELECT e.* INTO v_entry FROM public.journal_entries AS e
  WHERE e.id = p_id AND e.owner_id = v_uid AND e.deleted_at IS NULL
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'not_found';
  END IF;
  UPDATE public.journal_entries AS e
  SET text = NULL, original_text = NULL, reflection_opt_in = NULL, revision = NULL,
    created_at = NULL, updated_at = NULL, deleted_at = pg_catalog.clock_timestamp()
  WHERE e.id = v_entry.id;
  RETURN pg_catalog.jsonb_build_object('id', v_entry.id);
END;
$$;

CREATE FUNCTION public.entry_get(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := private.writing_active_uid();
  v_entry public.journal_entries;
BEGIN
  IF p_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;
  SELECT e.* INTO v_entry FROM public.journal_entries AS e
  WHERE e.id = p_id AND e.owner_id = v_uid AND e.deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'not_found';
  END IF;
  RETURN private.writing_resource(v_entry);
END;
$$;

CREATE FUNCTION public.entry_list(
  p_limit integer DEFAULT 20,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := private.writing_active_uid();
  v_result jsonb;
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 101
    OR (p_before_created_at IS NULL) <> (p_before_id IS NULL)
    OR (p_before_created_at IS NOT NULL AND NOT pg_catalog.isfinite(p_before_created_at)) THEN
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'bad_request';
  END IF;
  SELECT COALESCE(pg_catalog.jsonb_agg(
    private.writing_resource(page.entry) ORDER BY page.created_at DESC, page.id DESC
  ), '[]'::jsonb) INTO v_result
  FROM (
    SELECT e AS entry, e.created_at, e.id FROM public.journal_entries AS e
    WHERE e.owner_id = v_uid AND e.deleted_at IS NULL
      AND (p_before_created_at IS NULL OR (e.created_at, e.id) < (p_before_created_at, p_before_id))
    ORDER BY e.created_at DESC, e.id DESC
    LIMIT p_limit
  ) AS page;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION private.writing_text_valid(text), private.writing_profile_created(),
  private.writing_active_uid(), private.writing_resource(public.journal_entries)
FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.entry_create(text, uuid, boolean),
  public.entry_update(uuid, text, integer), public.entry_delete(uuid), public.entry_get(uuid),
  public.entry_list(integer, timestamptz, uuid)
FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.entry_create(text, uuid, boolean),
  public.entry_update(uuid, text, integer), public.entry_delete(uuid), public.entry_get(uuid),
  public.entry_list(integer, timestamptz, uuid)
TO authenticated;

-- Catalog-only compatibility primitive: no fixtures, user data, keys, or AI checks.
CREATE FUNCTION public.api_schema_ready()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    (SELECT pg_catalog.count(*) = 2 FROM pg_catalog.pg_class AS c
      WHERE c.oid IN (pg_catalog.to_regclass('public.profiles'), pg_catalog.to_regclass('public.journal_entries'))
        AND c.relkind = 'r' AND c.relrowsecurity)
    AND (SELECT pg_catalog.count(*) = 7 FROM pg_catalog.pg_constraint AS c
      WHERE c.conrelid IN (pg_catalog.to_regclass('public.profiles'), pg_catalog.to_regclass('public.journal_entries'))
        AND c.conname IN ('profiles_pkey', 'profiles_id_fkey', 'profiles_status_check',
          'journal_entries_pkey', 'journal_entries_owner_id_fkey',
          'journal_entries_owner_key_unique', 'journal_entries_state_check')
        AND c.convalidated)
    AND EXISTS (SELECT 1 FROM pg_catalog.pg_index AS i
      WHERE i.indexrelid = pg_catalog.to_regclass('public.journal_entries_live_page_idx')
        AND i.indisvalid AND i.indisready)
    AND EXISTS (SELECT 1 FROM pg_catalog.pg_trigger AS t
      WHERE t.tgrelid = pg_catalog.to_regclass('auth.users')
        AND t.tgname = 'writing_profile_after_auth_insert' AND t.tgenabled IN ('O', 'A')
        AND t.tgfoid = pg_catalog.to_regprocedure('private.writing_profile_created()'))
    AND (SELECT pg_catalog.count(*) = 2 FROM pg_catalog.pg_policy AS p
      WHERE (p.polrelid = pg_catalog.to_regclass('public.profiles') AND p.polname = 'profiles_read_own')
        OR (p.polrelid = pg_catalog.to_regclass('public.journal_entries')
          AND p.polname = 'journal_entries_read_own_active_live'))
    AND NOT EXISTS (
      SELECT 1 FROM (VALUES
        ('public.entry_create(text,uuid,boolean)'), ('public.entry_update(uuid,text,integer)'),
        ('public.entry_delete(uuid)'), ('public.entry_get(uuid)'),
        ('public.entry_list(integer,timestamp with time zone,uuid)'),
        ('private.writing_active_uid()'), ('private.writing_profile_created()')
      ) AS required(signature)
      LEFT JOIN pg_catalog.pg_proc AS p ON p.oid = pg_catalog.to_regprocedure(required.signature)
      WHERE p.oid IS NULL OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
    );
$$;
REVOKE ALL ON FUNCTION public.api_schema_ready() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.api_schema_ready() TO anon, authenticated;
