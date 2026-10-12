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
      cwd: path.join(root, 'apps/web'),
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
      await page.getByRole('button', { name: 'Step beyond', exact: true }).click();
      await page.getByRole('textbox', { name: 'Email', exact: true }).fill(user.email);
      await page.getByLabel('Password', { exact: true }).fill(user.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.getByRole('button', { name: 'Start an entry', exact: true }).waitFor();
    };
    await group(
      'browser login, private writing, reload and edit with the unchanged app styles',
      async () => {
        await page.goto(origin + '/#/app');
        await signin(first);
        await page.getByRole('button', { name: 'Start an entry', exact: true }).click();
        await page
          .getByRole('textbox', { name: "Tonight's entry" })
          .fill('Fictional browser private entry');
        await page.getByRole('button', { name: 'Leave it for tonight', exact: true }).click();
        await page.getByRole('button', { name: 'Back to your journal', exact: true }).click();
        await page.reload();
        await page
          .getByRole('button')
          .filter({ hasText: 'Fictional browser private entry' })
          .click();
        await page
          .getByRole('textbox', { name: "Tonight's entry" })
          .fill('Fictional browser corrected entry');
        await page.getByRole('button', { name: 'Leave it for tonight', exact: true }).click();
        await page.getByRole('button', { name: 'Back to your journal', exact: true }).click();
        const stored = await page.evaluate(() =>
          [...Object.values(localStorage), ...Object.values(sessionStorage)].some((value) =>
            value.includes('Fictional browser'),
          ),
        );
        check(!stored, 'Journal text entered browser storage.');
        const layout = await page.locator('.phone.device').count();
        check(layout === 1, 'Product client did not retain the device shell.');
        await page.setViewportSize({ width: 1280, height: 900 });
        check(
          (await page.locator('.phone.device').count()) === 1 &&
            (await page.locator('body').getAttribute('data-mode')) === 'app',
          'Product switched into fictional presentation on resize.',
        );
        await page.setViewportSize({ width: 390, height: 844 });
      },
    );
    await group('browser owned todos, approved memory, export and content clearing', async () => {
      await page.getByLabel('One small step you choose').fill('Fictional browser task');
      await page.getByRole('button', { name: 'Save step', exact: true }).click();
      await page.getByRole('checkbox', { name: 'Fictional browser task' }).waitFor();
      await page.getByRole('checkbox', { name: 'Fictional browser task' }).click();
      await page.getByRole('button', { name: 'You', exact: true }).click();
      await page.getByRole('button', { name: 'Add a memory', exact: true }).click();
      await page
        .getByLabel('Memory you explicitly approve')
        .fill('Fictional browser approved memory');
      await page.getByRole('button', { name: 'Approve memory', exact: true }).click();
      await page.getByText('Fictional browser approved memory', { exact: true }).waitFor();
      const download = page.waitForEvent('download');
      await page.getByRole('button').filter({ hasText: 'Export my data' }).click();
      const file = await download;
      const location = await file.path();
      const exported = JSON.parse(await readFile(location, 'utf8'));
      check(
        exported.entries.some((e) => e.text === 'Fictional browser corrected entry'),
        'Browser export omitted the current entry.',
      );
      check(
        exported.memories.some((m) => m.text === 'Fictional browser approved memory'),
        'Browser export omitted an approved memory.',
      );
      check(Array.isArray(exported.reflections), 'Export omitted reflection section.');
      await page.getByRole('button', { name: 'Delete saved content', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
      await page.getByText('Nothing remembered.', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Journal', exact: true }).click();
      await page
        .getByText('No entries yet. Your journal starts with what you write.', { exact: true })
        .waitFor();
    });
    await group('browser logout revokes old session and another account starts empty', async () => {
      const token = await page.evaluate(() => {
        for (const value of Object.values(sessionStorage)) {
          try {
            const session = JSON.parse(value);
            if (session.access_token) return session.access_token;
          } catch {
            /* unrelated UI key */
          }
        }
        return null;
      });
      check(typeof token === 'string', 'Browser session fixture was not captured.');
      await page.getByRole('button', { name: 'Start an entry', exact: true }).click();
      await page
        .getByRole('textbox', { name: "Tonight's entry" })
        .fill('Fictional unsaved owner A draft');
      await page.getByRole('button', { name: 'Close entry', exact: true }).click();
      await page.getByRole('button', { name: 'You', exact: true }).click();
      const control = page.getByRole('button', { name: 'Sign out', exact: true });
      await control.scrollIntoViewIfNeeded();
      const hittable = await control.evaluate((element) => {
        const box = element.getBoundingClientRect();
        const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return top !== null && element.contains(top);
      });
      check(hittable, 'Sign-out control is clipped or covered.');
      await Promise.all([
        page.waitForResponse(
          (r) => r.url().includes('/auth/v1/logout') && r.request().method() === 'POST',
        ),
        control.click(),
      ]);
      await page.getByRole('button', { name: 'Step beyond', exact: true }).waitFor();
      const prior = first.token;
      try {
        first.token = token;
        statusIs(await api('/api/v1/entries', first), 403, 'forbidden');
        const direct = await rest(first, '/rpc/settings_get', json('POST', {}));
        statusIs(direct, 400);
        check(
          direct.body.message === 'unauthorized',
          'Revoked session could still call direct product RPC.',
        );
      } finally {
        first.token = prior;
      }
      await signin(second);
      check(
        !(await page.getByText('Fictional unsaved owner A draft').count()),
        'Previous owner draft survived account switch.',
      );
      await page
        .getByText('No entries yet. Your journal starts with what you write.', { exact: true })
        .waitFor();
      await page.getByRole('button', { name: 'Letters', exact: true }).click();
      await page.getByText('No letter yet.', { exact: true }).waitFor();
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
