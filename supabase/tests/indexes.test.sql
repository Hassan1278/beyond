BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;
SELECT plan(4);

SELECT has_index('public', 'letters', 'letters_owner_page', ARRAY['owner_id','created_at','id'], 'Letters are indexed by owner');
SELECT has_index('private', 'letter_jobs', 'letter_jobs_owner', ARRAY['owner_id'], 'Letter jobs are indexed by owner');
SELECT has_index('private', 'letter_jobs', 'letter_jobs_due', ARRAY['next_attempt_at'], 'Letter jobs are indexed by due time');
SELECT has_index('public', 'letters', 'letters_entry_id_key', ARRAY['entry_id'], 'Each night has at most one letter');

SELECT * FROM finish();
ROLLBACK;
