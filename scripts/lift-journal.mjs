// Lifts the journal app's own components into the landing page at build time.
//
// The landing page advertises the app, so it should show the app rather than a
// drawing of it. Copying the markup would start identical and then rot, so this
// reads frontend/web/src/journal/app.js and journal.css instead and pulls out
// the rules and the functions the page needs. Change the chart in the app and
// the chart on the landing page changes with it; there is no second copy to
// forget.
//
// Everything lifted is scoped under .bui, so the app's selectors keep working
// while the site's own classes of the same name are untouched.
//
//   node scripts/lift-journal.mjs

/* ------------------------------------------------------------------ guards */

/**
 * A custom property whose value reads its own name is a cycle, so it is
 * invalid at computed-value time and resolves to nothing. That failure is
 * silent: the rules using it simply stop applying, which once left this page
 * with 150 transparent stars, black chart cores and an unreadable button. The
 * build refuses to run rather than ship that again.
 */
export function assertNoSelfReference(css, where) {
  const bad = [];
  for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;}]+)/gi)) {
    if (m[2].replace(/\s+/g, '').includes(`var(${m[1]})`)) bad.push(`${m[1]}: ${m[2].trim()}`);
  }
  if (bad.length) {
    const lead = bad.length === 1 ? 'y reads' : 'ies read';
    throw new Error(`${where}: ${bad.length} custom propert${lead} itself, which makes it invalid `
      + `and silently blanks whatever uses it: ` + bad.join('; '));
  }
}

/* ---------------------------------------------------------------- scanning */

/**
 * Drop every comment. The app's prose belongs in the app; what the build
 * writes is generated output, and a comment left in front of a rule would end
 * up inside the selector when the rule is scoped.
 */
function stripComments(css) {
  let out = '', i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e === -1 ? css.length : e + 2; continue; }
    if (c === '"' || c === "'") {
      const q = c; const start = i; i++;
      while (i < css.length && css[i] !== q) { if (css.charCodeAt(i) === 92) i++; i++; } // 92 = backslash
      i++; out += css.slice(start, i); continue;
    }
    out += c; i++;
  }
  return out;
}

/** Split a stylesheet into top-level rules, aware of comments and strings. */
function splitRules(css) {
  const out = [];
  let i = 0, start = 0, depth = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const e = css.indexOf('*/', i + 2); i = e === -1 ? css.length : e + 2; continue; }
    if (c === '"' || c === "'") { const q = c; i++; while (i < css.length && css[i] !== q) { if (css[i] === '\\') i++; i++; } i++; continue; }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') {
      depth--; i++;
      if (depth === 0) { const text = css.slice(start, i).trim(); if (text) out.push(text); start = i; }
      continue;
    }
    i++;
  }
  return out;
}

/** The part before the first brace. */
const headOf = (rule) => rule.slice(0, rule.indexOf('{')).trim();
/** The part between the outermost braces. */
const bodyOf = (rule) => rule.slice(rule.indexOf('{') + 1, rule.lastIndexOf('}'));

/** Split a selector list on commas that are not inside brackets or quotes. */
function splitSelectors(sel) {
  const out = []; let depth = 0, start = 0;
  for (let i = 0; i < sel.length; i++) {
    const c = sel[i];
    if (c === '(' || c === '[') depth++;
    else if (c === ')' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(sel.slice(start, i).trim()); start = i + 1; }
  }
  out.push(sel.slice(start).trim());
  return out.filter(Boolean);
}

/* ---------------------------------------------------------------- scoping */

const SCOPE = '.bui';
/* The page supplies its own tokens and its own page-level rules, so the app's
   root block, element selectors and resets are never lifted. */
const NEVER = /^(:root|html|body|\*|\*::|h1,|button,|ul,|::selection|:focus-visible)/;

/** Put every selector in a rule inside the scope. */
function scopeSelector(sel) {
  return splitSelectors(sel).map((one) => {
    if (one.startsWith(SCOPE)) return one;
    // a selector that starts with a pseudo-element on the scope itself
    if (one.startsWith('.letter') || one.startsWith('.')) return `${SCOPE} ${one}`;
    return `${SCOPE} ${one}`;
  }).join(', ');
}

/**
 * Put every rule in a stylesheet inside a scope, leaving @keyframes, :root and
 * the page's own scope selector alone. The site and the landing page both have
 * an `.eyebrow` and a `.hint`; this is what stops them reaching each other.
 */
