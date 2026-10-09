/** Behavioral checks use fictional data and mocked responses; never call a provider. */
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { createServer } from 'vite';
import { JSDOM } from 'jsdom';
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
for (const key of ['window', 'document', 'localStorage', 'HTMLElement', 'Event', 'MouseEvent'])
  globalThis[key] = dom.window[key];
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalFetch = globalThis.fetch;
const calls = [];
const pending = [];
let deferred = false;
const response = () =>
  Response.json({
    letter: {
      greet: 'Hello',
      said: 'Fictional response',
      rec: '',
      step: 'Take a walk.',
      sign: 'Fixture',
    },
    meta: { model: 'test-fixture', ms: 1 },
  });
globalThis.fetch = async (_url, options = {}) => {
  if (options.method !== 'POST') return Response.json({ ok: true, model: 'test-fixture' });
  calls.push({ body: JSON.parse(options.body), signal: options.signal });
  // Intentionally ignore cancellation to test the stale-response fence as well.
  return deferred ? new Promise((resolve) => pending.push(() => resolve(response()))) : response();
};
const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});
let root;
let api;
let count = 0;
const entry = 'Fictional entry about an upcoming exam and a walk.';
const button = (text) =>
  [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === text);

try {
  const { BeyondProvider, useBeyond } = await server.ssrLoadModule('/src/state/store.tsx');
  const { TryOneNight } = await server.ssrLoadModule('/src/site/TryOneNight.tsx');
  const { MemorySettings } = await server.ssrLoadModule('/src/screens/MemorySettings.tsx');
  const { validate, readBody, BodyFailure } = await server.ssrLoadModule('/api/letter.ts');
  function Probe({ view }) {
    api = useBeyond();
    return view === 'site'
      ? h(TryOneNight)
      : view === 'memory'
        ? h(MemorySettings, { state: api.state, live: true })
        : null;
  }
  async function unmount() {
    if (root) await act(async () => root.unmount());
    root = undefined;
  }
  async function mount(view = 'store', clear = true) {
    await unmount();
    if (clear) localStorage.clear();
    calls.length = 0;
    pending.length = 0;
    deferred = false;
    root = createRoot(document.getElementById('root'));
    await act(async () => root.render(h(BeyondProvider, null, h(Probe, { view }))));
  }
  async function actions(...items) {
    await act(async () => items.forEach((item) => api.dispatch(item)));
  }
  async function check(name, run) {
    await run();
    count++;
    console.log(`PASS ${name}`);
  }
  async function configure() {
    await actions({ type: 'entry', entry }, { type: 'source', source: 'ai' });
  }

  await check('voice change regenerates the site letter using the new voice', async () => {
    await mount('site');
    await configure();
    await act(async () => button('Leave it for tonight').click());
    assert.equal(api.state.ai.status, 'ready');
    assert.equal(calls.length, 1);
    await act(async () => button('Mentor').click());
    assert.equal(calls.length, 2);
    assert.equal(calls[1].body.voice, 'mentor');
    assert.equal(api.state.ai.status, 'ready');
    assert.equal(document.querySelector('.overnight'), null);
    assert.match(document.body.textContent, /Sample patterns/);
  });
  await check('site safety branch pauses sending until explicit acknowledgement', async () => {
    await mount('site');
    await configure();
    await actions({ type: 'entry', entry: 'Fictional safety test: I want to die tonight.' });
    await act(async () => button('Leave it for tonight').click());
    assert.equal(api.state.screen, 'safety');
    assert.ok(document.querySelector('.v-safety'));
    assert.equal(calls.length, 0);
    await act(async () => button('Back to my entry').click());
    assert.equal(api.state.screen, 'write');
    assert.equal(calls.length, 0);
    await act(async () => button('Leave it for tonight').click());
    await act(async () => button('I’m okay, seal my entry').click());
    assert.equal(api.state.screen, 'sealed');
    assert.equal(calls.length, 1);
  });
  await check(
    'delete clears all sensitive fields and late replies cannot restore them',
    async () => {
      await mount('memory');
      await configure();
      await actions({ type: 'fix/text', text: 'Fictional correction' }, { type: 'fix/send' });
      deferred = true;
      let request;
      await act(async () => {
        request = api.generate();
      });
      await act(async () => button('Delete everything').click());
      await act(async () => button('Delete everything').click());
      assert.equal(calls[0].signal.aborted, true);
      await act(async () => {
        pending.shift()();
        await request;
      });
      assert.equal(api.state.entry, '');
      assert.equal(api.state.correction, '');
      assert.equal(api.state.fixText, '');
      assert.deepEqual(api.state.mems, []);
      assert.equal(api.state.ai.letter, null);
      assert.deepEqual(JSON.parse(localStorage.getItem('beyond.demo.v1')), { deleted: true });
      await mount('store', false);
      assert.equal(api.state.entry, '');
      assert.equal(api.state.ai.letter, null);
      assert.deepEqual(api.state.mems, []);
    },
  );
  await check('older saved deletion markers scrub previously retained content', async () => {
    await unmount();
    localStorage.setItem(
      'beyond.demo.v1',
      JSON.stringify({ deleted: true, entry, correction: entry, letter: { said: entry } }),
    );
    await mount('store', false);
    assert.equal(api.state.entry, '');
    assert.equal(api.state.correction, '');
    assert.equal(api.state.ai.letter, null);
    assert.deepEqual(JSON.parse(localStorage.getItem('beyond.demo.v1')), { deleted: true });
  });
  for (const action of [
    { type: 'reset' },
    { type: 'entry', entry: 'A different fictional entry.' },
    { type: 'voice', voice: 'future' },
    { type: 'mem/forget', index: 0 },
    { type: 'source', source: 'scripted' },
  ])
    await check(`${action.type} invalidates stale requests`, async () => {
      await mount();
      await configure();
      deferred = true;
      let request;
      await act(async () => {
        request = api.generate();
      });
      await actions(action);
      assert.equal(calls[0].signal.aborted, true);
      await act(async () => {
        pending.shift()();
        await request;
      });
      assert.equal(api.state.ai.letter, null);
      assert.notEqual(api.state.ai.status, 'writing');
    });
  await check(
    'memory pause omits retained context while still sending the current entry',
    async () => {
      await mount();
      await configure();
      await actions(
        { type: 'fix/text', text: 'Fictional correction' },
        { type: 'fix/send' },
        { type: 'mem/pause' },
      );
      await act(async () => api.generate());
      assert.equal(calls[0].body.entry, entry);
      assert.deepEqual(calls[0].body.memories, []);
      assert.equal(calls[0].body.correction, undefined);
    },
  );
  await check('simultaneous generation calls send only one request', async () => {
    await mount();
    await configure();
    deferred = true;
    let first;
    await act(async () => {
      first = api.generate();
      await api.generate();
    });
    assert.equal(calls.length, 1);
    await act(async () => {
      pending.shift()();
      await first;
    });
    assert.equal(api.state.ai.status, 'ready');
  });
  await check('letter input rejects oversized or unexpected context', async () => {
    const valid = { entry, voice: 'friend' };
    assert.equal(typeof validate(valid), 'object');
    for (const input of [
      { ...valid, entry: 'a'.repeat(6001) },
      { ...valid, memories: ['a'.repeat(2001)] },
      { ...valid, memories: Array(21).fill('x') },
      { ...valid, memories: [123] },
      { ...valid, correction: 'a'.repeat(601) },
      { ...valid, today: 'a'.repeat(41) },
      { ...valid, time: '99:99' },
      { ...valid, owner: 'ignored-owner' },
      [],
    ])
      assert.equal(typeof validate(input), 'string');
  });
  await check('request-body byte limits cover both host-parsed and streamed JSON', async () => {
    const large = JSON.stringify({ entry: 'a'.repeat(128001) });
    await assert.rejects(
      readBody({ headers: {}, body: large }),
      (e) => e instanceof BodyFailure && e.status === 413,
    );
    await assert.rejects(
      readBody({ headers: {}, body: { entry: 'a'.repeat(128001) } }),
      (e) => e.status === 413,
    );
    const stream = new PassThrough();
    stream.headers = {};
    stream.end(large);
    await assert.rejects(readBody(stream), (e) => e.status === 413);
    stream.destroy();
  });
  await check('stalled body has a total deadline', async () => {
    const stream = new PassThrough();
    stream.headers = {};
    await assert.rejects(readBody(stream, 15), (e) => e.status === 408);
    stream.destroy();
  });
  console.log(`PASS regression group count: ${count}`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  dom.window.close();
  globalThis.fetch = originalFetch;
}
