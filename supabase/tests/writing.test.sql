BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT no_plan();

-- All identities, keys, addresses, and entry contents are fictional fixtures.
CREATE TEMP TABLE writing_rpc_results (
  label text PRIMARY KEY,
  payload jsonb NOT NULL
);
GRANT SELECT, INSERT ON TABLE writing_rpc_results TO authenticated;

INSERT INTO auth.users (id, aud, role, email) VALUES
  ('11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'writing-one@example.invalid'),
  ('22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'writing-two@example.invalid');

UPDATE auth.users
SET raw_user_meta_data = '{"status":"deleting"}'::jsonb,
    raw_app_meta_data = '{"status":"deleting"}'::jsonb
WHERE id IN (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);

SELECT is(
  (SELECT count(*) FROM public.profiles
   WHERE id IN ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')
     AND status = 'active'),
  2::bigint,
  'Auth fixtures have active authoritative profiles despite deleting metadata'
);

SELECT is(public.api_schema_ready(), true, 'Writing schema readiness is true');
SELECT is(
  (SELECT count(*)
   FROM pg_catalog.pg_class AS c
   JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
   WHERE n.nspname IN ('public', 'private')
     AND c.relkind IN ('r', 'p')
     AND c.relname ~* '(^|_)(ai|job|jobs|reflection|reflections)(_|$)'),
  0::bigint,
  'Writing migration creates no AI, job, or reflection tables'
);

-- Clear the legacy claim so auth.uid() reads only the JSON claims below.
SELECT set_config('request.jwt.claim.sub', '', true);
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","user_metadata":{"status":"deleting"},"app_metadata":{"status":"deleting"}}',
  true
);

SELECT is(public.api_schema_ready(), true, 'Authenticated callers can check schema readiness');
SELECT is(
  (SELECT status FROM public.profiles WHERE id = '11111111-1111-4111-8111-111111111111'),
  'active',
  'Client metadata does not change the authoritative profile status'
);
SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '22222222-2222-4222-8222-222222222222'),
  0::bigint,
  'Profile RLS hides the other fictional user'
);

INSERT INTO writing_rpc_results (label, payload)
VALUES ('created', public.entry_create(
  E' \tFictional journal entry.\n ',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false
));

SELECT is((SELECT (payload ->> 'created')::boolean FROM writing_rpc_results WHERE label = 'created'),
  true, 'Initial create reports a new entry despite deleting metadata');