export function scopeAll(rawCss, scope) {
  const css = stripComments(rawCss);
  const out = [];
  for (const rule of splitRules(css)) {
    const head = headOf(rule);
    if (head.startsWith('@keyframes') || head.startsWith(':root')) { out.push(rule); continue; }
    if (head.startsWith('@media') || head.startsWith('@supports')) {
      const inner = splitRules(bodyOf(rule)).map((r) => {
        const h = headOf(r);
        if (h.startsWith(':root')) return `  ${h} {${bodyOf(r)}}`;
        return `  ${scopeOne(h, scope)} {${bodyOf(r)}}`;
      });
      out.push(`${head} {\n${inner.join('\n')}\n}`);
      continue;
    }
    if (head.startsWith('@')) { out.push(rule); continue; }
    out.push(`${scopeOne(head, scope)} {${bodyOf(rule)}}`);
  }
  return out.join('\n');
}

function scopeOne(sel, scope) {
  return splitSelectors(sel).map((one) => {
    if (one === scope || one.startsWith(`${scope} `) || one.startsWith(`${scope}.`)
      || one.startsWith(`${scope}:`)) return one;
    // a rule on the page root itself, like .landing.quiet-sky
    if (one.startsWith('.landing')) return one;
    return `${scope} ${one}`;
  }).join(', ');
}

/**
 * Keep the rules whose selectors mention one of the wanted class names, scope
 * them, and bring along any @keyframes they animate.
 */
export function collectCss(rawCss, wanted) {
  const css = stripComments(rawCss);
  const rules = splitRules(css);
  /* The app's components read the app's own token names - --cream, --amber,
     --dusk and the rest - so its :root block travels with them, rescoped to
     .bui. The page's own palette is untouched: these apply only inside it. */
  const tokens = rules
    .filter((r) => headOf(r).split(',').some((h) => h.trim() === ':root'))
    .map((r) => bodyOf(r))
    .join('\n');
  const want = (sel) => wanted.some((w) => sel.includes(w));
  const kept = [];
  const frames = new Map();

  for (const rule of rules) {
    const head = headOf(rule);
    if (head.startsWith('@keyframes')) { frames.set(head.split(/\s+/)[1], rule); continue; }
    if (head.startsWith('@media')) {
      const inner = splitRules(bodyOf(rule)).filter((r) => !NEVER.test(headOf(r)) && want(headOf(r)));
      if (inner.length) kept.push(`${head} {\n${inner.map((r) => `  ${scopeSelector(headOf(r))} {${bodyOf(r)}}`).join('\n')}\n}`);
      continue;
    }
    if (head.startsWith('@')) continue;
    if (NEVER.test(head) || !want(head)) continue;
    kept.push(`${scopeSelector(head)} {${bodyOf(rule)}}`);
  }

  // any keyframe name an animation in the kept rules refers to
  const body = kept.join('\n');
  const used = new Set();
  for (const m of body.matchAll(/animation(?:-name)?\s*:\s*([^;}]+)/g)) {
    for (const part of m[1].split(',')) for (const tok of part.trim().split(/\s+/)) if (frames.has(tok)) used.add(tok);
  }
  const root = tokens.trim() ? [`${SCOPE} {${tokens}}`] : [];
  return [...root, ...[...used].map((n) => frames.get(n)), ...kept].join('\n');
}

/* -------------------------------------------------------------------- JS */

/** The text of a `function NAME(...) {...}`, by brace matching. */
function takeFunction(js, name) {
  const at = js.search(new RegExp(`^function ${name}\\s*\\(`, 'm'));
  if (at === -1) throw new Error(`shared: function ${name} not found in the app`);
  let i = js.indexOf('{', at), depth = 0;
  for (; i < js.length; i++) {
    const c = js[i];
    if (c === '/' && js[i + 1] === '*') { const e = js.indexOf('*/', i + 2); i = e === -1 ? js.length : e + 1; continue; }
    if (c === '/' && js[i + 1] === '/') { const e = js.indexOf('\n', i); i = e === -1 ? js.length : e; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < js.length && js[i] !== q) { if (js[i] === '\\') i++; else if (q === '`' && js[i] === '$' && js[i + 1] === '{') { let d = 1; i += 2; while (i < js.length && d) { if (js[i] === '{') d++; else if (js[i] === '}') d--; i++; } i--; } i++; }
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (!depth) return js.slice(at, i + 1); }
  }
  throw new Error(`shared: function ${name} is unbalanced`);
}

