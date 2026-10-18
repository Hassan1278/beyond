BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path=public,extensions;
SELECT no_plan();

-- Catalog and privilege shape
SELECT is(public.api_schema_ready(),true,'Letters catalog is ready');
ALTER TABLE public.letters DISABLE ROW LEVEL SECURITY;
SELECT is(public.api_schema_ready(),false,'Missing letter RLS fails readiness');
ALTER TABLE public.letters ENABLE ROW LEVEL SECURITY;
SELECT is(has_table_privilege('authenticated','private.letter_jobs','SELECT'),false,'Clients cannot see letter jobs');
SELECT is(has_table_privilege('authenticated','private.ai_daily_usage','SELECT'),false,'Clients cannot see AI quotas');
SELECT is(has_table_privilege('authenticated','public.letters','INSERT'),false,'Clients cannot write letters directly');
SELECT is(has_function_privilege('authenticated','public.letter_claim(integer)','EXECUTE'),false,'Users cannot claim letter work');
SELECT is(has_function_privilege('authenticated','public.letter_finish(uuid,uuid,jsonb,text)','EXECUTE'),false,'Users cannot store AI output');
SELECT is(has_function_privilege('anon','public.letter_request(uuid,integer,date,timestamptz)','EXECUTE'),false,'Anonymous callers cannot request letters');
SELECT is(has_column_privilege('authenticated','public.user_settings','forgotten_hashes','SELECT'),false,'Forgotten-memory hashes stay server-side');
SELECT is(has_column_privilege('authenticated','public.letter_notes','source_ids','SELECT'),false,'Note provenance stays server-side');
SELECT is((SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname IN ('public','private') AND tablename ~ 'reflection'),0::bigint,'The earlier reflection tables are gone');
SELECT is(private.memory_hash('Likes  quiet mornings.'),private.memory_hash('likes quiet mornings'),'Memory hashes ignore case, spacing and end punctuation');

-- Fixtures: two fictional people with live sessions and a recent password sign-in
INSERT INTO auth.users(id,aud,role,email) VALUES
('aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa','authenticated','authenticated','letters-one@example.invalid'),
('bbbbbbbb-5151-4151-8151-bbbbbbbbbbbb','authenticated','authenticated','letters-two@example.invalid');
INSERT INTO auth.sessions(id,user_id) SELECT id,id FROM auth.users WHERE id IN ('aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa','bbbbbbbb-5151-4151-8151-bbbbbbbbbbbb');
CREATE TEMP TABLE r(label text PRIMARY KEY,payload jsonb);
GRANT SELECT,INSERT,UPDATE,DELETE ON r TO authenticated,service_role;
CREATE FUNCTION pg_temp.v(p text) RETURNS jsonb LANGUAGE sql AS $$ SELECT payload FROM r WHERE label=p $$;
CREATE FUNCTION pg_temp.id(p text) RETURNS uuid LANGUAGE sql AS $$ SELECT (payload->>'id')::uuid FROM r WHERE label=p $$;
CREATE FUNCTION pg_temp.lease(p text) RETURNS uuid LANGUAGE sql AS $$ SELECT (payload->>'lease_token')::uuid FROM r WHERE label=p $$;
CREATE FUNCTION pg_temp.as_user(p uuid) RETURNS void LANGUAGE sql AS $$
 SELECT set_config('request.jwt.claims',jsonb_build_object('sub',p,'session_id',p,'amr',jsonb_build_array(jsonb_build_object('method','password','timestamp',floor(extract(epoch FROM statement_timestamp())))))::text,true);
