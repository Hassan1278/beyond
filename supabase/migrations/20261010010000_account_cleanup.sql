-- Durable account cleanup is independent of reflection/AI jobs.
CREATE TABLE private.account_deletions (
 user_id uuid PRIMARY KEY,
 requested_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
 lease_token uuid,
 lease_until timestamptz,
 CHECK ((lease_token IS NULL) = (lease_until IS NULL))
);
ALTER TABLE private.account_deletions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.account_deletions FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.account_delete_begin(p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_uid uuid := p_user_id; v_status text;
BEGIN
 IF v_uid IS NULL THEN RAISE EXCEPTION USING MESSAGE='unauthorized'; END IF;
 INSERT INTO private.account_deletions(user_id) VALUES(v_uid) ON CONFLICT DO NOTHING;
 PERFORM 1 FROM private.account_deletions WHERE user_id=v_uid FOR UPDATE;
 SELECT status INTO v_status FROM public.profiles WHERE id=v_uid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 UPDATE public.profiles SET status='deleting' WHERE id=v_uid;
 RETURN jsonb_build_object('status','deleting');
END;
$$;
CREATE FUNCTION public.account_delete_claim(p_limit integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_result jsonb; v_now timestamptz := clock_timestamp();
BEGIN
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION USING MESSAGE='bad_request'; END IF;
 WITH candidates AS (
  SELECT user_id FROM private.account_deletions WHERE next_attempt_at <= v_now AND (lease_until IS NULL OR lease_until <= v_now)
  ORDER BY requested_at,user_id FOR UPDATE SKIP LOCKED LIMIT p_limit
 ), claimed AS (
  UPDATE private.account_deletions q SET lease_token=gen_random_uuid(),lease_until=v_now+interval '60 seconds',attempts=LEAST(q.attempts,2147483646)+1
  FROM candidates c WHERE q.user_id=c.user_id RETURNING q.user_id,q.lease_token
 ) SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id',user_id,'lease_token',lease_token)),'[]'::jsonb) INTO v_result FROM claimed;
 RETURN v_result;
END;
$$;
CREATE FUNCTION public.account_delete_purge(p_user_id uuid,p_lease_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_status text;
BEGIN
 -- Fence every stage. No payloads, tokens or email addresses are persisted in this queue.
 PERFORM 1 FROM private.account_deletions WHERE user_id=p_user_id AND lease_token=p_lease_token AND lease_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 SELECT status INTO v_status FROM public.profiles WHERE id=p_user_id FOR UPDATE;
 IF v_status IS DISTINCT FROM 'deleting' AND EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION USING MESSAGE='forbidden'; END IF;
 DELETE FROM public.approved_memories WHERE owner_id=p_user_id;
 DELETE FROM public.todos WHERE owner_id=p_user_id;
 DELETE FROM public.user_settings WHERE owner_id=p_user_id;
 DELETE FROM public.journal_entries WHERE owner_id=p_user_id;
 RETURN true;
END;
$$;
CREATE FUNCTION public.account_delete_finish(p_user_id uuid,p_lease_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM 1 FROM private.account_deletions WHERE user_id=p_user_id AND lease_token=p_lease_token AND lease_until>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 IF EXISTS(SELECT 1 FROM auth.users WHERE id=p_user_id) THEN RAISE EXCEPTION USING MESSAGE='conflict'; END IF;
 -- Purge residual metadata too. Auth FK cascades already remove the profile/product rows.
 DELETE FROM private.account_deletions WHERE user_id=p_user_id;
 RETURN true;
END;
$$;
CREATE FUNCTION public.account_delete_retry(p_user_id uuid,p_lease_token uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 UPDATE private.account_deletions SET lease_token=NULL,lease_until=NULL,
 next_attempt_at=clock_timestamp()+make_interval(secs => LEAST(3600,30*LEAST(attempts,120)))
 WHERE user_id=p_user_id AND lease_token=p_lease_token AND lease_until>clock_timestamp();
 RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.account_delete_begin(uuid),public.account_delete_claim(integer),public.account_delete_purge(uuid,uuid),public.account_delete_finish(uuid,uuid),public.account_delete_retry(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.account_delete_begin(uuid) TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.account_delete_claim(integer),public.account_delete_purge(uuid,uuid),public.account_delete_finish(uuid,uuid),public.account_delete_retry(uuid,uuid) TO service_role;
