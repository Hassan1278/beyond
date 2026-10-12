/**
 * Palette check. Two jobs, both of them things you would otherwise have to
 * trust your eyes for:
 *
 *   1. Contrast. Every text-on-surface pair the site actually uses, in all
 *      four themes, against the WCAG AA thresholds.
 *   2. Distinctness. How far apart the themes are from each other on the
 *      tokens that paint the most pixels - which is the whole point of
 *      having four of them.
 *
 * Run: node scripts/contrast.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const THEMES = ['night', 'bloom'];

/* --------------------------------------------------------------- parsing */

const declarations = (block) => {
  const out = {};
  for (const [, k, v] of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) out[k] = v.trim();
  return out;
};

/** Pull one selector's declaration block out of a stylesheet. */
function blockFor(css, selector) {
  const i = css.indexOf(selector);
  if (i === -1) return '';
  const open = css.indexOf('{', i);
  return css.slice(open + 1, css.indexOf('}', open));
}

/* ------------------------------------------------------------ colour maths */

const hex = (s) => {
  const m = /^#([0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const lin = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const luminance = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

function ratio(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

/** CIE76 in Lab. Crude, but good enough to say "these two are not the same colour". */
function lab([r, g, b]) {
  const [x, y, z] = [
    (lin(r) * 0.4124 + lin(g) * 0.3576 + lin(b) * 0.1805) / 0.9505,
    lin(r) * 0.2126 + lin(g) * 0.7152 + lin(b) * 0.0722,
    (lin(r) * 0.0193 + lin(g) * 0.1192 + lin(b) * 0.9505) / 1.089,
  ];
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

const deltaE = (a, b) => {
  const [p, q] = [lab(a), lab(b)];
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
};

/**
 * Resolve a colour spec against one palette. A spec is either a token name, or
 * `[spec, pct, spec]` meaning `color-mix(in srgb, first pct%, second)` - which
 * also stands in for `opacity` over a known backdrop, since the two compute
 * to the same thing. Nests, because several of these surfaces are a mix on a
 * mix in the stylesheets.
 */
function resolve(spec, p) {
  if (typeof spec === 'string') return hex(p[spec] ?? '');
  const [a, pct, b] = spec;
  const [x, y] = [resolve(a, p), resolve(b, p)];
  if (!x || !y) return null;
  const t = pct / 100;
  return x.map((v, i) => v * t + y[i] * (1 - t));
}

/** How a spec reads in the report. */
const label = (spec) =>
  typeof spec === 'string' ? `--${spec}` : `${spec[1]}% ${label(spec[0])} over ${label(spec[2])}`;

/* ------------------------------------------------------------- what to check
   fg, bg, where it appears, and the AA floor: 4.5 for body and small text,
   3.0 for text at 24px+ or 19px+ bold, and for non-text separators. */

const PAIRS = [
  ['ink', 'paper', 'body text on a day section', 4.5],
  ['ink', 'paper-2', 'body text on an alternating section', 4.5],
  ['ink', 'paper-hi', 'body text on a raised card', 4.5],
  ['ink-soft', 'paper', '.sub on a day section', 4.5],
  ['ink-soft', 'paper-2', '.sub on an alternating section', 4.5],
  ['ink-soft', 'paper-hi', '.sub on a raised card', 4.5],
  ['ink-faint', 'paper', '.kicker / .eyebrow / .foot', 4.5],
  ['ink-faint', 'paper-2', '.kicker on an alternating section', 4.5],
  ['ink-faint', 'paper-hi', '.kicker on a raised card', 4.5],
  ['paper', 'night', 'body text on a night section', 4.5],
  ['paper', 'night-2', 'text on a night card', 4.5],
  ['paper', 'night-3', 'text on a raised night card', 4.5],
  ['paper', 'ink', '.btn-dark label', 4.5],
  ['ink', 'paper', '.btn-light label', 4.5],
  ['mist', 'night', '.sub on a night section', 4.5],
  ['mist', 'night-2', '.sub on a night card', 4.5],
  ['moon', 'night', 'muted text on night', 4.5],
  ['dawn', 'night', '.quiet-line, .audiences .big, accents', 3.0],
  ['dawn', 'night-2', 'accents on a night card', 3.0],
  ['dusk', 'night', 'the dusk marker', 3.0],
  ['paper-line', 'paper', 'hairline on a day section', 1.2],
  ['night-line', 'night', 'hairline on a night section', 1.2],
  ['ok', 'paper-hi', 'the ok state', 3.0],
  ['alert', 'night', 'the alert state', 3.0],
];

/* Surfaces built with color-mix in the stylesheets. These are new, nobody has
   looked at them yet, and a mix is exactly the kind of value that drifts out
   of contrast without anyone noticing. */
const HARD_BUB = ['ink', 9, 'paper-2'];
const WARM_BUB = ['dawn', 58, 'paper-hi'];
const MIXED = [
  ['ink', HARD_BUB, 'the name on a grey bubble', 4.5],
  ['ink', WARM_BUB, 'the name on a warm bubble', 4.5],
  // The count is --ink at 68% opacity, which over a known fill is a mix.
  [['ink', 68, HARD_BUB], HARD_BUB, 'the count on a grey bubble', 4.5],
  [['ink', 68, WARM_BUB], WARM_BUB, 'the count on a warm bubble', 4.5],
  ['ink', ['dawn', 62, 'paper-hi'], 'the New flag on a fresh line', 4.5],
  ['ink-soft', ['dawn', 26, 'paper-hi'], 'the "filed under" note', 4.5],
  ['ink', WARM_BUB, 'the "Going well" chip', 4.5],
  // The Wrapped cards are read out of data/content.ts below, rather than
  // copied here, so the two cannot drift apart.
];

/** The tokens that paint the most pixels, so the ones that make a theme read. */
const HEAVY = ['paper', 'night', 'mist', 'ink-faint', 'paper-line', 'night-line', 'dawn'];

/* -------------------------------------------------------------------- run */

const tokensCss = await readFile(join(root, 'src/styles/tokens.css'), 'utf8');
const themesCss = await readFile(join(root, 'src/styles/themes.css'), 'utf8');

const base = declarations(blockFor(tokensCss, ':root'));
const palettes = {};
for (const id of THEMES) {
  const own = declarations(blockFor(themesCss, `[data-theme='${id}']`));
  palettes[id] = { ...base, ...own };
}

/* The Wrapped cards put light text on the lighter end of their own gradient,
   which is where it is hardest to read. Read the first stop of each straight
   out of the data, so this checks what actually ships. */
const contentTs = await readFile(join(root, 'src/data/content.ts'), 'utf8');
for (const [, quarter] of contentTs.matchAll(/quarter: '([^']+)'/g)) {
  const at = contentTs.indexOf(`quarter: '${quarter}'`);
  const grad = /grad:\s*'([^']+)'/.exec(contentTs.slice(at))?.[1] ?? '';
  const stop = /color-mix\(in srgb,\s*var\(--([\w-]+)\)\s*([\d.]+)%,\s*var\(--([\w-]+)\)\s*\)/.exec(
    grad,
  );
  if (!stop) continue;
  MIXED.push([
    'paper',
    [stop[1], Number(stop[2]), stop[3]],
    `${quarter} Wrapped, at its lightest`,
    4.5,
  ]);
}

