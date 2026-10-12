/**
 * Renders every screen, in both shells, outside a browser and checks the words
 * that must be on each one. Catches a broken screen in seconds, which matters
 * more the closer it gets to standing up and demoing it.
 *
 * It also checks the theme map, which is the one screen whose correctness is
 * geometric rather than textual: seven circles that must not overlap, must not
 * leave the box, and must come out identical every time.
 *
 *   node scripts/smoke.mjs
 */
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
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
  home: ['Good evening', 'Start an entry', 'Coming back', 'Feeling behind', 'Still being written'],
  theme: ['Journal entries on', 'since Oct 2024', '2024'],
  write: ['actually on your mind', 'Leave it for tonight', 'No replies'],
  sealed: ['Sealed for the night', 'Nothing needs solving tonight'],
  letter: ['One small step', 'Coming back', 'Correct it'],
  patterns: ['Your patterns', 'Quarterly Wrapped', 'Feeling behind'],
  memory: ['What Beyond remembers', 'Memory on', 'Delete everything', 'Letter writer'],
  safety: ['That sounded heavy', '18111', 'Open Up', '999'],
};

const server = await createServer({
  configFile: false,
  plugins: [react()],
  resolve: {
    alias: {
      '@beyond/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

let failed = 0;
try {
  const { Phone } = await server.ssrLoadModule('/packages/app-ui/src/components/Phone.tsx');
  const { BeyondProvider, freshState } = await server.ssrLoadModule(
    '/packages/app-ui/src/state/store.tsx',
  );
  const { SCREENS } = await server.ssrLoadModule('/packages/app-ui/src/data/content.ts');

  for (const chrome of ['frame', 'device']) {
    for (const sc of SCREENS) {
      const state = { ...freshState(), screen: sc.id };
      let html = '';
      try {
        html = renderToString(
          h(
            BeyondProvider,
            { demo: true },
            h(Phone, { screen: sc, state, live: true, chrome, onGo: noop, onCloseSheet: noop }),
          ),
        );
      } catch (err) {
        console.error(`FAIL ${chrome}/${sc.id}: threw ${err.message}`);
        failed++;
        continue;
      }

      if (!EXPECT[sc.id]) {
        console.error(`FAIL ${chrome}/${sc.id}: no expected words listed in smoke.mjs`);
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
  /* The states a presenter will actually put on screen, which the loop above
     never reaches because it only ever renders a fresh state. Each one is a
     thing that has to be true live, in front of people. */
  const screenOf = (id) => SCREENS.find((sc) => sc.id === id);
  const render = (id, extra) =>
    renderToString(
      h(
        BeyondProvider,
        { demo: true },
        h(Phone, {
          screen: screenOf(id),
          state: { ...freshState(), screen: id, ...extra },
          live: true,
          chrome: 'frame',
          onGo: noop,
          onCloseSheet: noop,
        }),
      ),
    );

  const bubbleCount = (html) => (html.match(/class="bub /g) ?? []).length;
  const states = [
    ['home shows one bubble per theme', () => bubbleCount(render('home')) === 7],
    [
      'popping one takes it off the map',
      () => {
        const html = render('home', { popped: ['sleep'] });
        return bubbleCount(html) === 6 && !html.includes('>Sleep<');
      },
    ],
    [
      'popping all of them leaves a way back',
      () => {
        const html = render('home', {
          popped: ['behind', 'internships', 'sleep', 'photography', 'friends', 'money', 'running'],
        });
        return bubbleCount(html) === 0 && html.includes('Restore any from the You tab');
      },
    ],
    [
      'pop mode changes the button and the hint',
      () => {
        const html = render('home', { popMode: true });
        return (
          html.includes('aria-pressed="true"') &&
          html.includes('>Done<') &&
          html.includes('Hold a bubble to hide it') &&
          html.includes('bubbles popping')
        );
      },
    ],
    [
      'a popped theme is restorable from the You tab',
      () => {
        const html = render('memory', { popped: ['internships'] });
        return html.includes('Not surfacing') && html.includes('>Restore<');
      },
    ],
    ['nothing popped means no restore list', () => !render('memory').includes('Not surfacing')],
    [
      'a line from tonight lands on its theme, flagged',
      () => {
        const html = render('theme', {
          openTheme: 'photography',
          extract: {
            status: 'ready',
            error: null,
            found: [
              {
                id: 'photography',
                line: { date: '2026-10-11', text: 'walked until it got dark', fresh: true },
              },
            ],
          },
        });
        return html.includes('walked until it got dark') && html.includes('>New<');
      },
    ],
    [
      'home says what the entry was filed under',
      () => {
        const html = render('home', {
          extract: {
            status: 'ready',
            error: null,
            found: [
              { id: 'photography', line: { date: '2026-10-11', text: 'a', fresh: true } },
              { id: 'sleep', line: { date: '2026-10-11', text: 'b', fresh: true } },
            ],
          },
        });
        return html.includes('filed under Photography and Sleep');
      },
    ],
    [
      'a failed read says nothing at all',
      () => {
        const html = render('home', {
          extract: { status: 'error', error: 'nope', found: [] },
        });
        return !html.includes('filed under') && bubbleCount(html) === 7;
      },
    ],
    [
      'a line with a broken date still renders',
      () => {
        const html = render('theme', {
          openTheme: 'sleep',
          extract: {
            status: 'ready',
            error: null,
            found: [{ id: 'sleep', line: { date: undefined, text: 'kept waking up' } }],
          },
        });
        return html.includes('kept waking up');
      },
    ],
    [
      'the theme page opens on its subject, not the first one',
      () => render('theme', { openTheme: 'running' }).includes('Running'),
    ],
    [
      'the theme page survives no subject at all',
      () => render('theme', { openTheme: null }).includes('Journal entries on'),
    ],
  ];
  for (const [name, run] of states) {
    let ok = false;
    try {
      ok = run() === true;
    } catch (err) {
      console.error(`FAIL state ${name}: threw ${err.message}`);
    }
    if (ok) console.log(`ok   state  ${name}`);
    else {
      console.error(`FAIL state  ${name}`);
      failed++;
    }
  }

  /* The site: one short page per idea. */
  const { SiteShell } = await server.ssrLoadModule('/apps/web/src/site/SiteShell.tsx');
  const { PAGES } = await server.ssrLoadModule('/apps/web/src/data/site.ts');
  const pageMods = {
    '/': [
      '/apps/web/src/site/pages/HomePage.tsx',
      'HomePage',
      [
        'Everyone is telling you who to become',
        'It never runs out',
        'Who it is for',
        'more say in your plans',
        // The wall has to carry more than one genre of pressure.
        'aidan.lifts',
        'skin.by.neve',
      ],
    ],
    '/problem': [
      '/apps/web/src/site/pages/ProblemPage.tsx',
      'ProblemPage',
      [
        'The Great Distraction',
        'What young people told us',
        '91%',
        'aidan.lifts',
        'that.girl.era',
        'ella.andjames',
      ],
    ],
    '/how': [
      '/apps/web/src/site/pages/HowPage.tsx',
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
      '/apps/web/src/site/pages/WhyPage.tsx',
      'WhyPage',
      ['Three places to put', 'AI journaling apps', 'beyond.'],
    ],
    '/privacy': [
      '/apps/web/src/site/pages/PrivacyPage.tsx',
      'PrivacyPage',
      ['Safe enough to be honest', 'Not therapy', '18111', 'Not automatically collected'],
    ],
    '/institutions': [
      '/apps/web/src/site/pages/InstitutionsPage.tsx',
      'InstitutionsPage',
      ['Somewhere to put it down', 'Employers', 'Join the beta'],
    ],
    '/beta': [
      '/apps/web/src/site/pages/BetaPage.tsx',
      'BetaPage',
      ['write without an audience', 'Open Beyond', 'Join the beta'],
    ],
  };

  for (const [path, [mod, name, expect]] of Object.entries(pageMods)) {
    const meta = PAGES.find((p) => p.path === path);
    const Page = (await server.ssrLoadModule(mod))[name];
    let html = '';
    try {
      html = renderToString(
        h(BeyondProvider, { demo: true }, h(SiteShell, { path, time: meta.time }, h(Page, null))),
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

/* The theme map. Seven circles whose correctness no amount of rendered HTML
   will tell you about: they must not overlap, must stay inside the box, and
   must land in the same place on the server as in the browser and on the
   second run-through of a pitch as on the first. */
{
  const server = await createServer({
    configFile: false,
    plugins: [react()],
    resolve: {
      alias: {
        '@beyond/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
      },
    },
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error',
  });
  try {
    const { pack, BOX } = await server.ssrLoadModule('/packages/app-ui/src/lib/bubbles.ts');
    const { THEMES } = await server.ssrLoadModule('/packages/app-ui/src/data/themes.ts');

    // Every count a pop can leave behind, down to the last bubble.
    for (let n = THEMES.length; n >= 1; n--) {
      const out = pack(THEMES.slice(0, n), (t) => t.mentions);
      const problems = [];
      if (out.length !== n) problems.push(`placed ${out.length} of ${n}`);
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          const d = Math.hypot(out[i].x - out[j].x, out[i].y - out[j].y);
          if (d < out[i].r + out[j].r - 0.6)
            problems.push(`${out[i].item.name} overlaps ${out[j].item.name}`);
        }
      }
      for (const c of out) {
        if (
          c.x - c.r < -0.6 ||
          c.x + c.r > BOX.w + 0.6 ||
          c.y - c.r < -0.6 ||
          c.y + c.r > BOX.h + 0.6
        )
          problems.push(`${c.item.name} leaves the box`);
      }
      // Bigger theme, bigger bubble - the only thing the map actually claims.
      const byWeight = [...out].sort((a, b) => b.item.mentions - a.item.mentions);
      for (let i = 1; i < byWeight.length; i++) {
        if (byWeight[i].r > byWeight[i - 1].r + 0.01)
          problems.push(
            `${byWeight[i].item.name} is drawn larger than ${byWeight[i - 1].item.name}`,
          );
      }
      const again = pack(THEMES.slice(0, n), (t) => t.mentions);
      if (
        JSON.stringify(out.map((c) => [c.item.id, c.x, c.y, c.r])) !==
        JSON.stringify(again.map((c) => [c.item.id, c.x, c.y, c.r]))
      )
        problems.push('layout is not deterministic');

      if (problems.length) {
        console.error(`FAIL bubbles/${n}: ${problems.join('; ')}`);
        failed++;
      } else {
        console.log(`ok   bubbles/${n} (r ${out.map((c) => c.r.toFixed(1)).join(' ')})`);
      }
    }

    /* The feed. Every post is a hand-written claim, so the things worth
       checking are that none of them collide and that all of them draw. */
    const { FEED } = await server.ssrLoadModule('/apps/web/src/data/feed.ts');
    const { FeedArt } = await server.ssrLoadModule('/apps/web/src/site/FeedArt.tsx');
    const feedBad = [];
    const handles = new Set();
    const captions = new Set();
    for (const [i, post] of FEED.entries()) {
      if (handles.has(post.handle)) feedBad.push(`duplicate handle ${post.handle}`);
      if (captions.has(post.caption)) feedBad.push(`duplicate caption on ${post.handle}`);
      handles.add(post.handle);
      captions.add(post.caption);
      if (!/^\d/.test(post.metric))
        feedBad.push(`${post.handle}: metric "${post.metric}" is not a count`);
      if (post.grad.some((g) => /#[0-9a-f]{3,8}/i.test(g)))
        feedBad.push(`${post.handle}: gradient is a fixed colour, so it will not follow the theme`);
      try {
        const drawn = renderToString(
          h(FeedArt, { kind: post.art, grad: post.grad, id: String(i) }),
        );
        if (!drawn.includes('<path') && !drawn.includes('<circle') && !drawn.includes('<rect'))
          feedBad.push(`${post.handle}: art "${post.art}" drew nothing`);
      } catch (err) {
        feedBad.push(`${post.handle}: art "${post.art}" threw ${err.message}`);
      }
    }
    if (feedBad.length) {
      for (const b of feedBad) console.error(`FAIL feed: ${b}`);
      failed += feedBad.length;
    } else {
      const kinds = new Set(FEED.map((p) => p.art));
      console.log(`ok   feed (${FEED.length} posts, ${kinds.size} kinds of art, all drawing)`);
    }

    /* The theme data itself: the dates are what the page is selling. */
    const { showDate, newestFirst } = await server.ssrLoadModule(
      '/packages/app-ui/src/data/themes.ts',
    );
    const bad = [];
    for (const t of THEMES) {
      if (!t.lines.length) bad.push(`${t.id} has no lines`);
      if (t.mentions < t.lines.length) bad.push(`${t.id} quotes more lines than it claims entries`);
      for (const l of t.lines) {
        if (!/^20\d\d-\d\d-\d\d$/.test(l.date)) bad.push(`${t.id}: bad date ${l.date}`);
        if (showDate(l.date) === l.date) bad.push(`${t.id}: ${l.date} does not format`);
      }
      const sorted = newestFirst(t.lines);
      if (sorted[0].date < sorted[sorted.length - 1].date) bad.push(`${t.id}: sorts backwards`);
    }
    const span = THEMES.flatMap((t) => t.lines.map((l) => l.date)).sort();
    if (bad.length) {
      for (const b of bad) console.error(`FAIL themes: ${b}`);
      failed += bad.length;
    } else {
      console.log(
        `ok   themes (${THEMES.length} themes, ${span.length} lines, ${span[0]} to ${span[span.length - 1]})`,
      );
    }
  } finally {
    await server.close();
  }
}

console.log(failed ? `${failed} check(s) failed.` : 'All designed screens and pages rendered.');
process.exit(failed ? 1 : 0);
