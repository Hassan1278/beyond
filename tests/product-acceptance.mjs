// Called only by the guarded local two-user production runner. No credentials or fixture content are logged.
export async function runProductAcceptance({
  api,
  rest,
  sql,
  json,
  statusIs,
  check,
  same,
  group,
  first,
  second,
  createUser,
  randomUUID,
  triggerSecret,
}) {
  const data = (result) => statusIs(result, 200).data;
  await group('private settings persistence, revision conflicts and disabled AI', async () => {
    const settings = data(await api('/api/v1/settings', first));
    check(settings.reflection_enabled === false, 'AI must remain disabled.');
    const updated = data(
      await api(
        '/api/v1/settings',
        first,
        json('PATCH', {
          timezone: 'Asia/Hong_Kong',
          memory_paused: true,
          expected_revision: settings.revision,
        }),
      ),
    );
    check(
      updated.memory_paused === true && updated.revision === settings.revision + 1,
      'Settings did not persist.',
    );
    same(
      data(await api('/api/v1/settings', first)),
      updated,
      'Settings read after update differs.',
    );
    statusIs(
      await api(
        '/api/v1/settings',
        first,
        json('PATCH', { voice: 'mentor', expected_revision: settings.revision }),
      ),
      409,
      'conflict',
    );
    statusIs(
      await api(
        '/api/v1/settings',
        first,
        json('PATCH', { reflection_enabled: true, expected_revision: updated.revision }),
      ),
      400,
      'bad_request',
    );
    check(
      data(await api('/api/v1/settings', second)).memory_paused === false,
      'Preferences crossed owners.',
    );
  });
  let todo;
  const todoKey = randomUUID();
  await group('standalone todo replay, concurrent revisions and ownership', async () => {
    const body = { title: 'Fictional local acceptance task', idempotency_key: todoKey };
    const copies = await Promise.all(
      Array.from({ length: 4 }, () => api('/api/v1/todos', first, json('POST', body))),
    );
    todo = data(copies[0]);
    check(
      copies.every((r) => data(r).id === todo.id),
      'Concurrent todo retries duplicated.',
    );
    const race = await Promise.all(
      [true, false].map((completed) =>
        api('/api/v1/todos/' + todo.id, first, json('PATCH', { completed, expected_revision: 1 })),
      ),
    );
    same(
      race.map((r) => r.response.status).sort(),
      [200, 409],
      'Todo revision race must have one winner.',
    );
    check(
      data(await api('/api/v1/todos', first, json('POST', body))).revision === 2,
      'Retry overwrote current todo.',
    );
    statusIs(await api('/api/v1/todos/' + todo.id, second), 404, 'not_found');
    statusIs(await api('/api/v1/todos/' + todo.id, second, { method: 'DELETE' }), 404, 'not_found');
    const direct = await rest(second, '/todos?select=id,title,completed,revision');
    statusIs(direct, 200);
    check(
      direct.body.every((row) => row.id !== todo.id),
      'Todo RLS leak.',
    );
    statusIs(await rest(first, '/todos?select=original_title'), 403);
  });
  await group('bounded product pagination preserves exact cursor and todo tombstones', async () => {
    const secondTodo = data(
      await api(
        '/api/v1/todos',
        first,
        json('POST', { title: 'Second fictional task', idempotency_key: randomUUID() }),
      ),
    );
    const page = data(await api('/api/v1/todos?limit=1', first));
    check(
      page.items.length === 1 && typeof page.next_cursor === 'string',
      'Missing product page cursor.',
    );
    const next = data(await api('/api/v1/todos?limit=1&cursor=' + page.next_cursor, first));
    check(
      next.items.length === 1 && next.items[0].id !== page.items[0].id,
      'Product pagination duplicates.',
    );
    same(
      [next.items[0].id, page.items[0].id].sort(),
      [todo.id, secondTodo.id].sort(),
      'Product pagination lost an item.',
    );
    statusIs(await api('/api/v1/todos/' + todo.id, first, { method: 'DELETE' }), 200);
    statusIs(
      await api(
        '/api/v1/todos',
        first,
        json('POST', { title: 'Fictional local acceptance task', idempotency_key: todoKey }),
      ),
      409,
      'conflict',
    );
    same(
      sql(
        `SELECT count(*) FROM public.todos WHERE id='${todo.id}'::uuid AND title IS NULL AND original_title IS NULL;`,
      ),
      '1',
      'Deleted todo content remains.',
    );
  });
  await group('explicit memory approval, owned sources and source-deletion cleanup', async () => {
    const entry = data(
      await api(
        '/api/v1/entries',
        first,
        json('POST', {
          text: 'Fictional memory source',
          reflection_opt_in: false,
          idempotency_key: randomUUID(),
        }),
      ),
    );
    const body = {
      text: 'Fictional approved memory',
      source_entry_id: entry.id,
      idempotency_key: randomUUID(),
      approved: true,
    };
    statusIs(
      await api('/api/v1/memories', first, json('POST', { ...body, approved: false })),
      400,
      'bad_request',
    );
    statusIs(await api('/api/v1/memories', second, json('POST', body)), 404, 'not_found');
    const memory = data(await api('/api/v1/memories', first, json('POST', body)));
    same(
      data(await api('/api/v1/memories', first, json('POST', body))),
      memory,
      'Approved memory retry duplicates.',
    );
    statusIs(await api('/api/v1/memories/' + memory.id, second), 404, 'not_found');
    statusIs(await rest(first, '/approved_memories?select=original_payload'), 403);
    const direct = await rest(second, '/approved_memories?select=id,text');
    statusIs(direct, 200);
    check(direct.body.length === 0, 'Memory RLS leak.');
    statusIs(await api('/api/v1/entries/' + entry.id, first, { method: 'DELETE' }), 200);
    statusIs(await api('/api/v1/memories/' + memory.id, first), 404, 'not_found');
    same(
      sql(
        `SELECT count(*) FROM public.approved_memories WHERE id='${memory.id}'::uuid AND text IS NULL AND original_payload IS NULL AND source_entry_id IS NULL AND revision IS NULL AND updated_at IS NULL;`,
      ),
      '1',
      'Source-linked memory not scrubbed.',
    );
  });
  let editedMemory;
  await group(
    'approved memory corrections, revision races and immutable creation replay',
    async () => {
      const body = {
        text: 'Fictional editable memory',
        source_entry_id: null,
        approved: true,
        idempotency_key: randomUUID(),
      };
      const memory = data(await api('/api/v1/memories', first, json('POST', body)));
      check(
        memory.revision === 1 && memory.updated_at === memory.created_at,
        'Missing initial memory revision.',
      );
      statusIs(
        await api(
          '/api/v1/memories/' + memory.id,
          first,
          json('PATCH', { text: 'Unapproved correction', approved: false, expected_revision: 1 }),
        ),
        400,
        'bad_request',
      );
      statusIs(
        await api(
          '/api/v1/memories/' + memory.id,
          first,
          json('PATCH', {
            text: 'Source injection',
            source_entry_id: randomUUID(),
            approved: true,
            expected_revision: 1,
          }),
        ),
        400,
        'bad_request',
      );
      const races = await Promise.all(
        ['Fictional correction one', 'Fictional correction two'].map((text) =>
          api(
            '/api/v1/memories/' + memory.id,
            first,
            json('PATCH', { text, approved: true, expected_revision: 1 }),
          ),
        ),
      );
      same(
        races.map((r) => r.response.status).sort(),
        [200, 409],
        'Memory revision race must have one winner.',
      );
      editedMemory = data(races.find((r) => r.response.status === 200));
      check(
        editedMemory.revision === 2 &&
          editedMemory.source_entry_id === null &&
          editedMemory.created_at === memory.created_at,
        'Correction changed source/creation metadata.',
      );
      same(
        data(await api('/api/v1/memories', first, json('POST', body))),
        editedMemory,
        'Creation retry did not return corrected memory.',
      );
      statusIs(
        await api('/api/v1/memories', first, json('POST', { ...body, text: editedMemory.text })),
        409,
        'conflict',
      );
      statusIs(
        await api(
          '/api/v1/memories/' + memory.id,
          second,
          json('PATCH', { text: 'Other owner correction', approved: true, expected_revision: 2 }),
        ),
        404,
        'not_found',
      );
      statusIs(
        await rest(
          first,
          '/approved_memories?id=eq.' + memory.id,
          json('PATCH', { text: 'Bypass revision' }),
        ),
        403,
      );
    },
  );
  await group(
    'private paginated exports, current corrections and deleted-content exclusion',
    async () => {
      const readPage = async (user, section, params = '') => {
        const result = await api('/api/v1/account/export?section=' + section + params, user);
        const page = data(result);
        check(
          page.section === section &&
            page.format_version === 1 &&
            typeof page.exported_at === 'string',
          'Invalid export page metadata.',
        );
        check(
          result.response.headers.get('Cache-Control') === 'no-store' &&
            result.response.headers.get('Content-Disposition') ===
              `attachment; filename="beyond-${section}.json"`,
          'Export cache/download headers are missing.',
        );
        check(
          !/"(?:owner_id|original_payload|original_text|original_title|idempotency_key|deleted_at)":/.test(
            JSON.stringify(page),
          ),
          'Export exposes internal metadata.',
        );
        return page;
      };
      const settings = await readPage(first, 'settings');
      same(
        settings.settings,
        data(await api('/api/v1/settings', first)),
        'Exported preferences differ from current settings.',
      );
      const memories = await readPage(first, 'memories');
      same(memories.items, [editedMemory], 'Export omitted corrected or included deleted memory.');
      same((await readPage(second, 'memories')).items, [], 'Memory export crossed owners.');
      const exportedEntry = data(
        await api(
          '/api/v1/entries',
          first,
          json('POST', {
            text: 'Fictional export-only entry',
            reflection_opt_in: false,
            idempotency_key: randomUUID(),
          }),
        ),
      );
      let cursor = null;
      const exportedIds = [];
      do {
        const page = await readPage(
          first,
          'entries',
          '&limit=1' + (cursor ? '&cursor=' + cursor : ''),
        );
        check(page.items.length <= 1, 'Export exceeded requested page size.');
        for (const row of page.items) {
          check(!exportedIds.includes(row.id), 'Export cursor repeated a row.');
          exportedIds.push(row.id);
        }
        cursor = page.next_cursor;
        check(
          exportedIds.length <= 100,
          'Export failed to terminate on bounded fictional fixture.',
        );
      } while (cursor);
      check(exportedIds.includes(exportedEntry.id), 'Export missed active own journal entry.');
      const expectedEntryIds = JSON.parse(
        sql(
          `SELECT COALESCE(jsonb_agg(id ORDER BY created_at DESC,id DESC),'[]'::jsonb)::text FROM public.journal_entries WHERE owner_id='${first.id}'::uuid AND deleted_at IS NULL;`,
        ),
      );
      same(
        exportedIds,
        expectedEntryIds,
        'Journal export paging lost, leaked or included deleted entries.',
      );
      const todos = await readPage(first, 'todos');
      same(
        todos.items.map((row) => row.id),
        JSON.parse(
          sql(
            `SELECT COALESCE(jsonb_agg(id ORDER BY created_at DESC,id DESC),'[]'::jsonb)::text FROM public.todos WHERE owner_id='${first.id}'::uuid AND deleted_at IS NULL;`,
          ),
        ),
        'Todo export lost or included deleted tasks.',
      );
      statusIs(
        await api('/api/v1/account/export?section=entries&limit=51', first),
        400,
        'bad_request',
      );
      statusIs(
        await api('/api/v1/account/export?section=entries&owner_id=' + second.id, first),
        400,
        'bad_request',
      );
      statusIs(
        await api('/api/v1/account/export?section=settings&limit=1', first),
        400,
        'bad_request',
      );
      statusIs(await api('/api/v1/memories/' + editedMemory.id, first, { method: 'DELETE' }), 200);
      same(
        (await readPage(first, 'memories')).items,
        [],
        'Export retained forgotten corrected text.',
      );
      same(
        sql(
          `SELECT count(*) FROM public.approved_memories WHERE id='${editedMemory.id}'::uuid AND text IS NULL AND original_payload IS NULL AND revision IS NULL AND updated_at IS NULL;`,
        ),
        '1',
        'Forgotten correction metadata remains.',
      );
    },
  );
  await group(
    'recoverable account deletion, access gate and protected cleanup trigger',
    async () => {
      // Never process another owner's queue in the local acceptance harness.
      same(
        sql('SELECT count(*) FROM private.account_deletions;'),
        '0',
        'Use a local database without unrelated cleanup requests.',
      );
      const victim = await createUser('account-cleanup', randomUUID());
      const victimId = victim.id;
      data(await api('/api/v1/settings', victim));
      data(
        await api(
          '/api/v1/todos',
          victim,
          json('POST', { title: 'Fictional deleted-account task', idempotency_key: randomUUID() }),
        ),
      );
      data(
        await api(
          '/api/v1/memories',
          victim,
          json('POST', {
            text: 'Fictional deleted-account memory',
            source_entry_id: null,
            approved: true,
            idempotency_key: randomUUID(),
          }),
        ),
      );
      statusIs(
        await rest(first, '/rpc/account_delete_begin', json('POST', { p_user_id: second.id })),
        403,
      );
      statusIs(await api('/api/v1/account', victim, { method: 'DELETE' }), 202);
      statusIs(await api('/api/v1/account', victim, { method: 'DELETE' }), 202);
      for (const route of [
        '/api/v1/entries',
        '/api/v1/settings',
        '/api/v1/todos',
        '/api/v1/memories',
        '/api/v1/account/export?section=settings',
      ])
        statusIs(await api(route, victim), 403, 'forbidden');
      statusIs(
        await api('/api/v1/internal/accounts/process', first, json('POST', {})),
        401,
        'unauthorized',
      );
      same(
        sql(`SELECT count(*) FROM private.account_deletions WHERE user_id<>'${victimId}'::uuid;`),
        '0',
        'Unexpected cleanup owner.',
      );
      const claims = JSON.parse(sql('SELECT public.account_delete_claim(1)::text;'));
      check(
        claims.length === 1 && claims[0].user_id === victimId,
        'Claim is not the captured fictional user.',
      );
      const lease = claims[0].lease_token;
      check(/^[0-9a-f-]{36}$/.test(lease), 'Invalid captured lease.');
      same(
        sql(`SELECT public.account_delete_purge('${victimId}'::uuid,'${lease}'::uuid);`),
        't',
        'Interrupted worker did not purge product rows.',
      );
      sql(
        `UPDATE private.account_deletions SET lease_until=clock_timestamp()-interval '1 second' WHERE user_id='${victimId}'::uuid;`,
      );
      const processed = data(
        await api(
          '/api/v1/internal/accounts/process',
          null,
          json('POST', { limit: 1 }, { Authorization: `Bearer ${triggerSecret}` }),
        ),
      );
      same(processed, { claimed: 1, completed: 1, retried: 0 }, 'Expired cleanup did not recover.');
      same(
        sql(
          `SELECT (SELECT count(*) FROM auth.users WHERE id='${victimId}'::uuid)+(SELECT count(*) FROM public.profiles WHERE id='${victimId}'::uuid)+(SELECT count(*) FROM private.account_deletions WHERE user_id='${victimId}'::uuid);`,
        ),
        '0',
        'Account or queue remains.',
      );
      statusIs(await api('/api/v1/settings', victim), 401, 'unauthorized');
      statusIs(await api('/api/v1/account/export?section=settings', victim), 401, 'unauthorized');
      statusIs(await api('/api/v1/settings', second), 200);
    },
  );
}