SELECT is((SELECT (payload #>> '{entry,revision}')::integer FROM writing_rpc_results WHERE label = 'created'),
  1, 'Initial revision is one');
SELECT is((SELECT (payload #>> '{entry,reflection_opt_in}')::boolean FROM writing_rpc_results WHERE label = 'created'),
  false, 'Created entry does not opt into reflection');
SELECT ok(
  (SELECT pg_catalog.convert_to(payload #>> '{entry,text}', 'UTF8') =
          pg_catalog.convert_to(E' \tFictional journal entry.\n ', 'UTF8')
   FROM writing_rpc_results WHERE label = 'created'),
  'Create preserves the original UTF8 bytes and surrounding whitespace'
);
SELECT is(
  (SELECT count(*) FROM public.journal_entries
   WHERE id = (SELECT (payload #>> '{entry,id}')::uuid FROM writing_rpc_results WHERE label = 'created')
     AND owner_id = '11111111-1111-4111-8111-111111111111'),
  1::bigint, 'Owner can read the live entry directly'
);
SELECT ok(
  (SELECT NOT ((payload -> 'entry') ?| ARRAY['owner_id', 'original_text', 'idempotency_key', 'deleted_at'])
   FROM writing_rpc_results WHERE label = 'created'),
  'RPC resource excludes internal ownership, original payload, key, and tombstone fields'
);

INSERT INTO writing_rpc_results (label, payload)
VALUES ('replayed', public.entry_create(
  E' \tFictional journal entry.\n ',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false
));
SELECT is((SELECT (payload ->> 'created')::boolean FROM writing_rpc_results WHERE label = 'replayed'),
  false, 'Byte-identical replay reports no new entry');
SELECT is(
  (SELECT payload -> 'entry' FROM writing_rpc_results WHERE label = 'replayed'),
  (SELECT payload -> 'entry' FROM writing_rpc_results WHERE label = 'created'),
  'Byte-identical replay returns exactly the same resource'
);
SELECT is((SELECT count(*) FROM public.journal_entries), 1::bigint,
  'Replay does not create a duplicate entry');
SELECT throws_ok(
  $$SELECT public.entry_create(E' \tFictional journal entry.\n  ', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false)$$,
  'P0001', 'conflict', 'Whitespace-only payload difference conflicts (409)'
);

INSERT INTO writing_rpc_results (label, payload)
SELECT 'edited', public.entry_update(
  (payload #>> '{entry,id}')::uuid, E' Fictional edited entry.\t\n ', 1
)
FROM writing_rpc_results WHERE label = 'created';
SELECT is((SELECT (payload ->> 'revision')::integer FROM writing_rpc_results WHERE label = 'edited'),
  2, 'Update with the expected revision increments it');
SELECT ok(
  (SELECT pg_catalog.convert_to(payload ->> 'text', 'UTF8') =
          pg_catalog.convert_to(E' Fictional edited entry.\t\n ', 'UTF8')
   FROM writing_rpc_results WHERE label = 'edited'),
  'Update preserves the edited bytes'
);
SELECT is(
  public.entry_get((SELECT (payload ->> 'id')::uuid FROM writing_rpc_results WHERE label = 'edited')),
  (SELECT payload FROM writing_rpc_results WHERE label = 'edited'),
  'Get returns the current edited resource'
);

INSERT INTO writing_rpc_results (label, payload)
VALUES ('edited_replay', public.entry_create(
  E' \tFictional journal entry.\n ',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false
));
SELECT is((SELECT (payload ->> 'created')::boolean FROM writing_rpc_results WHERE label = 'edited_replay'),
  false, 'Replay after editing still reports no new entry');
SELECT is(
  (SELECT payload -> 'entry' FROM writing_rpc_results WHERE label = 'edited_replay'),
  (SELECT payload FROM writing_rpc_results WHERE label = 'edited'),
  'Original-payload replay returns the CURRENT edited resource and revision'
);
SELECT throws_ok(
  $$SELECT public.entry_create(E' Fictional edited entry.\t\n ', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false)$$,
  'P0001', 'conflict', 'Replay compares the original payload, not the current edited text'
);
SELECT throws_ok(
  format('SELECT public.entry_update(%L::uuid, %L, 1)',
    (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'edited'), 'Fictional stale edit'),
  'P0001', 'conflict', 'Stale expected revision conflicts (409)'
);
SELECT is(
  public.entry_list(),
  jsonb_build_array((SELECT payload FROM writing_rpc_results WHERE label = 'edited')),
  'Default list returns only the current owned resource'
);

SELECT throws_ok(
  $$INSERT INTO public.journal_entries
      (id, owner_id, idempotency_key, text, original_text, reflection_opt_in, revision, created_at, updated_at)
    VALUES ('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111',
      'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'Fictional direct insert', 'Fictional direct insert',
      false, 1, now(), now())$$,
  '42501', 'permission denied for table journal_entries', 'Direct INSERT is denied'
);
SELECT throws_ok(
  $$UPDATE public.journal_entries SET text = 'Fictional direct edit'
    WHERE owner_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', 'permission denied for table journal_entries', 'Direct UPDATE is denied'
);
SELECT throws_ok(
  $$DELETE FROM public.journal_entries WHERE owner_id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', 'permission denied for table journal_entries', 'Direct DELETE is denied'
);
SELECT throws_ok(
  $$SELECT original_text FROM public.journal_entries$$,
  '42501', 'permission denied for table journal_entries', 'SELECT of original_text is denied'
);
SELECT throws_ok(
  $$SELECT idempotency_key FROM public.journal_entries$$,
  '42501', 'permission denied for table journal_entries', 'SELECT of idempotency_key is denied'
);
SELECT throws_ok(
  $$UPDATE public.profiles SET status = 'deleting' WHERE id = '11111111-1111-4111-8111-111111111111'$$,
  '42501', 'permission denied for table profiles', 'Clients cannot change authoritative profile status'
);

-- Missing JSON IDs arrive at these SQL RPC boundaries as NULL.
SELECT throws_ok(sql, 'P0001', 'bad_request', description)
FROM (VALUES
  ('SELECT public.entry_get(NULL::uuid)', 'Missing/null get ID is bad_request (400)'),
  ('SELECT public.entry_update(NULL::uuid, ''Fictional edit'', 1)', 'Missing/null update ID is bad_request (400)'),
  ('SELECT public.entry_delete(NULL::uuid)', 'Missing/null delete ID is bad_request (400)'),
  ('SELECT public.entry_create(''Fictional entry'', NULL::uuid, false)', 'Missing/null create key is bad_request (400)')
) AS cases(sql, description);

SELECT throws_ok(sql, 'P0001', 'not_found', description)
FROM (VALUES
  ('SELECT public.entry_get(''99999999-9999-4999-8999-999999999999''::uuid)', 'Unknown get ID is not_found (404)'),
  ('SELECT public.entry_update(''99999999-9999-4999-8999-999999999999''::uuid, ''Fictional edit'', 1)', 'Unknown update ID is not_found (404)'),
  ('SELECT public.entry_delete(''99999999-9999-4999-8999-999999999999''::uuid)', 'Unknown delete ID is not_found (404)')
) AS cases(sql, description);

SELECT throws_ok(
  format('SELECT public.entry_create(%L::text, %L::uuid, false)',
    invalid_text, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  'P0001', 'bad_request', description
)
FROM (VALUES
  (NULL::text, 'Create rejects NULL text (400)'),
  ('', 'Create rejects empty text (400)'),
  (E' \t\n\r ', 'Create rejects ASCII-whitespace-only text (400)'),
  (U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF',
   'Create rejects Unicode-whitespace-only text (400)'),
  (repeat('x', 20001), 'Create rejects 20001 BMP characters (400)'),
  (repeat(U&'\+01F642', 10001), 'Create rejects 10001 emoji exceeding 20000 UTF16 units (400)')
) AS cases(invalid_text, description);

SELECT throws_ok(
  format('SELECT public.entry_create(%L, %L::uuid, %s)',
    'Fictional entry', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', opt_in_sql),
  'P0001', 'bad_request', description
)
FROM (VALUES
  ('true', 'Create rejects reflection opt-in true (400)'),
  ('NULL::boolean', 'Create rejects NULL reflection opt-in (400)')
) AS cases(opt_in_sql, description);

SELECT throws_ok(
  format('SELECT public.entry_update(%L::uuid, %L::text, 2)',
    (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'edited'), invalid_text),
  'P0001', 'bad_request', description
)
FROM (VALUES
  (NULL::text, 'Update rejects NULL text (400)'),
  ('', 'Update rejects empty text (400)'),
  (E' \t\n\r ', 'Update rejects ASCII-whitespace-only text (400)'),
  (U&'\00A0\1680\2000\2028\2029\202F\205F\3000\FEFF', 'Update rejects Unicode-whitespace-only text (400)'),
  (repeat('x', 20001), 'Update rejects 20001 BMP characters (400)'),
  (repeat(U&'\+01F642', 10001), 'Update rejects 10001 emoji (400)')
) AS cases(invalid_text, description);

SELECT throws_ok(
  format('SELECT public.entry_update(%L::uuid, %L, %s)',
    (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'edited'),
    'Fictional edit', revision_sql),
  'P0001', 'bad_request', description
)
FROM (VALUES
  ('NULL::integer', 'Update rejects NULL expected revision (400)'),
  ('0', 'Update rejects zero expected revision (400)'),
  ('-1', 'Update rejects negative expected revision (400)')
) AS cases(revision_sql, description);

SELECT is(
  public.entry_get((SELECT (payload ->> 'id')::uuid FROM writing_rpc_results WHERE label = 'edited')),
  (SELECT payload FROM writing_rpc_results WHERE label = 'edited'),
  'Rejected edits do not change the resource or revision'
);

SELECT throws_ok(sql, 'P0001', 'bad_request', description)
FROM (VALUES
  ('SELECT public.entry_list(NULL::integer)', 'List rejects NULL limit (400)'),
  ('SELECT public.entry_list(0)', 'List rejects zero limit (400)'),
  ('SELECT public.entry_list(-1)', 'List rejects negative limit (400)'),
  ('SELECT public.entry_list(102)', 'List rejects limit above 101 (400)'),
  ('SELECT public.entry_list(20, ''2026-10-09 15:00:00+00''::timestamptz, NULL::uuid)', 'List rejects a cursor timestamp without an ID (400)'),
  ('SELECT public.entry_list(20, NULL::timestamptz, ''99999999-9999-4999-8999-999999999999''::uuid)', 'List rejects a cursor ID without a timestamp (400)'),
  ('SELECT public.entry_list(20, ''infinity''::timestamptz, ''99999999-9999-4999-8999-999999999999''::uuid)', 'List rejects an infinite cursor timestamp (400)'),
  ('SELECT public.entry_list(20, ''-infinity''::timestamptz, ''99999999-9999-4999-8999-999999999999''::uuid)', 'List rejects a negative infinite cursor timestamp (400)')
) AS cases(sql, description);
SELECT is(jsonb_array_length(public.entry_list(1)), 1, 'List accepts its minimum limit');
SELECT is(jsonb_array_length(public.entry_list(101)), 1, 'List accepts its maximum limit');
SELECT is(
  public.entry_list(20,
    (SELECT (payload ->> 'created_at')::timestamptz FROM writing_rpc_results WHERE label = 'edited'),
    (SELECT (payload ->> 'id')::uuid FROM writing_rpc_results WHERE label = 'edited')),
  '[]'::jsonb, 'Valid list cursor excludes the cursor entry itself'
);

INSERT INTO writing_rpc_results (label, payload)
VALUES ('emoji', public.entry_create(
  repeat(U&'\+01F642', 10000), 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', false
));
SELECT is((SELECT (payload ->> 'created')::boolean FROM writing_rpc_results WHERE label = 'emoji'),
  true, 'Create accepts exactly 10000 emoji (20000 UTF16 units)');
SELECT is((SELECT char_length(payload #>> '{entry,text}') FROM writing_rpc_results WHERE label = 'emoji'),
  10000, 'Maximum emoji input retains every character');
SELECT ok(
  (SELECT pg_catalog.convert_to(payload #>> '{entry,text}', 'UTF8') =
          pg_catalog.convert_to(repeat(U&'\+01F642', 10000), 'UTF8')
   FROM writing_rpc_results WHERE label = 'emoji'),
  'Maximum emoji create response preserves every UTF8 byte'
);
SELECT ok(
  pg_catalog.convert_to(public.entry_get(
    (SELECT (payload #>> '{entry,id}')::uuid FROM writing_rpc_results WHERE label = 'emoji')
  ) ->> 'text', 'UTF8') = pg_catalog.convert_to(repeat(U&'\+01F642', 10000), 'UTF8'),
  'Maximum emoji input is preserved in persisted storage'
);

SELECT set_config('request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated","user_metadata":{"status":"deleting"}}', true);
SELECT is(
  (SELECT count(*) FROM public.journal_entries
   WHERE owner_id = '11111111-1111-4111-8111-111111111111'),
  0::bigint, 'Second user cannot directly read first-user entries'
);
SELECT is(public.entry_list(), '[]'::jsonb, 'Second user list cannot see first-user entries');
SELECT throws_ok(
  format('SELECT public.entry_get(%L::uuid)',
    (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'edited')),
  'P0001', 'not_found', 'Other-owner get returns not_found (404)'
);
SELECT throws_ok(
  format('SELECT public.entry_update(%L::uuid, %L, 2)',
    (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'edited'), 'Fictional other-owner edit'),
  'P0001', 'not_found', 'Other-owner update returns not_found (404)'
);
SELECT throws_ok(
  format('SELECT public.entry_delete(%L::uuid)',
    (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'edited')),
  'P0001', 'not_found', 'Other-owner delete returns not_found (404)'
);

INSERT INTO writing_rpc_results (label, payload)
VALUES ('second_user', public.entry_create(
  E' \tFictional journal entry.\n ', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false
));
SELECT is((SELECT (payload ->> 'created')::boolean FROM writing_rpc_results WHERE label = 'second_user'),
  true, 'Same idempotency key creates a new entry for the second user');
SELECT ok(
  (SELECT payload #>> '{entry,id}' FROM writing_rpc_results WHERE label = 'second_user') <>
  (SELECT payload #>> '{entry,id}' FROM writing_rpc_results WHERE label = 'created'),
  'Same key is scoped to owner and produces a distinct entry ID'
);
SELECT is((SELECT count(*) FROM public.journal_entries), 1::bigint,
  'Second user directly sees only the distinct owned entry');

SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}', true);
SELECT is(
  (SELECT count(*) FROM public.journal_entries
   WHERE id = (SELECT (payload #>> '{entry,id}')::uuid FROM writing_rpc_results WHERE label = 'second_user')),
  0::bigint, 'First user cannot directly read the second-user entry'
);

INSERT INTO writing_rpc_results (label, payload)
SELECT 'deleted', public.entry_delete((payload ->> 'id')::uuid)
FROM writing_rpc_results WHERE label = 'edited';
SELECT is(
  (SELECT payload FROM writing_rpc_results WHERE label = 'deleted'),
  jsonb_build_object('id', (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'edited')),
  'Delete returns only the retired entry ID'
);

RESET ROLE;
SELECT ok(
  (SELECT text IS NULL AND original_text IS NULL AND reflection_opt_in IS NULL
          AND revision IS NULL AND created_at IS NULL AND updated_at IS NULL
   FROM public.journal_entries
   WHERE id = (SELECT (payload ->> 'id')::uuid FROM writing_rpc_results WHERE label = 'deleted')),
  'Admin confirms tombstone clears ALL six payload, preference, revision, and timestamp fields'
);
SELECT ok(
  (SELECT deleted_at IS NOT NULL AND pg_catalog.isfinite(deleted_at)
          AND owner_id = '11111111-1111-4111-8111-111111111111'::uuid
          AND idempotency_key = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
   FROM public.journal_entries
   WHERE id = (SELECT (payload ->> 'id')::uuid FROM writing_rpc_results WHERE label = 'deleted')),
  'Admin confirms finite tombstone timestamp and retained owner/key identity'
);
SELECT is(
  (SELECT count(*) FROM public.journal_entries
   WHERE idempotency_key = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  2::bigint, 'Admin confirms same-key rows remain distinct across both owners'
);

SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM public.journal_entries
   WHERE id = (SELECT (payload ->> 'id')::uuid FROM writing_rpc_results WHERE label = 'deleted')),
  0::bigint, 'RLS hides the owner tombstone'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(public.entry_list()) AS item(entry)
    WHERE item.entry ->> 'id' = (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'deleted')
  ), 'List hides the owner tombstone'
);
SELECT throws_ok(
  format('SELECT public.entry_get(%L::uuid)',
    (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'deleted')),
  'P0001', 'not_found', 'Tombstone get returns not_found (404)'
);
SELECT throws_ok(
  format('SELECT public.entry_update(%L::uuid, %L, 2)',
    (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'deleted'), 'Fictional tombstone edit'),
  'P0001', 'not_found', 'Tombstone update returns not_found (404)'
);
SELECT throws_ok(
  format('SELECT public.entry_delete(%L::uuid)',
    (SELECT payload ->> 'id' FROM writing_rpc_results WHERE label = 'deleted')),
  'P0001', 'not_found', 'Repeated tombstone delete returns not_found (404)'
);
SELECT throws_ok(
  $$SELECT public.entry_create(E' \tFictional journal entry.\n ', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false)$$,
  'P0001', 'conflict', 'Retired key with the same payload conflicts (409)'
);
SELECT throws_ok(
  $$SELECT public.entry_create('Fictional different retired payload', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', false)$$,
  'P0001', 'conflict', 'Retired key with a different payload conflicts (409)'
);

RESET ROLE;
UPDATE public.profiles SET status = 'deleting'
WHERE id = '11111111-1111-4111-8111-111111111111';
SELECT is(
  (SELECT count(*) FROM public.journal_entries
   WHERE owner_id = '11111111-1111-4111-8111-111111111111' AND deleted_at IS NULL),
  1::bigint, 'Admin confirms an inactive profile still has a live fixture to test RLS'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated","user_metadata":{"status":"active"},"app_metadata":{"status":"active"}}', true);
SELECT is((SELECT count(*) FROM public.journal_entries), 0::bigint,
  'Inactive profile sees no entries even when JWT metadata claims active');
SELECT throws_ok(sql, 'P0001', 'forbidden', description)
FROM (VALUES
  ('SELECT public.entry_create(''Fictional inactive entry'', ''ffffffff-ffff-4fff-8fff-ffffffffffff''::uuid, false)', 'Inactive profile create is forbidden (403)'),
  (format('SELECT public.entry_get(%L::uuid)',
    (SELECT payload #>> '{entry,id}' FROM writing_rpc_results WHERE label = 'emoji')), 'Inactive profile get is forbidden (403)'),
  (format('SELECT public.entry_update(%L::uuid, %L, 1)',
    (SELECT payload #>> '{entry,id}' FROM writing_rpc_results WHERE label = 'emoji'), 'Fictional inactive edit'), 'Inactive profile update is forbidden (403)'),
  (format('SELECT public.entry_delete(%L::uuid)',
    (SELECT payload #>> '{entry,id}' FROM writing_rpc_results WHERE label = 'emoji')), 'Inactive profile delete is forbidden (403)'),
  ('SELECT public.entry_list()', 'Inactive profile list is forbidden (403)')
) AS cases(sql, description);
SELECT is(public.api_schema_ready(), true, 'Readiness remains catalog-only for inactive profiles');

RESET ROLE;
DELETE FROM auth.users WHERE id = '22222222-2222-4222-8222-222222222222';
SELECT is(
  (SELECT count(*) FROM public.profiles WHERE id = '22222222-2222-4222-8222-222222222222'),
  0::bigint, 'Auth deletion cascades to the authoritative profile'
);
SELECT is(
  (SELECT count(*) FROM public.journal_entries WHERE owner_id = '22222222-2222-4222-8222-222222222222'),
  0::bigint, 'Auth deletion cascades to the deleted user entries'
);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM public.journal_entries), 0::bigint,
  'Deleted Auth identity cannot directly read entries');
SELECT throws_ok(sql, 'P0001', 'forbidden', description)
FROM (VALUES
  ('SELECT public.entry_create(''Fictional deleted-user entry'', ''ffffffff-ffff-4fff-8fff-ffffffffffff''::uuid, false)', 'Deleted Auth identity create is forbidden (403)'),
  (format('SELECT public.entry_get(%L::uuid)',
    (SELECT payload #>> '{entry,id}' FROM writing_rpc_results WHERE label = 'second_user')), 'Deleted Auth identity get is forbidden (403)'),
  (format('SELECT public.entry_update(%L::uuid, %L, 1)',
    (SELECT payload #>> '{entry,id}' FROM writing_rpc_results WHERE label = 'second_user'), 'Fictional deleted-user edit'), 'Deleted Auth identity update is forbidden (403)'),
  (format('SELECT public.entry_delete(%L::uuid)',
    (SELECT payload #>> '{entry,id}' FROM writing_rpc_results WHERE label = 'second_user')), 'Deleted Auth identity delete is forbidden (403)'),
  ('SELECT public.entry_list()', 'Deleted Auth identity list is forbidden (403)')
) AS cases(sql, description);

SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true);
SELECT ok(auth.uid() IS NULL, 'Claims without sub produce no UID');
SELECT is((SELECT count(*) FROM public.profiles), 0::bigint, 'No UID sees no profiles directly');
SELECT is((SELECT count(*) FROM public.journal_entries), 0::bigint, 'No UID sees no entries directly');
SELECT throws_ok(sql, 'P0001', 'unauthorized', description)
FROM (VALUES
  ('SELECT public.entry_create(''Fictional no-UID entry'', ''ffffffff-ffff-4fff-8fff-ffffffffffff''::uuid, false)', 'No UID create is unauthorized (401)'),
  ('SELECT public.entry_get(''99999999-9999-4999-8999-999999999999''::uuid)', 'No UID get is unauthorized (401)'),
  ('SELECT public.entry_update(''99999999-9999-4999-8999-999999999999''::uuid, ''Fictional no-UID edit'', 1)', 'No UID update is unauthorized (401)'),
  ('SELECT public.entry_delete(''99999999-9999-4999-8999-999999999999''::uuid)', 'No UID delete is unauthorized (401)'),
  ('SELECT public.entry_list()', 'No UID list is unauthorized (401)')
) AS cases(sql, description);
SELECT set_config('request.jwt.claims', '{"sub":null,"role":"authenticated"}', true);
SELECT throws_ok('SELECT public.entry_list()', 'P0001', 'unauthorized', 'Explicit NULL UID is unauthorized (401)');

RESET ROLE;
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SELECT is(public.api_schema_ready(), true, 'Anonymous schema readiness exposes no user data');
SELECT throws_ok(sql, '42501', message, description)
FROM (VALUES
  ('SELECT public.entry_create(''Fictional anonymous entry'', ''ffffffff-ffff-4fff-8fff-ffffffffffff''::uuid, false)', 'permission denied for function entry_create', 'Anonymous create lacks EXECUTE permission'),
  ('SELECT public.entry_get(''99999999-9999-4999-8999-999999999999''::uuid)', 'permission denied for function entry_get', 'Anonymous get lacks EXECUTE permission'),
  ('SELECT public.entry_update(''99999999-9999-4999-8999-999999999999''::uuid, ''Fictional anonymous edit'', 1)', 'permission denied for function entry_update', 'Anonymous update lacks EXECUTE permission'),
  ('SELECT public.entry_delete(''99999999-9999-4999-8999-999999999999''::uuid)', 'permission denied for function entry_delete', 'Anonymous delete lacks EXECUTE permission'),
  ('SELECT public.entry_list()', 'permission denied for function entry_list', 'Anonymous list lacks EXECUTE permission'),
  ('SELECT id FROM public.journal_entries', 'permission denied for table journal_entries', 'Anonymous direct entry read lacks SELECT permission'),
  ('SELECT id FROM public.profiles', 'permission denied for table profiles', 'Anonymous direct profile read lacks SELECT permission')
) AS cases(sql, message, description);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
