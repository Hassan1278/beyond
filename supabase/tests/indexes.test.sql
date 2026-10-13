BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(2);

SELECT has_index('public', 'reflections', 'reflections_owner_idx', ARRAY['owner_id'], 'Letters are indexed by owner');
SELECT has_index('private', 'reflection_jobs', 'reflection_jobs_owner_idx', ARRAY['owner_id'], 'Letter jobs are indexed by owner');

SELECT * FROM finish();
ROLLBACK;
