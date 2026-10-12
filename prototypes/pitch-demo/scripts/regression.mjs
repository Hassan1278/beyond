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
const allCalls = [];
const pending = [];
let deferred = false;
const response = (url) =>
  url === '/api/themes'
    ? Response.json({ found: [{ id: 'behind', line: 'fictional theme line' }] })
    : Response.json({
        letter: {
          greet: 'Hello',
          said: 'Fictional response',
          rec: '',
          step: 'Take a walk.',
          sign: 'Fixture',
        },
        meta: { model: 'test-fixture', ms: 1 },
      });
globalThis.fetch = async (url, options = {}) => {
  if (options.method !== 'POST') return Response.json({ ok: true, model: 'test-fixture' });
  const call = { url, body: JSON.parse(options.body), signal: options.signal };
  allCalls.push(call);
  if (url === '/api/letter') calls.push(call);
  // Intentionally ignore cancellation to test the stale-response fence as well.
  return deferred
    ? new Promise((resolve) => {
        const finish = () => resolve(response(url));
        finish.url = url;
        pending.push(finish);
      })
    : response(url);
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
  const { Home } = await server.ssrLoadModule('/src/screens/Home.tsx');
  const { ThemePage } = await server.ssrLoadModule('/src/screens/ThemePage.tsx');
  const { ThemePicker } = await server.ssrLoadModule('/src/site/ThemePicker.tsx');
  const { readTheme } = await server.ssrLoadModule('/src/lib/theme.ts');
  const { validate, readBody, readWebBody, BodyFailure } =
    await server.ssrLoadModule('/api/letter.ts');
  const { validate: validateThemes } = await server.ssrLoadModule('/api/themes.ts');
  function Probe({ view }) {
    api = useBeyond();
    if (view === 'palette') return h(ThemePicker);
    if (view === 'map')
      return h(
        api.state.screen === 'theme'
          ? ThemePage
          : api.state.screen === 'memory'
            ? MemorySettings
            : Home,
        { state: api.state, live: true },
      );
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
    allCalls.length = 0;
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

  await check(
    'theme bubbles open their page and can be hidden and restored with the keyboard',
    async () => {
      await mount('map');
      await act(async () => document.querySelector('button.bub').click());
      assert.equal(api.state.screen, 'theme');
      assert.equal(api.state.openTheme, 'behind');
      assert.match(document.body.textContent, /Journal entries on feeling behind/);
      await actions({ type: 'go', screen: 'home' });
      await act(async () => button('Pop').click());
      const bubble = document.querySelector('button.bub');
      await act(async () =>
        bubble.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
      );
      await act(async () => new Promise((resolve) => setTimeout(resolve, 350)));
      assert.deepEqual(api.state.popped, ['behind']);
      assert.equal(document.querySelectorAll('button.bub').length, 6);
      await actions({ type: 'go', screen: 'memory' });
      await act(async () => button('Restore').click());
      await actions({ type: 'go', screen: 'home' });
      assert.equal(document.querySelectorAll('button.bub').length, 7);
    },
  );
  await check('leaving pop mode cancels an unfinished bubble hold', async () => {
    await mount('map');
    await act(async () => button('Pop').click());
    await act(async () =>
      document
        .querySelector('button.bub')
        .dispatchEvent(new window.Event('pointerdown', { bubbles: true })),
    );
    await act(async () => button('Done').click());
    await act(async () => new Promise((resolve) => setTimeout(resolve, 900)));
    assert.deepEqual(api.state.popped, []);
    assert.equal(document.querySelectorAll('button.bub').length, 7);
  });
  await check(
    'Night and Bloom switch, survive reloads and replace retired palettes safely',
    async () => {
      await mount('palette');
      await act(async () => document.querySelector('[aria-label="Bloom theme"]').click());
      assert.equal(document.documentElement.dataset.theme, 'bloom');
      assert.equal(readTheme(), 'bloom');
      await mount('palette', false);
      assert.equal(
        document.querySelector('[aria-label="Bloom theme"]').getAttribute('aria-pressed'),
        'true',
      );
      localStorage.setItem('beyond.theme', 'tide');
      await mount('palette', false);
      assert.equal(readTheme(), 'night');
      assert.equal(
        document.querySelector('[aria-label="Night theme"]').getAttribute('aria-pressed'),
        'true',
      );
    },
  );

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
      assert.ok(allCalls.every((call) => call.signal.aborted));
      await act(async () => {
        pending.splice(0).forEach((finish) => finish());
        await request;
      });
      assert.equal(api.state.entry, '');
      assert.equal(api.state.correction, '');
      assert.equal(api.state.fixText, '');
      assert.deepEqual(api.state.mems, []);
      assert.equal(api.state.ai.letter, null);
      assert.deepEqual(api.state.extract.found, []);
      assert.deepEqual(api.state.popped, []);
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
      JSON.stringify({
        deleted: true,
        entry,
        correction: entry,
        letter: { said: entry },
        found: [{ id: 'behind', line: { text: entry } }],
      }),
    );
    await mount('store', false);
    assert.equal(api.state.entry, '');
    assert.equal(api.state.correction, '');
    assert.equal(api.state.ai.letter, null);
    assert.deepEqual(api.state.extract.found, []);
    assert.deepEqual(JSON.parse(localStorage.getItem('beyond.demo.v1')), { deleted: true });
  });
  for (const action of [
    { type: 'reset' },
    { type: 'entry', entry: 'A different fictional entry.' },
    { type: 'voice', voice: 'future' },
    { type: 'mem/forget', index: 0 },
    { type: 'mem/pause' },
    { type: 'time', time: '08:00' },
    { type: 'fix/send' },
    { type: 'theme/pop', id: 'behind' },
    { type: 'theme/restore', id: 'behind' },
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
      assert.ok(allCalls.every((call) => call.signal.aborted));
      await act(async () => {
        pending.splice(0).forEach((finish) => finish());
        await request;
      });
      assert.equal(api.state.ai.letter, null);
      assert.notEqual(api.state.ai.status, 'writing');
      assert.deepEqual(api.state.extract.found, []);
      assert.notEqual(api.state.extract.status, 'writing');
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
      assert.equal(allCalls.filter((call) => call.url === '/api/themes').length, 0);
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
      pending.splice(0).forEach((finish) => finish());
      await first;
    });
    assert.equal(api.state.ai.status, 'ready');
  });
  await check(
    'a theme reply after the letter completes cannot revive deleted content',
    async () => {
      await mount();
      await configure();
      deferred = true;
      let request;
      await act(async () => {
        request = api.generate();
      });
      await act(async () => {
        pending.find((finish) => finish.url === '/api/letter')();
      });
      assert.equal(api.state.ai.status, 'ready');
      await actions({ type: 'del/confirm' });
      assert.equal(allCalls.find((call) => call.url === '/api/themes').signal.aborted, true);
      await act(async () => {
        pending.find((finish) => finish.url === '/api/themes')();
        await request;
      });
      assert.equal(api.state.ai.letter, null);
      assert.deepEqual(api.state.extract.found, []);
      assert.deepEqual(JSON.parse(localStorage.getItem('beyond.demo.v1')), { deleted: true });
    },
  );
  await check('scripted mode sends neither letter nor theme content', async () => {
    await mount();
    await actions({ type: 'entry', entry });
    await act(async () => api.generate());
    assert.equal(allCalls.length, 0);
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
      { ...valid, avoid: [null] },
      { ...valid, avoid: ['a'.repeat(61)] },
      [],
    ])
      assert.equal(typeof validate(input), 'string');
  });
  await check('theme requests reject malformed, excessive and unexpected context', async () => {
    const valid = { entry, themes: [{ id: 'behind', name: 'Feeling behind' }] };
    assert.equal(typeof validateThemes(valid), 'object');
    for (const input of [
      { ...valid, entry: 'a'.repeat(6001) },
      { ...valid, themes: [null] },
      { ...valid, themes: [{ id: 'behind', name: 'a'.repeat(61) }] },
      { ...valid, themes: [...valid.themes, ...valid.themes] },
      { ...valid, themes: Array(21).fill(valid.themes[0]) },
      { ...valid, owner: 'ignored-owner' },
      [],
    ])
      assert.equal(typeof validateThemes(input), 'string');
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
  await check(
    'Web adapters enforce body bytes, JSON parsing and cancellation deadlines',
    async () => {
      const request = (body) =>
        new Request('http://localhost/api/themes', { method: 'POST', body, duplex: 'half' });
      assert.deepEqual(await readWebBody(request(JSON.stringify({ entry }))), { entry });
      await assert.rejects(readWebBody(request('invalid JSON')), (e) => e.status === 400);
      await assert.rejects(readWebBody(request('a'.repeat(128001))), (e) => e.status === 413);
      let cancelled = false;
      const stalled = new ReadableStream({
        cancel() {
          cancelled = true;
        },
      });
      await assert.rejects(readWebBody(request(stalled), 15), (e) => e.status === 408);
      assert.equal(cancelled, true);
    },
  );
  console.log(`PASS regression group count: ${count}`);
} finally {
  if (root) await act(async () => root.unmount());
  await server.close();
  dom.window.close();
  globalThis.fetch = originalFetch;
}
