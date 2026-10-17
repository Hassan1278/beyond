BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;
SELECT no_plan();

-- Catalog shape
SELECT is(public.api_schema_ready(),true,'Catalog is ready with the welcome columns');
SELECT is(has_column_privilege('authenticated','public.user_settings','welcome_reasons','UPDATE'),false,'Welcome answers have no direct write grant');

-- One fictional person
INSERT INTO auth.users(id,aud,role,email) VALUES
('77777777-7777-4777-8777-777777777777','authenticated','authenticated','welcome-one@example.invalid');
INSERT INTO auth.sessions(id,user_id) VALUES('77777777-7777-4777-8777-777777777777','77777777-7777-4777-8777-777777777777');
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"77777777-7777-4777-8777-777777777777","session_id":"77777777-7777-4777-8777-777777777777","role":"authenticated"}',true);

SELECT is((public.settings_get()->>'welcome_seen')::boolean,false,'A new account has not seen the welcome');
SELECT is(public.settings_get()->'welcome_reasons','[]'::jsonb,'A new account has no welcome answers');
SELECT ok(public.settings_get() ? 'welcome_other','Settings say whether something else was written');

SELECT is(public.settings_update('{"welcome_seen":true,"onboarded":true,"voice":"mentor","welcome_reasons":["mind","other"],"welcome_other":"  Fictional: a new city  "}',1)->>'revision','2','The welcome is saved in one settings update');
SELECT is((public.settings_get()->>'welcome_seen')::boolean,true,'Seeing the welcome is remembered on the account');
SELECT is(public.settings_get()->'welcome_reasons','["mind","other"]'::jsonb,'Chosen reasons are kept in order');
SELECT is(public.settings_get()->>'welcome_other','Fictional: a new city','The written answer is trimmed');
SELECT is(public.settings_update('{"welcome_other":null}',2)->>'welcome_other',NULL,'The written answer can be cleared');

SELECT throws_ok($$SELECT public.settings_update('{"welcome_reasons":["astronaut"]}',3)$$,'P0001','bad_request','Unknown reasons are rejected');
SELECT throws_ok($$SELECT public.settings_update('{"welcome_reasons":["mind","mind"]}',3)$$,'P0001','bad_request','Repeated reasons are rejected');
SELECT throws_ok($$SELECT public.settings_update('{"welcome_reasons":"mind"}',3)$$,'P0001','bad_request','Reasons must be a list');
SELECT throws_ok($$SELECT public.settings_update('{"welcome_other":"   "}',3)$$,'P0001','bad_request','A blank written answer is rejected');
SELECT throws_ok($$SELECT public.settings_update(jsonb_build_object('welcome_other',repeat('x',151)),3)$$,'P0001','bad_request','Written answers are at most 150 characters');
SELECT throws_ok($$SELECT public.settings_update('{"welcome_seen":"yes"}',3)$$,'P0001','bad_request','Seeing the welcome is a yes or no');
SELECT throws_ok($$UPDATE public.user_settings SET welcome_seen=false$$,'42501',NULL,'Direct welcome writes are denied');

SELECT * FROM finish();
ROLLBACK;
