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
        `SELECT count(*) FROM public.approved_memories WHERE id='${memory.id}'::uuid AND text IS NULL AND original_payload IS NULL AND source_entry_id IS NULL;`,
      ),
      '1',
      'Source-linked memory not scrubbed.',
    );
  });
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
      statusIs(await api('/api/v1/settings', second), 200);
    },
  );
}