/** The text of a `const NAME = ...;` declaration, to its top-level semicolon. */
function takeConst(js, name) {
  const at = js.search(new RegExp(`^const ${name}\\s*=`, 'm'));
  if (at === -1) throw new Error(`shared: const ${name} not found in the app`);
  let i = at, depth = 0;
  for (; i < js.length; i++) {
    const c = js[i];
    if (c === '/' && js[i + 1] === '*') { const e = js.indexOf('*/', i + 2); i = e === -1 ? js.length : e + 1; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; i++;
      while (i < js.length && js[i] !== q) { if (js[i] === '\\') i++; else if (q === '`' && js[i] === '$' && js[i + 1] === '{') { let d = 1; i += 2; while (i < js.length && d) { if (js[i] === '{') d++; else if (js[i] === '}') d--; i++; } i--; } i++; }
      continue;
    }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ';' && depth === 0) return js.slice(at, i + 1);
  }
  throw new Error(`shared: const ${name} is unterminated`);
}

/** The run of lines between a named section comment and the next one. */
function takeSection(js, title) {
  const mark = `/* ---------- ${title} ---------- */`;
  const at = js.indexOf(mark);
  if (at === -1) throw new Error(`shared: section "${title}" not found in the app`);
  const from = at + mark.length;
  const next = js.indexOf('/* ---------- ', from);
  return js.slice(from, next === -1 ? js.length : next).trim();
}

export function collectJs(js, { sections = [], functions = [], consts = [] }) {
  return [
    ...sections.map((t) => `/* from the app: ${t} */\n${takeSection(js, t)}`),
    ...consts.map((n) => takeConst(js, n)),
    ...functions.map((n) => takeFunction(js, n)),
  ].join('\n\n');
}

/* ------------------------------------------------------------ what we take */

/* The components the landing page shows. Anything whose selector mentions one
   of these travels; add a class here to put a new component on the page. */
export const SHARED_CSS = [
  '.ambient', '.stars', '.band', '.sky', '.leg-dot', '.orrery', '.constellation',
  '.ns-', '.tone-', '.mag', '.theme-line', '.qcard', '.qcards', '.qh', '.chip', '.chips',
  '.dots', '.changes', '.done-list', '.open-list', '.film', '.frame',
  '.letter', '.ls', '.greet', '.headline', '.insight', '.signoff', '.issue', '.cause',
  '.notice', '.words', '.remembers', '.provenance', '.todo-cta', '.quote', 'mark',
  '.paper-in', '.lantern', '.ripple', '.tn-',
  '.mem', '.login-in', '.toggle', '.track',
  '.k', '.fine', '.h2', '.title', '.lead', '.stack', '.row', '.btn', '.link', '.smp', '.pill',
  '.ring', '.todo', '.check', '.tick', '.alldone', '.sheet', '.card', '.setting', '.voices', '.voice',
];

export const SHARED_JS = {
  sections: ['vocab', 'helpers'],
  consts: ['realThemes', 'secLabel'],
  functions: ['countThemes', 'lanternVars', 'drawSky', 'skyCard'],
};

/* ------------------------------------------------------------------- run */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'web');
const OUT = path.join(WEB, 'src', 'site', 'landing');

const HEADER = [
  '/* Generated by scripts/lift-journal.mjs from the journal app. Do not edit:',
  '   edit the app and run the script, or the two will drift apart. */',
  '',
].join('\n');

const WRAP_TOP = [
  '/* eslint-disable */',
  '/**',
  " * The journal app's own vocabulary, helpers, chart and letter labels.",
  ' *',
  " * Everything in app.js lives inside startJournal(), so none of it can be",
  ' * imported; this is lifted out of it by name at build time. It runs inside a',
  " * closure so the app's $ and esc cannot collide with the site's own, and only",
  ' * what the landing page actually needs comes back out.',
  ' */',
  'export const APP = (() => {',
  '  let pTip = null, skyState = null, secHans = false;',
  "  const S = { lang: 'auto', deliverTime: '08:00', memories: [] };",
].join('\n');

/* What the landing page would like to have. The app is free to rename or drop
   any of these; the ones it still has are exported and the rest are reported,
   so a change in the app shows up here instead of as a blank section on the
   page. */
const WANTED = [
  'THEMES', 'SECTIONS', 'VOICES', 'MON', 'MONTH',
  'esc', 'cap', 'plural', 'listOf', 'fmtDay', 'pad', 'dayDiff', 'seeded', 'countWords',
  'realThemes', 'countThemes', 'secLabel', 'lanternVars', 'skyCard',
];
/* Without these the page has nothing to show, so their absence is an error. */
const REQUIRED = ['skyCard', 'drawSky', 'secLabel', 'countThemes', 'seeded'];

