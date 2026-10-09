-- Keep the original writing checks intact and extend the public catalog-only gate.
ALTER FUNCTION public.api_schema_ready() SET SCHEMA private;
ALTER FUNCTION private.api_schema_ready() RENAME TO writing_schema_ready;
REVOKE ALL ON FUNCTION private.writing_schema_ready() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.api_schema_ready() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT private.writing_schema_ready()
 AND (SELECT count(*)=4 FROM pg_catalog.pg_class c
   WHERE c.oid IN (pg_catalog.to_regclass('public.user_settings'),pg_catalog.to_regclass('public.approved_memories'),
     pg_catalog.to_regclass('public.todos'),pg_catalog.to_regclass('private.account_deletions'))
     AND c.relkind='r' AND c.relrowsecurity)
 AND (SELECT count(*)=3 FROM pg_catalog.pg_policy p
   WHERE (p.polrelid=pg_catalog.to_regclass('public.user_settings') AND p.polname='settings_read_own_active')
     OR (p.polrelid=pg_catalog.to_regclass('public.approved_memories') AND p.polname='memories_read_own_active')
     OR (p.polrelid=pg_catalog.to_regclass('public.todos') AND p.polname='todos_read_own_active'))
 AND (SELECT count(*)=2 FROM pg_catalog.pg_index i
   WHERE i.indexrelid IN (pg_catalog.to_regclass('public.memories_live_page'),pg_catalog.to_regclass('public.todos_live_page'))
     AND i.indisvalid AND i.indisready)
 AND EXISTS(SELECT 1 FROM pg_catalog.pg_trigger t WHERE t.tgrelid=pg_catalog.to_regclass('public.journal_entries')
   AND t.tgname='scrub_source_memories' AND t.tgenabled IN ('O','A')
   AND t.tgfoid=pg_catalog.to_regprocedure('private.memory_source_deleted()'))
 AND NOT EXISTS(SELECT 1 FROM (VALUES
   ('public.user_settings','user_settings_pkey'),('public.user_settings','user_settings_owner_id_fkey'),
   ('public.approved_memories','approved_memories_pkey'),('public.approved_memories','approved_memories_owner_id_fkey'),
   ('public.approved_memories','approved_memories_source_entry_id_fkey'),
   ('public.approved_memories','approved_memories_owner_id_idempotency_key_key'),
   ('public.approved_memories','approved_memories_check'),
   ('public.todos','todos_pkey'),('public.todos','todos_owner_id_fkey'),
   ('public.todos','todos_owner_id_idempotency_key_key'),('public.todos','todos_check'),
   ('private.account_deletions','account_deletions_pkey'),('private.account_deletions','account_deletions_check')
 ) required(table_name,constraint_name)
 LEFT JOIN pg_catalog.pg_constraint c ON c.conrelid=pg_catalog.to_regclass(required.table_name)
   AND c.conname=required.constraint_name
 WHERE c.oid IS NULL OR NOT c.convalidated)
 AND NOT EXISTS(SELECT 1 FROM (VALUES
   ('public.settings_get()'),('public.settings_update(jsonb,integer)'),
   ('public.memory_create(text,uuid,boolean,uuid)'),('public.todo_create(text,uuid)'),
   ('public.todo_update(uuid,jsonb,integer)'),('public.product_get(text,uuid)'),
   ('public.product_delete(text,uuid)'),('public.product_list(text,integer,timestamp with time zone,uuid)')
 ) required(signature)
 LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(required.signature)
 WHERE p.oid IS NULL OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
   OR NOT pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
   OR pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'))
 AND NOT EXISTS(SELECT 1 FROM (VALUES
   ('public.account_delete_begin(uuid)'),('public.account_delete_claim(integer)'),
   ('public.account_delete_purge(uuid,uuid)'),('public.account_delete_finish(uuid,uuid)'),
   ('public.account_delete_retry(uuid,uuid)')
 ) required(signature)
 LEFT JOIN pg_catalog.pg_proc p ON p.oid=pg_catalog.to_regprocedure(required.signature)
 WHERE p.oid IS NULL OR NOT p.prosecdef OR p.proconfig IS DISTINCT FROM ARRAY['search_path=""']::text[]
   OR NOT pg_catalog.has_function_privilege('service_role',p.oid,'EXECUTE')
   OR pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE')
   OR pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE'))
 AND NOT EXISTS(SELECT 1 FROM (VALUES
   ('public.user_settings'),('public.approved_memories'),('public.todos'),('private.account_deletions')
 ) required(table_name) CROSS JOIN (VALUES('anon'),('authenticated')) roles(role_name)
 WHERE pg_catalog.has_table_privilege(roles.role_name,pg_catalog.to_regclass(required.table_name),'INSERT,UPDATE,DELETE,TRUNCATE')
   OR pg_catalog.has_any_column_privilege(roles.role_name,pg_catalog.to_regclass(required.table_name),'INSERT,UPDATE'))
 AND NOT pg_catalog.has_table_privilege('authenticated','private.account_deletions','SELECT')
 AND NOT pg_catalog.has_column_privilege('authenticated','public.approved_memories','original_payload','SELECT')
 AND NOT pg_catalog.has_column_privilege('authenticated','public.todos','original_title','SELECT');
$$;
REVOKE ALL ON FUNCTION public.api_schema_ready() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.api_schema_ready() TO anon,authenticated;
