/**
 * Drives the real journal app (/app) in Chromium against a fake Supabase Auth
 * and a fake product API, so the whole UI flow is checked without a database:
 * sign in, onboarding, sealing a night, a letter arriving, opening it, ticking a
 * to-do, Letters with search, Identity, Patterns, Settings with memory,
 * export, Demo mode (a sample night sealed and answered by the AI), and
 * signing out.
 * Also checks that nothing the person writes is left in browser storage, and
 * that the site links in.
 *
 *   npm run build:web (with the NEXT_PUBLIC_* values below), then
 *   node tests/frontend/journal-smoke.mjs
 *
 * Everything is fictional. No network leaves the browser.
 */
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const PORT = Number(process.env.SMOKE_PORT ?? 3100);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const SB = 'https://sb.example.test';
const API = 'https://api.example.test';
const SHOTS = process.env.SMOKE_SHOTS ?? '';
const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'kit.fictional@example.test' };
const SECRET_WORDS = 'Fictional night: I walked along the harbour after class and felt calm.';

let failures = 0;
const check = (ok, message) => {
  if (!ok) {
    failures++;
    console.error(`  ✗ ${message}`);
  } else console.log(`  ✓ ${message}`);
};

/* ------------------------------------------------------------- fake backend */
const now = () => new Date().toISOString().replace(/(\.\d{3})Z$/, '$1000Z');
const uuid = () => crypto.randomUUID();
const db = {
  settings: {
    timezone: 'UTC',
    morning_time: '08:00',
    voice: 'friend',
    memory_paused: false,
    reflection_enabled: false,
    letter_language: 'auto',
    delivery_time: '08:00',
    allow_early: true,
    onboarded: false,
    directions: {},
    revision: 1,
    updated_at: now(),
  },
  entries: [],
  letters: [],
  memories: [],
  notes: [],
  calls: [],
};
const content = (entryId) => ({
  voice: 'mentor',
  greeting: 'Good morning.',
  signoff: 'Until tonight.',
  language: 'en',
  headline: 'A calm walk by the harbour',
  recap: 'You wrote that you walked along the harbour after class and felt calm.',
  analysis: [
    {
      lens: 'feeling',
      title: 'Calm after class',
      text: 'It might be that walking helps you land.',
      quote: 'felt calm',
      entryId,
    },
    {
      lens: 'pattern',
      title: 'Water helps',
      text: 'The harbour came up as a place to breathe.',
      quote: 'walked along the harbour',
      entryId,
    },
  ],
  challenge: { issue: 'Nothing needs fixing', cause: 'An ordinary good day.' },
  advice: { text: 'Walk the harbour again on Thursday.', why: 'You felt calm there.' },
  encouragement: 'You noticed the calm instead of rushing past it.',
  steps: [
    { text: 'Walk ten minutes without your phone', kind: 'rest', minutes: 10, why: 'Calm.' },
    { text: 'Send a friend the harbour photo', kind: 'connection', minutes: 3, why: 'Share it.' },
    { text: 'Write one line about the walk', kind: 'reflection', minutes: 3, why: 'Keep it.' },
  ],
  themes: ['rest', 'nature'],
  openQuestions: [],
  wins: [{ text: 'Walked after class', entryId }],
  tone: 'positive',
  safetyConcern: false,
  remember: [{ text: 'Walks by the harbour to feel calm', entryId }],
});
function finishLetter(letter) {
  letter.status = 'ready';
  letter.content = content(letter.entry_id);
  letter.model = 'claude-sonnet-5-5';
  letter.written_at = now();
  letter.revision++;
  db.memories.push({
    id: uuid(),
    text: 'Walks by the harbour to feel calm',
    source_entry_id: letter.entry_id,
    kind: 'learned',
    revision: 1,
    created_at: now(),
    updated_at: now(),
  });
}
const cors = {
  'access-control-allow-origin': ORIGIN,
  'access-control-allow-headers': 'authorization, content-type',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE',
  'access-control-expose-headers': 'X-Request-Id, Retry-After',
  'cache-control': 'no-store',
};
const ok = (route, data, status = 200) =>
  route.fulfill({
    status,
    headers: { ...cors, 'content-type': 'application/json' },
    body: JSON.stringify({ data }),
  });
