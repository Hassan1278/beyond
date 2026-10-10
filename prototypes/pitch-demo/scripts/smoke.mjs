/**
 * Renders all nine screens, in both shells, outside a browser and checks the
 * words that must be on each one. Catches a broken screen in seconds, which
 * matters more the closer it gets to standing up and demoing it.
 *
 *   node scripts/smoke.mjs
 */
import { createServer } from 'vite';
import { createElement as h } from 'react';
import { renderToString } from 'react-dom/server';

/* Browser globals the app touches while rendering. */
const store = new Map();
const noop = () => undefined;
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};
globalThis.window = {
  localStorage: globalThis.localStorage,
  matchMedia: () => ({ matches: false, addEventListener: noop, removeEventListener: noop }),
  location: { hash: '', search: '', origin: 'http://localhost', pathname: '/' },
  history: { replaceState: noop },
  navigator: { standalone: false },
  addEventListener: noop,
  removeEventListener: noop,
  scrollTo: noop,
  setInterval: noop,
  clearInterval: noop,
};
globalThis.document = { body: { dataset: {} }, baseURI: 'http://localhost/' };

const EXPECT = {
  welcome: ['Everyone is telling you who to become', 'not therapy'],
  voice: ['Who should write your letters', 'Future you', '07:30'],
  home: ['Good evening', 'Start tonight', 'Coming back this week'],
  write: ['actually on your mind', 'Leave it for tonight', 'No replies'],
  sealed: ['Sealed for the night', 'Nothing needs solving tonight'],
  letter: ['One small step', 'Coming back', 'Correct it'],
  patterns: ['Your patterns', 'Quarterly Wrapped', 'Feeling behind'],
  memory: ['What Beyond remembers', 'Memory on', 'Delete everything', 'Letter writer'],
  safety: ['That sounded heavy', '18111', 'Open Up', '999'],
};

const server = await createServer({
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

let failed = 0;
try {
  const { Phone } = await server.ssrLoadModule('/src/components/Phone.tsx');
  const { BeyondProvider, freshState } = await server.ssrLoadModule('/src/state/store.tsx');
  const { SCREENS } = await server.ssrLoadModule('/src/data/content.ts');

  for (const chrome of ['frame', 'device']) {
    for (const sc of SCREENS) {
      const state = { ...freshState(), screen: sc.id };
      let html = '';
      try {
        html = renderToString(
          h(
            BeyondProvider,
            null,
            h(Phone, { screen: sc, state, live: true, chrome, onGo: noop, onCloseSheet: noop }),
          ),
        );
      } catch (err) {
        console.error(`FAIL ${chrome}/${sc.id}: threw ${err.message}`);
        failed++;
        continue;
      }

      const missing = EXPECT[sc.id].filter((t) => !html.includes(t));
      const bezel =
        chrome === 'frame' ? html.includes('class="isl"') : !html.includes('class="isl"');
      if (missing.length) {
        console.error(
          `FAIL ${chrome}/${sc.id}: missing ${missing.map((m) => `"${m}"`).join(', ')}`,
        );
        failed++;
      } else if (!bezel) {
        console.error(`FAIL ${chrome}/${sc.id}: wrong chrome for ${chrome} mode`);
        failed++;
      } else {
        console.log(`ok   ${chrome}/${sc.id} (${html.length} chars)`);
      }
    }
  }
  /* The site: one short page per idea. */
  const { SiteShell } = await server.ssrLoadModule('/src/site/SiteShell.tsx');
  const { PAGES } = await server.ssrLoadModule('/src/data/site.ts');
  const pageMods = {
    '/': [
      '/src/site/pages/HomePage.tsx',
      'HomePage',
      [
        'Everyone is telling you who to become',
        'It never runs out',
        'Who it is for',
        'more say in your plans',
      ],
    ],
    '/problem': [
      '/src/site/pages/ProblemPage.tsx',
      'ProblemPage',
      ['The Great Distraction', 'What young people told us', '91%', 'aidan.lifts'],
    ],
    '/how': [
      '/src/site/pages/HowPage.tsx',
      'HowPage',
      [
        'Say it whenever',
        'Any time',
        'Leave it for the night',
        'Quarterly Wrapped',
        'Q3 2026',
        'What Beyond remembers',
      ],
    ],
    '/why': [
      '/src/site/pages/WhyPage.tsx',
      'WhyPage',
      ['Three places to put', 'AI journaling apps', 'beyond.'],
    ],
    '/privacy': [
      '/src/site/pages/PrivacyPage.tsx',
      'PrivacyPage',
      ['Safe enough to be honest', 'Not therapy', '18111', 'Never sent'],
    ],
    '/institutions': [
      '/src/site/pages/InstitutionsPage.tsx',
      'InstitutionsPage',
      ['Somewhere to put it down', 'Employers', 'Join the beta'],
    ],
    '/beta': [
      '/src/site/pages/BetaPage.tsx',
      'BetaPage',
      ['write without an audience', 'Open the app demo', 'Join the beta'],
    ],
  };

  for (const [path, [mod, name, expect]] of Object.entries(pageMods)) {
    const meta = PAGES.find((p) => p.path === path);
    const Page = (await server.ssrLoadModule(mod))[name];
    let html = '';
    try {
      html = renderToString(
        h(BeyondProvider, null, h(SiteShell, { path, time: meta.time }, h(Page, null))),
      );
    } catch (err) {
      console.error(`FAIL site${path}: threw ${err.message}`);
      failed++;
      continue;
    }
    const missing = expect.filter((t) => !html.includes(t));
    const nav = html.includes('class="nav-in"') && html.includes('Open the app');
    if (missing.length) {
      console.error(`FAIL site${path}: missing ${missing.map((m) => `"${m}"`).join(', ')}`);
      failed++;
    } else if (!nav) {
      console.error(`FAIL site${path}: nav missing`);
      failed++;
    } else {
      console.log(`ok   site${path} (${html.length} chars)`);
    }
  }
} finally {
  await server.close();
}

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll screens and pages rendered.');
process.exit(failed ? 1 : 0);
