BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;
SELECT no_plan();

SELECT is(has_column_privilege('authenticated','public.user_settings','journal_theme','UPDATE'),false,'The theme has no direct write grant');

INSERT INTO auth.users(id,aud,role,email) VALUES
('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','authenticated','authenticated','theme-one@example.invalid');
INSERT INTO auth.sessions(id,user_id) VALUES('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","session_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}',true);

SELECT is(public.settings_get()->>'journal_theme','midnight','A new account starts on Midnight');
SELECT is(public.settings_update('{"journal_theme":"candle"}',1)->>'journal_theme','candle','The theme can be changed');
SELECT throws_ok($$SELECT public.settings_update('{"journal_theme":"pink"}',2)$$,'P0001','bad_request','Unknown themes are rejected');

SELECT * FROM finish();
ROLLBACK;