function wrapBottom(lifted) {
  const has = (n) => new RegExp(`^(?:function|const|let|var)\\s+${n}\\b`, 'm').test(lifted);
  const missingRequired = REQUIRED.filter((n) => !has(n));
  if (missingRequired.length) {
    throw new Error(`lift-journal: the app no longer defines ${missingRequired.join(', ')}. `
      + 'The landing page is built from these; update SHARED_JS and the page, do not ship it blank.');
  }
  const got = WANTED.filter(has);
  const missing = WANTED.filter((n) => !has(n));
  return {
    missing,
    text: [
      '  return {',
      `    ${got.join(', ')},`,
      '    /* Draw the chart. Pass the state once; later calls redraw what is there. */',
      '    chart(state) { if (state) skyState = state; drawSky(); },',
      '    /* Which star is showing its card, by letter id, or null for none. */',
      '    tip(id) { pTip = id; },',
      '    tipId() { return pTip; },',
      '  };',
      '})();',
      '',
    ].join('\n'),
  };
}

/**
 * The lifted functions read module-level state that lives beside them in the
 * app - drawSky remembers the last sky it drew, for one. Rather than keeping a
 * hand-written list that goes stale the next time the app changes, find the
 * names the lifted code uses but does not declare, and bring across the app's
 * own one-line declarations of them, repeating until nothing new is needed.
 */
function liftFreeVars(appJs, lifted, provided) {
  /* Every one-line piece of state the app keeps beside its functions. Long
     lines are data tables rather than state, and are left where they are. */
  const state = new Map();
  for (const m of appJs.matchAll(/^(?:let|const)\s+[^\n;]+;\s*$/gm)) {
    const line = m[0].trim();
    if (line.length > 200) continue;
    for (const n of line.matchAll(/(?:^|;\s*)(?:let|const)\s+([A-Za-z_$][\w$]*)/g)) {
      if (!state.has(n[1])) state.set(n[1], line);
    }
  }
  const hasFn = (n) => new RegExp(`^function ${n}\\s*\\(`, 'm').test(appJs);
  const hasConst = (n) => new RegExp(`^const ${n}\\s*=`, 'm').test(appJs);

  const declaredIn = (text) => new Set(
    [...text.matchAll(/(?:^|\s)(?:function|let|const|var)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]),
  );

  const added = [];
  let body = lifted;
  for (let pass = 0; pass < 12; pass++) {
    const have = declaredIn(body);
    const used = new Set([...body.matchAll(/[A-Za-z_$][\w$]*/g)].map((m) => m[0]));
    const want = [...used].filter((n) => !have.has(n) && !added.includes(n) && !provided.has(n)
      && (hasFn(n) || hasConst(n) || state.has(n)));
    if (!want.length) return { body, added };
    for (const n of want) {
      added.push(n);
      // a function or a full const declaration first; a one-line piece of
      // state only if it is neither
      const text = hasFn(n) ? takeFunction(appJs, n) : hasConst(n) ? takeConst(appJs, n) : state.get(n);
      body = `${text}\n${body}`;
    }
  }
  throw new Error('lift-journal: the dependencies of the lifted code keep growing. '
    + `Last round wanted: ${added.slice(-8).join(', ')}. Narrow SHARED_JS, or stub the name in PROVIDED.`);
}

export function liftJournal() {
  const js = fs.readFileSync(path.join(WEB, 'src', 'journal', 'app.js'), 'utf8');
  const css = fs.readFileSync(path.join(WEB, 'src', 'journal', 'journal.css'), 'utf8');
  assertNoSelfReference(css, 'journal.css');

  fs.mkdirSync(OUT, { recursive: true });

  const outCss = `${HEADER}${collectCss(css, SHARED_CSS)}\n`;
  fs.writeFileSync(path.join(OUT, 'lifted.css'), outCss);

  /* The closure declares these itself: the app's own versions reach into
     storage and the signed-in account, which the landing page has neither of. */
  const PROVIDED = new Set(['pTip', 'skyState', 'secHans', 'S']);
  const { body: lifted, added } = liftFreeVars(js, collectJs(js, SHARED_JS), PROVIDED);
  const { text: bottom, missing } = wrapBottom(lifted);
  const body = lifted
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');
  const outJs = `${HEADER}${WRAP_TOP}\n${body}\n${bottom}`;
  fs.writeFileSync(path.join(OUT, 'lifted.js'), outJs);

  return { css: outCss.length, js: outJs.length, missing, added };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const n = liftJournal();
  console.log(`Lifted the journal's components: ${Math.round(n.css / 1024)} KB of rules, ${Math.round(n.js / 1024)} KB of code`);
  if (n.added.length) {
    console.log(`  brought its state across too: ${n.added.join(', ')}`);
  }
  if (n.missing.length) {
    console.log(`  the app does not define ${n.missing.join(', ')} — the page does without them`);
  }
}
