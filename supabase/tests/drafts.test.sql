BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;
SELECT no_plan();

SELECT is(has_column_privilege('authenticated','public.user_settings','draft','UPDATE'),false,'Drafts have no direct write grant');

-- One fictional person
INSERT INTO auth.users(id,aud,role,email) VALUES
('88888888-8888-4888-8888-888888888888','authenticated','authenticated','draft-one@example.invalid');
INSERT INTO auth.sessions(id,user_id) VALUES('88888888-8888-4888-8888-888888888888','88888888-8888-4888-8888-888888888888');
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"88888888-8888-4888-8888-888888888888","session_id":"88888888-8888-4888-8888-888888888888","role":"authenticated"}',true);

SELECT ok(public.settings_get() ? 'draft','Settings say whether there is a draft');
SELECT is(public.settings_get()->>'draft',NULL,'A new account has no draft');
SELECT is(public.settings_update('{"draft":"  Fictional: half a thought\n"}',1)->>'draft','  Fictional: half a thought'||chr(10),'A draft is kept exactly as typed');
SELECT is(public.settings_update('{"draft":null}',2)->>'draft',NULL,'Sealing clears the draft');
SELECT throws_ok($$SELECT public.settings_update('{"draft":"   "}',3)$$,'P0001','bad_request','A blank draft is rejected');
SELECT throws_ok($$SELECT public.settings_update(jsonb_build_object('draft',repeat('x',20001)),3)$$,'P0001','bad_request','A draft is at most one entry long');
SELECT throws_ok($$SELECT public.settings_update('{"draft":5}',3)$$,'P0001','bad_request','A draft is text');
SELECT throws_ok($$UPDATE public.user_settings SET draft='x'$$,'42501',NULL,'Direct draft writes are denied');

SELECT * FROM finish();
ROLLBACK;