const err = (route, code, status) =>
  route.fulfill({
    status,
    headers: { ...cors, 'content-type': 'application/json' },
    body: JSON.stringify({ error: { code, message: code, request_id: uuid() } }),
  });

async function api(route) {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  const url = new URL(req.url());
  const path = url.pathname.replace(/^\/api\/v1/, '');
  const body =
    req.postData() && req.headers()['content-type']?.includes('json')
      ? JSON.parse(req.postData())
      : null;
  db.calls.push(`${req.method()} ${path}`);
  if (req.headers().authorization !== 'Bearer header.fixture.signature')
    return err(route, 'unauthorized', 401);
  if (path === '/settings' && req.method() === 'GET') return ok(route, db.settings);
  if (path === '/settings' && req.method() === 'PATCH') {
    const { expected_revision, ...patch } = body;
    if (expected_revision !== db.settings.revision) return err(route, 'conflict', 409);
    Object.assign(db.settings, patch, { revision: db.settings.revision + 1, updated_at: now() });
    return ok(route, db.settings);
  }
  if (path === '/account')
    return ok(route, {
      status: 'active',
      capabilities: { account_deletion: false, letters: true, voice_transcription: false },
    });
  if (path === '/ai') return ok(route, { letters: true, notes: true, transcribe: false });
  if (path === '/letters' && req.method() === 'GET')
    return ok(route, { items: [...db.letters].reverse(), next_cursor: null });
  if (path === '/entries' && req.method() === 'POST') {
    const e = {
      id: uuid(),
      text: body.text,
      revision: 1,
      reflection_opt_in: false,
      created_at: now(),
      updated_at: now(),
    };
    db.entries.push(e);
    return ok(route, e);
  }
  if (path === '/letters' && req.method() === 'POST') {
    if (body.consent !== true) return err(route, 'bad_request', 400);
    const e = db.entries.find((x) => x.id === body.entry_id);
    const l = {
      id: uuid(),
      entry_id: e.id,
      journal_date: body.journal_date,
      voice: db.settings.voice,
      language: db.settings.letter_language,
      status: 'queued',
      content: null,
      model: null,
      written_at: null,
      deliver_at: body.deliver_at,
      read_at: null,
      early: false,
      private: false,
      steps: {},
      error: null,
      revision: 1,
      created_at: now(),
      updated_at: now(),
      entry: { id: e.id, text: e.text, created_at: e.created_at },
    };
    db.letters.push(l);
    return ok(route, l);
  }
  const m = path.match(/^\/letters\/([0-9a-f-]{36})$/);
  if (m) {
    const l = db.letters.find((x) => x.id === m[1]);
    if (!l) return err(route, 'not_found', 404);
    if (req.method() === 'PATCH') {
      if (body.read) l.read_at ??= now();
      if (body.early) l.early = true;
      if ('private' in body) l.private = body.private;
      if (body.steps) l.steps = body.steps;
      if (body.deliver_at) l.deliver_at = body.deliver_at;
      l.revision++;
    }
    return ok(route, l);
  }
  if (path === '/memories' && req.method() === 'GET')
    return ok(route, { items: db.memories, next_cursor: null });
  if (path === '/memories' && req.method() === 'POST') {
    const x = {
      id: uuid(),
      text: body.text,
      source_entry_id: null,
      kind: 'told',
      revision: 1,
      created_at: now(),
      updated_at: now(),
    };
    db.memories.push(x);
    return ok(route, x);
  }
  const mm = path.match(/^\/memories\/([0-9a-f-]{36})$/);
  if (mm && req.method() === 'DELETE') {
    db.memories = db.memories.filter((x) => x.id !== mm[1]);
    return ok(route, { id: mm[1] });
  }
  if (path === '/notes' && req.method() === 'GET') return ok(route, { items: db.notes });
  if (path === '/account/export') {
    const section = url.searchParams.get('section');
    const meta = { format_version: 1, exported_at: now(), section };
    if (section === 'settings') return ok(route, { ...meta, settings: db.settings });
    if (section === 'notes') return ok(route, { ...meta, items: db.notes });
    const items = { entries: db.entries, letters: db.letters, memories: db.memories, todos: [] }[
      section
    ];
    return ok(route, { ...meta, items, next_cursor: null });
  }
  return err(route, 'not_found', 404);
}