$$;
CREATE FUNCTION pg_temp.content(p_headline text, p_remember jsonb) RETURNS jsonb LANGUAGE sql AS $$
 SELECT jsonb_build_object('language','en','greeting','Hi','signoff','Your friend','headline',p_headline,'recap','A fictional recap.',
  'analysis',jsonb_build_array(jsonb_build_object('lens','feelings','title','A fictional title','text','Fictional reading.','quote','fictional words','entryId','e')),
  'challenge',jsonb_build_object('issue','Fictional','cause','Fictional'),'advice',jsonb_build_object('text','Fictional','why','Fictional'),'encouragement','Fictional',
  'steps',jsonb_build_array(jsonb_build_object('text','Step one','kind','reflect','minutes',5,'why','w'),jsonb_build_object('text','Step two','kind','connect','minutes',5,'why','w'),jsonb_build_object('text','Step three','kind','rest','minutes',5,'why','w')),
  'themes',jsonb_build_array('rest'),'openQuestions',jsonb_build_array('A fictional question?'),'wins',jsonb_build_array(),'tone','calm','safetyConcern',false,'remember',p_remember);
$$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated,service_role;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT pg_temp.as_user('aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa');
SET LOCAL ROLE authenticated;

-- Settings: language, delivery time, early opening, onboarding and directions
SELECT is(public.settings_get()->>'delivery_time','08:00','Letters arrive at 08:00 by default');
SELECT is((public.settings_get()->>'allow_early')::boolean,true,'Opening early is allowed by default');
SELECT ok(NOT (public.settings_get() ? 'forgotten_hashes'),'Settings never expose forgotten-memory hashes');
SELECT is(public.settings_update('{"letter_language":"zh-hant","delivery_time":"07:30","onboarded":true,"directions":{"curious-learner":"confirmed"}}',1)->>'delivery_time','07:30','Letter settings can be changed together');
SELECT throws_ok($$SELECT public.settings_update('{"delivery_time":"04:00"}',2)$$,'P0001','bad_request','Delivery before 05:00 is rejected');
SELECT throws_ok($$SELECT public.settings_update('{"delivery_time":"07:10"}',2)$$,'P0001','bad_request','Delivery times use quarter hours');
SELECT throws_ok($$SELECT public.settings_update('{"directions":{"astronaut":"confirmed"}}',2)$$,'P0001','bad_request','Unknown directions are rejected');
SELECT throws_ok($$SELECT public.settings_update('{"directions":{"curious-learner":"maybe"}}',2)$$,'P0001','bad_request','Unknown direction states are rejected');
SELECT throws_ok($$SELECT public.settings_update('{"forgotten_hashes":[]}',2)$$,'P0001','bad_request','Clients cannot write forgotten hashes');

