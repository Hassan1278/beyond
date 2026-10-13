BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(6);

SELECT is(public.api_release_ready('connected-text-v1'), true, 'The installed API release is ready');
SELECT is(public.api_release_ready('future-release'), false, 'An unknown API release fails closed');
SELECT is(public.api_release_ready(NULL), false, 'A missing release fails closed');
ALTER TABLE public.reflections DISABLE ROW LEVEL SECURITY;
SELECT is(public.api_release_ready('connected-text-v1'), false, 'The release marker still requires current privacy controls');
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;
SELECT is(public.api_release_ready('connected-text-v1'), true, 'Restoring privacy controls restores release readiness');
SET LOCAL ROLE anon;
SELECT is(public.api_release_ready('connected-text-v1'), true, 'Anonymous health checks receive only catalog readiness');
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
