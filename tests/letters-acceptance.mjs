// Called only by the guarded local runner. Letters end to end: seal through the
// API, the scheduled worker, the real AI service with a stub model, then reading,
// to-dos, learned memory, notes, export, privacy and invalidation. Fictional
// content only; nothing is logged except fixed labels.
export async function runLettersAcceptance({
  api,
  json,
  statusIs,
  check,
  group,
  createUser,
  randomUUID,
  letterTriggerSecret,
  modelRequests,
}) {
  const data = (result) => statusIs(result, 200).data;
  const owner = await createUser('letters-a', randomUUID());
  const other = await createUser('letters-b', randomUUID());
  const today = new Date().toISOString().slice(0, 10);
  const inHours = (h) => new Date(Date.now() + h * 3600_000).toISOString();
  const work = (limit = 3, secret = letterTriggerSecret) =>
    api(
      '/api/v1/internal/letters/process',
      undefined,
      json('POST', { limit }, { Authorization: `Bearer ${secret}` }),
    );
  let entry, letter;

  await group('sealing a night queues one letter only with consent', async () => {
    const status = data(await api('/api/v1/ai', owner));
    check(status.letters === true && status.notes === true, 'AI status should report letters on.');
    entry = data(
      await api(
        '/api/v1/entries',
        owner,
        json('POST', {
          text: 'Fictional harbour walk after class, calm and slow.',
          idempotency_key: randomUUID(),
          reflection_opt_in: false,
        }),
      ),
    );
    const body = {
      entry_id: entry.id,
      expected_revision: entry.revision,
      journal_date: today,
      deliver_at: inHours(8),
    };
    statusIs(await api('/api/v1/letters', owner, json('POST', body)), 400, 'bad_request');
    letter = data(await api('/api/v1/letters', owner, json('POST', { ...body, consent: true })));
    check(letter.status === 'queued' && letter.entry.id === entry.id, 'Seal must queue a letter.');
    const again = data(
      await api('/api/v1/letters', owner, json('POST', { ...body, consent: true })),
    );
    check(again.id === letter.id, 'Sealing twice must return the same letter.');
    statusIs(await api(`/api/v1/letters/${letter.id}`, other), 404, 'not_found');
    statusIs(
      await api('/api/v1/letters', other, json('POST', { ...body, consent: true })),
      404,
      'not_found',
    );
  });

  await group(
    'the worker writes the letter through the AI service and stores checked output',
    async () => {
      statusIs(await work(3, 'x'.repeat(64)), 401, 'unauthorized');
      const before = modelRequests.length;
      const run = data(await work());
      check(run.claimed >= 1 && run.written >= 1, 'Worker must write the queued letter.');
      const sent = modelRequests
        .slice(before)
        .map((r) => r.body)
        .join('\n');
      check(sent.includes('Fictional harbour walk'), 'The model must receive the sealed words.');
      check(
        !sent.includes(owner.email) && !sent.includes(owner.id) && !sent.includes(other.email),
        'The model must not receive identity.',
      );
      const ready = data(await api(`/api/v1/letters/${letter.id}`, owner));
      check(ready.status === 'ready' && ready.model === 'fixture-model', 'Letter must be ready.');
      check(ready.content.steps.length === 3, 'Letter must have three to-dos.');
      check(
        ready.content.analysis[0].quote === 'Fictional harbour walk after',
        'Quotes must be the exact words.',
      );
      const memories = data(await api('/api/v1/memories', owner)).items;
      check(
        memories.some((m) => m.kind === 'learned' && m.source_entry_id === entry.id),
        'A checked memory must be learned from the night.',
      );
      const idle = data(await work());
      check(idle.claimed === 0, 'Finished work must not be claimed again.');
    },
  );

  await group('reading, early opening, to-dos and privacy are owner-only updates', async () => {
    const opened = data(
      await api(`/api/v1/letters/${letter.id}`, owner, json('PATCH', { early: true, read: true })),
    );
    check(opened.read_at !== null && opened.early === true, 'Letter must open early.');
    const ticked = data(
      await api(
        `/api/v1/letters/${letter.id}`,
        owner,
        json('PATCH', { steps: { 'step.0': 'tried', 'step.2': 'skipped' } }),
      ),
    );
    check(ticked.steps['step.0'] === 'tried', 'To-do must be saved.');
    statusIs(
      await api(`/api/v1/letters/${letter.id}`, owner, json('PATCH', { content: {} })),
      400,
      'bad_request',
    );
    statusIs(
      await api(`/api/v1/letters/${letter.id}`, other, json('PATCH', { private: true })),
      404,
      'not_found',
    );
  });

  await group('notes read only kept letters and are removed with their source', async () => {
    const key = today.slice(0, 7);
    const note = data(await api('/api/v1/notes', owner, json('POST', { key })));
    check(note.letter_count === 1 && note.model === 'fixture-model', 'Note must be written.');
    check(data(await api('/api/v1/notes', owner)).items.length === 1, 'Note must be listed.');
    check(data(await api('/api/v1/notes', other)).items.length === 0, 'Notes must be private.');
    data(await api(`/api/v1/letters/${letter.id}`, owner, json('PATCH', { private: true })));
    check(
      data(await api('/api/v1/notes', owner)).items.length === 0,
      'Keeping a letter private must remove notes built on it.',
    );
    statusIs(await api('/api/v1/notes', owner, json('POST', { key })), 409, 'conflict');
    data(await api(`/api/v1/letters/${letter.id}`, owner, json('PATCH', { private: false })));
  });

  await group('export includes letters and notes for a recent sign-in', async () => {
    const page = data(await api('/api/v1/account/export?section=letters&limit=10', owner));
    check(
      page.items.some((l) => l.id === letter.id),
      'Export must include the letter.',
    );
    const notes = data(await api('/api/v1/account/export?section=notes', owner));
    check(Array.isArray(notes.items), 'Export must include notes.');
  });

  await group('editing the night removes its letter and stale work', async () => {
    data(
      await api(
        `/api/v1/entries/${entry.id}`,
        owner,
        json('PATCH', { text: 'Fictional edited night.', expected_revision: entry.revision }),
      ),
    );
    statusIs(await api(`/api/v1/letters/${letter.id}`, owner), 404, 'not_found');
    const memories = data(await api('/api/v1/memories', owner)).items;
    check(memories.length >= 1, 'Memories stay until the night is deleted.');
  });
}
