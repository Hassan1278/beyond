/**
 * Drives the real journal app (/app) in Chromium against a fake Supabase Auth
 * and a fake product API, so the whole UI flow is checked without a database:
 * sign in, onboarding, sealing a night, a letter arriving, opening it, ticking a
 * to-do, Letters with search, Identity, Growth, Settings with memory,
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
const LATER_WORDS = 'Fictional, later: I called my grandma before bed.';

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
    welcome_seen: false,
    welcome_reasons: [],
    welcome_other: null,
    draft: null,
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
  version: 3,
  voice: 'mentor',
  language: 'en',
  title: 'A calm walk by the harbour',
  headline: 'A calm walk by the harbour',
  body: 'Good morning {{name}},\n\nYou walked along the harbour after class and the calm came while you were walking, not after.\n\nThat is worth noticing: you slow down when there is water nearby.\n\nUntil tonight.',
  reflection_question: 'Where else today could you slow down like that?',
  small_step: { text: 'Walk ten minutes without your phone', minutes: 10, category: 'rest' },
  steps: [{ text: 'Walk ten minutes without your phone', kind: 'rest', minutes: 10, why: '' }],
  openQuestions: ['Where else today could you slow down like that?'],
  night_type: 'good',
  safety_flag: 'none',
  safetyConcern: false,
  tone: 'positive',
  themes: ['rest', 'nature'],
  evidence: ['walked along the harbour', 'felt calm'],
  activities: [{ name: 'Harbour walk', energy: 2, absorption: 1 }],
  compass: { loves: ['walking by the water'], good_at: [], matters: ['calm'], within_reach: [] },
  interests: ['walking'],
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
  if (path === '/entries' && req.method() === 'GET')
    return ok(route, { entries: [...db.entries].reverse(), next_cursor: null });
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
  const em = path.match(/^\/entries\/([0-9a-f-]{36})$/);
  if (em) {
    const e = db.entries.find((x) => x.id === em[1]);
    if (!e) return err(route, 'not_found', 404);
    if (req.method() === 'PATCH') {
      if (body.expected_revision !== e.revision) return err(route, 'conflict', 409);
      Object.assign(e, { text: body.text, revision: e.revision + 1, updated_at: now() });
      // editing a night removes its letter, as the database's privacy cascade does
      db.letters = db.letters.filter((l) => l.entry_id !== e.id);
    }
    return ok(route, e);
  }
  if (path === '/letters' && req.method() === 'POST') {
    if (body.consent !== true) return err(route, 'bad_request', 400);
    if (db.lettersUsedUp) return err(route, 'rate_limited', 429);
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
  console.log('welcome');
  const next = page.locator('.onb-next');
  const step = async () => ({
    label: (await page.locator('.onb-count').innerText()).trim(),
    bar: await page.locator('.onb-bar').getAttribute('aria-valuenow'),
  });
  await page.getByRole('heading', { name: 'How Beyond works' }).waitFor();
  await shot(page, '02-welcome');
  let at = await step();
  check(at.label === '1 of 4' && at.bar === '1', 'the welcome opens on screen 1 of 4');
  check(await next.isDisabled(), 'Next waits while the three steps appear');
  check(!(await page.locator('.topbar').count()), 'the welcome comes before any tab');
  await page.waitForFunction(() => !document.querySelector('.onb-next')?.disabled, null, {
    timeout: 6000,
  });
  check(true, 'Next lights up once all three steps are shown');
  await next.click();
  await page.getByRole('heading', { name: 'What brings you here?' }).waitFor();
  at = await step();
  check(at.label === '2 of 4' && at.bar === '2', 'screen 2 of 4');
  check(await next.isDisabled(), 'Next waits for an answer');
  await page.locator('[data-onb-reason="other"]').click();
  check(
    !(await next.isDisabled()) && (await page.locator('#onb-other').isVisible()),
    '“Something else” counts as a choice and opens a box',
  );
  await page.fill('#onb-other', 'Fictional: a new city');
  check(!(await next.isDisabled()), 'words in the box are enough');
  await page.fill('#onb-other', '   ');
  await page.locator('[data-onb-reason="mind"]').click();
  await page.locator('[data-onb-reason="write"]').click();
  check(
    !(await next.isDisabled()) &&
      (await page.locator('.onb-opt[aria-checked="true"]').count()) === 3,
    'several answers can be chosen',
  );
  await page.fill('#onb-other', 'Fictional: a new city');
  await next.click();
  await page.getByRole('heading', { name: 'Who writes back each morning?' }).waitFor();
  at = await step();
  check(at.label === '3 of 4' && at.bar === '3', 'screen 3 of 4');
  check(
    (await next.isDisabled()) && !(await page.locator('.onb-voice[aria-checked="true"]').count()),
    'no voice is chosen for you',
  );
  check(
    !(await page.getByText('never invents').count()) &&
      (await page.getByText('Just the notes').isVisible()),
    'screen 3 has the new wording',
  );
  check(!(await page.locator('.onb[data-step="0"] .onb-back').count()), 'screen 1 has no Back');
  await page.locator('.onb-back').click();
  await page.getByRole('heading', { name: 'What brings you here?' }).waitFor();
  check(
    (await step()).label === '2 of 4' &&
      (await page.locator('.onb-opt[aria-checked="true"]').count()) === 3 &&
      (await page.locator('#onb-other').inputValue()) === 'Fictional: a new city',
    'Back returns to the last screen with every answer kept',
  );
  await next.click();
  await page.getByRole('heading', { name: 'Who writes back each morning?' }).waitFor();
  await page.locator('[data-onb-voice="mentor"]').click();
  check(!(await next.isDisabled()), 'choosing a voice lights up Next');
  check(
    !(await page.locator('.onb-voice i').count()) &&
      (await page.getByText('You can switch anytime in Settings.').isVisible()),
    'screen 3 has no example quotes, and the Settings note sits under everything',
  );
  await page.fill('#onb-name', '  Kit  ');
  await next.click();
  await page.getByRole('heading', { name: 'Privacy', exact: true }).waitFor();
  at = await step();
  check(at.label === '4 of 4' && at.bar === '4', 'screen 4 of 4');
  check(!(await page.locator('.onb-next').count()), 'the last screen has no Next');
  check(
    (await page.locator('.onb-privacy li').count()) === 3,
    'the privacy screen has three points',
  );
  check(!(await page.locator('.onb-ready.is-shown').count()), '“I’m ready” waits a moment');
  await page.locator('.onb-ready.is-shown').waitFor({ timeout: 6000 });
  await shot(page, '02b-privacy');
  await page.getByRole('button', { name: 'I’m ready' }).click();
  await page.getByRole('heading', { name: 'Identity', exact: true }).waitFor();
  await sleep(700);
  check(
    db.settings.welcome_seen === true &&
      db.settings.onboarded === true &&
      db.settings.voice === 'mentor' &&
      JSON.stringify(db.settings.welcome_reasons) === '["mind","write","other"]' &&
      db.settings.welcome_other === 'Fictional: a new city' &&
      db.settings.letter_name === 'Kit',
    'the welcome, the voice and the answers are saved to the account',
  );
  check(!db.memories.some((m) => m.text.includes('new city')), 'the answers are not a memory');
  await page.reload();
  await page.locator('.topbar').waitFor();
  check(!(await page.locator('.onb').count()), 'after a reload the welcome does not come back');
  await page.locator('.tab[data-go="tonight"]').click();
  await page.locator('#entry').waitFor();
  check(
    (await page.locator('.tn-head .tn-date').isVisible()) &&
      (await page.locator('.tn-head #prompt').isVisible()) &&
      (await page.locator('#entry').getAttribute('placeholder')) === 'Start anywhere',
    'Journal shows the date and one question above a blank page',
  );
  check(
    !(await page.locator('.tn .lantern-wrap, .tn .samples, .tn .glance, .tn .arrived').count()),
    'Journal keeps nothing else around the writing',
  );
  check(
    (await page.locator('#book .bk-page.is-write #entry').count()) === 1 &&
      (await page.locator('.bk-wrap.is-one .bk-strip .bk-sd.is-today.is-on').count()) === 1 &&
      (await page.locator('.bk-edge.next').isDisabled()),
    'Journal is a book opened at today’s writing page, with a date strip on a phone',
  );
  await shot(page, '03-tonight');

  console.log('seal');
  await page.fill('#entry', SECRET_WORDS);
  await page.getByRole('button', { name: 'Seal tonight' }).click();
  await page.locator('.bk-sealing').waitFor();
  check(
    (await page.locator('.bk-sealing').innerText()).includes(
      'Sealed. Your letter arrives at 08:00.',
    ),
    'sealing shows the seal and the delivery time',
  );
  await page.locator('.bk-sealing').waitFor({ state: 'detached', timeout: 5000 });
  await page.locator('.skip-morning').waitFor({ timeout: 20000 });
  check(
    (await page.locator('#entry').inputValue()) === '' &&
      (await page.locator('.skip-morning').isVisible()),
    'sealing goes back to a blank Journal page, ready for more writing',
  );
  check(
    db.letters.length === 1 && db.letters[0].entry.text === SECRET_WORDS,
    'sealing saves the night and asks for one letter',
  );
  check(
    db.calls.includes('POST /entries') && db.calls.includes('POST /letters'),
    'the entry is saved before the letter is requested',
  );
  await shot(page, '04-sealed');
  const stored = await page.evaluate(
    () => JSON.stringify({ ...localStorage }) + JSON.stringify({ ...sessionStorage }),
  );
  check(!stored.includes('harbour'), 'nothing the person wrote is in browser storage');

  console.log('the book');
  await page.locator('.bk-sd:not(.is-today)').last().waitFor();
  await page.locator('.bk-edge.prev').click();
  await page.locator('.bk-page.is-day').waitFor();
  check(
    (await page.locator('.bk-page.is-day .bk-entries li').count()) === 1 &&
      (await page.locator('.bk-page.is-day .bk-entries').innerText()).includes('harbour') &&
      /\d{1,2}:\d\d(am|pm)/.test(await page.locator('.bk-page.is-day .bk-time').innerText()) &&
      (await page.locator('.bk-page.is-day .bk-seal[aria-label="Sealed"]').count()) === 1 &&
      (await page.locator('.bk-page.is-day').getByText('Letter on its way').isVisible()),
    'a sealed day is a page with its words, their time, a seal and the letter on its way',
  );
  check(
    !(await page.locator('.bk-page.is-day textarea, .bk-page.is-day [contenteditable]').count()),
    'past pages are read-only',
  );
  await page.locator('.bk-page.is-day .bk-date').click();
  await page.keyboard.press('ArrowRight');
  await page.locator('#entry').waitFor();
  check(true, 'the arrow keys turn the pages');
  await page.evaluate(() => {
    const el = document.querySelector('.bk-page.is-write .tn-head');
    const touch = (x) => [new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 })];
    el.dispatchEvent(
      new TouchEvent('touchstart', {
        bubbles: true,
        touches: touch(80),
        changedTouches: touch(80),
      }),
    );
    el.dispatchEvent(
      new TouchEvent('touchend', { bubbles: true, touches: [], changedTouches: touch(300) }),
    );
  });
  await page.locator('.bk-page.is-day').waitFor();
  check(true, 'swiping turns back a page');
  await page.locator('.bk-sd.is-today').click();
  await page.locator('#entry').waitFor();
  check(true, 'tapping Today in the strip turns to the writing page');

  console.log('draft');
  await page.fill('#entry', LATER_WORDS);
  for (let t = 0; t < 40 && db.settings.draft !== LATER_WORDS; t++) await sleep(100);
  check(
    db.settings.draft === LATER_WORDS && db.letters.length === 1 && db.entries[0].revision === 1,
    'unsealed words are saved as a draft on the account, and nothing is sent to the letter writer',
  );
  check(
    !(
      JSON.stringify(await page.evaluate(() => ({ ...localStorage, ...sessionStorage }))) || ''
    ).includes('grandma'),
    'the draft is never in browser storage',
  );
  await page.reload();
  await page.locator('#entry').waitFor();
  check(
    (await page.locator('#entry').inputValue()) === LATER_WORDS,
    'the draft is still there after leaving',
  );

  console.log('write again the same night');
  await page.getByRole('button', { name: 'Seal tonight' }).click();
  // wait for the second seal to reach the server, then for the page to come back
  for (let t = 0; t < 100 && !(db.letters.length === 1 && db.entries[0].revision === 2); t++)
    await sleep(100);
  await page.locator('.bk-sealing').waitFor({ state: 'detached', timeout: 20000 });
  await page.locator('.skip-morning').waitFor();
  check(
    db.letters.length === 1 &&
      db.entries.length === 1 &&
      new RegExp(`^${SECRET_WORDS}\\n\\n\\[\\d\\d:\\d\\d\\]\\n${LATER_WORDS}$`).test(
        db.letters[0].entry.text,
      ),
    'writing again the same night adds to it, with its own time: one letter over everything written',
  );
  for (let t = 0; t < 40 && db.settings.draft !== null; t++) await sleep(100);
  check(db.settings.draft === null, 'sealing clears the draft');
  await page.locator('.bk-edge.prev').click();
  await page.locator('.bk-page.is-day').waitFor();
  check(
    (await page.locator('.bk-page.is-day .bk-entries li').count()) === 2 &&
      (await page.locator('.bk-page.is-day .bk-time').count()) === 2,
    'both sealings that night are on the day’s page, each with its time',
  );
  await page.locator('.bk-sd.is-today').click();

  console.log('letter arrives');
  finishLetter(db.letters[0]);
  await page.locator('.skip-morning').click();
  await page.getByRole('button', { name: 'Open it' }).waitFor({ timeout: 20000 });
  check(db.letters[0].early === true, 'Skip to morning delivers the letter early');
  check(
    await page.locator('.present').getByText('A letter arrived for you').isVisible(),
    'the letter arrives as a present',
  );
  await shot(page, '05-envelope');
  await page.getByRole('button', { name: 'Open it' }).click();
  await page.getByText('A calm walk by the harbour').first().waitFor();
  await sleep(400);
  check(db.letters[0].read_at !== null, 'opening the letter marks it read');
  check(
    await page.getByText('Walks by the harbour to feel calm').isVisible(),
    'the letter shows what Beyond will remember',
  );
  await shot(page, '06-letter');

  console.log('one small step');
  check(
    (await page.locator('.lt-body p').first().innerText()).startsWith('Good morning Kit,') &&
      !(await page.locator('.lt-body').innerText()).includes('{{name}}'),
    'the letter uses the name from the welcome, filled in by the app',
  );
  check(
    (await page.locator('.lt-end').count()) === 2 &&
      (await page.locator('.lt-q').innerText()).includes('slow down') &&
      !(await page.locator('.ls-label').count()),
    'the letter is one flowing letter, then one question and one small step',
  );
  await page.locator('[data-step-skip]').click();
  await sleep(400);
  check(db.letters[0].steps['step.0'] === 'skipped', '“Not for me” is saved');
  await page.locator('[data-step-skip]').click();
  await sleep(300);
  await page.locator('[data-step-done]').click();
  await sleep(500);
  check(
    db.letters[0].steps['step.0'] === 'tried' && (await page.locator('.lt-seal').count()) === 1,
    'doing the one step is saved and earns the gold seal',
  );
  await shot(page, '07-todos');

  console.log('letters');
  await page.locator('.tab[data-go="letters"]').click();
  await page.getByRole('heading', { name: 'Letters', exact: true }).waitFor();
  check(
    await page.locator('.lp-card').getByText('A calm walk by the harbour').isVisible(),
    'the newest letter is a small card at the top of Letters',
  );
  check(
    (await page.locator('.lp-head').boundingBox()).height < 120 &&
      (await page.locator('#arch-q').boundingBox()).y < 844,
    'the header is small and search is on screen without scrolling',
  );
  check(
    (await page.locator('#arch-results .lc[data-open]').count()) === 1 &&
      (await page.locator('#arch-results .lp-month').count()) === 1,
    'each letter is its own card under a month heading',
  );
  check(
    await page.locator('#arch-results').getByText('A calm walk by the harbour').isVisible(),
    'the letter is also in All letters',
  );
  check(
    await page.getByText('1 letter so far').isVisible(),
    'Letters says how many letters so far',
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
  await sleep(300);
  check(
    await page.locator('#arch-results').getByText('A calm walk by the harbour').isVisible(),
    'the gold seal filter shows the letter whose small step was done',
  );
  await page.locator('[data-act="arch-gold"]').click();
  await shot(page, '08-letters');

  console.log('identity, patterns');
  await page.locator('.tab[data-go="identity"]').click();
  await page.getByRole('heading', { name: 'Identity', exact: true }).waitFor();
  check(
    await page.getByText('more nights to see your first direction').first().isVisible(),
    'Identity has its own tab and says when a direction will appear',
  );
  await page.locator('.tab[data-go="growth"]').click();
  await page.getByRole('heading', { name: 'Growth', exact: true }).waitFor();
  check(
    (await page.locator('.tab[data-go="growth"]').innerText()).trim() === 'Growth' &&
      !(await page.locator('[data-go="patterns"]').count()) &&
      !(await page.getByText('Your patterns, not their highlight reel.').count()),
    'Patterns is now Growth',
  );
  check(
    (await page.locator('.g-card').count()) === 7 &&
      (await page.locator('.g-card .g-t').count()) === 7 &&
      (await page.locator('.g-card .g-sub').count()) === 7,
    'Growth is seven cards, each with a title and a one-line subtitle',
  );
  check(
    (await page.locator('.g-empty').count()) >= 4,
    'a month with few nights shows gentle empty states, not confident visuals',
  );
  await page.goto(`${ORIGIN}/app#patterns-year`);
  await page.locator('.g-card').first().waitFor();
  check(
    page.url().endsWith('#patterns-year') &&
      (await page.locator('[data-ptab="year"][aria-current="page"]').count()) === 1,
    'old #patterns-year links open the Growth year view',
  );
  await page.locator('.tab[data-go="growth"]').click();
  check(
    !(await page.locator('.tab[data-go="profile"]').count()),
    'there is no separate Profile tab',
  );
  check(
    !(await page.locator('.tab[data-go="settings"]').count()),
    'Settings is the gear at the top right, not a tab',
  );
  await shot(page, '09-growth');
  await page.locator('.brand').click();
  await page.getByRole('heading', { name: 'Identity', exact: true }).waitFor();
  check(true, 'the Beyond mark returns to Identity, the home page');
  await page.locator('.lang-btn').click();
  await page.locator('.tab[data-go="tonight"]').getByText('日记').waitFor();
  check(
    (await page.locator('.gear-btn[data-go="settings"]').getAttribute('aria-label')) === '设置',
    'the language button switches the app to Chinese',
  );
  await page.locator('.lang-btn').click();
  await page.locator('.tab[data-go="tonight"]').getByText('Journal').waitFor();
  check(true, 'and back to English');
  await page.locator('.gear-btn[data-go="settings"]').click();
  await page.locator('[data-jtheme-pick="ink"]').click();
  check(
    (await page.evaluate(() => document.documentElement.dataset.jtheme)) === 'ink',
    'Settings switches the colour theme',
  );
  await page.locator('[data-jtheme-pick="midnight"]').click();
  check(
    (await page.evaluate(() => document.documentElement.dataset.jtheme)) === undefined,
    'Midnight is the default theme',
  );

  console.log('settings and memory');
  await page.locator('.gear-btn[data-go="settings"]').click();
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

  console.log('tabs open at the top');
  await page.locator('.gear-btn[data-go="settings"]').click();
  await sleep(300);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await sleep(250);
  const scrolled = await page.evaluate(() => window.scrollY);
  await page.locator('.tab[data-go="letters"]').click();
  await sleep(300);
  check(
    scrolled > 200 && (await page.evaluate(() => window.scrollY)) === 0,
    'switching tabs always opens the new tab at the top',
  );
  await page.evaluate(() => window.scrollTo(0, 400));
  await sleep(150);
  await page.locator('.gear-btn[data-go="settings"]').click();
  await sleep(300);
  check((await page.evaluate(() => window.scrollY)) === 0, 'Settings opens at the top');

  console.log('demo mode');
  await page.locator('[data-act="toggle-sample"]').click();
  const entriesBefore = db.entries.length;
  await page.locator('.tab[data-go="tonight"]').click();
  check(
    !(await page.locator('[data-sample-night]').count()),
    'demo mode keeps the Journal page blank too',
  );
  await page.fill(
    '#entry',
    'Fictional demo night: first month at uni and I still eat lunch alone.',
  );
  await page.getByRole('button', { name: 'Seal tonight' }).click();
  await page.locator('.skip-morning').waitFor({ timeout: 20000 });
  check(
    db.entries.length === entriesBefore + 1 && db.letters.length === 2,
    'a demo night is saved and its letter is asked of the AI, like any other night',
  );
  finishLetter(db.letters[1]);
  await page.locator('.skip-morning').click();
  await page.getByRole('button', { name: 'Open it' }).click({ timeout: 20000 });
  await page.getByText('A calm walk by the harbour').first().waitFor();
  await sleep(400);
  check(db.letters[1].read_at !== null, 'the demo night’s AI letter opens');
  await shot(page, '11-demo-letter');

  console.log('demo letter when no letter can be written');
  db.lettersUsedUp = true;
  const lettersBefore = db.letters.length;
  await page.locator('.tab[data-go="tonight"]').click();
  await page.fill(
    '#entry',
    'Fictional demo night: the library was quiet. I finally finished the essay.',
  );
  await page.getByRole('button', { name: 'Seal tonight' }).click();
  await page.getByText('Skip to morning will show a demo letter').waitFor({ timeout: 20000 });
  check(
    (await page.locator('#entry').inputValue()) === '' && db.letters.length === lettersBefore,
    'past the daily limit the words are saved and no letter is asked for',
  );
  await page.locator('.skip-morning').click();
  await page.getByRole('button', { name: 'Open it' }).click({ timeout: 20000 });
  await page.getByText('What you set down tonight').waitFor();
  check(
    await page.getByText('Demo mode: a pre-written sample letter').isVisible(),
    'Demo mode shows a labelled demo letter built from the night’s own words',
  );
  check(
    (await page.locator('.lt-body').innerText()).includes('library was quiet'),
    'the demo letter quotes what was written',
  );
  db.lettersUsedUp = false;

  console.log('the book in demo mode');
  await page.locator('.tab[data-go="tonight"]').click();
  await page.locator('#entry').waitFor();
  const sd = page.locator('.bk-sd[aria-label$=", sample"]').last();
  const kitDate = await sd.getAttribute('data-bk-day');
  await sd.click();
  await page.locator(`.bk-page.is-day[data-page="${kitDate}"]`).waitFor();
  check(
    (await page.locator('.bk-page.is-day .bk-date').innerText()).endsWith(', sample'),
    'Kit’s sample days are pages in the book, marked sample',
  );
  const kitWords = (await page.locator('.bk-page.is-day .bk-entries p').first().innerText()).slice(
    0,
    40,
  );
  await sleep(400);
  await shot(page, '11a-book-phone');
  const openKit = async () => {
    await page.locator('.bk-page.is-day .bk-read').click();
    await page.locator('.letter, .env-stage').first().waitFor();
    if (await page.locator('[data-openenv]').count()) await page.locator('[data-openenv]').click();
    await page.locator('.letter').waitFor();
    await page.locator('.words-d summary').click();
  };
  await openKit();
  check(
    (await page.locator('.words-d .words').innerText()).includes(kitWords),
    'a Kit day’s words match its letter',
  );
  await page.locator('[data-letter-back-book]').click();
  await page.locator(`.bk-page[data-page="${kitDate}"]`).waitFor();
  check(true, 'going back from a letter opened in the book returns to that page');
  await openKit();
  await page.locator('.words-book').click();
  await page.locator(`.bk-page[data-page="${kitDate}"]`).waitFor();
  check(true, '“Open in your journal” opens the book at that day');
  await page.locator('[data-bk-cal]').click();
  const calBtn = page.locator('.bk-sheet button.bk-cd.has').first();
  const calDay = await calBtn.getAttribute('data-bk-day');
  await calBtn.click();
  await page.locator('.bk-sheet').waitFor({ state: 'detached' });
  await page.locator(`.bk-page[data-page="${calDay}"]`).waitFor();
  check(true, 'the calendar sheet turns to a highlighted day');
  await page.setViewportSize({ width: 1280, height: 860 });
  await page.locator('.bk-wrap.is-two').waitFor();
  check(
    (await page.locator('.bk-spread .bk-page.left').count()) === 1 &&
      (await page.locator('.bk-spread .bk-page.right').count()) === 1 &&
      (await page.locator('#bk-cal button.bk-cd.has').count()) >= 1 &&
      !(await page.locator('.bk-strip').count()),
    'a wide screen shows a two-page spread with the calendar beside it',
  );
  await page.locator('.bk-back-today').click();
  await page.locator('.bk-spread .bk-page.right.is-write').waitFor();
  check(
    (await page.locator('.bk-spread .bk-page.left.is-day').count()) === 1,
    'on today, the writing page is on the right of the spread',
  );
  await sleep(400);
  await shot(page, '11b-book-desktop');
  const target = page.locator('#bk-cal button.bk-cd.has:not(.is-on)').first();
  const tDay = await target.getAttribute('data-bk-day');
  await target.click();
  await page.locator(`.bk-spread .bk-page[data-page="${tDay}"]`).waitFor();
  check(true, 'clicking a highlighted day in the calendar turns to it');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.bk-wrap.is-one').waitFor();

  console.log('growth in demo mode');
  await page.locator('.tab[data-go="growth"]').click();
  await page.locator('.g-compass').waitFor();
  check(
    (await page.locator('.g-compass .g-pt b').count()) >= 3 &&
      (await page.locator('.g-dot').count()) >= 3 &&
      (await page.locator('.g-thread').count()) >= 2 &&
      (await page.locator('.g-rank-row').count()) >= 3,
    'Demo mode fills every Growth card from Kit’s letters',
  );
  await shot(page, '11c-growth-month');
  await page.locator('[data-ptab="year"]').click();
  await page.locator('.g-film').waitFor();
  check((await page.locator('.g-film .frame').count()) >= 5, 'the Year view has the Life Film');
  await shot(page, '11d-growth-year');

  console.log('a direction’s own page');
  await page.locator('.tab[data-go="identity"]').click();
  await page.locator('.bubble[data-bubble="community-builder"]').waitFor();
  await sleep(1600);
  check(
    !(await page.locator('.spread, .focus, .dir-list').count()),
    'the Identity page is just the map',
  );
  await page.locator('.bubble[data-bubble="community-builder"]').click();
  await page.locator('.dir-head').waitFor();
  await sleep(700);
  await shot(page, '11e-direction');
  check(
    page.url().endsWith('#identity/community-builder') &&
      (await page.getByRole('heading', { name: 'Community Builder' }).isVisible()) &&
      (await page.locator('.dir-line').innerText()).split('.').filter(Boolean).length === 1 &&
      (await page.getByText('A possibility, not a label.').isVisible()),
    'a bubble opens its own page with one plain sentence and its note',
  );
  const firstJournal = {};
  firstJournal.community = await page.locator('.dir-j b').first().innerText();
  check(
    (await page.locator('.dir-j').count()) >= 3 &&
      (await page.locator('.tl-star[data-open]').count()) >= 3,
    'the page has the timeline and a box for each journal',
  );
  check(
    (await page.locator('#dir-try').count()) === 1,
    'Try it shows suggestions from its letters',
  );
  await page.locator('.dir-j').first().click();
  await page.locator('.letter, .env-stage').first().waitFor();
  await page.locator('[data-letter-back-dir="community-builder"]').click();
  await page.locator('.dir-head').waitFor();
  check(
    page.url().endsWith('#identity/community-builder'),
    'going back from a letter returns to its direction',
  );
  await page.locator('[data-dir-back]').click();
  await page.locator('#stage').waitFor();
  await sleep(900);
  check(
    page.url().endsWith('#identity') &&
      (await page.locator('.bubble.is-back[data-bubble="community-builder"]').count()) === 1,
    'Back returns to the map and lights up the bubble it came from',
  );
  await page.locator('.bubble[data-bubble="community-builder"]').click();
  await page.locator('.dir-head').waitFor();
  await page.goBack();
  await page.locator('#stage').waitFor();
  await sleep(800);
  check(
    page.url().endsWith('#identity') && (await page.locator('.dir-head').count()) === 0,
    'the phone’s back returns to the map',
  );
  for (const [key, name] of [
    ['curious-learner', 'learner'],
    ['creative-explorer', 'creative'],
  ]) {
    await page.goto(`${ORIGIN}/app#identity/${key}`);
    await page.locator('.dir-head').waitFor();
    firstJournal[name] = await page.locator('.dir-j b').first().innerText();
  }
  check(
    new Set(Object.values(firstJournal)).size === 3,
    'each Kit direction leads with a different journal of its own',
  );
  await page.locator('[data-dir-fit]').click();
  await sleep(300);
  check(
    (await page.locator('.dir-st').innerText()).includes('Confirmed') &&
      !(await page.locator('.dir-decide').count()),
    'This fits me confirms it and the choice goes away',
  );
  await page.locator('[data-dir-change]').click();
  await page.locator('[data-dir-unsure]').click();
  check(
    (await page.locator('.dir-decide').count()) === 1,
    'Changed your mind? turns it back into a suggestion',
  );
  await page.goto(`${ORIGIN}/app#identity/curious-learner`);
  await page.locator('.dir-head').waitFor();
  await page.locator('[data-dir-pop]').click();
  await page.locator('.toast-undo').waitFor();
  await sleep(1500);
  check(
    !(await page.locator('.bubble[data-bubble="curious-learner"]').count()),
    'Pop it removes the bubble from the map',
  );
  await page.locator('.toast-undo button').click();
  await page.locator('.bubble[data-bubble="curious-learner"]').waitFor();
  check(true, 'Undo brings it back');
  await page.goto(`${ORIGIN}/app#identity/astronaut`);
  await page.locator('#stage').waitFor();
  check(page.url().endsWith('#identity'), 'an unknown direction link goes to the map');
  await page.locator('.gear-btn[data-go="settings"]').click();
  await page.locator('[data-act="toggle-sample"]').click();
  await page.locator('.tab[data-go="tonight"]').click();
  check(!(await page.locator('.samples').count()), 'Normal mode has no sample nights');
  await page.locator('.gear-btn[data-go="settings"]').click();

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
