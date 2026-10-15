import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
// Called by the already guarded local API runner. No hosted targets, traces,
// tokens, passwords, downloaded personal data or browser exceptions are logged.
export async function runBrowserAcceptance({
  root,
  group,
  check,
  createUser,
  randomUUID,
  api,
  rest,
  json,
  statusIs,
  letterTriggerSecret,
}) {
  const origin = 'http://127.0.0.1:3000';
  let processError = false,
    browser;
  const server = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules/next/dist/bin/next'),
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3000',
    ],
    {
      cwd: path.join(root, 'frontend/web'),
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  server.stdout.resume();
  server.stderr.resume();
  server.on('error', () => {
    processError = true;
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100 && !ready; attempt++) {
      if (processError) throw new Error('Web process failed.');
      try {
        ready = (await fetch(origin, { signal: AbortSignal.timeout(500) })).ok;
      } catch {
        /* startup */
      }
      if (!ready) await new Promise((resolve) => setTimeout(resolve, 100));
    }
    check(ready, 'Web client did not start.');
    browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', () => errors.push(true));
    page.setDefaultTimeout(15000);
    const first = await createUser('browser-a', randomUUID());
    const second = await createUser('browser-b', randomUUID());
    const signin = async (user) => {
      await page.locator('#email').fill(user.email);
      await page.locator('#password').fill(user.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    };
    const storageHas = (text) =>
      page.evaluate(
        (t) =>
          [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) =>
            value.includes(t),
          ),
        text,
      );
    await group('browser sign-in, onboarding and sealing a night on the real backend', async () => {
      await page.goto(origin + '/app');
      await page.getByText('Write tonight. A letter by morning.', { exact: true }).waitFor();
      await signin(first);
      await page.getByRole('button', { name: 'Start my journal', exact: true }).click();
      await page.getByRole('button', { name: 'Start writing', exact: true }).click();
      await page.locator('#entry').fill('Fictional browser private night by the harbour');
      await page.getByRole('button', { name: 'Seal tonight', exact: true }).click();
      await page.getByText('Sealed for the night.', { exact: true }).waitFor();
      check(!(await storageHas('Fictional browser')), 'Journal text entered browser storage.');
      await page.reload();
      await page.getByText('Sealed for the night.', { exact: true }).waitFor();
      const letters = statusIs(await api('/api/v1/letters', first), 200).data.items;
      check(
        letters.length === 1 &&
          letters[0].entry.text === 'Fictional browser private night by the harbour',
        'Sealing did not save the night with one letter.',
      );
    });
    await group('browser letter arrives, opens early and saves a to-do', async () => {
      const run = await api(
        '/api/v1/internal/letters/process',
        undefined,
        json('POST', { limit: 3 }, { Authorization: `Bearer ${letterTriggerSecret}` }),
      );
      check(statusIs(run, 200).data.written >= 1, 'Worker did not write the browser letter.');
      await page.getByRole('button', { name: 'Read it now', exact: true }).click();
      await page.getByRole('button', { name: 'Open the letter', exact: true }).click();
      await page.getByText('A fictional letter about your night').first().waitFor();
      await page.locator('[data-todo]').first().click();
      await page.locator('[data-check="0"]').click();
      await page.getByRole('button', { name: 'Done', exact: true }).click();
      await new Promise((resolve) => setTimeout(resolve, 500));
      const letter = statusIs(await api('/api/v1/letters', first), 200).data.items[0];
      check(letter.read_at !== null && letter.early === true, 'Opening early was not saved.');
      check(letter.steps['step.0'] === 'tried', 'Ticking a to-do was not saved.');
    });
    await group('browser memory, export and clearing the journal', async () => {
      await page.locator('.tab[data-go="profile"]').click();
      await page.locator('#mem-new').fill('Fictional browser approved memory');
      await page.getByRole('button', { name: 'Remember', exact: true }).click();
      await page.getByText('Fictional browser approved memory', { exact: true }).waitFor();
      await page.locator('.tab[data-go="settings"]').click();
      const download = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Download a copy', exact: true }).click();
      const file = await download;
      const exported = JSON.parse(await readFile(await file.path(), 'utf8'));
      check(
        exported.entries.some((e) => e.text === 'Fictional browser private night by the harbour'),
        'Browser export omitted the night.',
      );
      check(
        exported.memories.some((m) => m.text === 'Fictional browser approved memory'),
        'Browser export omitted a memory.',
      );
      check(
        exported.letters.length === 1 && Array.isArray(exported.notes),
        'Export omitted letters.',
      );
      await page.getByRole('button', { name: 'Delete my journal', exact: true }).click();
      await page.getByRole('button', { name: 'Delete everything', exact: true }).click();
      await page.getByText('Your journal was deleted.').waitFor();
      check(
        statusIs(await api('/api/v1/letters', first), 200).data.items.length === 0,
        'Clearing left letters behind.',
      );
    });
    await group('browser logout revokes old session and another account starts empty', async () => {
      const token = await page.evaluate(() => {
        for (const value of Object.values(sessionStorage)) {
          try {
            const session = JSON.parse(value);
            if (session.access_token) return session.access_token;
          } catch {
            /* unrelated key */
          }
        }
        return null;
      });
      check(typeof token === 'string', 'Browser session fixture was not captured.');
      const control = page.getByRole('button', { name: 'Sign out', exact: true });
      await control.scrollIntoViewIfNeeded();
      const [response] = await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/auth/v1/logout') && r.request().method() === 'POST',
        ),
        control.click(),
      ]);
      check(response.ok(), 'Server logout did not succeed.');
      await page.getByText('Write tonight. A letter by morning.', { exact: true }).waitFor();
      const prior = first.token;
      try {
        first.token = token;
        statusIs(await api('/api/v1/entries', first), 401, 'unauthorized');
        const direct = await rest(first, '/rpc/settings_get', json('POST', {}));
        statusIs(direct, 400);
        check(direct.body.message === 'unauthorized', 'Revoked session could still call RPCs.');
      } finally {
        first.token = prior;
      }
      await signin(second);
      await page.getByRole('button', { name: 'Start my journal', exact: true }).waitFor();
      check(
        !(await page.getByText('Fictional browser').count()),
        'Previous owner content survived account switch.',
      );
      check(errors.length === 0, 'Browser raised an unhandled application error.');
    });
    await context.close();
  } finally {
    await browser?.close();
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await new Promise((resolve) => {
        const timer = setTimeout(() => {
          server.kill('SIGKILL');
          resolve();
        }, 5000);
        server.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
  }
}