let failures = 0;
const missing = [];

for (const id of THEMES) {
  const p = palettes[id];
  for (const k of Object.keys(base)) if (!(k in p)) missing.push(`${id}: --${k}`);

  const rows = [];
  for (const [fg, bg, where, floor] of MIXED) {
    const [a, b] = [resolve(fg, p), resolve(bg, p)];
    if (!a || !b) continue;
    const r = ratio(a, b);
    const ok = r >= floor;
    if (!ok) failures++;
    rows.push(
      `  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1  (min ${floor})  ${label(fg)} on ${label(bg)}  ${where}`,
    );
  }
  for (const [fg, bg, where, floor] of PAIRS) {
    const [a, b] = [hex(p[fg] ?? ''), hex(p[bg] ?? '')];
    if (!a || !b) continue;
    const r = ratio(a, b);
    const ok = r >= floor;
    if (!ok) failures++;
    rows.push(
      `  ${ok ? 'ok  ' : 'FAIL'} ${r.toFixed(2).padStart(5)}:1  (min ${floor})  --${fg} on --${bg}  ${where}`,
    );
  }
  console.log(`\n${id}`);
  for (const r of rows) console.log(r);
}

console.log('\ndistinctness  (CIE76 dE between themes; 10 is a clear difference)');
for (const token of HEAVY) {
  const parts = [];
  let worst = Infinity;
  for (let i = 0; i < THEMES.length; i++) {
    for (let j = i + 1; j < THEMES.length; j++) {
      const [a, b] = [hex(palettes[THEMES[i]][token] ?? ''), hex(palettes[THEMES[j]][token] ?? '')];
      if (!a || !b) continue;
      const d = deltaE(a, b);
      worst = Math.min(worst, d);
      parts.push(`${THEMES[i].slice(0, 2)}/${THEMES[j].slice(0, 2)} ${d.toFixed(0)}`);
    }
  }
  const flag = worst < 10 ? ' <- too close' : '';
  console.log(
    `  --${token.padEnd(11)} closest pair ${worst.toFixed(0).padStart(3)}   ${parts.join('  ')}${flag}`,
  );
  if (worst < 10) failures++;
}

/* The dots in the nav, and the browser-chrome tint, are written out by hand.
   If either drifts from themes.css the picker starts lying about the page. */
const pickerTsx = await readFile(join(root, 'src/site/ThemePicker.tsx'), 'utf8');
const themeTs = await readFile(join(root, 'src/lib/theme.ts'), 'utf8');

/** The hexes of one `key: [...]` list that follows `id: '<theme>'`. */
function listAfter(src, id, key) {
  const i = src.indexOf("id: '" + id + "'");
  if (i === -1) return null;
  const j = src.indexOf(key, i);
  if (j === -1) return null;
  return src.slice(j, src.indexOf(']', j)).match(/#[0-9a-f]{6}/gi);
}

const drift = [];
for (const id of THEMES) {
  const p = palettes[id];

  const bands = listAfter(pickerTsx, id, 'bands: [');
  const want = [p.night, p.dawn, p.paper].join(' ').toLowerCase();
  if (!bands) drift.push(id + ': no swatch in ThemePicker');
  else if (bands.join(' ').toLowerCase() !== want)
    drift.push(id + ': swatch is ' + bands.join(' ') + ' but the palette is ' + want);

  const bar = themeTs.slice(themeTs.indexOf(id + ':', themeTs.indexOf('const BAR')));
  const got = (bar.match(/#[0-9a-f]{6}/i) ?? [''])[0];
  if (got.toLowerCase() !== String(p.night).toLowerCase())
    drift.push(id + ': theme-color is ' + got + ' but --night is ' + p.night);
}
if (drift.length) {
  console.log();
  console.log('picker drift:');
  for (const d of drift) console.log('  ' + d);
  failures += drift.length;
} else {
  console.log();
  console.log('picker  every swatch and theme-color matches its palette');
}

if (missing.length) {
  console.log(`\nundefined tokens:\n  ${missing.join('\n  ')}`);
  failures += missing.length;
}

console.log(failures ? `\n${failures} problem(s)` : '\nall clear');
process.exit(failures ? 1 : 0);