-- Sealing a night queues one letter, snapshotting voice and language
INSERT INTO r VALUES('entry',public.entry_create('Fictional night about a quiet walk',gen_random_uuid(),false)->'entry');
INSERT INTO r VALUES('told',public.memory_create('Fictional told memory',NULL,true,gen_random_uuid()));
SELECT is(pg_temp.v('told')->>'kind','told','Memories the person adds are told memories');
INSERT INTO r VALUES('letter',public.letter_request(pg_temp.id('entry'),1,current_date,clock_timestamp()+interval '8 hours'));
SELECT is(pg_temp.v('letter')->>'status','queued','Sealing queues a letter');
SELECT is(pg_temp.v('letter')->>'language','zh-hant','The chosen letter language is snapshotted');
SELECT is(pg_temp.v('letter')->'entry'->>'text','Fictional night about a quiet walk','The owner sees the night with its letter');
SELECT ok(NOT (pg_temp.v('letter') ? 'entry_revision'),'Letters do not expose internal revisions of their source');
SELECT is(public.letter_request(pg_temp.id('entry'),1,current_date,clock_timestamp()+interval '8 hours')->>'id',pg_temp.v('letter')->>'id','Sealing again returns the same letter');
SELECT throws_ok($$SELECT public.letter_request(pg_temp.id('entry'),2,current_date,clock_timestamp())$$,'P0001','conflict','A stale entry revision is rejected');
SELECT throws_ok($$SELECT public.letter_request(pg_temp.id('entry'),1,current_date,clock_timestamp()+interval '9 days')$$,'P0001','bad_request','Far-future delivery is rejected');
SELECT throws_ok($$SELECT public.letter_request(pg_temp.id('entry'),1,current_date-30,clock_timestamp())$$,'P0001','bad_request','Old journal dates are rejected');
SELECT throws_ok($$SELECT public.letter_claim(1)$$,'42501',NULL,'Clients cannot claim letter work');
SELECT throws_ok($$SELECT public.letter_update(pg_temp.id('letter'),'{"read":true}')$$,'P0001','conflict','A queued letter cannot be marked read');
SELECT is(public.letter_update(pg_temp.id('letter'),jsonb_build_object('deliver_at',to_char((clock_timestamp()+interval '9 hours') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')))->>'revision','2','A sealed letter can be moved to a different time');
RESET ROLE;

-- Worker: fenced claim, input, cancellation by memory changes
SET LOCAL ROLE service_role;
INSERT INTO r VALUES('claim',public.letter_claim(5)->0);
SELECT is(pg_temp.id('claim'),pg_temp.id('letter'),'The worker claims the queued letter');
SELECT is(public.letter_claim(5),'[]'::jsonb,'A live lease cannot be claimed twice');
SELECT throws_ok($$SELECT public.letter_input(pg_temp.id('claim'),gen_random_uuid())$$,'P0001','conflict','A wrong lease cannot read the night');
INSERT INTO r VALUES('input',public.letter_input(pg_temp.id('claim'),pg_temp.lease('claim')));
SELECT is(pg_temp.v('input')->'entries'->0->>'text','Fictional night about a quiet walk','The worker receives the sealed words');
SELECT is(pg_temp.v('input')->>'language','zh-hant','The worker receives the language');
SELECT is(pg_temp.v('input')->>'voice','friend','The worker receives the voice');
SELECT is(pg_temp.v('input')->'memories','["Fictional told memory"]'::jsonb,'The worker receives told memories');
SELECT is(pg_temp.v('input')->'earlier_letters','[]'::jsonb,'There are no earlier letters yet');
SELECT ok(NOT (pg_temp.v('input') ? 'owner_id') AND NOT (pg_temp.v('input')::text ~ 'example.invalid'),'Worker input carries no identity');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.memory_update(pg_temp.id('told'),'Fictional told memory, corrected',true,1)$$,'A memory can be corrected while a letter is being written');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok($$SELECT public.letter_input(pg_temp.id('claim'),pg_temp.lease('claim'))$$,'P0001','conflict','Changing memories cancels the in-flight context');
SELECT throws_ok($$SELECT public.letter_finish(pg_temp.id('claim'),pg_temp.lease('claim'),pg_temp.content('Old context',NULL),'fixture')$$,'P0001','conflict','Cancelled work cannot be stored');
UPDATE r SET payload=public.letter_claim(5)->0 WHERE label='claim';
SELECT is(public.letter_input(pg_temp.id('claim'),pg_temp.lease('claim'))->'memories','["Fictional told memory, corrected"]'::jsonb,'Reclaimed work reads the corrected memory');
RESET ROLE;
SELECT is((SELECT attempts FROM private.letter_jobs),1,'Context cancellation does not spend an attempt');
SET LOCAL ROLE service_role;
SELECT throws_ok($$SELECT public.letter_finish(pg_temp.id('claim'),pg_temp.lease('claim'),pg_temp.content('Two steps',NULL)||'{"steps":[{},{}]}','fixture')$$,'P0001','bad_request','A letter needs exactly three steps');
SELECT throws_ok($$SELECT public.letter_finish(pg_temp.id('claim'),pg_temp.lease('claim'),pg_temp.content('Bad model',NULL),'bad model name')$$,'P0001','bad_request','Model names are validated');
SELECT throws_ok($$SELECT public.letter_finish(pg_temp.id('claim'),pg_temp.lease('claim'),pg_temp.content('Version 3 without a body',NULL)||'{"version":3,"steps":[]}'::jsonb,'fixture')$$,'P0001','bad_request','A version 3 letter needs a body');
SELECT throws_ok($$SELECT public.letter_finish(pg_temp.id('claim'),pg_temp.lease('claim'),pg_temp.content('Version 3 with two steps',NULL)||'{"version":3,"body":"Hey,","steps":[{},{}]}'::jsonb,'fixture')$$,'P0001','bad_request','A version 3 letter has at most one step');
SELECT is(public.letter_finish(pg_temp.id('claim'),pg_temp.lease('claim'),pg_temp.content('A quiet walk',jsonb_build_array(jsonb_build_object('text','Walks to clear the head'),jsonb_build_object('text','fictional told memory, corrected'),jsonb_build_object('text','A third memory is ignored'))),'fixture-model'),true,'Valid output is stored once');
SELECT throws_ok($$SELECT public.letter_finish(pg_temp.id('claim'),pg_temp.lease('claim'),pg_temp.content('Replay',NULL),'fixture')$$,'P0001','conflict','A replayed completion cannot write another letter');
RESET ROLE;
SELECT is((SELECT count(*) FROM private.letter_jobs),0::bigint,'Finished work leaves no job');
SELECT is((SELECT count(*) FROM public.approved_memories WHERE owner_id='aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa' AND kind='learned' AND deleted_at IS NULL),1::bigint,'One new thing is learned; duplicates and extras are skipped');
SELECT is((SELECT source_entry_id FROM public.approved_memories WHERE kind='learned' AND deleted_at IS NULL),pg_temp.id('entry'),'A learned memory links to its night');

-- Reading, early opening, to-dos and privacy
SET LOCAL ROLE authenticated;
SELECT is(jsonb_array_length(public.letter_list(20,NULL,NULL)),1,'The owner lists their letter');
SELECT is(public.letter_get(pg_temp.id('letter'))->'content'->>'headline','A quiet walk','The owner reads the content');
SELECT is(public.letter_get(pg_temp.id('letter'))->>'model','fixture-model','The model is recorded');
SELECT ok(public.letter_update(pg_temp.id('letter'),'{"early":true,"read":true}')->>'read_at' IS NOT NULL,'Opening early marks the letter read');
SELECT throws_ok($$SELECT public.letter_update(pg_temp.id('letter'),jsonb_build_object('deliver_at',to_char(clock_timestamp()+interval '1 hour','YYYY-MM-DD"T"HH24:MI:SSOF')))$$,'P0001','conflict','An opened letter cannot be rescheduled');
SELECT is(public.letter_update(pg_temp.id('letter'),'{"steps":{"step.0":"tried","step.2":"skipped"}}')->'steps','{"step.0":"tried","step.2":"skipped"}'::jsonb,'Steps can be tried or skipped');
SELECT throws_ok($$SELECT public.letter_update(pg_temp.id('letter'),'{"steps":{"step.3":"tried"}}')$$,'P0001','bad_request','Only three steps exist');
SELECT throws_ok($$SELECT public.letter_update(pg_temp.id('letter'),'{"content":{}}')$$,'P0001','bad_request','Clients cannot rewrite letter content');
SELECT throws_ok($$SELECT public.letter_update(pg_temp.id('letter'),'{"read":false}')$$,'P0001','bad_request','Read cannot be undone');
SELECT is(jsonb_array_length(public.product_list('memories',20,NULL,NULL)),2,'Told and learned memories are both listed');

-- Notes over a month of kept letters
INSERT INTO r VALUES('noteinput',public.note_input(to_char(current_date,'YYYY-MM')));
SELECT is(jsonb_array_length(pg_temp.v('noteinput')->'letters'),1,'A month note reads the delivered letters');
SELECT is(pg_temp.v('noteinput')->'letters'->0->'todos'->2->>'status','skipped','Note input carries what was skipped');
SELECT is(pg_temp.v('noteinput')->'letters'->0->'theirWords','["fictional words"]'::jsonb,'Note input carries the quoted words');
SELECT throws_ok($$SELECT public.note_input('2026-13')$$,'P0001','bad_request','Note keys are validated');
SELECT is(public.note_save(to_char(current_date,'YYYY-MM'),'A fictional month note.','fixture-model',ARRAY[pg_temp.id('letter')])->>'letter_count','1','A note is saved');
SELECT throws_ok($$SELECT public.note_save(to_char(current_date,'YYYY-MM'),'Bad',NULL,ARRAY[gen_random_uuid()])$$,'P0001','conflict','Notes can only cite the owner''s kept letters');
SELECT is(jsonb_array_length(public.note_list()),1,'The owner lists notes');
SELECT is(jsonb_array_length(public.account_export_page('letters',20,NULL,NULL)->'items'),1,'Export includes letters');
SELECT is(jsonb_array_length(public.account_export_page('notes',NULL,NULL,NULL)->'items'),1,'Export includes notes');
SELECT lives_ok($$SELECT public.letter_update(pg_temp.id('letter'),'{"private":true}')$$,'A letter can be kept out of Patterns');
SELECT is(jsonb_array_length(public.note_list()),0,'Keeping a letter private removes notes built on it');
SELECT is(jsonb_array_length(public.note_input(to_char(current_date,'YYYY-MM'))->'letters'),0,'Private letters are not read by notes');
SELECT throws_ok($$SELECT public.ai_spend('letter')$$,'P0001','bad_request','Letters are only spent by sealing');
SELECT is(public.ai_spend('transcribe'),true,'Transcription spends from the daily allowance');

-- A second night: private letters' learned memories are not used; early opening can be turned off
INSERT INTO r VALUES('entry2',public.entry_create('Fictional second night',gen_random_uuid(),false)->'entry');
SELECT lives_ok($$SELECT public.settings_update('{"allow_early":false}',2)$$,'Opening early can be turned off');
INSERT INTO r VALUES('letter2',public.letter_request(pg_temp.id('entry2'),1,current_date,clock_timestamp()+interval '8 hours'));
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE r SET payload=public.letter_claim(5)->0 WHERE label='claim';
SELECT is(public.letter_input(pg_temp.id('claim'),pg_temp.lease('claim'))->'memories','["Fictional told memory, corrected"]'::jsonb,'Memories learned from a private letter are not used');
SELECT is(public.letter_input(pg_temp.id('claim'),pg_temp.lease('claim'))->'earlier_letters','[]'::jsonb,'Private letters are not shown to later letters');
SELECT is(public.letter_release(pg_temp.id('claim'),pg_temp.lease('claim')),true,'Unconfigured AI hands work back');
RESET ROLE;
SELECT is((SELECT attempts FROM private.letter_jobs),0,'Handing work back does not spend an attempt');
UPDATE private.letter_jobs SET next_attempt_at=clock_timestamp()-interval '1 second';
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.letter_update(pg_temp.id('letter'),'{"private":false}')$$,'A letter can be returned to Patterns');
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE r SET payload=public.letter_claim(5)->0 WHERE label='claim';
SELECT is(jsonb_array_length(public.letter_input(pg_temp.id('claim'),pg_temp.lease('claim'))->'memories'),2,'Learned memories from kept letters are used');
SELECT is(public.letter_input(pg_temp.id('claim'),pg_temp.lease('claim'))->'earlier_letters'->0->'stepsTheyMarkedNotForMe','["Step three"]'::jsonb,'Later letters know which steps were skipped');
SELECT is(public.letter_fail(pg_temp.id('claim'),pg_temp.lease('claim'),'unavailable'),true,'A failed attempt is recorded');
SELECT is(public.letter_claim(5),'[]'::jsonb,'Backoff prevents an immediate retry');
RESET ROLE;
SELECT ok((SELECT next_attempt_at>clock_timestamp()+interval '50 seconds' FROM private.letter_jobs),'The first retry waits about a minute');
UPDATE private.letter_jobs SET attempts=5,next_attempt_at=clock_timestamp()-interval '1 second';
SET LOCAL ROLE service_role;
UPDATE r SET payload=public.letter_claim(5)->0 WHERE label='claim';
SELECT is(public.letter_fail(pg_temp.id('claim'),pg_temp.lease('claim'),'invalid_output'),true,'The sixth failure is final');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT is(public.letter_get(pg_temp.id('letter2'))->>'status','failed','The person sees that the letter could not be written');
SELECT is(public.letter_get(pg_temp.id('letter2'))->>'error','invalid_output','Only a short error code is shown');
SELECT throws_ok($$SELECT public.letter_update(pg_temp.id('letter2'),'{"early":true}')$$,'P0001','forbidden','Early opening respects the setting');
SELECT is(public.letter_retry(pg_temp.id('letter2'))->>'status','queued','The person can try again');
RESET ROLE;
SELECT is((SELECT attempts FROM private.letter_jobs),0,'Trying again starts a fresh job');
UPDATE private.letter_jobs SET next_attempt_at=clock_timestamp()-interval '1 second';
SET LOCAL ROLE service_role;
UPDATE r SET payload=public.letter_claim(5)->0 WHERE label='claim';
SELECT is(public.letter_fail(pg_temp.id('claim'),pg_temp.lease('claim'),'refused'),true,'A refusal is recorded');
RESET ROLE;
SELECT is((SELECT status FROM public.letters WHERE id=pg_temp.id('letter2')),'failed','A refusal fails at once without retries');

-- Forgetting: a forgotten learned memory is never relearned
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.product_delete('memories',(SELECT (m->>'id')::uuid FROM jsonb_array_elements(public.product_list('memories',20,NULL,NULL)) m WHERE m->>'kind'='learned'))$$,'A learned memory can be forgotten');
SELECT lives_ok($$SELECT public.letter_retry(pg_temp.id('letter2'))$$,'Another letter is requested');
RESET ROLE;
SELECT is((SELECT cardinality(forgotten_hashes) FROM public.user_settings WHERE owner_id='aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa'),1,'The forgotten memory is remembered as a hash only');
UPDATE private.letter_jobs SET next_attempt_at=clock_timestamp()-interval '1 second';
SET LOCAL ROLE service_role;
UPDATE r SET payload=public.letter_claim(5)->0 WHERE label='claim';
SELECT is(public.letter_finish(pg_temp.id('claim'),pg_temp.lease('claim'),pg_temp.content('Second',jsonb_build_array(jsonb_build_object('text','WALKS to clear the head!'))),'fixture-model'),true,'A later letter is stored');
RESET ROLE;
SELECT is((SELECT count(*) FROM public.approved_memories WHERE owner_id='aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa' AND kind='learned' AND deleted_at IS NULL),0::bigint,'A forgotten memory is not relearned');
SET LOCAL ROLE authenticated;
SELECT is(public.memory_update((SELECT (m->>'id')::uuid FROM jsonb_array_elements(public.product_list('memories',20,NULL,NULL)) m LIMIT 1),'Fictional told memory, again',true,2)->>'kind','told','Editing a told memory keeps it told');

-- Isolation
SELECT pg_temp.as_user('bbbbbbbb-5151-4151-8151-bbbbbbbbbbbb');
SELECT is(jsonb_array_length(public.letter_list(20,NULL,NULL)),0,'Another person has no letters');
SELECT is((SELECT count(*) FROM public.letters),0::bigint,'Table RLS isolates letters');
SELECT is((SELECT count(*) FROM public.letter_notes),0::bigint,'Table RLS isolates notes');
SELECT throws_ok($$SELECT public.letter_get(pg_temp.id('letter'))$$,'P0001','not_found','Another person cannot read a letter');
SELECT throws_ok($$SELECT public.letter_update(pg_temp.id('letter'),'{"private":true}')$$,'P0001','not_found','Another person cannot change a letter');
SELECT throws_ok($$SELECT public.letter_request(pg_temp.id('entry'),1,current_date,clock_timestamp())$$,'P0001','not_found','Another person cannot seal someone else''s night');
SELECT pg_temp.as_user('aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa');

-- Editing or deleting the night removes its letter and what was learned from it
SELECT lives_ok($$SELECT public.entry_update(pg_temp.id('entry2'),'Fictional second night, edited',1)$$,'A sealed night can be edited');
SELECT throws_ok($$SELECT public.letter_get(pg_temp.id('letter2'))$$,'P0001','not_found','Editing the night removes its letter');
SELECT lives_ok($$SELECT public.entry_delete(pg_temp.id('entry'))$$,'A night can be deleted');
SELECT is(jsonb_array_length(public.letter_list(20,NULL,NULL)),0,'Deleting the night removes its letter');
RESET ROLE;
SELECT is((SELECT count(*) FROM private.letter_jobs),0::bigint,'No orphaned jobs remain');

-- Daily allowance
UPDATE private.ai_daily_usage SET used=6 WHERE owner_id='aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa' AND kind='letter';
SET LOCAL ROLE authenticated;
INSERT INTO r VALUES('entry3',public.entry_create('Fictional third night',gen_random_uuid(),false)->'entry');
SELECT throws_ok($$SELECT public.letter_request(pg_temp.id('entry3'),1,current_date,clock_timestamp())$$,'P0001','rate_limited','The daily letter allowance is enforced');
RESET ROLE;
UPDATE private.ai_daily_usage SET used=0 WHERE owner_id='aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa' AND kind='letter';

-- Pausing memory cancels in-flight context and sends none
SET LOCAL ROLE authenticated;
INSERT INTO r VALUES('letter3',public.letter_request(pg_temp.id('entry3'),1,current_date,clock_timestamp()));
RESET ROLE;
SET LOCAL ROLE service_role;
UPDATE r SET payload=public.letter_claim(5)->0 WHERE label='claim';
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT lives_ok($$SELECT public.settings_update('{"memory_paused":true}',3)$$,'Memory can be paused');
RESET ROLE;
SET LOCAL ROLE service_role;
SELECT throws_ok($$SELECT public.letter_input(pg_temp.id('claim'),pg_temp.lease('claim'))$$,'P0001','conflict','Pausing cancels in-flight context');
UPDATE r SET payload=public.letter_claim(5)->0 WHERE label='claim';
SELECT is(public.letter_input(pg_temp.id('claim'),pg_temp.lease('claim'))->'memories','[]'::jsonb,'Paused memory sends no memories');
RESET ROLE;

-- Inactive accounts are never processed
UPDATE private.letter_jobs SET lease_token=NULL,lease_until=NULL,next_attempt_at=clock_timestamp()-interval '1 second';
UPDATE public.profiles SET status='deleting' WHERE id='aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa';
SET LOCAL ROLE service_role;
SELECT is(public.letter_claim(5),'[]'::jsonb,'Deleting accounts are not claimed');
RESET ROLE;
UPDATE public.profiles SET status='active' WHERE id='aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa';

-- Clearing content removes letters, notes and jobs without recording forgotten hashes
SET LOCAL ROLE authenticated;
SELECT is(public.account_data_clear()->>'status','cleared','Recent sign-in can clear content');
SELECT is(jsonb_array_length(public.letter_list(20,NULL,NULL)),0,'Clearing removes letters');
RESET ROLE;
SELECT is((SELECT count(*) FROM private.letter_jobs),0::bigint,'Clearing removes letter jobs');
SELECT is((SELECT count(*) FROM public.user_settings WHERE owner_id='aaaaaaaa-5151-4151-8151-aaaaaaaaaaaa'),0::bigint,'Clearing removes settings and forgotten hashes');
SELECT is(public.api_schema_ready(),true,'Catalog remains ready');
SELECT * FROM finish();
ROLLBACK;
