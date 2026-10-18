BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;
SELECT no_plan();

SELECT is(has_column_privilege('authenticated','public.user_settings','direction_labels','UPDATE'),false,'Direction labels have no direct write grant');

INSERT INTO auth.users(id,aud,role,email) VALUES
('99999999-9999-4999-8999-999999999999','authenticated','authenticated','labels-one@example.invalid');
INSERT INTO auth.sessions(id,user_id) VALUES('99999999-9999-4999-8999-999999999999','99999999-9999-4999-8999-999999999999');
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims','{"sub":"99999999-9999-4999-8999-999999999999","session_id":"99999999-9999-4999-8999-999999999999","role":"authenticated"}',true);

SELECT is(public.settings_get()->'direction_labels','{}'::jsonb,'A new account has no direction labels');
SELECT is(public.settings_update('{"direction_labels":{"community-builder":{"name":"Fictional: The Connector","line":"I bring people together."}}}',1)->'direction_labels'->'community-builder'->>'name','Fictional: The Connector','A direction can be renamed');
SELECT throws_ok($$SELECT public.settings_update('{"direction_labels":{"astronaut":{"name":"x","line":"y"}}}',2)$$,'P0001','bad_request','Unknown directions are rejected');
SELECT throws_ok($$SELECT public.settings_update('{"direction_labels":{"maker-builder":{"name":"   ","line":"y"}}}',2)$$,'P0001','bad_request','A blank name is rejected');
SELECT throws_ok($$SELECT public.settings_update(jsonb_build_object('direction_labels',jsonb_build_object('maker-builder',jsonb_build_object('name',repeat('x',41),'line','y'))),2)$$,'P0001','bad_request','Names are at most 40 characters');
SELECT throws_ok($$SELECT public.settings_update('{"direction_labels":{"maker-builder":{"name":"x","line":"y","extra":1}}}',2)$$,'P0001','bad_request','Only a name and a line are kept');

SELECT * FROM finish();
ROLLBACK;