const session = () => ({
  access_token: 'header.fixture.signature',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'fixture-refresh',
  user: {
    id: USER.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: USER.email,
    app_metadata: {},
    user_metadata: {},
    created_at: now(),
  },
});
async function auth(route) {
  const req = route.request();
  const headers = {
    'access-control-allow-origin': ORIGIN,
    'access-control-allow-headers': '*',
    'content-type': 'application/json',
  };
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
  const url = new URL(req.url());
  if (url.pathname === '/auth/v1/token') {
    const b = JSON.parse(req.postData() ?? '{}');
    if (b.password !== 'fictional-password')
      return route.fulfill({
        status: 400,
        headers,
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials',
        }),
      });
    return route.fulfill({ status: 200, headers, body: JSON.stringify(session()) });
  }
  if (url.pathname === '/auth/v1/user')
    return route.fulfill({ status: 200, headers, body: JSON.stringify(session().user) });
  if (url.pathname === '/auth/v1/logout') return route.fulfill({ status: 204, headers });
  return route.fulfill({ status: 404, headers, body: '{}' });
}

/* -------------------------------------------------------------------- run */
const server = spawn('npx', ['next', 'start', '--hostname', '127.0.0.1', '--port', String(PORT)], {
  cwd: new URL('../../frontend/web/', import.meta.url).pathname,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
  detached: true,
});
// npx starts next-server as a child: stop the whole group.
const stopServer = () => {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    /* already gone */
  }
};
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE } : {},
);
const shot = async (page, name) => {
  if (!SHOTS) return;
  await mkdir(SHOTS, { recursive: true });
  await page.screenshot({ path: `${SHOTS}/${name}.png` });
};
try {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${ORIGIN}/app`)).ok) break;
    } catch {
      /* starting */
    }
    await sleep(500);
  }
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });
  await context.route(`${SB}/**`, auth);
  await context.route(`${API}/**`, api);
  await context.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) =>
    r.fulfill({ status: 200, body: '' }),
  );
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  console.log('sign in');
  await page.goto(`${ORIGIN}/app`);
  await page.getByText('Write tonight. A letter by morning.').waitFor();
  check(
    await page.locator('.mode-note').getByText('Demo mode').isVisible(),
    'the first page says Beyond starts in Demo mode',
  );
  await shot(page, '01-login');
  // The main flow runs in Normal mode; Demo mode is checked further down.
  await page.evaluate(() =>
    localStorage.setItem('beyond.prefs.v1', JSON.stringify({ mode: 'own' })),
  );
  await page.reload();
  await page.getByText('Write tonight. A letter by morning.').waitFor();
  await page.fill('#email', USER.email);
  await page.fill('#password', 'wrong');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByText('don’t match').waitFor();
  check(true, 'a wrong password is refused without saying whether the account exists');
  await page.fill('#password', 'fictional-password');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByRole('button', { name: 'Start my journal' }).waitFor();
  await shot(page, '02-welcome');

  console.log('onboarding');
  await page.getByRole('button', { name: 'Start my journal' }).click();
  await page.getByText('Who should write your morning letters?').waitFor();
  await page.locator('[data-voice="mentor"]').click();
  await page.getByRole('button', { name: 'Start writing' }).click();
  await page.locator('#entry').waitFor();
  await sleep(700);
  check(
    db.settings.voice === 'mentor' && db.settings.onboarded === true,
    'voice and onboarding are saved to the account',
  );
  check(
    await page.getByText('Write 3 more nights to see your first direction').isVisible(),
    'Tonight shows how far away the first Identity direction is',
  );
  await shot(page, '03-tonight');

  console.log('seal');
  await page.fill('#entry', SECRET_WORDS);
  await page.getByRole('button', { name: 'Seal tonight' }).click();
  await page.getByText('Sealed for the night.').waitFor();
  check(
    db.letters.length === 1 && db.letters[0].entry.text === SECRET_WORDS,
    'sealing saves the night and asks for one letter',
  );
  check(
    db.calls.includes('POST /entries') && db.calls.includes('POST /letters'),
    'the entry is saved before the letter is requested',
  );
  await page.getByText('Claude is writing quietly').waitFor();
  await shot(page, '04-sealed');
  const stored = await page.evaluate(
    () => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }),
  );
  check(!stored.includes('harbour'), 'nothing the person wrote is in browser storage');

  console.log('letter arrives');
  finishLetter(db.letters[0]);
  await page.getByRole('button', { name: 'Read it now' }).click();
  await page.getByRole('button', { name: 'Open the letter' }).waitFor({ timeout: 20000 });
  check(db.letters[0].early === true, 'reading early is recorded');
  await shot(page, '05-envelope');
  await page.getByRole('button', { name: 'Open the letter' }).click();
  await page.getByText('A calm walk by the harbour').first().waitFor();
  await sleep(400);
  check(db.letters[0].read_at !== null, 'opening the letter marks it read');
  check(
    await page.getByText('Walks by the harbour to feel calm').isVisible(),
    'the letter shows what Beyond will remember',
  );
  await shot(page, '06-letter');

  console.log('to-dos');
  await page.locator('[data-todo]').first().click();
  await page.locator('[data-check="0"]').click();
  await sleep(500);
  check(db.letters[0].steps['step.0'] === 'tried', 'ticking a to-do is saved');
  await page.locator('[data-skip="1"]').click();
  await sleep(500);
  check(db.letters[0].steps['step.1'] === 'skipped', '“Not for me” is saved');
  await shot(page, '07-todos');
  await page.getByRole('button', { name: 'Done', exact: true }).click();

  console.log('letters');
  await page.locator('.tab[data-go="letters"]').click();
  await page.getByRole('heading', { name: 'Letters', exact: true }).waitFor();
  check(
    await page.locator('.cover').getByText('A calm walk by the harbour').isVisible(),
    'the newest letter is the cover of Letters',
  );
  check(
    await page.locator('#arch-results').getByText('A calm walk by the harbour').isVisible(),
    'the letter is also in All letters',
  );
  check(
    await page.getByText('1 night written since').isVisible(),
    'Letters counts the nights written',
  );

  console.log('search all letters');
  await page.fill('#arch-q', 'HARBOUR');
  await page.locator('#arch-count').getByText('1 letter matches').waitFor();
  check(
    (await page.locator('#arch-results mark').count()) > 0,
    'search is case-insensitive and highlights the words',
  );
  await page.fill('#arch-q', 'phone');
  await page.locator('#arch-count').getByText('1 letter matches').waitFor();
  check(
    await page.locator('#arch-results').getByText('To-do').isVisible(),
    'search finds words in to-dos and says where they were',
  );
  await page.fill('#arch-q', 'nothing like this');
  await page.getByText('Nothing matches').waitFor();
  await page.fill('#arch-q', '');
  await page.locator('[data-act="arch-gold"]').click();
  await page.getByText('Nothing matches').waitFor();
  check(true, 'the gold seal filter hides letters without one');
  await page.locator('[data-act="arch-gold"]').click();
  await shot(page, '08-letters');

  console.log('identity, patterns');
  await page.locator('.tab[data-go="identity"]').click();
  await page.getByRole('heading', { name: 'Who you might become' }).waitFor();
  check(
    await page.getByText('more nights to see your first direction').first().isVisible(),
    'Identity has its own tab and says when a direction will appear',
  );
  await page.locator('.tab[data-go="patterns"]').click();
  await page.getByText('Your patterns, not their highlight reel.').waitFor();
  check(
    !(await page.locator('[data-ptab="identity"]').count()),
    'Patterns no longer holds Identity',
  );
  check(
    !(await page.locator('.tab[data-go="profile"]').count()),
    'there is no separate Profile tab',
  );
  await shot(page, '09-patterns');

  console.log('settings and memory');
  await page.locator('.tab[data-go="settings"]').click();
  await page.getByRole('heading', { name: 'Settings', exact: true }).waitFor();
  check(
    await page.getByText('Walks by the harbour to feel calm').isVisible(),
    'Settings lists what Beyond remembers',
  );
  await page.fill('#mem-new', 'Fictional: likes rainy mornings');
  await page.getByRole('button', { name: 'Remember' }).click();
  await page.getByText('Fictional: likes rainy mornings').waitFor();
  check(
    db.memories.some((x) => x.kind === 'told'),
    'a told memory is saved',
  );
  await page.locator('[data-memforget]').first().click();
  await sleep(500);
  check(db.memories.length === 1, 'forgetting a memory deletes it');
  check(
    await page.getByText(USER.email).isVisible(),
    'Settings shows which account the journal belongs to',
  );
  await shot(page, '10-settings');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download a copy' }).click();
  const file = await download;
  check(
    file.suggestedFilename().startsWith('beyond-journal-'),
    'Download a copy exports the account',
  );

  console.log('demo mode');
  await page.locator('[data-act="toggle-sample"]').click();
  const entriesBefore = db.entries.length;
  await page.locator('.tab[data-go="tonight"]').click();
  await page.locator('[data-sample-night="0"]').click();
  check(
    (await page.locator('#entry').inputValue()).startsWith('First month at uni'),
    'demo mode offers sample nights that fill the page in one tap',
  );
  await page.getByRole('button', { name: 'Seal tonight' }).click();
  await page.getByText('Sealed for the night.').waitFor();
  check(
    db.entries.length === entriesBefore + 1 && db.letters.length === 2,
    'a demo night is saved and its letter is asked of the AI, like any other night',
  );
  finishLetter(db.letters[1]);
  await page.getByRole('button', { name: 'Skip to morning' }).click();
  await page.getByRole('button', { name: 'Open the letter' }).click({ timeout: 20000 });
  await page.getByText('A calm walk by the harbour').first().waitFor();
  await sleep(400);
  check(db.letters[1].read_at !== null, 'the demo night’s AI letter opens');
  await shot(page, '11-demo-letter');
  await page.locator('.tab[data-go="settings"]').click();
  await page.locator('[data-act="toggle-sample"]').click();
  await page.locator('.tab[data-go="tonight"]').click();
  check(!(await page.locator('.samples').count()), 'Normal mode has no sample nights');

  console.log('sign out');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await page.getByText('Write tonight. A letter by morning.').waitFor();
  const after = await page.evaluate(() => JSON.stringify({ ...sessionStorage }));
  check(!after.includes('fixture-refresh'), 'signing out removes the session from the browser');

  console.log('site');
  await page.goto(`${ORIGIN}/#/`);
  await page.locator('a[href="/app"]').first().waitFor();
  check(true, 'the site links to the app');
  await shot(page, '12-site');
  for (const [path, words] of [
    ['/how', 'Say it whenever. Understand it tomorrow.'],
    ['/privacy', 'Safe enough to be honest.'],
    ['/institutions', 'Somewhere to put it down'],
    ['/beta', 'Tonight, write without an audience.'],
  ]) {
    await page.goto(`${ORIGIN}/#${path}`);
    await page.locator('main').getByText(words).first().waitFor({ timeout: 10000 });
  }
  check(true, 'every site page renders');
  await page.goto(`${ORIGIN}/#/app`);
  await page.waitForURL(`${ORIGIN}/app`);
  check(true, 'old #/app links open the app');

  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.join(' | ')}` : ''}`);
  await context.close();
} catch (e) {
  failures++;
  console.error(e);
} finally {
  await browser.close();
  stopServer();
}
console.log(failures ? `${failures} check(s) failed.` : 'Journal app flow passed.');
process.exit(failures ? 1 : 0);
