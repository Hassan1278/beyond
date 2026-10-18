/** Against a local production web server; fictional content only. */
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const origin = process.env.LANDING_ORIGIN || 'http://127.0.0.1:3101';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('Local targets only');
const shots = process.env.LANDING_SHOTS;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true });
const errors = [];
try {
  for (const width of [375, 768, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    for (const theme of ['blue', 'gold']) {
      await page.goto(`${origin}/?theme=${theme}`);
      await page.locator('.glass-nav a').first().waitFor();
      assert.equal(await page.locator('.glass-nav a').count(), 4);
      assert.equal(await page.locator('.hero').count(), 1);
      assert.equal(
        await page.locator('.landing-tools a').getAttribute('href'),
        `/app?theme=${theme}`,
      );
      for (const section of ['problem', 'how', 'privacy', 'institutions']) {
        await page.locator(`.glass-nav a[href="#/${section}"]`).click();
        await page.waitForFunction(
          (id) =>
            document.querySelector(`.glass-nav a[href="#/${id}"]`)?.getAttribute('aria-current') ===
            'page',
          section,
        );
        assert(
          await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          `${width} ${theme} ${section} overflow`,
        );
      }
      for (const lang of ['en', 'zh']) {
        if (lang === 'zh') await page.locator('.language-toggle').click();
        await page.locator('.glass-nav a').nth(1).click();
        const left = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        assert(left <= 0, `${width} ${theme} ${lang}: overflow ${left}`);
        if (shots)
          await page.screenshot({ path: `${shots}/${width}-${theme}-${lang}.png`, fullPage: true });
        if (lang === 'zh') {
          const untranslated = await page.evaluate(() => {
            const walker = document.createTreeWalker(
              document.querySelector('main'),
              NodeFilter.SHOW_TEXT,
            );
            const list = [];
            for (let n = walker.nextNode(); n; n = walker.nextNode())
              if (
                /[a-zA-Z]{3}/.test(n.textContent) &&
                !/[\u3400-\u9fff]/.test(n.textContent) &&
                n.textContent.trim() !== 'beyond.'
              )
                list.push(n.textContent.trim());
            return list;
          });
          assert.deepEqual(untranslated, [], `Untranslated strings: ${untranslated}`);
        }
      }
      assert.equal(await page.evaluate(() => localStorage.length), 0);
      assert.equal(await page.evaluate(() => sessionStorage.length), 0);
      assert.equal((await context.cookies()).length, 0);
    }
    await page.goto(`${origin}/?theme=blue`);
    await page.getByRole('button', { name: 'Gold theme', exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector('.landing-tools a')?.getAttribute('href') === '/app?theme=gold',
    );
    await page.getByRole('button', { name: 'Remove all noise', exact: true }).click();
    await page.getByRole('heading', { name: 'Now you can hear yourself.' }).waitFor();
    for (const path of ['why', 'beta']) {
      await page.goto(`${origin}/?theme=gold#/${path}`);
      await page.waitForURL('**#/how');
    }
    await page.goto(`${origin}/?theme=gold`);
    await page.locator('.landing-tools a').click();
    await page.waitForFunction(() => document.documentElement.dataset.jtheme === 'candle');
    console.log(
      `${width}px: both themes, both languages, nav, redirects, theme handoff and storage passed`,
    );
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
