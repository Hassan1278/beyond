/* ======================================================================
   Beyond — the journal app.
   Write tonight, nothing replies, a letter arrives in the morning.
   Ported from the prototype (client/web/app.src.html); storage and letter
   writing go through Beyond's backend. Journal text is kept in memory only,
   never in browser storage.
   PC redesign: ink on night, letters on paper, hand-drawn marks instead of
   boxes. Tabs: Identity, Journal (the tonight page), Letters, Growth (once Patterns), centred; language and
   Settings sit at the top right.
   Identity is home: the app opens on it and the Beyond mark returns to it.
   Letters holds every letter, Settings holds memories.
   ====================================================================== */
/* eslint-disable */
import SAMPLE_DATA from './sample.json';
import { uiLang, setUiLang, startTranslating } from './i18n';
import { JOURNAL_THEMES, journalTheme, setJournalTheme, applyJournalTheme, themeSwatch } from './theme';
import { WELCOME_STEPS, WELCOME_REASONS, WELCOME_OTHER_MAX, WELCOME_VOICES, WELCOME_PRIVACY, LETTER_NAME_MAX } from './welcome';

let started = false;
export function startJournal(backend) {
if (started) return;
started = true;
applyJournalTheme();
startTranslating();
const SAMPLE = SAMPLE_DATA;

/* ---------- vocab ---------- */
const THEMES = {
  study: 'study pressure', career: 'internships & jobs', business: 'your business idea', technology: 'building things',
  creativity: 'making art', learning: 'curiosity', friendship: 'friends', family: 'family', community: 'helping others',
  rest: 'rest', health: 'your body', uncertainty: "not knowing what's next", comparison: 'comparing yourself', loneliness: 'feeling alone',
  achievement: 'getting things done', money: 'money', nature: 'being outdoors', travel: 'travel', ordinary: 'an ordinary day',
};
const THEME_KEYS = Object.keys(THEMES);
const ACTION_KINDS = ['rest', 'connection', 'exploration', 'practical', 'reflection'];
const LENSES = ['pattern', 'feeling', 'strength', 'need', 'context'];
const SECTIONS = {
  recap: ['Recap', '總結', 'var(--mist)', '总结'], insight: ['Insight', '分析', 'var(--dusk)', '分析'], challenge: ['Challenge', '問題', 'var(--rose)', '问题'],
  improve: ['Try this', '改善', 'var(--ember)', '改善'], encourage: ['Encourage', '鼓勵', 'var(--gold)', '鼓励'],
};
const VOICES = {
  friend: { name: 'Friend', desc: 'Warm, direct, a little funny.', example: 'Hey, so about last night…',
    prompt: 'Write as a warm, direct friend who is a little funny. Plain words, short sentences, no lecturing. Greeting like "Hey," and a short casual sign-off such as "Talk tonight,\\nB."',
    en: ['Hey,', 'Talk tonight,\nB.'], zh: ['Hi，', '今晚再傾，\nB.'], hans: ['嗨，', '今晚再聊，\nB.'] },
  mentor: { name: 'Mentor', desc: 'Clear, structured, honest.', example: 'Good morning. Three things stood out.',
    prompt: 'Write as a clear, honest mentor. Structured and calm, kind but not soft, no jargon. Greeting like "Good morning." and a brief sign-off such as "Until tonight."',
    en: ['Good morning.', 'Until tonight.'], zh: ['早晨。', '今晚見。'], hans: ['早上好。', '今晚见。'] },
  future: { name: 'Future you', desc: 'Writes back from a few years ahead.', example: 'Hi. It’s you, a few years from now.',
    prompt: "Write as the person themselves, a few years from now, looking back on this day with kindness. Never predict specific outcomes, never claim to know what happened next, and never promise that things worked out — speak about what they can notice now. Greeting like \"Hi. It's you, a few years from now.\" and sign-off \"See you down the road,\\nYou\".",
    en: ['Hi. It’s you, a few years from now.', 'See you down the road,\nYou'], zh: ['你好，我係幾年後嘅你。', '路上見，\n你'], hans: ['你好，我是几年后的你。', '路上见，\n你'] },
  diary: { name: 'Plain diary', desc: 'Just the summary. No voice.', example: 'Sat 10 Oct, summary',
    prompt: 'No persona. Write plainly and briefly, like a neutral diary summary: short factual sentences, no warmth flourishes, no jokes. The greeting is just the date and the word "summary" (e.g. "Thu 8 Oct, summary"). Leave the sign-off empty.',
    en: ['', ''], zh: ['', ''], hans: ['', ''] },
};
const PROMPTS = ["What's on your mind tonight?", 'What took most of your energy today?', 'Who did you feel close to today, even for a minute?', '今日有咩想講？', 'What felt heavier than it should have?', 'What are you unsure about right now?', 'What made you smile, even a little?'];
const SUPPORT = [
  { name: 'Emergency services · 緊急服務', phone: '999', note: 'If you or someone else is in immediate danger.' },
  { name: 'Mental Health Support Hotline · 精神健康支援熱線', phone: '18111', note: '24 hours · Cantonese, English' },
  { name: 'The Samaritans Hong Kong · 撒瑪利亞會', phone: '2896 0000', note: '24 hours · multilingual' },
  { name: 'Suicide Prevention Services · 生命熱線', phone: '2382 0000', note: '24 hours · Cantonese' },
  { name: 'Open Up · Open 噏 (online text support)', url: 'https://www.openup.hk', note: '24 hours · for young people' },
];
const CRISIS = [/\bkill(ing)? myself\b/i, /\bsuicid(e|al)\b/i, /\bend (my life|it all)\b/i, /\bwant(ed)? to die\b/i, /\bself[- ]?harm\b/i, /\bhurt(ing)? myself\b/i, /\bcut(ting)? myself\b/i, /\bno reason to live\b/i, /\bbetter off dead\b/i, /\bdon'?t want to (be alive|live)\b/i, /自殺/, /想死/, /輕生/, /唔想(再)?活/, /不想(再)?活/, /傷害自己/, /割手/, /了結(自己|生命)/, /死咗算/, /死了算/];
const hasCrisis = (t) => CRISIS.some((re) => re.test(t || ''));

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const journalDate = (d = new Date()) => { const x = new Date(d); if (x.getHours() < 4) x.setDate(x.getDate() - 1); return ymd(x); };
const addDays = (s, n) => { const x = parse(s); x.setDate(x.getDate() + n); return ymd(x); };
const utc = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d); };
const dayDiff = (a, b) => Math.round((utc(a) - utc(b)) / 864e5);
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const fmtDay = (s) => { const d = parse(s); return `${WD[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`; };
const hhmm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const deliverAtFor = (date) => { const [h, m] = ((typeof S !== 'undefined' && S.deliverTime) || '08:00').split(':').map(Number); const d = parse(date); d.setDate(d.getDate() + 1); d.setHours(h, m, 0, 0); return d.toISOString(); };
const deliverTime = () => S.deliverTime || '08:00';
const atTime = (L) => (L?.deliverAt ? hhmm(new Date(L.deliverAt)) : deliverTime());
const uid = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const plural = (n, a, b = `${a}s`) => `${n} ${n === 1 ? a : b}`;
const cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : s;
/* The active colour theme's tokens, for drawing on canvas (see journal.css). */
const tone = (name) => getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function seeded(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
const LANGS = [['auto', 'Auto · match my writing'], ['en', 'English'], ['zh-hant', '繁體中文'], ['zh-hans', '简体中文']];
const scriptOf = (t) => { const hans = (t.match(/[这们说时国过还见么没东车门问会对开关让给发长现实学习觉经]/g) || []).length; const hant = (t.match(/[這們說時國過還見麼沒東車門問會對開關讓給發長現實學習覺經嘅咗唔]/g) || []).length; return hans > hant ? 'hans' : 'hant'; };
const detectLang = (t) => { const zh = /[㐀-鿿]/.test(t); const en = /[a-z]{3,}/i.test(t.replace(/[㐀-鿿]/g, '')); return zh && en ? 'mixed' : zh ? 'zh' : 'en'; };
const countWords = (t) => { const s = (t || '').trim(); if (!s) return 0; return (s.match(/[㐀-鿿]/g) || []).length + (s.replace(/[㐀-鿿]/g, ' ').match(/\S+/g) || []).length; };

/* ---------- state ----------
   Your journal lives in your Beyond account. This page holds it in memory
   only. A few display choices (write or speak, speech language, demo mode)
   are remembered on this device; nothing you write is. */
const OFFLINE = false;
let AUTH = { auth: true, user: null };
const isGuest = () => false;
let storageOk = true;
function fresh() { return { v: 2, onboarded: false, welcomeSeen: false, welcomeReasons: [], welcomeOther: null, letterName: null, mode: 'own', voice: 'friend', lang: 'auto', inputMode: 'type', deliverTime: '08:00', allowEarly: true, draft: '', letters: [], demoLetters: [], demoNights: [], sampleMeta: {}, notes: {}, dirs: {}, memories: [], memoryPaused: false, forgotten: [], hiddenSampleMem: [], savedAt: 0 }; }
/* Demo mode (the default): sample nights to try, Kit's fictional letters next to
   yours, and "Skip to morning". Letters are still written by the AI, as in
   Normal mode. Normal mode is just your own journal. */
const demoOn = () => S.mode === 'sample';
const canSkip = () => demoOn() || isGuest() || OFFLINE || S.allowEarly !== false;
const isDemoSkip = () => demoOn() || isGuest() || OFFLINE;
const TIMES = ['06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '12:00'];
const timeOptions = (cur) => [...new Set([...TIMES, cur])].sort().map((t) => `<option ${cur === t ? 'selected' : ''}>${t}</option>`).join('');
const PREFS = 'beyond.prefs.v1';
function loadPrefs() {
  try { const p = JSON.parse(localStorage.getItem(PREFS) || '{}'); return { inputMode: p.inputMode === 'speak' ? 'speak' : 'type', speechLang: typeof p.speechLang === 'string' ? p.speechLang : undefined, mode: p.mode === 'own' ? 'own' : 'sample' }; } catch (e) { return { inputMode: 'type', mode: 'sample' }; }
}
function savePrefs() {
  try { localStorage.setItem(PREFS, JSON.stringify({ inputMode: S.inputMode, speechLang: S.speechLang || null, mode: S.mode })); } catch (e) { /* private window: fine */ }
}
let S = { ...fresh(), ...loadPrefs() };
let syncTimer = null;
/* Settings changes are sent to your account a moment later; display choices stay here. */
function save() {
  savePrefs();
  if (!synced) return;
  clearTimeout(syncTimer); syncTimer = setTimeout(syncSettings, 300);
}

/* Kit's story keeps its own spacing and weekdays; it is moved forward in whole
   weeks so the newest sample letter is always from the last few days. */
let sampleShift = null;
function sampleDate(s) {
  if (s.rel !== undefined) return addDays(journalDate(), s.rel);
  if (sampleShift === null) {
    const last = SAMPLE.reduce((m, x) => (x.date > m ? x.date : m), '');
    const diff = dayDiff(addDays(journalDate(), -1), last);
    sampleShift = diff - (((diff % 7) + 7) % 7);
  }
  return addDays(s.date, sampleShift);
}
function sampleLetters() {
  return SAMPLE.map((s) => {
    const meta = S.sampleMeta[s.id] || {};
    const date = sampleDate(s);
    return {
      id: s.id, sample: true, by: 'sample', date, entries: s.entries, content: asLetter(s.content), status: 'ready',
      deliverAt: deliverAtFor(date), early: true, readAt: meta.readAt !== undefined ? meta.readAt : (s.unread ? null : 'earlier'),
      actions: meta.actions || { ...s.actions }, private: meta.private !== undefined ? meta.private : s.private,
    };
  });
}
function allLetters() {
  const list = demoOn() ? [...S.letters, ...S.demoLetters, ...sampleLetters()] : [...S.letters];
  return list.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}
const findLetter = (id) => allLetters().find((l) => l.id === id);
const delivered = (l) => l.status === 'ready' && (l.early || Date.now() >= Date.parse(l.deliverAt));
function patchLetter(id, patch) {
  const demo = S.demoLetters.find((l) => l.id === id);
  if (demo) { Object.assign(demo, patch); return; } // never leaves this page
  const own = S.letters.find((l) => l.id === id);
  if (!own) { Object.assign((S.sampleMeta[id] = S.sampleMeta[id] || {}), patch); return; }
  const before = { ...own, actions: { ...(own.actions || {}) } };
  Object.assign(own, patch);
  const body = {};
  if (patch.readAt && !before.readAt) body.read = true;
  if (patch.early && !before.early) body.early = true;
  if ('private' in patch && !!patch.private !== !!before.private) body.private = !!patch.private;
  if (patch.actions) body.steps = { ...patch.actions };
  if (patch.deliverAt && patch.deliverAt !== before.deliverAt) body.deliver_at = patch.deliverAt;
  if (Object.keys(body).length) sendLetterPatch(own, body, before);
}
/* Every letter, whatever format it was written in, is read in one shape: a title, a
   flowing body, one question and one small step (format 3, the current letter writer).
   Older letters (Kit's samples, letters written before the switch) are reshaped from
   their sections; only their first step is kept, so one step earns the gold seal. */
const KIND_V3 = { practical: 'focus' };
const NIGHT_OF_TONE = { difficult: 'heavy', positive: 'good', mixed: 'mixed', ordinary: 'quiet' };
const shaped = new WeakMap();
function asLetter(c) {
  if (!c || typeof c !== 'object') return c;
  if (shaped.has(c)) return shaped.get(c);
  let out;
  if (c.version === 3) {
    const paras = String(c.body || '').split(/\n{2,}/);
    out = { ...c, recap: c.recap || clip(paras.length > 1 ? paras[1] : paras[0], 400), analysis: [], steps: (c.steps || []).slice(0, 1) };
  } else {
    const first = (c.steps || [])[0];
    const middle = [c.recap, ...(c.analysis || []).map((a) => a.text), c.advice?.text, c.encouragement].filter(Boolean);
    const body = [c.greeting, ...middle, c.signoff].filter(Boolean).join('\n\n');
    out = {
      ...c, legacy: true, title: c.headline, body,
      reflection_question: (c.openQuestions || [])[0] || null,
      small_step: first ? { text: first.text, minutes: Math.min(15, first.minutes || 10), category: KIND_V3[first.kind] || first.kind } : null,
      steps: first ? [{ ...first, kind: KIND_V3[first.kind] || first.kind }] : [],
      night_type: c.night_type || NIGHT_OF_TONE[c.tone] || 'mixed',
      safety_flag: c.safetyConcern ? 'watch' : 'none',
      evidence: c.evidence || (c.analysis || []).map((a) => a.quote).filter(Boolean),
    };
  }
  shaped.set(c, out);
  return out;
}
/* What letters call you: filled in here, never sent to the letter writer. */
function fillName(text) {
  const name = S.letterName;
  if (name) return text.replace(/\{\{name\}\}/g, name);
  return text.replace(/[ \t]*[,，]?[ \t]*\{\{name\}\}[ \t]*/g, '').replace(/^(Hey|Hi|Dear|嗨|你好)\s*([,，])?/m, (m, w, comma) => `${w}${comma || ','}`);
}
/* to-do progress: steps marked done out of steps not skipped */
function progress(L) {
  const steps = L.content?.steps || []; const a = L.actions || {};
  const done = steps.filter((_, i) => a[`step.${i}`] === 'tried').length;
  const skipped = steps.filter((_, i) => a[`step.${i}`] === 'skipped').length;
  const need = steps.length - skipped;
  return { done, need, total: steps.length, complete: need > 0 && done === need };
}

/* ---------- memory: what Beyond may remember about you ----------
   Learned from letters (0–2 each, checked) or told by you. You can see, edit,
   forget or pause it in You. A learned memory is only used while a letter it
   came from is kept in Growth. */
const SAMPLE_MEMORIES = [
  { id: 'dm1', text: 'First-year university student in Hong Kong', kind: 'told', letterIds: [] },
  { id: 'dm2', text: 'Just started university; school friends went to other unis', kind: 'learned', letterIds: ['l_d09'] },
  { id: 'dm3', text: 'Feels calmer after time outdoors', kind: 'learned', letterIds: ['l_d02'] },
  { id: 'dm4', text: 'Big loud crowds are hard; small groups doing something together are easier', kind: 'learned', letterIds: ['l_d07', 'l_d10'] },
  { id: 'dm5', text: 'Helping kids learn is the part of the week they look forward to most', kind: 'learned', letterIds: ['l_d18'] },
];
const normText = (t) => String(t || '').toLowerCase().replace(/[\s.。,，!！?？]+/g, ' ').trim();
function allMemories() {
  const sample = demoOn() ? SAMPLE_MEMORIES.filter((m) => !(S.hiddenSampleMem || []).includes(m.id)).map((m) => ({ ...m, sample: true })) : [];
  return [...(S.memories || []), ...sample];
}
function memoryInUse(m) {
  if (m.kind === 'told') return true;
  const ls = allLetters(); return m.letterIds.some((id) => { const l = ls.find((x) => x.id === id); return l && !l.private; });
}
const usableMemories = () => (S.memoryPaused ? [] : allMemories().filter(memoryInUse)).slice(0, 20);
/* Learning happens on the server when a letter is stored (at most two small,
   checked things, never something you told Beyond to forget). */

/* The night waiting for its letter. */
const pendingNight = () => S.letters.find((l) => !delivered(l));

/* ---------- letter writer ----------
   Letters are written by Beyond's letter service after you seal a night, with
   the same rules and checks as before. Nothing is written in this page; it
   only asks Beyond what's ready. */
const LOCAL = true;
let SERVER_STT = false; let SERVER_SYNC = true;
let aiLabel = 'Claude';
let claudeState = 'checking'; // checking | ready | off
const inflight = new Map();
let route = 'identity'; let param = null; // Identity is home
let claudeReady = Promise.resolve();
function checkAI() { return (claudeReady = (async () => {
  try { const j = await backend.aiStatus(); claudeState = j.letters ? 'ready' : 'off'; SERVER_STT = !!j.transcribe; } catch (e) { claudeState = 'off'; SERVER_STT = false; }
  if (route === 'login' || route === 'welcome' || !AUTH.user) return;
  if (route !== 'tonight') render();
  watchLetters();
})()); }
let stateReady = false;

const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const clip = (s, n) => { const t = norm(s); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

const ERR = {
  unavailable: 'Beyond’s letter writer couldn’t be reached. Your words are safe. Try again.',
  invalid_output: 'The letter didn’t pass Beyond’s checks (quotes must be your exact words, and there must be three to-dos). Try again.',
  refused: 'The letter writer declined to write about this night. Your words are safe, and you can try again.',
  rate_limited: 'Today’s letters are used up. Try again tomorrow.',
};
/* Try again on a letter that couldn't be written. */
function writeLetter(id) {
  const L = S.letters.find((l) => l.id === id);
  if (!L) return Promise.resolve();
  L.status = 'writing'; L.error = null;
  return (async () => {
    try { mergeLetter(await backend.retryLetter(id)); }
    catch (e) { L.status = 'failed'; L.error = e?.code === 'rate_limited' ? ERR.rate_limited : 'Couldn’t reach Beyond. Check your connection and try again.'; }
    if (!document.querySelector('.bk-sealing, .overnight')) render();
    watchLetters();
  })();
}

/* ---------- routing ---------- */
let lettersScroll = 0; // going back from a letter returns to the same place in the list
function go(r, p = null, opts = {}) {
  const from = route;
  if (from === 'letters' && r === 'letter') lettersScroll = window.scrollY;
  if (r !== 'letter') { letterFromDir = null; letterFromBook = null; }
  if (r === 'tonight' && from !== 'tonight' && !opts.keepBook) BK.at = 'write'; // the Journal tab opens on today's page
  route = r; param = p;
  const token = p ? `${route}${route === 'identity' ? '/' : '-'}${p}` : route;
  if (!opts.replace && location.hash.slice(1) !== token) { try { history.pushState(null, '', `#${token}`); } catch (e) { /* frame may refuse */ } }
  render();
  if (!opts.keepScroll) toTop(from === 'letter' && r === 'letters' ? lettersScroll : 0);
}
/* Every tab and Settings opens at the top: set now, and again once the page has laid out. */
function toTop(y = 0) {
  window.scrollTo({ top: y, left: 0, behavior: 'instant' });
  requestAnimationFrame(() => { if (Math.abs(window.scrollY - y) > 2) window.scrollTo({ top: y, left: 0, behavior: 'instant' }); });
}
try { history.scrollRestoration = 'manual'; } catch (e) { /* older browsers */ }
function readHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  const m = h.match(/^(letter|growth|patterns)-(.+)$/);
  const dir = h.match(/^identity\/([a-z-]+)$/);
  if (dir) { route = 'identity'; param = dir[1]; } // a direction's own page
  else if (h === 'patterns-identity') { route = 'identity'; param = null; } // old links
  else if (m) { route = m[1] === 'patterns' ? 'growth' : m[1]; param = m[2]; } // #patterns-year is now #growth-year
  else if (h === 'patterns') { route = 'growth'; param = null; } // old links
  else if (h === 'you') { route = 'settings'; param = null; } // old links
  else if (h === 'profile') { route = 'letters'; param = null; } // old links
  else if (['tonight', 'letters', 'identity', 'growth', 'settings', 'support', 'welcome'].includes(h)) { route = h; param = null; }
}
window.addEventListener('popstate', () => { if (route === 'identity' && param && !/^#identity\//.test(location.hash) && /^#identity$|^$/.test(location.hash)) { closeSheet(false); return closeDirection({ viaHistory: true }); } const from = route; closeSheet(false); readHash(); render(); toTop(from === 'letter' && route === 'letters' ? lettersScroll : 0); });

/* ---------- icons ---------- */
/* Hand-drawn line marks: slightly uneven strokes, never perfect geometry. */
const HAND = 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
const I = {
  moon: `<svg viewBox="0 0 24 24" ${HAND}><path d="M15.6 3.6c-4.3.6-7.3 4.4-6.9 8.7.4 4.2 4.2 7.4 8.5 7.1-1.6 1.4-3.8 2.2-6.1 2-4.6-.4-8-4.4-7.6-9 .4-4.4 4.1-7.8 8.6-7.6 1.3.1 2.4-.4 3.5-1.2Z"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" ${HAND}><path d="M3.4 6.2c5.8-.5 11.5-.6 17.3-.1.4 4 .3 8 .1 11.9-5.8.4-11.5.4-17.2 0-.4-3.9-.5-7.9-.2-11.8Z"/><path d="M3.8 6.7c2.6 2.3 5.3 4.4 8.3 6.3 2.9-1.9 5.6-4 8.2-6.4"/></svg>`,
  bubbles: `<svg viewBox="0 0 24 24" ${HAND}><path d="M9.2 4.4c3 0 5.3 2.3 5.2 5.2-.1 2.9-2.5 5-5.4 4.9-2.8-.1-4.9-2.4-4.8-5.2.2-2.7 2.3-4.9 5-4.9Z"/><path d="M16.9 12.6c2 .1 3.6 1.8 3.5 3.8-.1 2-1.9 3.6-3.9 3.5-2-.1-3.5-1.8-3.4-3.8.1-2 1.8-3.6 3.8-3.5Z"/><path d="M6.6 16.8c1.1 0 2 .9 2 2s-1 1.9-2.1 1.9c-1 0-1.9-.9-1.9-2 0-1 .9-1.9 2-1.9Z"/></svg>`,
  sky: `<svg viewBox="0 0 24 24" ${HAND}><path d="M6 13.4c.3 1.6.9 2.4 2.4 2.7-1.5.4-2.1 1.1-2.4 2.8-.3-1.6-.9-2.4-2.5-2.7 1.6-.4 2.2-1.1 2.5-2.8Z"/><path d="M15.4 3.6c.5 2.6 1.6 3.9 4.1 4.4-2.5.6-3.6 1.9-4.1 4.6-.5-2.6-1.6-3.9-4.2-4.4 2.6-.6 3.7-1.9 4.2-4.6Z"/><path d="M8.7 15.4c2-1.4 3.6-2.9 5.2-4.6" stroke-dasharray="0.1 2.6"/></svg>`,
  you: `<svg viewBox="0 0 24 24" ${HAND}><path d="M12.1 4.6c1.9 0 3.4 1.6 3.3 3.5 0 1.9-1.6 3.4-3.5 3.3-1.8 0-3.3-1.6-3.2-3.5.1-1.8 1.5-3.3 3.4-3.3Z"/><path d="M5.2 19.8c.9-3.6 3.8-5.4 6.9-5.4 3.2 0 6 1.8 6.8 5.5"/></svg>`,
  star: `<svg viewBox="0 0 24 24" ${HAND}><path d="M12.2 3.2c.6 4.1 2.2 6.3 6.6 7.3-4.3.9-6 3-6.7 7.8-.7-4.5-2.4-6.8-6.9-7.6 4.4-1 6.3-3.2 7-7.5Z"/></svg>`,
  // switch language: 文 and A swapping places
  translate: `<svg viewBox="0 0 24 24" ${HAND}><rect x="1.8" y="1.8" width="10" height="10" rx="2.4"/><rect x="12.2" y="12.2" width="10" height="10" rx="2.4"/><text x="6.8" y="9.6" text-anchor="middle" font-size="7.2" fill="currentColor" stroke="none">文</text><text x="17.2" y="20" text-anchor="middle" font-size="7.4" font-weight="600" fill="currentColor" stroke="none">A</text><path d="M15 3.2c2.9 0 5 1.9 5.1 4.9"/><path d="M18.2 6.6l1.9 1.7 1.7-2"/><path d="M9 20.8c-2.9 0-5-1.9-5.1-4.9"/><path d="M5.8 17.4l-1.9-1.7-1.7 2"/></svg>`,
  // Growth: a sprout
  sprout: `<svg viewBox="0 0 24 24" ${HAND}><path d="M12.1 20.6c-.2-4.1-.1-7.6.3-10.4"/><path d="M12.3 11.8c-.6-3.4-3.2-5.6-7.4-5.6.2 3.9 2.7 6.1 7.4 5.6Z"/><path d="M12.5 9.6c.4-3.3 2.7-5.4 6.8-5.5 0 3.7-2.4 5.8-6.8 5.5Z"/><path d="M7.4 20.4c3.1-.4 6.2-.4 9.3 0"/></svg>`,
  // the Settings cog: eight square teeth around a ring
  gear: `<svg viewBox="0 0 24 24" ${HAND}><path d="M19.1 9.8L21.8 10.3L21.8 13.7L19.1 14.2L18.5 15.5L20.2 17.7L17.7 20.2L15.5 18.5L14.2 19.1L13.7 21.8L10.3 21.8L9.8 19.1L8.5 18.5L6.3 20.2L3.8 17.7L5.5 15.5L4.9 14.2L2.2 13.7L2.2 10.3L4.9 9.8L5.5 8.5L3.8 6.3L6.3 3.8L8.5 5.5L9.8 4.9L10.3 2.2L13.7 2.2L14.2 4.9L15.5 5.5L17.7 3.8L20.2 6.3L18.5 8.5Z"/><circle cx="12" cy="12" r="3.4"/></svg>`,
  search: `<svg viewBox="0 0 24 24" ${HAND}><path d="M10.6 4.2c3.6 0 6.4 2.8 6.3 6.3-.1 3.5-3 6.2-6.4 6.1-3.4-.1-6.1-2.9-6-6.3.1-3.3 2.8-6.1 6.1-6.1Z"/><path d="M15.4 15.6c1.6 1.5 3.2 3 4.9 4.6"/></svg>`,
  left: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m14 6-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m10 6 6 6-6 6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  crescent: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 3.2a9 9 0 1 0 5.3 13.7A7.4 7.4 0 0 1 15.5 3.2Z"/></svg>',
  cal: `<svg viewBox="0 0 24 24" ${HAND}><path d="M4.2 6.4c5.2-.4 10.4-.4 15.6 0 .3 4.5.3 9 0 13.4-5.2.4-10.4.4-15.6 0-.3-4.4-.3-8.9 0-13.4Z"/><path d="M4.4 10.2c5.1-.2 10.2-.2 15.3 0"/><path d="M8.4 4v4M15.6 4v4"/><path d="M8 14h.1M12 14h.1M16 14h.1M8 17h.1M12 17h.1" stroke-width="2.2"/></svg>`,
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  pen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="7" y="7" width="10" height="10" rx="2.5"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>',
};
function ring(L, size = 46) {
  const p = progress(L); const C = 2 * Math.PI * 20; const frac = p.need ? p.done / p.need : 0;
  if (p.complete) return goldSeal(size);
  return `<span class="ring" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 46 46" aria-hidden="true"><circle cx="23" cy="23" r="20" class="rt"/><circle cx="23" cy="23" r="20" class="rp" style="stroke-dasharray:${(frac * C).toFixed(1)} ${C.toFixed(1)}"/></svg>
    <span class="n">${p.done}/${p.need}</span></span>`;
}
/* The gold seal: a stamped wax disc with a scalloped edge and a hand-drawn tick. */
function goldSeal(size = 46) {
  const n = 18; let d = '';
  for (let i = 0; i <= n; i++) { const a = (i / n) * Math.PI * 2 - Math.PI / 2; const r = i % 2 ? 19.2 : 22; d += `${i ? 'L' : 'M'}${(23 + Math.cos(a) * r).toFixed(1)} ${(23 + Math.sin(a) * r).toFixed(1)} `; }
  return `<span class="ring is-done" style="width:${size}px;height:${size}px"><svg viewBox="0 0 46 46" aria-hidden="true"><path d="${d}Z" class="seal-edge"/><path d="${wobble('seal', 23, 23, 15, .04)}" class="seal-in"/><path d="M15.6 23.6c2 1.5 3.6 3.2 5 5.1 2.8-4.6 5.9-8.2 9.6-11" class="seal-tick"/></svg></span>`;
}
/* An uneven circle, as if drawn by hand: seeded so it looks the same every time. */
function wobble(seed, cx, cy, r, j = .06, n = 10) {
  const rnd = seeded(String(seed)); const off = rnd() * Math.PI * 2; const pts = [];
  for (let i = 0; i < n; i++) { const a = off + (i / n) * Math.PI * 2; const rr = r * (1 + (rnd() - .5) * 2 * j); pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); }
  const f = (v) => v.toFixed(1); const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const start = mid(pts[n - 1], pts[0]);
  let d = `M${f(start[0])} ${f(start[1])}`;
  for (let i = 0; i < n; i++) { const p = pts[i]; const q = mid(pts[i], pts[(i + 1) % n]); d += ` Q${f(p[0])} ${f(p[1])} ${f(q[0])} ${f(q[1])}`; }
  // overshoot a little past the start, the way a pen does
  const p = pts[0]; const q = mid(pts[0], pts[1 % n]);
  return `${d} Q${f(p[0] * .985 + cx * .015)} ${f(p[1] * .985 + cy * .015)} ${f(q[0] * .97 + cx * .03)} ${f(q[1] * .97 + cy * .03)}`;
}
/* A four-point star drawn freehand. */
function sparkle(seed, s) {
  const r = seeded(String(seed)); const j = () => 1 + (r() - .5) * .3; const k = .2;
  const pt = (x, y) => `${(x).toFixed(1)} ${(y).toFixed(1)}`;
  const t = -s * j(), ri = s * j(), b = s * j(), l = -s * j();
  return `M${pt(0, t)} C${pt(s * k, t * k)} ${pt(ri * k, -s * k)} ${pt(ri, 0)} C${pt(ri * k, s * k)} ${pt(s * k, b * k)} ${pt(0, b)} C${pt(-s * k, b * k)} ${pt(l * k, s * k)} ${pt(l, 0)} C${pt(l * k, -s * k)} ${pt(-s * k, t * k)} ${pt(0, t)}Z`;
}

/* ---------- render ---------- */
let after = []; let lastRoute = null;
function render() {
  if (route !== 'tonight' && voice.state === 'rec') stopRecording();
  if (route !== 'tonight' && voice.state === 'dictate') voice.state = 'idle';
  if (needsWelcome() && !['support', 'login'].includes(route)) route = 'welcome';
  document.body.classList.add('night');
  setAmbient(route === 'tonight' || route === 'welcome' ? 'full' : 'soft');
  if (route === 'you') route = 'settings';
  if (route === 'profile') route = 'letters';
  const views = { welcome: vWelcome, login: vLogin, tonight: vTonight, letters: vLetters, letter: vLetter, identity: vIdentity, growth: vGrowth, settings: vSettings, support: vSupport };
  const html = (views[route] || vTonight)();
  const unread = allLetters().some((l) => delivered(l) && !l.readAt);
  setAmbient(route === 'login' ? 'full' : undefined);
  const here = (r) => route === r || (r === 'letters' && route === 'letter');
  // a new page enters with one short rise; staying on a page re-renders in place
  const entering = route !== lastRoute; lastRoute = route;
  if (entering && route === 'identity' && !identVeiled) identRevealAt = performance.now() + (identArrive ? 650 : 0);
  const nav = route === 'welcome' || route === 'login' ? '' : `
    <header class="topbar">
      <button class="brand" data-go="identity" aria-label="Beyond, Identity">${I.moon}<span>Beyond</span></button>
      <nav class="tabs" aria-label="Main">
        ${[['identity', 'Identity', I.bubbles], ['tonight', 'Journal', I.moon], ['letters', 'Letters', I.mail], ['growth', 'Growth', I.sprout]].map(([r, l, ic]) =>
          `<button class="tab" data-go="${r}" ${here(r) ? 'aria-current="page"' : ''}>${ic}<span>${l}</span>${r === 'letters' && unread ? '<i class="dot" aria-label="Unread letter"></i>' : ''}</button>`).join('')}
      </nav>
      <div class="top-actions">
        <button class="gear-btn lang-btn" data-act="ui-lang" data-i18n-skip lang="${uiLang() === 'zh' ? 'en' : 'zh-Hans'}" aria-label="${uiLang() === 'zh' ? 'Switch to English' : '切换到中文'}" title="${uiLang() === 'zh' ? 'English' : '中文'}">${I.translate}</button>
        <button class="gear-btn" data-go="settings" aria-label="Settings" ${here('settings') ? 'aria-current="page"' : ''}>${I.gear}</button>
      </div>
    </header>`;
  $('#app').innerHTML = `${nav}<main id="main" class="v-${route}${entering && stateReady ? ' is-entering' : ''}">${html}</main>`;
  after.forEach((f) => f()); after = [];
}
let candleRaf = 0;
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || reduceMotion()) return;
  cancelAnimationFrame(candleRaf);
  candleRaf = requestAnimationFrame(() => { const a = document.getElementById('ambient'); if (a) { a.style.setProperty('--mx', `${e.clientX}px`); a.style.setProperty('--my', `${e.clientY}px`); a.classList.add('has-candle'); } });
}, { passive: true });
document.addEventListener('pointerleave', () => document.getElementById('ambient')?.classList.remove('has-candle'));
function setAmbient(mode) {
  if (mode === undefined) return;
  const a = $('#ambient');
  a.classList.toggle('soft', mode === 'soft');
  if (!a.childElementCount) {
    const r = seeded('embers');
    a.innerHTML = '<i class="blob b1"></i><i class="blob b2"></i><i class="blob b3"></i>' + Array.from({ length: 16 }, () =>
      `<i class="ember" style="left:${(r() * 100).toFixed(1)}%;--z:${(2 + r() * 3).toFixed(1)}px;--t:${(11 + r() * 12).toFixed(1)}s;--dl:${(-r() * 20).toFixed(1)}s;--dx:${((r() - .5) * 120).toFixed(0)}px"></i>`).join('');
    // plus a few pencil stars in the margins
    const spots = [[4, 12, 9], [93, 8, 7], [88, 46, 5], [6, 64, 6], [96, 82, 8], [14, 90, 5], [72, 20, 4]];
    a.innerHTML += '<i class="candle" aria-hidden="true"></i>';
    a.innerHTML += spots.map(([x, y, s], i) => `<svg class="pencil-star" style="left:${x}%;top:${y}%;width:${s * 3}px;height:${s * 3}px" viewBox="-10 -10 20 20"><path d="${sparkle(`amb${i}`, 8)}"/></svg>`).join('');
  }
  a.hidden = false;
}

function sampleBanner() {
  if (!demoOn()) return '';
  return `<p class="sample-banner">Demo mode: Kit’s sample letters (fictional) are shown with yours. <button class="link" data-act="own">Switch to Normal mode</button></p>`;
}

/* ----- welcome: four calm screens on first sign-in -----
   Shown once per account, before any tab. "Seen" is kept on the account
   (settings.welcome_seen once the welcome migration is live; until then the
   older settings.onboarded), never in browser storage. Words live in welcome.ts. */
const DEV = process.env.NODE_ENV !== 'production';
// Development only: /app?onboarding=1 shows the welcome again, for demos and testing.
let replayWelcome = DEV && new URLSearchParams(location.search).get('onboarding') === '1';
let draftSupported = false; // the account can keep an unsealed draft
let welcomeSupported = false; // the account can store welcome_seen and the answers
const needsWelcome = () => replayWelcome || (welcomeSupported ? !S.welcomeSeen : !S.onboarded);
const W = { step: 0, shown: -1, reasons: new Set(), other: '', voice: null, name: '', ready: false, timer: 0, seenFirst: false };
const ART = {
  write: `<svg viewBox="0 0 120 90" ${HAND}><path d="M88 13c-5 1.5-8 6.5-6.6 11.5 1.3 4.9 6.3 7.8 11.3 6.7-3 3-8 4-12.2 2-6-2.9-8.3-10-5.2-15.5 2.2-4 6.7-6 11-5.2"/><path d="M60 41c-10-6-24-7.4-38-4.2v32c14-3.2 28-1.8 38 4.2 10-6 24-7.4 38-4.2v-32c-14-3.2-28-1.8-38 4.2Z"/><path d="M60 41v32"/><path d="M29 47.5c7.5-1.2 15-.9 22.6 1M29 54.5c7.5-1.2 15-.9 22.6 1M29 61.5c5-.8 10-.7 15 .3"/><path d="M71 62l19-23.5 4.4 3.4-19 23.5-6.6 2.3Z"/><path d="M104 32l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1Z"/><path d="M18 22l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/></svg>`,
  letter: `<svg viewBox="0 0 120 90" ${HAND}><path d="M14 72h92"/><path d="M30 72a30 30 0 0 1 60 0" stroke-dasharray="2 5"/><path d="M60 33v-9M37 41l-6-6M83 41l6-6M24 58h-8M96 58h8"/><path d="M39 47.5c14-.6 28-.6 42 0 .5 8 .4 16-.2 24.3-13.8.5-27.6.5-41.4 0-.6-8.2-.8-16.2-.4-24.3Z"/><path d="M39.6 48.6c6.6 5 13.4 9.6 20.4 13.7 7-4.1 13.8-8.7 20.3-13.8"/><path d="M60 57.6c2.5 0 4.4 2 4.3 4.4 0 2.4-2 4.3-4.4 4.3-2.4 0-4.3-2-4.2-4.4 0-2.4 2-4.3 4.3-4.3Z"/></svg>`,
  grow: `<svg viewBox="0 0 120 90" ${HAND}><path d="M60 40.5c4.4 0 8 3.6 7.9 8 0 4.4-3.7 7.9-8.1 7.8-4.3-.1-7.8-3.7-7.7-8 .1-4.3 3.6-7.8 7.9-7.8Z"/><path d="M31 26.5c2.6 0 4.7 2.1 4.6 4.7 0 2.6-2.2 4.6-4.8 4.6-2.5 0-4.6-2.2-4.5-4.7.1-2.5 2.2-4.6 4.7-4.6ZM93 23c3.1 0 5.6 2.5 5.5 5.6 0 3.1-2.6 5.5-5.7 5.5-3 0-5.5-2.6-5.4-5.6.1-3 2.6-5.5 5.6-5.5ZM97 63c2.2 0 4 1.8 3.9 4 0 2.2-1.8 3.9-4 3.9-2.1 0-3.9-1.8-3.8-4 0-2.1 1.8-3.9 3.9-3.9ZM26 63.5c2.8 0 5 2.3 4.9 5 0 2.8-2.3 5-5.1 4.9-2.7 0-4.9-2.3-4.8-5 .1-2.7 2.3-4.9 5-4.9Z"/><path d="M53.5 44.5 35.5 33.5M66.8 44l21.4-12.6M67 53l25.5 12M53 53.5 30.5 65.5" stroke-dasharray="2 4"/><path d="M75 13l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9Z"/></svg>`,
  shield: `<svg viewBox="0 0 120 124"><defs>
    <linearGradient id="onb-sh" x1="0" y1="0" x2=".35" y2="1"><stop offset="0" style="stop-color:var(--light-1)"/><stop offset=".5" style="stop-color:var(--light-2)"/><stop offset="1" style="stop-color:var(--ember-deep)"/></linearGradient>
    <linearGradient id="onb-shine" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="onb-tick" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".98"/><stop offset="1" stop-color="#fff" stop-opacity=".7"/></linearGradient></defs>
    <path d="M60 8c13 7.5 27 11.6 41.5 13.4 3 .4 5.2 3 5.1 6.1-.9 36.6-15.4 63.6-43.6 81.7a5.6 5.6 0 0 1-6 0C28.8 91.1 14.3 64.1 13.4 27.5c-.1-3.1 2.1-5.7 5.1-6.1C33 19.6 47 15.5 60 8Z" fill="url(#onb-sh)"/>
    <path d="M60 8c13 7.5 27 11.6 41.5 13.4 3 .4 5.2 3 5.1 6.1-.9 36.6-15.4 63.6-43.6 81.7a5.6 5.6 0 0 1-6 0C28.8 91.1 14.3 64.1 13.4 27.5c-.1-3.1 2.1-5.7 5.1-6.1C33 19.6 47 15.5 60 8Z" fill="url(#onb-shine)"/>
    <path d="M40 62.5 54 76.5 82 46" fill="none" stroke="url(#onb-tick)" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" ${HAND}><path d="M6.4 10.6c3.7-.3 7.5-.3 11.2 0 .3 3.2.3 6.4 0 9.6-3.7.3-7.5.3-11.2 0-.3-3.2-.3-6.4 0-9.6Z"/><path d="M8.6 10.4V8c0-2 1.5-3.6 3.4-3.6 1.9 0 3.4 1.6 3.4 3.6v2.4"/></svg>`,
  seal: `<svg viewBox="0 0 24 24" ${HAND}><path d="M3.4 6.2c5.8-.5 11.5-.6 17.3-.1.4 4 .3 8 .1 11.9-5.8.4-11.5.4-17.2 0-.4-3.9-.5-7.9-.2-11.8Z"/><path d="M3.8 6.7c2.6 2.3 5.3 4.4 8.3 6.3 2.9-1.9 5.6-4 8.2-6.4"/></svg>`,
  memory: `<svg viewBox="0 0 24 24" ${HAND}><path d="M12.2 3.2c.6 4.1 2.2 6.3 6.6 7.3-4.3.9-6 3-6.7 7.8-.7-4.5-2.4-6.8-6.9-7.6 4.4-1 6.3-3.2 7-7.5Z"/></svg>`,
  clear: `<svg viewBox="0 0 24 24" ${HAND}><path d="M4.5 6.8h15M9.3 6.6V4.8c1.8-.3 3.6-.3 5.4 0v1.8"/><path d="M6.4 7c.3 4.3.6 8.6 1.1 12.9 2.9.3 5.8.3 8.8 0 .5-4.3.8-8.6 1.1-12.9"/></svg>`,
};
function welcomeOk() {
  if (W.step === 0) return W.ready;
  if (W.step === 1) return W.reasons.size > 0 || !!W.other.trim();
  if (W.step === 2) return !!W.voice;
  return W.ready;
}
function vWelcome() {
  const n = W.step; const pct = (n + 1) * 25; const from = W.shown >= 0 && W.shown !== n ? (W.shown + 1) * 25 : pct;
  const entering = W.shown !== n; W.shown = n;
  const again = n === 0 && W.seenFirst;
  if (entering) { clearTimeout(W.timer); W.ready = again; if ((n === 0 && !again) || n === 3) W.timer = setTimeout(() => { W.ready = true; if (n === 0) W.seenFirst = true; paintWelcome(); }, 3000); }
  after.push(() => {
    const bar = $('.onb-bar i'); if (bar) requestAnimationFrame(() => { bar.style.width = `${pct}%`; });
    if (n === 1) $('#onb-other')?.addEventListener('input', (e) => { W.other = e.target.value; paintWelcome(); });
    if (n === 2) $('#onb-name')?.addEventListener('input', (e) => { W.name = e.target.value; });
    $('.onb-body h1')?.focus({ preventScroll: true });
  });
  let body = '';
  if (n === 0) {
    body = `<h1 class="onb-t" tabindex="-1">How Beyond works</h1>
      <ol class="onb-steps ${again ? 'is-seen' : ''}">${WELCOME_STEPS.map((st, i) => `<li class="onb-card" style="--i:${i};--d:${(0.25 + i * 1).toFixed(2)}s"><span class="onb-num" aria-hidden="true">${i + 1}</span><span class="onb-card-t"><b><span class="sr-only">${i + 1}. </span>${st.title}</b><span>${st.text}</span></span><span class="onb-art" aria-hidden="true">${[ART.write, ART.letter, ART.grow][i]}</span></li>`).join('')}</ol>`;
  } else if (n === 1) {
    body = `<h1 class="onb-t" tabindex="-1">What brings you here?</h1><p class="onb-sub">Choose any that fit.</p>
      <div class="onb-opts" role="group" aria-label="What brings you here?">${WELCOME_REASONS.map((r) => `<button class="onb-opt" data-onb-reason="${r.key}" role="checkbox" aria-checked="${W.reasons.has(r.key)}"><i aria-hidden="true">${I.check}</i><span>${r.label}</span></button>`).join('')}</div>
      <div class="onb-other" ${W.reasons.has('other') ? '' : 'hidden'}><label class="sr-only" for="onb-other">Something else</label><input id="onb-other" class="login-in" maxlength="${WELCOME_OTHER_MAX}" placeholder="Tell us in your own words" value="${esc(W.other)}" autocomplete="off"></div>`;
  } else if (n === 2) {
    body = `<h1 class="onb-t" tabindex="-1">Who writes back each morning?</h1>
      <div class="onb-voices" role="radiogroup" aria-label="Who writes back each morning?">${WELCOME_VOICES.map((v) => `<button class="onb-voice" data-onb-voice="${v.key}" role="radio" aria-checked="${W.voice === v.key}"><b>${v.name}</b><span>${v.desc}</span></button>`).join('')}</div>
      ${welcomeSupported ? `<label class="onb-name" for="onb-name"><span>What should your letters call you?</span><input id="onb-name" class="login-in" maxlength="${LETTER_NAME_MAX}" placeholder="Your name or a nickname (optional)" value="${esc(W.name)}" autocomplete="nickname"></label>` : ''}
      <p class="fine onb-foot-note">You can switch anytime in Settings.</p>`;
  } else {
    body = `<span class="onb-shield" aria-hidden="true">${ART.shield}</span>
      <h1 class="onb-t onb-t-big" tabindex="-1">${WELCOME_PRIVACY.heading}</h1>
      <p class="onb-sub">${WELCOME_PRIVACY.subtitle}</p>
      <ul class="onb-privacy">${WELCOME_PRIVACY.items.map((it) => `<li><span class="onb-ico" aria-hidden="true">${ART[it.icon]}</span><span><b>${it.title}</b> ${it.text}</span></li>`).join('')}</ul>
      <p class="fine onb-note">${WELCOME_PRIVACY.note}</p>
      <button class="btn amber onb-ready ${welcomeOk() ? 'is-shown' : ''}" data-act="onb-done" ${welcomeOk() ? '' : 'disabled aria-disabled="true" tabindex="-1"'}>I’m ready</button>`;
  }
  const ok = welcomeOk();
  return `<section class="onb" data-step="${n}">
      <div class="onb-bar" role="progressbar" aria-label="Welcome progress" aria-valuemin="1" aria-valuemax="4" aria-valuenow="${n + 1}"><i style="width:${from}%"></i></div>
      <p class="onb-count">${n + 1} of 4</p>
      <div class="onb-body">${body}</div>
      <div class="onb-actions">
        ${n > 0 ? `<button class="btn onb-back" data-act="onb-back">${I.left}Back</button>` : ''}
        ${n < 3 ? `<button class="btn amber onb-next" data-act="onb-next" ${ok ? '' : 'disabled aria-disabled="true"'}>Next${I.right}</button>` : ''}
      </div>
    </section>`;
}
/* Light the Next (or I'm ready) button without redrawing the screen, so nothing replays. */
function paintWelcome() {
  if (route !== 'welcome') return;
  const ok = welcomeOk();
  const btn = $('.onb-next, .onb-ready'); if (!btn) return;
  btn.disabled = !ok; if (ok) btn.removeAttribute('aria-disabled'); else btn.setAttribute('aria-disabled', 'true');
  if (btn.classList.contains('onb-ready')) { btn.classList.toggle('is-shown', ok); if (ok) btn.removeAttribute('tabindex'); }
}
function finishWelcome() {
  clearTimeout(W.timer);
  S.onboarded = true;
  if (welcomeSupported) {
    // Kept on the account for the team. TODO: these answers could later shape the welcome
    // letter or prompts, but they are not sent to the letter writer today (the Privacy page
    // lists exactly what is), and they are not shown as a memory.
    S.welcomeSeen = true;
    S.welcomeReasons = WELCOME_REASONS.map((r) => r.key).filter((k) => W.reasons.has(k));
    const other = W.reasons.has('other') ? W.other.trim().slice(0, WELCOME_OTHER_MAX) : '';
    S.welcomeOther = other || null;
    // What letters call you: filled into the letter by the app, never sent to the letter writer.
    S.letterName = W.name.trim().slice(0, LETTER_NAME_MAX) || null;
  }
  save();
  if (replayWelcome) { replayWelcome = false; try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) { /* fine */ } }
  W.step = 0; W.shown = -1; W.reasons = new Set(); W.other = ''; W.voice = null; W.name = ''; W.seenFirst = false;
  identArrive = true;
  go('identity');
}
function voiceCards() {
  return Object.entries(VOICES).map(([k, v]) => `<button class="voice" data-voice="${k}" aria-pressed="${S.voice === k}"><b>${v.name}</b><span>${v.desc}</span><i>“${esc(v.example)}”</i></button>`).join('');
}

/* ----- Journal: a book -----
   Today's page is where you write. Every earlier day you wrote on is a page you can
   flip back to: read-only, so a letter always matches its night. Days with no
   writing are skipped. Pages come from the letters already loaded, plus your
   entries fetched a hundred at a time as you flip back (so an entry still waiting
   for its letter is in the book too). Only the open page or spread is drawn. */
let promptTimer = null; let lastWords = 0;
const BK = { at: 'write', month: null, entries: new Map(), cursor: undefined, loading: null, two: null, focus: true };
const bookTwo = () => window.innerWidth >= 960; // a two-page spread with the calendar beside it
/* Writing again the same night adds a "[HH:MM]" line before the new words (see
   sealNight), so each sealing keeps its own time on the day's page. */
const PART_MARK = /^\[(\d{2}):(\d{2})\]$/;
function splitEntry(text, t) {
  const parts = []; let cur = { t, lines: [] };
  for (const line of String(text || '').split('\n')) { const m = line.match(PART_MARK); if (m) { parts.push(cur); cur = { t: `${m[1]}:${m[2]}`, lines: [] }; } else cur.lines.push(line); }
  parts.push(cur);
  return parts.map((p) => ({ t: p.t || '', text: p.lines.join('\n').trim() })).filter((p) => p.text);
}
const entryPlain = (text) => splitEntry(text, '').map((p) => p.text).join('\n\n');
const ampm = (t) => { if (!/^\d\d:\d\d$/.test(t || '')) return ''; const [h, m] = t.split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(m)}${h < 12 ? 'am' : 'pm'}`; };
const nightMin = (t) => { if (!t) return 0; const m = toMin(t); return m < 240 ? m + 1440 : m; }; // after midnight still belongs to the night before
function bookDays() {
  const days = new Map(); const seen = new Set();
  const day = (date) => { if (!days.has(date)) days.set(date, { date, parts: [], letters: [], sample: false }); return days.get(date); };
  for (const L of allLetters()) {
    const d = day(L.date); d.letters.push(L); if (L.sample) d.sample = true;
    if (L.demo) continue; // a demo letter quotes words that are already on the page as the night's own entry
    (L.entries || []).forEach((e, i) => { const k = e.id || `${L.id}:${i}`; if (seen.has(k)) return; seen.add(k); d.parts.push(...splitEntry(e.text, e.t)); });
  }
  for (const e of BK.entries.values()) {
    if (seen.has(e.id)) continue; seen.add(e.id);
    const at = new Date(e.created_at); day(journalDate(at)).parts.push(...splitEntry(e.text, hhmm(at)));
  }
  return [...days.values()].filter((d) => d.parts.length).map((d) => ({ ...d, parts: d.parts.sort((a, b) => nightMin(a.t) - nightMin(b.t)) })).sort((a, b) => a.date.localeCompare(b.date));
}
const bookPages = () => [...bookDays(), { write: true, date: journalDate() }];
const pageAt = (P) => { if (BK.at === 'write') return P.length - 1; const i = P.findIndex((p) => !p.write && p.date === BK.at); return i === -1 ? P.length - 1 : i; };
/* Two pages: the newest spread has today's writing page on the right. */
const spreadOf = (P, i) => { const r = P.length - 1 - 2 * Math.floor((P.length - 1 - i) / 2); return [r - 1, r]; };
const pageKey = (p) => (p.write ? 'write' : p.date);
async function loadEntries() {
  if (BK.loading || BK.cursor === null || !AUTH.user) return BK.loading;
  BK.loading = (async () => {
    try { const r = await backend.entries(BK.cursor || undefined); for (const e of r.entries) BK.entries.set(e.id, e); BK.cursor = r.next_cursor; }
    catch (e) { if (BK.cursor === undefined) BK.cursor = null; /* the letters still show their nights */ }
    BK.loading = null;
  })();
  return BK.loading;
}
function resetBook() { BK.at = 'write'; BK.month = null; BK.entries = new Map(); BK.cursor = undefined; BK.loading = null; }
/* Flipping back toward the oldest page asks for the next hundred entries. */
function moreDaysSoon(P, i) {
  if (BK.cursor === null || BK.loading || i > 3) return;
  loadEntries().then(() => { if (route === 'tonight') paintBook(null, { keepWrite: true }); });
}

function vTonight() {
  clearInterval(promptTimer); cancelAnimationFrame(voice.raf);
  BK.two = bookTwo();
  if (BK.cursor === undefined && AUTH.user) loadEntries().then(() => { if (route === 'tonight') paintBook(null, { keepWrite: true }); });
  after.push(() => { wireBook(); if (BK.focus && BK.at === 'write' && window.matchMedia('(pointer: fine)').matches) $('#entry')?.focus({ preventScroll: true }); BK.focus = true; });
  return `<h1 class="sr-only">Journal</h1>
    <section class="bk-wrap ${BK.two ? 'is-two' : 'is-one'}">
      ${BK.two ? '' : `<div class="bk-top"><div class="bk-strip" id="bk-strip" role="group" aria-label="Days in your journal">${stripInner()}</div><button class="bk-cal-btn" data-bk-cal aria-label="Open the calendar">${I.cal}</button></div>`}
      <div class="book" id="book">${bookInner()}</div>
      ${BK.two ? `<aside class="bk-side" aria-label="Calendar"><div class="bk-cal" id="bk-cal">${calInner()}</div><p class="fine bk-side-note">Highlighted days have writing. Tap one to turn to it.</p></aside>` : ''}
      ${skipReady() ? `<button class="skip-morning" data-act="skip">Skip to morning${I.right}</button>` : ''}
    </section>`;
}
function bookInner() {
  const P = bookPages(); const i = pageAt(P);
  const edge = (dir, on) => `<button class="bk-edge ${dir}" data-bk="${dir}" aria-label="${dir === 'prev' ? 'Turn to an earlier day' : 'Turn to a later day'}" ${on ? '' : 'disabled'}><span class="bk-arrow">${dir === 'prev' ? I.left : I.right}</span></button>`;
  if (BK.two) { const [l, r] = spreadOf(P, i); return `${edge('prev', l > 0)}<div class="bk-spread">${pageHtml(P[l], 'left')}${pageHtml(P[r], 'right')}</div>${edge('next', r < P.length - 1)}`; }
  return `${edge('prev', i > 0)}<div class="bk-spread">${pageHtml(P[i], 'single')}</div>${edge('next', i < P.length - 1)}`;
}
function pageHtml(p, side) {
  if (!p) return `<div class="bk-page ${side} is-blank" data-page="start"><div class="bk-start"><span class="bk-end-mark" aria-hidden="true">${I.moon}${I.star}</span><p>Your journal starts here.</p><p class="fine">Every night you seal becomes a page you can turn back to.</p></div></div>`;
  return p.write ? writePage(side) : dayPage(p, side);
}
function writePage(side) {
  return `<article class="bk-page ${side} is-write tn" data-page="write" aria-labelledby="tn-date">
      <header class="tn-head">
        <h2 class="bk-date tn-date" id="tn-date">${fmtDay(journalDate())}</h2>
        <p class="tn-prompt" id="prompt"><span>${esc(PROMPTS[0])}</span></p>
      </header>
      <label for="entry" class="sr-only">Tonight's entry</label>
      <div class="entry-wrap">
        <textarea id="entry" class="paper-in" placeholder="Start anywhere">${esc(S.draft)}</textarea>
        <button class="mic" id="orb" data-act="orb" type="button" aria-label="Talk instead of typing"><span class="glyph" id="glyph">${I.mic}</span></button>
      </div>
      <p class="voice-hint" id="vhint" aria-live="polite"></p>
      <div id="crisis" style="width:100%"></div>
      ${failedNights()}
      <div class="tn-bar"><span class="bk-saved" id="bk-saved" aria-live="polite"></span><button class="btn amber" data-act="seal" id="b-seal" ${S.draft.trim() ? '' : 'disabled'}>Seal tonight</button></div>
    </article>`;
}
function dayLetterLink(p) {
  const L = p.letters.find(delivered) || p.letters[0];
  if (!L) return `<span class="bk-wait">${I.mail}Letter on its way</span>`;
  if (L.status === 'failed') return `<span class="bk-wait">This letter couldn't be written yet.</span><button class="link" data-retry="${L.id}">Try again</button>`;
  if (!delivered(L)) return `<span class="bk-wait">${I.mail}Letter on its way</span>`;
  return `<button class="link bk-read" data-open="${L.id}" data-from-book="${p.date}">Read the letter${I.right}</button>`;
}
function dayPage(p, side) {
  const id = `bk-d-${p.date}`;
  return `<article class="bk-page ${side} is-day" data-page="${p.date}" aria-labelledby="${id}">
      <header class="bk-day-head"><h2 class="bk-date" id="${id}">${fmtDay(p.date)}${p.sample ? ', sample' : ''}</h2><span class="bk-seal" role="img" aria-label="Sealed" title="Sealed">${I.crescent}</span></header>
      <ol class="bk-entries">${p.parts.map((x) => `<li>${x.t ? `<time class="bk-time">${ampm(x.t)}</time>` : ''}<p>${esc(x.text)}</p></li>`).join('')}</ol>
      <footer class="bk-foot">${dayLetterLink(p)}</footer>
    </article>`;
}
/* Phone: the days as a strip, today at the end. */
function stripInner() {
  const P = bookPages(); const i = pageAt(P); const on = BK.two ? spreadOf(P, i) : [i];
  return P.map((p, k) => { const d = parse(p.date); const cur = on.includes(k);
    return p.write ? `<button class="bk-sd is-today ${cur ? 'is-on' : ''}" data-bk-day="write" aria-label="Today, ${fmtDay(p.date)}: write" ${cur ? 'aria-current="page"' : ''}><small>Today</small><b>${d.getDate()}</b></button>`
      : `<button class="bk-sd ${cur ? 'is-on' : ''}" data-bk-day="${p.date}" aria-label="${fmtDay(p.date)}${p.sample ? ', sample' : ''}" ${cur ? 'aria-current="page"' : ''}><small>${WD[d.getDay()]}</small><b>${d.getDate()}</b></button>`; }).join('');
}
/* The month calendar (beside the book, or in a sheet on a phone). */
function calInner() {
  const P = bookPages(); const i = pageAt(P); const today = journalDate();
  const has = new Set(P.filter((p) => !p.write).map((p) => p.date));
  const on = new Set((BK.two ? spreadOf(P, i) : [i]).map((k) => P[k]).filter(Boolean).map(pageKey));
  const firstYm = (P.find((p) => !p.write)?.date || today).slice(0, 7); const lastYm = today.slice(0, 7);
  let ym = BK.month || (P[i].write ? today : P[i].date).slice(0, 7);
  if (ym < firstYm) ym = firstYm; if (ym > lastYm) ym = lastYm; BK.month = ym;
  const [y, m] = ym.split('-').map(Number); const lead = parse(`${ym}-01`).getDay(); const n = new Date(y, m, 0).getDate();
  const cells = [];
  for (let k = 0; k < lead; k++) cells.push('<span class="bk-cd is-pad" aria-hidden="true"></span>');
  for (let d = 1; d <= n; d++) {
    const date = `${ym}-${pad(d)}`; const isToday = date === today;
    const key = isToday && !has.has(date) ? 'write' : date; const cur = on.has(key) || (isToday && on.has('write'));
    if (has.has(date) || isToday) cells.push(`<button class="bk-cd ${has.has(date) ? 'has' : ''} ${isToday ? 'is-today' : ''} ${cur ? 'is-on' : ''}" data-bk-day="${key}" aria-label="${fmtDay(date)}${isToday ? ', today' : ''}${has.has(date) ? '' : ': write'}" ${cur ? 'aria-current="date"' : ''}>${d}</button>`);
    else cells.push(`<span class="bk-cd">${d}</span>`);
  }
  return `<div class="bk-cal-h"><button class="bk-mo" data-bk-month="-1" aria-label="Previous month" ${ym <= firstYm ? 'disabled' : ''}>${I.left}</button><b>${MONTH[m - 1]} ${y}</b><button class="bk-mo" data-bk-month="1" aria-label="Next month" ${ym >= lastYm ? 'disabled' : ''}>${I.right}</button></div>
    <div class="bk-cal-g" role="group" aria-label="${MONTH[m - 1]} ${y}">${WD.map((w) => `<span class="bk-wd" aria-hidden="true">${w}</span>`).join('')}${cells.join('')}</div>
    ${BK.at !== 'write' ? '<button class="link bk-back-today" data-bk-day="write">Back to today</button>' : ''}`;
}
function paintNav() {
  const s = $('#bk-strip'); if (s) { s.innerHTML = stripInner(); const b = s.querySelector('.is-on'); if (b) s.scrollLeft = b.offsetLeft - s.clientWidth / 2 + b.offsetWidth / 2; }
  const c = $('#bk-cal'); if (c) c.innerHTML = calInner();
  const sh = $('.bk-sheet .bk-cal'); if (sh) sh.innerHTML = calInner();
}
/* Redraw the open pages. dir 'back' | 'fwd' turns the page; keepWrite leaves the
   writing page alone (so nothing being typed is touched). */
function paintBook(dir = null, { keepWrite = false } = {}) {
  const book = $('#book'); if (!book) return;
  if (keepWrite && $('#entry')) {
    const tmp = document.createElement('div'); tmp.innerHTML = bookInner();
    const oldPages = [...book.querySelectorAll('.bk-spread > .bk-page')]; const newPages = [...tmp.querySelectorAll('.bk-spread > .bk-page')];
    if (oldPages.length === newPages.length && oldPages.every((p, k) => (p.dataset.page === 'write') === (newPages[k].dataset.page === 'write'))) {
      oldPages.forEach((p, k) => { if (p.dataset.page !== 'write' && p.outerHTML !== newPages[k].outerHTML) p.replaceWith(newPages[k]); });
      book.querySelectorAll('.bk-edge').forEach((e, k) => { const n = tmp.querySelectorAll('.bk-edge')[k]; if (n) e.disabled = n.disabled; });
      paintNav(); return;
    }
  }
  const ghosts = [];
  if (dir && !reduceMotion()) {
    const r0 = book.getBoundingClientRect();
    for (const pg of book.querySelectorAll('.bk-spread > .bk-page')) {
      const g = pg.cloneNode(true); const r = pg.getBoundingClientRect();
      g.querySelectorAll('[id]').forEach((x) => x.removeAttribute('id')); g.removeAttribute('aria-labelledby'); g.setAttribute('aria-hidden', 'true'); g.inert = true;
      const ta = pg.querySelector('textarea'); if (ta) g.querySelector('textarea').value = ta.value;
      g.classList.add('bk-ghost'); g.dataset.side = pg.classList.contains('left') ? 'left' : pg.classList.contains('right') ? 'right' : 'single';
      Object.assign(g.style, { left: `${r.left - r0.left}px`, top: `${r.top - r0.top}px`, width: `${r.width}px`, height: `${r.height}px` });
      ghosts.push([g, pg.scrollTop]);
    }
  }
  book.innerHTML = bookInner();
  ghosts.forEach(([g, top]) => { book.appendChild(g); g.scrollTop = top; });
  wireBook({ nav: false });
  paintNav();
  if (dir) turnPages(book, ghosts.map(([g]) => g), dir);
  const P = bookPages(); moreDaysSoon(P, BK.two ? spreadOf(P, pageAt(P))[0] : pageAt(P));
}
/* A short page turn (about 340ms), from the spine. Reduced motion: a quick fade. */
function turnPages(book, ghosts, dir) {
  const spread = book.querySelector('.bk-spread'); const T = 340; const E1 = 'cubic-bezier(.45,0,.75,.4)', E2 = 'cubic-bezier(.2,.6,.3,1)';
  const done = () => ghosts.forEach((g) => g.remove());
  if (reduceMotion() || !ghosts.length) { done(); spread.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: 'ease-out' }); return; }
  const side = (s) => ghosts.find((g) => g.dataset.side === s);
  const page = (s) => spread.querySelector(`.bk-page.${s}`);
  const shade = (el, a, b, dur, delay, easing) => el.animate([{ '--bk-shade': a }, { '--bk-shade': b }], { duration: dur, delay, easing, fill: 'both' });
  if (!BK.two) {
    const g = side('single'); const p = page('single'); if (!g || !p) return done();
    if (dir === 'fwd') { g.style.zIndex = 3; g.style.transformOrigin = 'left center'; g.animate([{ transform: 'rotateY(0)', opacity: 1 }, { transform: 'rotateY(-100deg)', opacity: .4 }], { duration: T, easing: E1, fill: 'forwards' }).finished.then(done, done); shade(g, 0, .5, T, 0, E1); }
    else { g.style.zIndex = 0; p.style.zIndex = 2; p.style.transformOrigin = 'left center'; p.animate([{ transform: 'rotateY(-100deg)', opacity: .4 }, { transform: 'rotateY(0)', opacity: 1 }], { duration: T, easing: E2 }).finished.then(done, done); shade(p, .5, 0, T, 0, E2); }
    return;
  }
  const H = T / 2;
  if (dir === 'fwd') { // the right page lifts and lands on the left
    const gl = side('left'), gr = side('right'), nl = page('left'); if (!gr || !nl) return done();
    if (gl) gl.style.zIndex = 1; gr.style.zIndex = 3; nl.style.zIndex = 2;
    gr.style.transformOrigin = 'left center'; nl.style.transformOrigin = 'right center';
    gr.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(-90deg)' }], { duration: H, easing: E1, fill: 'forwards' });
    shade(gr, 0, .45, H, 0, E1);
    nl.animate([{ transform: 'rotateY(90deg)' }, { transform: 'rotateY(0)' }], { duration: H, delay: H, easing: E2, fill: 'backwards' }).finished.then(done, done);
    shade(nl, .45, 0, H, H, E2);
  } else { // the left page lifts and lands on the right
    const gl = side('left'), gr = side('right'), nr = page('right'); if (!gl || !nr) return done();
    if (gr) gr.style.zIndex = 1; gl.style.zIndex = 3; nr.style.zIndex = 2;
    gl.style.transformOrigin = 'right center'; nr.style.transformOrigin = 'left center';
    gl.animate([{ transform: 'rotateY(0)' }, { transform: 'rotateY(90deg)' }], { duration: H, easing: E1, fill: 'forwards' });
    shade(gl, 0, .45, H, 0, E1);
    nr.animate([{ transform: 'rotateY(-90deg)' }, { transform: 'rotateY(0)' }], { duration: H, delay: H, easing: E2, fill: 'backwards' }).finished.then(done, done);
    shade(nr, .45, 0, H, H, E2);
  }
}
function flipBook(where) {
  const P = bookPages(); const from = pageAt(P);
  let to;
  if (where === 'prev' || where === 'next') {
    const step = where === 'prev' ? -1 : 1;
    if (BK.two) { const [l, r] = spreadOf(P, from); to = where === 'prev' ? l - 1 : r + 1; } else to = from + step;
    if (to < 0 || to >= P.length) return;
  } else to = where === 'write' ? P.length - 1 : P.findIndex((p) => !p.write && p.date === where);
  if (to < 0) return;
  BK.at = pageKey(P[to]); BK.month = null;
  const same = BK.two ? spreadOf(P, to)[1] === spreadOf(P, from)[1] : to === from;
  if (same) return paintNav();
  paintBook(to < from ? 'back' : 'fwd');
}
function wireBook({ nav = true } = {}) {
  const book = $('#book'); if (!book) return;
  if (nav) paintNav();
  if (!book.dataset.wired) {
    book.dataset.wired = '1';
    let sx = 0, sy = 0, from = null;
    book.addEventListener('touchstart', (e) => { const t = e.touches[0]; from = e.target.closest('textarea, input, select, .bk-strip') ? null : e.target; sx = t.clientX; sy = t.clientY; }, { passive: true });
    book.addEventListener('touchend', (e) => {
      if (!from) return; const t = e.changedTouches[0]; const dx = t.clientX - sx, dy = t.clientY - sy; from = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) flipBook(dx < 0 ? 'next' : 'prev');
    }, { passive: true });
  }
  wireEntry();
}
/* Today's page: type, or tap the microphone and talk. */
function wireEntry() {
  const ta = $('#entry'); if (!ta || ta.dataset.wired) return;
  ta.dataset.wired = '1';
  const words = countWords(S.draft); lastWords = words;
  const grow = () => { if (BK.two) { ta.style.height = ''; return; } ta.style.height = 'auto'; ta.style.height = `${Math.max(ta.scrollHeight, window.innerHeight * 0.42)}px`; };
  grow();
  let lastLen = ta.value.length;
  ta.addEventListener('input', () => {
    S.draft = ta.value; saveDraft(); grow();
    const added = ta.value.length - lastLen; lastLen = ta.value.length;
    if (added > 0) voice.impulse = Math.min(1, voice.impulse + 0.25 + added * 0.03);
    lastWords = countWords(ta.value);
    $('#b-seal').disabled = !ta.value.trim();
    if (hasCrisis(ta.value) && !$('#crisis').childElementCount) $('#crisis').innerHTML = supportInline();
  });
  if (hasCrisis(ta.value)) $('#crisis').innerHTML = supportInline();
  paintVoice();
  clearInterval(promptTimer); let i = 0;
  promptTimer = setInterval(() => {
    const p = $('#prompt'); if (!p || route !== 'tonight') return clearInterval(promptTimer);
    if (ta.value.trim() || voice.state === 'rec') return;
    i = (i + 1) % PROMPTS.length; p.innerHTML = `<span>${esc(PROMPTS[i])}</span>`;
  }, 5200);
}
window.addEventListener('resize', () => { if (route === 'tonight' && BK.two !== null && bookTwo() !== BK.two && !document.querySelector('.bk-sealing')) { BK.focus = false; render(); } });
document.addEventListener('keydown', (e) => {
  if (route !== 'tonight' || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
  if (e.target.closest?.('textarea, input, select, [contenteditable]') || document.querySelector('.present, .bk-sealing, .overnight, .sheet-wrap')) return;
  e.preventDefault(); flipBook(e.key === 'ArrowLeft' ? 'prev' : 'next');
});
/* Phone: the full month in a sheet. */
function openCalSheet() {
  closeCalSheet();
  const w = document.createElement('div'); w.className = 'bk-sheet';
  w.innerHTML = `<button class="bk-sheet-bg" data-bk-sheet-close tabindex="-1" aria-label="Close the calendar"></button><div class="bk-sheet-card" role="dialog" aria-modal="true" aria-label="Calendar"><div class="bk-cal">${calInner()}</div><button class="link" data-bk-sheet-close>Close</button></div>`;
  $('#layer').appendChild(w);
  setTimeout(() => w.querySelector('.bk-cd.is-on, .bk-cd.has, .bk-mo')?.focus({ preventScroll: true }), 50);
}
function closeCalSheet() { const w = $('.bk-sheet'); if (!w) return; w.remove(); $('[data-bk-cal]')?.focus({ preventScroll: true }); }
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('.bk-sheet')) closeCalSheet(); });
/* Unsealed words are kept as a draft on your account (never in this browser, never
   sent to the letter writer) a second after you stop typing, once the account
   supports drafts (migration 20261019000000_drafts). Until then they stay in memory. */
let draftTimer = null;
function saveDraft(now = false) {
  if (!draftSupported) return;
  clearTimeout(draftTimer);
  draftTimer = setTimeout(async () => { await syncSettings(); const s = $('#bk-saved'); if (s && synced && (synced.draft ?? '') === (S.draft.trim() ? S.draft : '')) s.textContent = S.draft.trim() ? 'Draft saved' : ''; }, now ? 0 : 1000);
  const s = $('#bk-saved'); if (s) s.textContent = '';
}
/* A letter that couldn't be written stays findable here, with a way to try again. */
function failedNights() {
  const L = S.letters.find((l) => l.status === 'failed');
  if (!L) return '';
  return `<p class="tn-failed"><span>The letter for ${fmtDay(L.date)} couldn't be written yet.</span> <button class="link" data-retry="${L.id}">Try again</button></p>`;
}
/* Directions that are showing, strongest first. */
function visibleDirections(all = directions()) {
  return all.filter((d) => (d.status === 'confirmed' && d.evidence.length) || (d.status === 'suggested' && d.sufficient))
    .sort((a, b) => b.days - a.days || b.evidence.length - a.evidence.length || a.key.localeCompare(b.key));
}
function nightsToFirst(all = directions()) { return Math.max(1, 3 - Math.max(0, ...all.map((d) => d.days))); }
function miniMap(list, W = 112, H = 72) {
  // Drawn on a 112 x 72 grid; larger circles have more nights behind them.
  const slots = [[44, 37], [87, 22], [88, 55], [13, 18], [14, 57]];
  const caps = [27, 16, 14, 11, 10];
  const max = Math.max(1, ...list.map((d) => d.days));
  const circles = (list.length ? list.slice(0, 5) : [null, null, null]).map((d, i) => {
    const [x, y] = slots[i]; const r = d ? Math.max(7, caps[i] * Math.sqrt(d.days / max)) : [18, 10, 8][i];
    return `<path d="${wobble(d ? d.key : `empty${i}`, x, y, r, .07)}" class="${d ? (d.status === 'confirmed' ? 'is-confirmed' : '') : 'is-empty'}"/>`;
  }).join('');
  return `<svg class="mini-map" viewBox="0 0 112 72" width="${W}" height="${H}" aria-hidden="true">${circles}</svg>`;
}
function supportInline() {
  return `<div class="support-inline" role="note"><b>You don't have to wait for the morning.</b><span class="fine" style="color:var(--mist)">Beyond isn't watched by a person and can't help in an emergency. If you're struggling or in danger, people can help right now, free and confidential.</span><div class="row"><button class="btn sm amber" data-go="support">See who to talk to</button></div></div>`;
}

/* ----- speak ------------------------------------------------------------
   One tap on the light starts listening; your words appear live; tap again
   to stop. Uses the browser's own speech recognition (Chrome, Edge, Safari)
   wherever the page may use the microphone: the local app, the online app,
   the double-clicked file. If that isn't available, the local app records and
   its server transcribes. claude.ai doesn't let pages use the microphone at
   all, so there the light falls back to the device's own dictation. */
/* Some browsers have the speech API but no speech service behind it, so it
   starts and then hears nothing: Brave, Opera, in-app browsers and desktop
   app shells. There the light records for Beyond's server, or uses dictation. */
const UA = navigator.userAgent;
const SR_HOLLOW = !!navigator.brave || /Electron\/|OPR\/|; wv\)|FBA[NV]|Instagram|Line\/|MicroMessenger|WeChat/.test(UA);
const SR = SR_HOLLOW ? null : window.SpeechRecognition || window.webkitSpeechRecognition;
const IN_CLAUDE = !LOCAL && !OFFLINE && !!window.claude?.use;
const MIC = LOCAL && !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
const RECORDS = MIC && window.isSecureContext;
const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
const voice = { state: 'idle', raf: 0, lvl: 0, impulse: 0, an: null, buf: null, freq: null, ac: null, rec: null, sr: null, stream: null, t0: 0, tick: 0, blocked: false, down: '', words: false, peak: 0, metered: false };
const SPEECH_LANGS = [['mixed', '粵 + 普 + EN'], ['yue-Hant-HK', '廣東話'], ['zh-CN', '普通话'], ['en-US', 'English']];
const mixedOK = () => RECORDS && SERVER_STT;
function speechLang() {
  const pick = S.speechLang;
  return pick && pick !== 'auto' && pick !== 'mixed' ? pick : autoSpeechLang();
}
function autoSpeechLang() {
  if (mixedOK()) return 'mixed';
  if (S.lang === 'zh-hans') return 'zh-CN'; if (S.lang === 'zh-hant') return 'yue-Hant-HK'; if (S.lang === 'en') return 'en-US';
  const prefs = (navigator.languages || [navigator.language || '']).join(',');
  // A browser set to English listens in English; only a Chinese browser guesses a Chinese language.
  return /zh-(HK|TW|MO)|yue/i.test(prefs) ? 'yue-Hant-HK' : /zh/i.test(prefs) ? 'zh-CN' : 'en-US';
}
const canListen = () => !!SR && !voice.blocked && !voice.down && speechLang() !== 'mixed';
const langName = (k) => (SPEECH_LANGS.find(([x]) => x === k) || [k, k])[1];
function level() {
  // How loud the microphone is right now, 0 to 1 (only while the light is metering).
  if (!voice.an) return 0;
  voice.an.getByteTimeDomainData(voice.buf); let s = 0; for (const v of voice.buf) { const x = (v - 128) / 128; s += x * x; }
  return Math.min(1, Math.sqrt(s / voice.buf.length) * 5);
}
function langChips() {
  const cur = speechLang();
  return '<span class="slang-k">I’m speaking</span>' + SPEECH_LANGS.filter(([k]) => k !== 'mixed' || mixedOK()).map(([k, l]) => `<button class="chip lang-chip" data-slang="${k}" aria-pressed="${cur === k}">${l}</button>`).join('');
}
function speechOptions() {
  const cur = S.speechLang && S.speechLang !== 'mixed' ? S.speechLang : 'auto';
  const auto = mixedOK() ? 'Auto (any mix of 粵語, 普通话, English)' : `Auto (${langName(autoSpeechLang())})`;
  return [['auto', auto], ...SPEECH_LANGS.filter(([k]) => k !== 'mixed')].map(([k, l]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(l)}</option>`).join('');
}
function dictationHint() {
  const ua = navigator.userAgent; const touch = window.matchMedia('(pointer: coarse)').matches;
  if (/iPhone|iPad|iPod|Android/.test(ua) || (touch && /Mac/.test(ua))) return 'tap the <b>🎤 on your keyboard</b> and just talk.';
  if (/Mac/.test(ua)) return 'press <b>Fn (🌐) twice</b> and just talk.';
  if (/Windows/.test(ua)) return 'press <b>Windows + H</b> and just talk.';
  return 'start your device’s <b>dictation</b> and just talk.';
}
function paintVoice() {
  const hint = $('#vhint'), orb = $('#orb'), glyph = $('#glyph'); if (!hint || !orb) return;
  orb.classList.toggle('is-rec', voice.state === 'rec'); orb.classList.toggle('is-busy', voice.state === 'busy');
  $('.tn')?.classList.toggle('is-rec', voice.state === 'rec');
  glyph.innerHTML = voice.state === 'rec' ? I.stop : voice.state === 'busy' ? '<i class="dots"><i></i><i></i><i></i></i>' : I.mic;
  orb.setAttribute('aria-label', voice.state === 'rec' ? 'Stop talking' : 'Talk instead of typing');
  if (voice.state === 'rec') {
    const sec = Math.floor((Date.now() - voice.t0) / 1000);
    if (voice.an) { voice.metered = true; voice.peak = Math.max(voice.peak, level()); }
    // Nothing for a while: say whether it's the microphone or the language.
    const stuck = voice.sr && !voice.words && sec >= 6;
    hint.innerHTML = stuck && voice.metered && voice.peak < 0.05
      ? '<span class="rec-dot"></span>No sound is coming in. Check your microphone.'
      : stuck
      ? `<span class="rec-dot"></span>No words yet. Listening in ${esc(langName(speechLang()))}; change it in <button class="link" data-go="settings">Settings</button>.`
      : `<span class="rec-dot"></span>Listening ${Math.floor(sec / 60)}:${pad(sec % 60)}. Tap again to stop.`;
  }
  else if (voice.state === 'busy') hint.textContent = 'Turning your voice into words…';
  else if (voice.state === 'dictate') hint.innerHTML = voice.down || !SR
    ? (voice.down ? `${voice.down} Or ${dictationHint()}` : `This browser can’t listen. Try Chrome, Edge or Safari, or ${dictationHint()}`)
    : `Use your device’s dictation: ${dictationHint()}`;
  else if (voice.blocked) hint.innerHTML = 'The microphone is blocked. Allow it from the icon in the address bar, then tap again.';
  else hint.textContent = '';
}
function setEntry(text) {
  const ta = $('#entry'); S.draft = text;
  if (ta) { ta.value = text; ta.dispatchEvent(new Event('input')); ta.scrollTop = ta.scrollHeight; } else save();
}
function appendSpoken(text) {
  setEntry((S.draft.trim() ? `${S.draft.trimEnd()}\n\n` : '') + text);
  const ta = $('#entry'); if (ta) { ta.classList.remove('arrive'); void ta.offsetWidth; ta.classList.add('arrive'); }
}
function useDictation() { const ta = $('#entry'); voice.state = 'dictate'; paintVoice(); voice.impulse = 0.6; if (ta) { ta.focus(); const end = ta.value.length; ta.setSelectionRange(end, end); } }
async function meter() {
  // Real levels for the light while listening (skipped on iPhone, where it can steal the mic).
  if (IOS || !navigator.mediaDevices?.getUserMedia) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (voice.state !== 'rec') { stream.getTracks().forEach((t) => t.stop()); return; }
    voice.stream = stream; voice.ac = new (window.AudioContext || window.webkitAudioContext)();
    const src = voice.ac.createMediaStreamSource(stream); voice.an = voice.ac.createAnalyser(); voice.an.fftSize = 512; voice.an.smoothingTimeConstant = 0.75; src.connect(voice.an);
    voice.buf = new Uint8Array(voice.an.fftSize); voice.freq = new Uint8Array(voice.an.frequencyBinCount);
  } catch (e) { voice.an = null; }
}
function releaseMeter() { voice.stream?.getTracks().forEach((t) => t.stop()); try { voice.ac?.close(); } catch (e) { /* closed */ } voice.an = null; voice.stream = null; voice.ac = null; }
function startListening(sameBreath = false) {
  const r = new SR(); const lang = speechLang();
  r.lang = lang; r.continuous = true; r.interimResults = true;
  // A language switch mid-sentence carries on the same paragraph.
  const prev = S.draft.trimEnd();
  const base = !prev ? '' : !sameBreath ? `${prev}\n\n` : /[\u3400-\u9fff，。！？、]$/.test(prev) ? prev : `${prev} `;
  const spaced = !/^(zh|yue|ja|ko)/i.test(lang);
  let finals = '';
  r.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript; if (t.trim()) voice.words = true;
      if (e.results[i].isFinal) finals += (spaced && finals && !/\s$/.test(finals) && !/^\s/.test(t) ? ' ' : '') + t;
      else interim += t;
    }
    setEntry(base + finals + (interim ? (spaced && finals && !/\s$/.test(finals) ? ' ' : '') + interim : ''));
    voice.impulse = Math.min(1, voice.impulse + 0.45);
  };
  r.onerror = (e) => {
    // no-speech and aborted are normal pauses; the session restarts on its own.
    if (e.error === 'not-allowed' || e.error === 'audio-capture') { voice.blocked = true; voice.stopping = true; }
    else if (e.error === 'service-not-allowed') { voice.down = 'Speech recognition is switched off in this browser (on a Mac, Safari needs Dictation turned on in System Settings).'; voice.stopping = true; }
    else if (e.error === 'network') { voice.down = 'This browser couldn’t reach its speech service (Chrome’s is Google’s, which needs a VPN in mainland China).'; voice.stopping = true; }
    else if (e.error === 'language-not-supported') { voice.stopping = true; toast(`This browser can’t listen in ${langName(lang)}. Pick another language.`); }
  };
  r.onend = () => {
    // Browsers stop after a pause; keep listening until you tap again.
    if (voice.state === 'rec' && !voice.stopping) { try { r.start(); return; } catch (e) { /* fall through */ } }
    clearInterval(voice.tick); releaseMeter(); voice.sr = null;
    setEntry(base + finals);
    if (voice.relisten) { voice.relisten = false; voice.state = 'idle'; voice.stopping = false; return canListen() ? startListening(true) : orbTap(); }
    if (voice.blocked) { if (IN_CLAUDE) useDictation(); else { voice.state = 'idle'; paintVoice(); } return; }
    if (voice.down) {
      // The speech service failed: record for Beyond's server if it can transcribe, otherwise dictation.
      voice.state = 'idle'; voice.stopping = false;
      if (RECORDS && SERVER_STT) { toast('Switched to recording. Tap the light again and talk; your words appear when you stop.'); return paintVoice(); }
      return useDictation();
    }
    voice.state = 'idle'; voice.stopping = false; paintVoice();
    if (finals.trim()) { const ta = $('#entry'); if (ta) { ta.classList.remove('arrive'); void ta.offsetWidth; ta.classList.add('arrive'); } }
    else if (!voice.words && Date.now() - voice.t0 > 2500) toast(voice.metered && voice.peak < 0.05
      ? 'No sound reached Beyond. Check that your microphone is on and is the one your browser uses.'
      : `No words came back. Check the language (listening in ${langName(lang)}), or type instead.`);
  };
  voice.sr = r; voice.state = 'rec'; voice.stopping = false; voice.t0 = Date.now(); voice.words = false; voice.peak = 0; voice.metered = false;
  let heard = false; r.onstart = r.onaudiostart = () => { heard = true; };
  try { r.start(); } catch (e) { voice.state = 'idle'; voice.blocked = true; return IN_CLAUDE ? useDictation() : paintVoice(); }
  // If listening never starts, find out why. Still waiting on the browser's "Allow microphone?"
  // question: keep waiting. Blocked: say so. Allowed but silent: the browser has no speech service
  // behind its speech API, so record for Beyond's server or use dictation instead.
  const watch = (waited) => setTimeout(async () => {
    if (voice.sr !== r || heard || finals) return;
    let perm = 'unknown';
    try { perm = (await navigator.permissions.query({ name: 'microphone' })).state; } catch (e) { /* not supported */ }
    if (voice.sr !== r || heard || finals) return;
    if (perm === 'prompt' && waited < 60000) return watch(waited + 4000);
    if (perm === 'denied' || IN_CLAUDE) voice.blocked = true;
    else voice.down = 'Speech recognition didn’t start in this browser. Try Chrome, Edge or Safari.';
    voice.stopping = true; try { r.abort ? r.abort() : r.stop(); } catch (e) { /* gone */ } if (voice.sr === r) r.onend?.();
  }, 4000);
  watch(4000);
  paintVoice(); voice.tick = setInterval(paintVoice, 500); meter();
}
async function orbTap() {
  if (voice.state === 'rec') return stopRecording();
  if (voice.state === 'busy') return;
  if (canListen()) return startListening();
  if (!RECORDS || !SERVER_STT || (SR && speechLang() !== 'mixed' && voice.blocked && IN_CLAUDE)) return useDictation();
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) {
    toast(e.name === 'NotAllowedError' ? 'The microphone is blocked. Allow it in your browser settings, or use your keyboard’s dictation.' : 'No microphone was found. You can type instead.'); return;
  }
  try { voice.ac = new (window.AudioContext || window.webkitAudioContext)(); const src = voice.ac.createMediaStreamSource(stream); voice.an = voice.ac.createAnalyser(); voice.an.fftSize = 512; voice.an.smoothingTimeConstant = 0.75; src.connect(voice.an); voice.buf = new Uint8Array(voice.an.fftSize); voice.freq = new Uint8Array(voice.an.frequencyBinCount); } catch (e) { voice.an = null; }
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((m) => MediaRecorder.isTypeSupported?.(m)) || '';
  const chunks = [];
  voice.stream = stream; voice.rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); voice.t0 = Date.now(); voice.state = 'rec';
  voice.rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  voice.rec.onstop = async () => {
    clearInterval(voice.tick); releaseMeter(); voice.rec = null;
    if (voice.cancel) { voice.cancel = false; voice.state = 'idle'; paintVoice(); return; }
    voice.state = 'busy'; paintVoice();
    try {
      const blob = new Blob(chunks, { type: mime || 'audio/webm' });
      // One request: the recording goes in, the words come back, nothing is kept.
      const tr = await backend.transcribe(blob, speechLang());
      if (tr.text) appendSpoken(tr.text);
      toast(tr.text ? 'Your words are below. Read them over, then seal.' : 'No speech was heard. Try again, or type.');
    } catch (e) { toast('Couldn’t turn the recording into words. Try again, or type.'); }
    voice.state = 'idle'; paintVoice();
  };
  voice.rec.start(); paintVoice();
  voice.tick = setInterval(paintVoice, 500);
}
function stopRecording(cancel = false) {
  if (voice.sr) { voice.stopping = true; try { voice.sr.stop(); } catch (e) { /* already stopped */ } return; }
  if (voice.rec && voice.rec.state !== 'inactive') { voice.cancel = cancel; voice.rec.stop(); }
}
function startVoice() {
  const c = $('#vcanvas'); if (!c) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1); const W = c.clientWidth;
  c.width = W * dpr; c.height = W * dpr; const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const orb = $('#orb'); const still = reduceMotion();
  const frame = (ts) => {
    if (!document.body.contains(c)) { voice.raf = 0; return; }
    let target = voice.impulse; voice.impulse *= 0.95; let bins = null;
    if (voice.an) {
      voice.an.getByteTimeDomainData(voice.buf); let s = 0; for (const v of voice.buf) { const x = (v - 128) / 128; s += x * x; }
      target = Math.min(1, Math.sqrt(s / voice.buf.length) * 5); voice.an.getByteFrequencyData(voice.freq); bins = voice.freq;
    }
    voice.lvl += (target - voice.lvl) * 0.16;
    const L = Math.max(0.14 + 0.05 * Math.sin(ts / 900), voice.lvl, voice.state === 'rec' ? 0.2 : 0);
    drawVoice(g, W, ts, L, bins);
    orb?.style.setProperty('--lv', L.toFixed(3));
    if (!still) voice.raf = requestAnimationFrame(frame);
  };
  cancelAnimationFrame(voice.raf); voice.raf = requestAnimationFrame(frame);
}
function drawVoice(g, W, ts, L, bins) {
  const cx = W / 2, cy = W / 2, r0 = W * 0.2;
  g.clearRect(0, 0, W, W);
  const h = g.createRadialGradient(cx, cy, r0 * 0.5, cx, cy, W / 2);
  h.addColorStop(0, `rgba(${tone('amber-rgb')},${(0.14 + 0.3 * L).toFixed(3)})`); h.addColorStop(0.55, `rgba(${tone('ember-rgb')},${(0.05 + 0.12 * L).toFixed(3)})`); h.addColorStop(1, `rgba(${tone('ember-rgb')},0)`);
  g.fillStyle = h; g.fillRect(0, 0, W, W);
  for (let k = 0; k < 3; k++) {
    const ph = ((ts / 3400) + k / 3) % 1; const rr = r0 * (1.08 + ph * (0.85 + L * 0.9));
    g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.strokeStyle = `rgba(${tone('amber-rgb')},${((1 - ph) * (0.14 + 0.36 * L)).toFixed(3)})`; g.lineWidth = 1; g.stroke();
  }
  const N = 72; g.lineCap = 'round'; g.lineWidth = Math.max(1.6, W / 190);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 - Math.PI / 2; let amp;
    if (bins) { const j = i < N / 2 ? i : N - i; amp = Math.min(1, (bins[2 + Math.floor(j * (bins.length * 0.45) / (N / 2))] / 255) * 1.15); }
    else amp = (0.3 + 0.7 * Math.abs(Math.sin(i * 1.7 + ts / 430) * Math.cos(i * 0.55 - ts / 690))) * L;
    const r1 = r0 + 12, r2 = r1 + 3 + amp * W * 0.16;
    g.strokeStyle = `rgba(${243 - Math.round(amp * 18)},${198 - Math.round(amp * 55)},${142 - Math.round(amp * 60)},${(0.28 + 0.62 * amp).toFixed(3)})`;
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke();
  }
}

/* ----- seal: the book closes for a moment, then opens on a fresh page ----- */
async function seal() {
  if (voice.state === 'rec') stopRecording(true);
  voice.state = 'idle';
  const ta = $('#entry'); const text = (ta?.value || '').trim();
  if (!text) return;
  const date = journalDate();
  // Saving starts straight away, alongside the animation. If it fails, the words come back to the page.
  const sealing = sealNight(text, date).then((L) => ({ L }), (e) => ({ e }));
  if (demoOn()) demoNight = demoNight?.date === date && !demoNight.done ? { date, texts: [...demoNight.texts, text] } : { date, texts: [text] };
  S.draft = ''; saveDraft(true);
  await closeBook(() => { BK.at = 'write'; BK.month = null; BK.focus = false; if (route === 'tonight' && $('#book')) paintBook(); else go('tonight'); });
  const r = await sealing;
  if (r.e) {
    refresh();
    if (r.e?.code === 'rate_limited') {
      // the daily limit comes after the words are saved: they're kept, only the letter waits
      BK.cursor = undefined; loadEntries().then(() => { if (route === 'tonight') paintBook(null, { keepWrite: true }); });
      syncSkip();
      toast(demoOn() ? 'Your words are saved. Today’s letters are used up, so Skip to morning will show a demo letter.' : 'Your words are saved. Today’s letters are used up, so this night’s letter has to wait.');
      return;
    }
    if (demoNight?.date === date) demoNight.texts = demoNight.texts.filter((t) => t !== text);
    if (!$('#entry')?.value.trim()) { S.draft = text; saveDraft(true); if (route === 'tonight') paintBook(); }
    toast(r.e?.code === 'unauthorized' ? 'Please sign in again. Your words are still here.' : 'Couldn’t seal tonight. Your words are still here; check your connection and try again.');
    return;
  }
  if (route === 'tonight') paintBook(null, { keepWrite: true });
  syncSkip();
}
/* Skip to morning shows while a letter waits. With no letter writer switched on, Demo
   mode can still show the night's demo letter; elsewhere the night just waits. */
let demoNight = null; // { date, texts, done }: tonight's words in Demo mode, in memory only
function skipReady() {
  if (!canSkip()) return false;
  const demoWaiting = demoOn() && demoNight && !demoNight.done && demoNight.texts.length > 0;
  if (claudeState !== 'ready' && demoOn()) return demoWaiting;
  return demoWaiting || S.letters.some((l) => !delivered(l) && l.status !== 'failed');
}
/* Show Skip to morning once a letter waits, without redrawing what's being written. */
function syncSkip() {
  const tn = route === 'tonight' && $('.bk-wrap'); if (!tn) return;
  const want = skipReady();
  const btn = tn.querySelector('.skip-morning');
  if (want && !btn) tn.insertAdjacentHTML('beforeend', `<button class="skip-morning" data-act="skip">Skip to morning${I.right}</button>`);
  if (!want && btn) btn.remove();
}
/* About a second: the cover closes over today's page, a moon seal and the delivery
   time, then it opens again on a fresh page (drawn underneath by reopen). Any tap or
   key skips it. Reduced motion: just the words, briefly. */
function closeBook(reopen) {
  return new Promise((resolve) => {
    window.scrollTo(0, 0);
    const pg = $('.bk-page.is-write') || $('#book');
    const r = pg ? pg.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    const top = Math.max(0, r.top); const h = Math.max(220, Math.min(r.bottom, window.innerHeight) - top);
    const ov = document.createElement('div'); ov.className = 'bk-sealing'; ov.setAttribute('role', 'status');
    Object.assign(ov.style, { left: `${r.left}px`, top: `${top}px`, width: `${r.width}px`, height: `${h}px` });
    ov.innerHTML = `<div class="bk-cover"><span class="bk-stamp" aria-hidden="true">${I.crescent}</span><p class="bk-sealed">Sealed. Your letter arrives at ${deliverTime()}.</p></div>`;
    $('#layer').appendChild(ov);
    const cover = ov.querySelector('.bk-cover'); const anims = []; let reopened = false; let finished = false;
    const doReopen = () => { if (!reopened) { reopened = true; reopen(); } };
    const finish = () => { if (finished) return; finished = true; anims.forEach((a) => a.cancel()); doReopen(); ov.remove(); document.removeEventListener('keydown', finish, true); resolve(); };
    ov.addEventListener('pointerdown', finish); document.addEventListener('keydown', finish, true);
    const run = (el, k, o) => { const a = el.animate(k, { fill: 'both', ...o }); anims.push(a); return a; };
    if (reduceMotion()) {
      run(cover, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 });
      setTimeout(() => { if (finished) return; doReopen(); run(ov, [{ opacity: 1 }, { opacity: 0 }], { duration: 150, delay: 0 }).finished.then(finish, finish); }, 1100);
      return;
    }
    const twoPages = BK.two && pg?.classList.contains('right');
    cover.style.transformOrigin = twoPages || !BK.two ? 'left center' : 'right center';
    run(cover, [{ transform: 'rotateY(-92deg)', opacity: .3 }, { transform: 'rotateY(0)', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.3,.6,.3,1)' });
    run(ov.querySelector('.bk-stamp'), [{ transform: 'scale(.4) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.12) rotate(4deg)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 260, delay: 300, easing: 'ease-out' });
    run(ov.querySelector('.bk-sealed'), [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 220, delay: 380 });
    setTimeout(() => {
      if (finished) return; doReopen();
      run(cover, [{ transform: 'rotateY(0)', opacity: 1 }, { transform: 'rotateY(-92deg)', opacity: .2 }], { duration: 260, easing: 'cubic-bezier(.5,0,.8,.4)' }).finished.then(finish, finish);
    }, 860);
  });
}

/* ----- overnight: the night passes while Claude finishes ----- */
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fmtMin = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
/* Skip to morning (demo): the night passes on screen, every sealed night's
   letter is finished and marked early, then they arrive as a present. */
async function skipToMorning() {
  const pending = S.letters.filter((l) => !delivered(l) && l.status !== 'failed');
  const demoFallback = demoOn() && demoNight && !demoNight.done && demoNight.texts.length > 0;
  if (!pending.length && !demoFallback) return;
  const layer = $('#layer');
  const ov = document.createElement('div'); ov.className = 'overnight'; ov.setAttribute('role', 'status'); ov.setAttribute('aria-live', 'polite');
  ov.innerHTML = `<div class="ov-sky ov-night"></div><div class="ov-sky ov-dawn"></div><span class="stars" aria-hidden="true"></span><span class="ov-moon" aria-hidden="true"></span><span class="ov-sun" aria-hidden="true"></span>
    <div class="ov-body"><p class="ov-clock">${hhmm()}</p><p class="ov-text">The night passes…</p><p class="ov-note">Your device's clock doesn't change.</p></div>`;
  layer.appendChild(ov);
  const clock = ov.querySelector('.ov-clock'), txt = ov.querySelector('.ov-text');
  const roll = (a, b, dur) => new Promise((res) => {
    if (b <= a) b += 1440;
    const t0 = performance.now();
    const tick = (now) => { const k = Math.min(1, (now - t0) / dur); const e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2; clock.textContent = fmtMin(a + (b - a) * e); k < 1 ? requestAnimationFrame(tick) : res(); };
    requestAnimationFrame(tick);
  });
  const fast = reduceMotion();
  const leave = async () => { await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).finished; ov.remove(); };
  requestAnimationFrame(() => ov.classList.add('is-late'));
  const at = toMin(pending.length ? atTime(pending[0]) : deliverTime()); const before = fmtMin(at - 20);
  await roll(toMin(hhmm()), toMin(before), fast ? 200 : 2600);
  const tasks = claudeState === 'ready' ? pending.filter((l) => l.status === 'writing').map((l) => waitForLetter(l.id)) : [];
  if (tasks.length) {
    txt.textContent = pending.some((l) => l.demo) ? 'Finishing your sample letter…' : 'Claude is still writing your letter…';
    const slow = setTimeout(() => { txt.textContent = 'Still writing. This can take up to a minute.'; }, 9000);
    // don't hold the night open forever: Demo mode falls back to its demo letter sooner
    await Promise.race([Promise.all(tasks), sleep(demoFallback ? 15000 : 60000)]); clearTimeout(slow);
  }
  const ready = pending.map((l) => findLetter(l.id)).filter((l) => l && l.status === 'ready');
  if (!ready.length && demoFallback) { const D = demoLetter(demoNight); S.demoLetters.push(D); ready.push(D); }
  if (demoNight && ready.length) demoNight.done = true;
  if (!ready.length) {
    await leave(); render();
    toast(claudeState === 'ready' ? 'Still being written. It will be here soon.' : 'Beyond’s letter writer isn’t switched on yet, so this letter can’t be written. It’s sealed and safe.');
    return;
  }
  ov.classList.add('is-dawn'); txt.textContent = 'Good morning.';
  await roll(toMin(before), at, fast ? 100 : 1500);
  await sleep(fast ? 100 : 700);
  ready.forEach((l) => { if (!l.demo) patchLetter(l.id, { early: true }); });
  await leave(); render();
  presentLetters();
}

/* Demo mode's stand-in when no letter writer is switched on: a clearly labelled,
   pre-written letter that quotes only the night's own words. It is never sent to an
   AI, never saved to the account, and gone when the page closes. */
function demoLetter(night) {
  const text = night.texts.join('\n\n');
  const id = `demo_${Date.now().toString(36)}`; const entryId = `${id}_e`;
  const zh = detectLang(text) === 'zh';
  const parts = text.split(/(?<=[.!?。！？])\s+|\n+/).map((x) => x.trim()).filter((x) => countWords(x) >= 2);
  const clipQ = (x) => (x.length > 90 ? x.slice(0, 90).replace(/\s+\S*$/, '') : x);
  const first = parts[0] ? clipQ(parts[0]) : clipQ(text.trim());
  const longest = parts.slice(1).sort((a, b) => b.length - a.length)[0];
  const n = countWords(text); const k = night.texts.length;
  const echo = (x) => x.replace(/[.。!！?？]+$/, '').replace(/^\s*(I|i)\b/, 'you').replace(/\bI\b/g, 'you').replace(/\bmy\b/gi, 'your').replace(/\bam\b/g, 'are');
  const t = zh ? {
    title: '你今晚寫低嘅嘢',
    body: [`嗨 {{name}}，`, `你今晚寫咗 ${n} 個字${k > 1 ? `，分 ${k} 次寫低` : ''}。你一開始就寫${first.slice(0, 40)}，最先寫出嚟嘅說話，往往係一直喺度等緊嘅嗰句。`,
      longest ? `你寫得最長嘅，係${clipQ(longest).slice(0, 40)}。佢佔咗最多位置，背後可能有最多嘢。` : '', '呢封係示範信：只係用你自己嘅說話，俾你睇吓早上嘅信係點樣。', '今晚再傾，\n朋友'].filter(Boolean).join('\n\n'),
    q: '今日有冇一個時刻，你想再慢少少？', step: '今晚寫之前，將上面嗰句再讀一次。',
  } : {
    title: 'What you set down tonight',
    body: [`Hey {{name}},`, `You wrote ${plural(n, 'word')} tonight${k > 1 ? `, across ${k} moments` : ''}, and you started with ${echo(first)}. The first words are often the ones that were already waiting.`,
      longest ? `The thought that took the most room was that ${echo(clipQ(longest))}. It may be the one with the most behind it.` : '', 'This is a demo letter: it shows what a morning letter looks like, using only your own words.', 'Talk tonight,\nYour friend'].filter(Boolean).join('\n\n'),
    q: 'What would you want to notice about today, before you write again tonight?', step: 'Before you write tonight, read your first line from last night once more.',
  };
  const now = new Date().toISOString();
  return {
    id, entryId, demo: true, by: 'demo', date: night.date, entries: [{ id: entryId, t: hhmm(), text }],
    status: 'ready', deliverAt: now, early: true, readAt: null, actions: {}, private: false, createdAt: now, sealedAt: hhmm(), revision: 1, model: null, error: null,
    content: asLetter({
      version: 3, voice: S.voice, language: zh ? 'zh-hant' : 'en', title: t.title, headline: t.title, body: t.body,
      reflection_question: t.q, small_step: { text: t.step, minutes: 2, category: 'reflection' },
      steps: [{ text: t.step, kind: 'reflection', minutes: 2, why: '' }], openQuestions: [t.q],
      night_type: 'quiet', safety_flag: 'none', safetyConcern: false, tone: 'ordinary', themes: ['ordinary'],
      evidence: [first, longest].filter(Boolean), activities: [], compass: { loves: [], good_at: [], matters: [], within_reach: [] }, interests: [], remember: [],
    }),
  };
}

/* A letter that has arrived opens as a present: once per letter, the next time
   Beyond is open after it's delivered (or straight after Skip to morning). */
const presented = new Set();
function presentLetters() {
  if (!AUTH.user || ['welcome', 'login'].includes(route) || document.querySelector('.present, .overnight, .bk-sealing, .sheet-wrap')) return;
  const list = [...S.letters, ...S.demoLetters].filter((l) => delivered(l) && !l.readAt && !presented.has(l.id)).sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
  if (!list.length) return;
  list.forEach((l) => presented.add(l.id));
  const L = list[0]; const v = VOICES[L.content?.voice || S.voice] || VOICES.friend; const more = list.length - 1;
  const w = document.createElement('div'); w.className = 'present';
  w.innerHTML = `<button class="present-bg" data-present-later tabindex="-1" aria-label="Later"></button>
    <div class="present-card" role="dialog" aria-modal="true" aria-labelledby="present-t">
      <span class="present-glow" aria-hidden="true"></span>
      <div class="env" id="present-env" aria-hidden="true"><div class="env-back"></div><div class="env-paper"><i></i><i style="width:80%"></i><i style="width:60%"></i></div><div class="env-pocket"></div><div class="env-flap"></div><div class="env-seal">${I.crescent}</div></div>
      <p class="present-k">${fmtDay(L.date)}</p>
      <h2 class="present-t" id="present-t">A letter arrived for you</h2>
      <p class="present-sub">From your ${esc(v.name)}${more ? ` · ${plural(more, 'more letter')} waiting` : ''}</p>
      <div class="row"><button class="btn amber" data-present-open="${L.id}">Open it</button><button class="link" data-present-later>Later</button></div>
    </div>`;
  $('#layer').appendChild(w);
  setTimeout(() => w.querySelector('[data-present-open]')?.focus({ preventScroll: true }), 400);
}
async function closePresent(openId) {
  const w = $('.present'); if (!w) return;
  if (openId) { w.querySelectorAll('button').forEach((b) => { b.disabled = true; }); return openEnvelope(w.querySelector('#present-env'), openId, w); }
  await w.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished;
  w.remove();
}
/* Opening a letter, like a real envelope: the flap opens, then the paper slides up out
   of the pocket (in front of the envelope's back and the open flap, behind its front).
   Once it has cleared the envelope it moves to the top layer and grows into the open
   letter, which fades in underneath it. About 1.5 seconds, as before. Reduced motion:
   the letter simply fades in. */
async function openEnvelope(env, id, overlay = null) {
  const show = () => { opening = id; patchLetter(id, { readAt: new Date().toISOString() }); if (route === 'letter' && param === id) render(); else go('letter', id); window.scrollTo(0, 0); return $('.letter'); };
  const dropOverlay = (ms) => { if (!overlay) return; overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: ms, fill: 'forwards' }).finished.then(() => overlay.remove(), () => overlay.remove()); };
  if (!env || reduceMotion()) {
    const art = show(); dropOverlay(200);
    art?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' });
    return;
  }
  env.getAnimations().forEach((a) => a.pause()); // hold the envelope still while the paper leaves it
  const flap = env.querySelector('.env-flap'), paper = env.querySelector('.env-paper'), wax = env.querySelector('.env-seal');
  wax.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.6)' }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
  // the flap is in front until it stands upright, then folds back behind the paper
  flap.animate([{ transform: 'rotateX(0)', zIndex: 5 }, { transform: 'rotateX(90deg)', zIndex: 5, offset: .5 }, { transform: 'rotateX(90deg)', zIndex: 1, offset: .501 }, { transform: 'rotateX(180deg)', zIndex: 1 }], { duration: 440, delay: 80, easing: 'cubic-bezier(.4,0,.3,1)', fill: 'forwards' });
  const er = env.getBoundingClientRect(), pr0 = paper.getBoundingClientRect();
  const rise = pr0.bottom - er.top + 6; // until its bottom edge is clear of the envelope's top
  await paper.animate([{ transform: 'translateY(0)' }, { transform: `translateY(${-rise}px)` }], { duration: 560, delay: 300, easing: 'cubic-bezier(.3,.1,.25,1)', fill: 'forwards' }).finished;
  // clear of the envelope: hand the paper to the top layer in the same frame
  const pr = paper.getBoundingClientRect();
  const fly = document.createElement('div'); fly.className = 'env-fly'; fly.setAttribute('aria-hidden', 'true'); fly.innerHTML = paper.innerHTML;
  Object.assign(fly.style, { left: `${pr.left}px`, top: `${pr.top}px`, width: `${pr.width}px`, height: `${pr.height}px` });
  $('#layer').appendChild(fly); paper.style.visibility = 'hidden';
  const art = show(); dropOverlay(320);
  if (!art) { fly.remove(); return; }
  art.style.opacity = '0';
  const ar = art.getBoundingClientRect(); const h = Math.max(pr.height, Math.min(ar.height, window.innerHeight - Math.max(0, ar.top) - 12));
  fly.querySelectorAll('i').forEach((x) => x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, fill: 'forwards' }));
  await fly.animate([{ left: `${pr.left}px`, top: `${pr.top}px`, width: `${pr.width}px`, height: `${pr.height}px`, borderRadius: '2px' },
    { left: `${ar.left}px`, top: `${ar.top}px`, width: `${ar.width}px`, height: `${h}px`, borderRadius: getComputedStyle(art).borderRadius || '4px' }],
  { duration: 460, easing: 'cubic-bezier(.25,.8,.25,1)', fill: 'forwards' }).finished;
  art.style.opacity = '';
  art.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease-out' });
  await fly.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished;
  fly.remove();
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('.present')) closePresent(); });

/* ----- letter ----- */
let opening = null; let letterFromDir = null; let letterFromBook = null; // a letter opened from a direction page, or the book, returns there
let secHans = false;
const secLabel = (k) => { const [en, zh, c, hans] = SECTIONS[k]; return `<h2 class="ls-label" style="--c:${c}"><b>${en}</b><span lang="${secHans ? 'zh-Hans' : 'zh-Hant-HK'}">${secHans ? hans : zh}</span></h2>`; };
function vLetter() {
  const L = findLetter(param);
  if (!L) return `<p class="lead">This letter isn't here anymore.</p><button class="btn" data-go="letters">All letters</button>`;
  if (!delivered(L)) return `<p class="lead">This letter arrives at ${atTime(L)}.</p><button class="btn" data-go="tonight">Back to Journal</button>`;
  const c = L.content; const v = VOICES[c.voice || 'friend'] || VOICES.friend;
  const lang = c.language === 'en' ? 'en' : c.language === 'zh-hans' ? 'hans' : 'zh';
  secHans = c.language === 'zh-hans' || (c.language === 'en' && S.lang === 'zh-hans');
  const greet = c.greeting ?? v[lang][0]; const sign = c.signoff ?? v[lang][1];
  const backDir = letterFromDir && DIRECTIONS.find((x) => x.key === letterFromDir);
  const backBtn = backDir ? `<button class="link back" data-letter-back-dir="${backDir.key}">${I.left}${esc(backDir.name)}</button>` : letterFromBook ? `<button class="link back" data-letter-back-book="${letterFromBook}">${I.left}Journal</button>` : `<button class="link back" data-go="letters">${I.left}Letters</button>`;
  if (!L.readAt && opening !== L.id) {
    return `${backBtn}
      <section class="env-stage">
        <span class="stars" aria-hidden="true"></span>
        <p class="tn-date">${fmtDay(L.date)}${L.sample ? ', Kit’s sample' : L.demo ? ', demo letter' : ''}</p>
        <h1 class="display sm">From your ${esc(v.name)}</h1>
        <div class="env" id="env"><div class="env-back"></div><div class="env-paper"><i></i><i style="width:80%"></i><i style="width:60%"></i></div><div class="env-pocket"></div><div class="env-flap"></div><div class="env-seal">${I.crescent}</div></div>
        <button class="btn amber" data-openenv="${L.id}">Open the letter</button>
      </section>`;
  }
  const p = progress(L);
  const by = L.by === 'claude' ? `Written by ${L.model ? esc(L.model) : 'Claude'}. Every line is checked against your words.`
    : L.by === 'template' ? 'A plain template letter. No AI was available when it was written.'
    : L.by === 'demo' ? 'Demo mode: a pre-written sample letter, matched to what you wrote and quoting your own words. Nothing was sent to an AI or saved to your account.'
    : 'Kit’s sample letter, pre-written for the demo. Kit isn’t a real person.';
  const fresh = opening === L.id; if (fresh) opening = null;
  const zhLetter = /^zh/.test(c.language || '') || (c.language === 'mixed' && /[㐀-鿿]/.test(c.title || ''));
  const label = (en, zh) => (zhLetter ? `<span lang="zh-Hant">${zh}</span>` : en);
  const paras = fillName(String(c.body || '')).split(/\n{2,}/).filter(Boolean);
  const step = c.small_step; const st = L.actions?.['step.0'];
  const urgent = c.safety_flag === 'urgent';
  return `${backBtn}
    <article class="letter paper ${fresh ? 'reveal' : ''}" lang="${{ en: 'en', 'zh-hans': 'zh-Hans' }[c.language] || 'zh-Hant-HK'}">
      <span class="paper-moon" aria-hidden="true">${I.moon}${I.star}</span>
      <div class="letter-meta" style="--i:0"><span>${fmtDay(L.date)}${L.sample ? ', sample' : L.demo ? ', demo letter' : ''}</span><span>From your ${esc(v.name)}</span></div>
      ${urgent || (c.legacy && c.safetyConcern) ? `<div class="notice warn" style="--i:0"><b>Please don't carry this alone.</b><span>Beyond isn't watched by a person. If you're struggling, people can help right now.</span><button class="btn sm" data-go="support" style="justify-self:start">See who to talk to</button></div>` : ''}
      <h1 class="headline" style="--i:1">${esc(c.title || c.headline)}</h1>
      <div class="lt-body" style="--i:2">${paras.map((x) => `<p>${esc(x)}</p>`).join('')}</div>
      ${c.reflection_question ? `<section class="lt-end" style="--i:3"><p class="lt-k">${label('Something to think about today', '今日想一想')}</p><p class="lt-q">${esc(c.reflection_question)}</p></section>` : ''}
      ${step ? `<section class="lt-end lt-step ${st === 'tried' ? 'is-done' : ''} ${st === 'skipped' ? 'is-skipped' : ''}" style="--i:4">
        <div class="lt-step-head"><p class="lt-k">${label('One small step', '一小步')}</p>${p.complete ? `<span class="lt-seal" title="Gold seal">${goldSeal(40)}</span>` : ''}</div>
        <p class="lt-s">${esc(step.text)}</p>
        <p class="fine lt-meta">${step.minutes} min, ${esc(step.category)}</p>
        <div class="row">${st === 'skipped'
          ? `<span class="fine">Marked “Not for me”.</span><button class="link" data-step-skip="${L.id}">Bring it back</button>`
          : `<button class="btn sm ${st === 'tried' ? 'secondary' : 'amber'}" data-step-done="${L.id}" aria-pressed="${st === 'tried'}">${st === 'tried' ? `${I.check} Done` : 'Mark as done'}</button>${st === 'tried' ? '' : `<button class="link" data-step-skip="${L.id}">Not for me</button>`}`}</div>
      </section>` : ''}
      <details class="words-d" style="--i:5"><summary>Your words from that night</summary>
        <ul class="words">${L.entries.flatMap((e) => splitEntry(e.text, e.t)).map((x) => `<li><span class="k">${esc(ampm(x.t) || x.t)}</span><p>${esc(x.text)}</p></li>`).join('')}</ul>
        <button class="link words-book" data-book-day="${L.date}">Open in your journal${I.right}</button>
      </details>
      ${(() => { const learned = (S.memories || []).filter((m) => m.letterIds.includes(L.id)); return learned.length ? `<div class="remembers" style="--i:6"><span class="k">Beyond will remember</span><ul>${learned.map((m) => `<li>${esc(m.text)}</li>`).join('')}</ul><button class="link" data-go="settings" data-to="memory">See, edit or forget</button></div>` : ''; })()}
      <div class="provenance" style="--i:7"><span>${by}</span>
        <button class="toggle" role="switch" aria-checked="${!!L.private}" data-private="${L.id}"><span class="track"></span><span>Keep this night out of Growth</span></button>
      </div>
    </article>`;
}

/* ----- to-do sheet ----- */
let sheetId = null;
function openSheet(id) { sheetId = id; drawSheet({ first: true }); }
function closeSheet(rerender = true) { const w = $('.sheet-wrap'); if (w) w.remove(); if (sheetId) { sheetId = null; if (rerender) render(); } }
function drawSheet({ first = false, burst = null, celebrate = false } = {}) {
  const L = findLetter(sheetId); if (!L) return;
  const p = progress(L); const c = L.content;
  let w = $('.sheet-wrap');
  if (!w) { w = document.createElement('div'); w.className = 'sheet-wrap'; $('#layer').appendChild(w); }
  const still = first ? '' : 'style="animation:none"';
  w.innerHTML = `<div class="sheet-bg" data-close ${still}></div>
    <div class="sheet paper" role="dialog" aria-modal="true" aria-labelledby="sheet-t" ${still}>
      <div class="sheet-head">${ring(L, 52)}<div class="t"><span class="sheet-date">${fmtDay(L.date)}${L.sample ? ', sample' : L.demo ? ', demo' : ''}</span><h2 id="sheet-t">One small step</h2></div><button class="x" data-close aria-label="Close">${I.x}</button></div>
      ${p.complete ? `<div class="alldone">${celebrate ? goldSeal(76) : ''}<b>${celebrate ? 'All done.' : 'Completed'}</b><span class="fine">${celebrate ? 'Small steps, actually taken. This letter now has a gold seal.' : 'This letter has a gold seal.'}</span></div>` : ''}
      <ul class="todos">${c.steps.map((s, i) => { const st = L.actions?.[`step.${i}`]; return `<li class="todo ${st === 'tried' ? 'is-done' : ''} ${st === 'skipped' ? 'is-skipped' : ''}">
        <button class="check ${burst === i ? 'pop' : ''}" data-check="${i}" aria-pressed="${st === 'tried'}" aria-label="${st === 'tried' ? 'Mark not done' : 'Mark done'}: ${esc(s.text)}"><svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg></button>
        <p>${esc(s.text)}</p>
        <div class="todo-meta"><span>${s.minutes} min, ${esc(s.kind)}</span>${st === 'tried' ? '' : `<button data-skip="${i}">${st === 'skipped' ? 'Bring it back' : 'Not for me'}</button>`}</div>
      </li>`; }).join('')}</ul>
      <p class="fine">All optional. “Not for me” tells future letters to suggest something different.</p>
      <button class="btn" data-close>Done</button>
    </div>`;
  if (!reduceMotion()) {
    if (burst !== null) {
      const b = w.querySelectorAll('.check')[burst];
      for (let k = 0; k < 10; k++) { const sp = document.createElement('i'); sp.className = 'spark'; const a = (k / 10) * Math.PI * 2; sp.style.setProperty('--x', `${Math.cos(a) * 30}px`); sp.style.setProperty('--y', `${Math.sin(a) * 30}px`); if (k % 2) sp.style.background = 'var(--ember)'; b.appendChild(sp); }
    }
    if (celebrate) {
      const sheet = w.querySelector('.sheet'); const cols = ['var(--gold)', 'var(--ember)', '#b8862c', 'var(--rose)', '#8a6a3c'];
      for (let k = 0; k < 26; k++) { const cf = document.createElement('i'); cf.className = 'confetti'; const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 120; cf.style.background = cols[k % cols.length]; cf.style.setProperty('--x', `${Math.cos(a) * d}px`); cf.style.setProperty('--y', `${Math.sin(a) * d * .7 + 60}px`); cf.style.setProperty('--r', `${Math.random() * 540 - 270}deg`); sheet.appendChild(cf); setTimeout(() => cf.remove(), 1400); }
    }
  }
  if (first) w.querySelector('.check')?.focus({ preventScroll: true });
}

/* ----- letters: a small latest-letter card, then search and filters, then every letter as a card ----- */
/* One short line from the letter (or, failing that, the night's own words). */
function letterLine(l) {
  const c = l.content || {};
  if (c.recap) return c.recap;
  const para = fillName(String(c.body || '')).split(/\n{2,}/).map((x) => x.trim()).find((x) => x.length > 30 && !/^(hey|hi|dear|good morning)\b/i.test(x));
  return para || entryPlain((l.entries || [])[0]?.text || '');
}
function letterCard(l, extra = {}) {
  const sealed = progress(l).complete; const th = realThemes(l).find((t) => THEMES[t]);
  const tag = l.sample ? 'sample' : l.demo ? 'demo letter' : '';
  return `<li><button class="lc" data-open="${l.id}">
      <span class="lc-top"><time class="lc-date" datetime="${l.date}">${fmtDay(l.date)}${tag ? `, ${tag}` : ''}</time>${!l.readAt ? '<span class="lc-new">New</span>' : ''}</span>
      <span class="lc-h">${extra.head || esc(l.content.title || l.content.headline)}</span>
      <span class="lc-line">${extra.snip || esc(clip(letterLine(l), 120))}</span>
      ${sealed || th ? `<span class="lc-tags">${sealed ? `<span class="lc-seal">${goldSeal(18)}<span>Gold seal</span></span>` : ''}${th ? `<span class="lc-tag">${esc(cap(THEMES[th]))}</span>` : ''}</span>` : ''}
      <span class="lc-chev" aria-hidden="true">${I.right}</span>
    </button></li>`;
}
function vLetters() {
  const list = allLetters();
  const ready = list.filter(delivered);
  const pending = S.letters.filter((l) => !delivered(l));
  const latest = ready[0];
  after.push(() => riseOnScroll('.month-group'));
  return `<header class="lp-head">
      <h1 class="lp-title">Letters</h1>
      <p class="lp-sub">${ready.length ? `${plural(ready.length, 'letter')} so far` : 'Your morning letters collect here.'}</p>
    </header>
    ${sampleBanner()}
    ${pending.length ? `<p class="arrived">${I.mail}<span>Your letter for ${fmtDay(pending[0].date)} arrives at ${atTime(pending[0])}.</span> <button class="link" data-go="tonight">Open Journal</button></p>` : ''}
    ${!latest ? `<section class="empty"><span class="empty-mark" aria-hidden="true">${I.moon}${I.star}</span><p class="lead">No letters yet. Write tonight and the first one arrives tomorrow morning.</p><button class="btn amber" data-go="tonight">Write tonight</button></section>` : `
    <section class="lp-latest" aria-label="Latest letter">
      <button class="lp-card ${!latest.readAt ? 'is-new' : ''}" data-open="${latest.id}">
        <span class="lp-k">${!latest.readAt ? 'New letter' : 'Latest letter'}, ${fmtDay(latest.date)}${latest.sample ? ', sample' : latest.demo ? ', demo letter' : ''}</span>
        <span class="lp-t lc-h">${esc(latest.content.title || latest.content.headline)}</span>
        <span class="btn sm lp-read">Read</span>
      </button>
    </section>
    <section class="lp-archive" id="archive" aria-label="All letters">${archive()}</section>`}`;
}
/* Below-the-fold groups rise in as they scroll into view; anything on screen is shown at once. */
function riseOnScroll(selector) {
  if (reduceMotion() || !('IntersectionObserver' in window)) return;
  const els = [...document.querySelectorAll(selector)].filter((el) => el.getBoundingClientRect().top > window.innerHeight);
  if (!els.length) return;
  const io = new IntersectionObserver((entries) => { for (const en of entries) if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }, { rootMargin: '0px 0px -8% 0px' });
  els.forEach((el) => { el.classList.add('rise-wait'); io.observe(el); });
  setTimeout(() => els.forEach((el) => el.classList.add('is-in')), 6000); // never leave anything hidden
}

/* ----- Growth (formerly Patterns): Month · Year, as a dashboard of cards -----
   Everything comes from the person's own kept letters (nights kept out of Growth are
   left out): themes, light and heavy nights, and, from format 3 letters, the
   activities, compass labels and interests the letter writer noted for that night.
   Kit's sample letters carry the same fields so Demo mode shows complete cards. */
const PTABS = [['month', 'Month'], ['year', 'Year']];
const DIRECTIONS = [
  { key: 'young-entrepreneur', name: 'Young Entrepreneur', line: 'You come alive turning ideas into something people can use.', themes: ['business'], blurb: 'turning ideas into something people can use or buy' },
  { key: 'maker-builder', name: 'Maker & Builder', line: 'You light up when you’re building something that works.', themes: ['technology'], blurb: 'building things like apps, sites and prototypes' },
  { key: 'creative-explorer', name: 'Creative Explorer', line: 'You lose track of time when you’re making something of your own.', themes: ['creativity'], blurb: 'making things for the joy of making them' },
  { key: 'curious-learner', name: 'Curious Learner', line: 'You come alive when you’re following a question that interests you.', themes: ['learning'], blurb: 'following questions because they interest you' },
  { key: 'community-builder', name: 'Community Builder', line: 'You light up when you’re bringing people together.', themes: ['community'], blurb: 'bringing people together and showing up for others' },
  { key: 'world-explorer', name: 'World Explorer', line: 'You feel most like yourself when you’re out seeing somewhere new.', themes: ['nature', 'travel'], blurb: 'getting outside and seeing new places' },
];
const SAMPLE_DIRS = { 'community-builder': 'confirmed', 'curious-learner': 'suggested', 'creative-explorer': 'suggested' };
const FRAME = {
  creativity: ['#a0704a', '#3a2519'], community: ['#68683f', '#23231a'], business: ['#86573a', '#2b1d15'], technology: ['#575d68', '#1d1f24'],
  comparison: ['#5f4a5d', '#211a21'], uncertainty: ['#594d70', '#1e1a26'], loneliness: ['#4f5770', '#1a1d26'], friendship: ['#825465', '#2c1d23'], family: ['#704e5f', '#251a20'],
  rest: ['#525066', '#1c1b23'], nature: ['#5b6b4d', '#1f251b'], learning: ['#5d5d74', '#202028'], study: ['#554e5d', '#1d1a20'], career: ['#64504d', '#231b1b'],
};

let pMonth = null; let pTheme = null; let yTheme = null; let pTip = null; let skyState = null;
const autoDrawn = {};
const keptLetters = () => allLetters().filter((l) => delivered(l) && !l.private);
const realThemes = (l) => (l.content.themes || []).filter((t) => t !== 'ordinary' && t !== 'achievement');
const lastDayOf = (ym) => { const [y, m] = ym.split('-').map(Number); return `${ym}-${pad(new Date(y, m, 0).getDate())}`; };
const prevMonthOf = (ym) => { const [y, m] = ym.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`; };
function monthKeys(list) { return [...new Set(list.map((l) => l.date.slice(0, 7)))].sort(); }
function countThemes(ls) { const c = new Map(); for (const l of ls) for (const t of new Set(realThemes(l))) c.set(t, (c.get(t) || 0) + 1); return [...c.entries()].sort((a, b) => b[1] - a[1]); }

const GROWTH_MIN = 5; // fewer nights than this: cards show a gentle empty state, never a confident visual
const COMPASS = [['loves', 'What you love'], ['good_at', 'What you’re good at'], ['matters', 'What matters to you'], ['within_reach', 'What’s within reach']];
const gKey = (x) => String(x || '').trim().toLowerCase();
let gSel = null; // { kind, key } a compass point, dot or thread whose nights are shown
let gYear = null;

/* The nights in a span, read into what the cards draw. */
function growthOf(list) {
  const themes = countThemes(list);
  const lineFor = {}; const usedLine = new Set();
  for (const [t] of themes) {
    for (const l of [...list].sort((a, b) => b.date.localeCompare(a.date))) {
      if (!realThemes(l).includes(t)) continue;
      const line = (l.content.evidence || []).find((e) => e && !usedLine.has(e));
      if (line) { usedLine.add(line); lineFor[t] = { line, l }; break; }
    }
  }
  const compass = {};
  for (const [k] of COMPASS) {
    const m = new Map();
    for (const l of list) for (const label of new Set((l.content.compass?.[k] || []).map(String))) {
      const key = gKey(label); const cur = m.get(key) || { label, n: 0, letters: [] }; cur.n++; cur.letters.push(l); m.set(key, cur);
    }
    compass[k] = [...m.values()].sort((a, b) => b.n - a.n || a.label.localeCompare(b.label)).slice(0, 2);
  }
  const acts = new Map();
  for (const l of list) for (const a of l.content.activities || []) {
    const key = gKey(a.name); const cur = acts.get(key) || { name: a.name, e: 0, b: 0, n: 0, letters: [] };
    cur.e += a.energy; cur.b += a.absorption; cur.n++; if (!cur.letters.includes(l)) cur.letters.push(l); acts.set(key, cur);
  }
  const activities = [...acts.values()].map((a) => ({ ...a, e: a.e / a.n, b: a.b / a.n }))
    .sort((a, b) => b.n - a.n || (b.e + b.b) - (a.e + a.b)).slice(0, 8);
  const interests = new Map();
  for (const l of list) for (const t of new Set((l.content.interests || []).map(gKey))) {
    const name = (l.content.interests || []).find((x) => gKey(x) === t);
    const cur = interests.get(t) || { name, n: 0, letters: [] }; cur.n++; cur.letters.push(l); interests.set(t, cur);
  }
  // the needle: what the compass points to most, from interests and what matters
  const pull = [...interests.values()].sort((a, b) => b.n - a.n)[0];
  const weight = Object.fromEntries(COMPASS.map(([k]) => [k, compass[k].reduce((n, x) => n + x.n, 0)]));
  return { n: list.length, themes, lineFor, compass, weight, activities, interests: [...interests.values()].sort((a, b) => b.n - a.n), needle: pull ? pull.name : (compass.matters[0]?.label || null) };
}

function vGrowth() {
  const tab = param === 'year' ? 'year' : 'month';
  const all = keptLetters();
  let head = '', body = '';
  if (tab === 'year') {
    const years = [...new Set(all.map((l) => l.date.slice(0, 4)))].sort();
    if (!gYear || !years.includes(gYear)) gYear = years[years.length - 1] || journalDate().slice(0, 4);
    const i = years.indexOf(gYear);
    head = navArrows(years[i - 1], years[i + 1], gYear, 'data-gyear');
    body = growthYear(all.filter((l) => l.date.startsWith(gYear)).sort((a, b) => a.date.localeCompare(b.date)), all);
  } else {
    const months = monthKeys(all); const cur = journalDate().slice(0, 7);
    if (!pMonth || (!months.includes(pMonth) && pMonth !== cur)) {
      const counts = Object.fromEntries(months.map((m) => [m, all.filter((l) => l.date.startsWith(m)).length]));
      pMonth = (counts[cur] || 0) >= GROWTH_MIN ? cur : ([...months].reverse().find((m) => counts[m] >= GROWTH_MIN) || months[months.length - 1] || cur);
    }
    const i = months.indexOf(pMonth);
    const [y, m] = pMonth.split('-').map(Number);
    head = navArrows(i === -1 ? months[months.length - 1] : months[i - 1], i >= 0 ? months[i + 1] : null, `${MONTH[m - 1]} ${y}`, 'data-month');
    body = growthMonth(all);
  }
  return `<header class="g-head">
      <h1 class="g-title">Growth</h1>
      <div class="g-controls"><nav class="switch" aria-label="Growth views">${PTABS.map(([k, l]) => `<button data-ptab="${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</button>`).join('')}</nav>${head}</div>
    </header>
    <div class="g-grid">${body}</div>`;
}
function navArrows(older, newer, label, attr) {
  return `<div class="g-nav"><button class="iconbtn" ${attr}="${older || ''}" ${older ? '' : 'disabled'} aria-label="Previous">${I.left}</button><span class="g-nav-l">${esc(label)}</span><button class="iconbtn" ${attr}="${newer || ''}" ${newer ? '' : 'disabled'} aria-label="Next">${I.right}</button></div>`;
}
const card = (id, title, sub, inner, cls = '') => `<section class="g-card ${cls}" aria-labelledby="g-${id}"><header class="g-card-h"><h2 class="g-t" id="g-${id}">${title}</h2><p class="g-sub">${sub}</p></header><div class="g-card-b">${inner}</div></section>`;
const gEmpty = (text) => `<p class="g-empty">${text}</p>`;
const nightsList = (letters) => `<ul class="g-nights">${[...letters].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6).map((l) => `<li><button class="link" data-open="${l.id}"><span class="k">${fmtDay(l.date)}${l.sample ? ', sample' : ''}</span>${esc(l.content.title || l.content.headline)}</button></li>`).join('')}</ul>`;

/* --- Month --- */
function growthMonth(all) {
  const inMonth = all.filter((l) => l.date.startsWith(pMonth)).sort((a, b) => a.date.localeCompare(b.date));
  const g = growthOf(inMonth); const few = inMonth.length < GROWTH_MIN;
  const pk = prevMonthOf(pMonth); const prev = all.filter((l) => l.date.startsWith(pk));
  const earlier = all.filter((l) => l.date < `${pMonth}-01`);
  after.push(() => { skyState = { list: inMonth, from: `${pMonth}-01`, to: lastDayOf(pMonth), ticks: 'month', theme: () => null }; drawSky(); });
  const window = lastMonths(pMonth, 6).map((ym) => ({ ym, list: all.filter((l) => l.date.startsWith(ym)) }));
  return [
    card('stars', 'Your month in stars', 'Each star is a night you wrote. Brighter means lighter.', starsInner(), 'g-span2 g-stars'),
    card('themes', 'What took up your month', 'The themes you wrote about most.', few ? gEmpty('A few more nights and your themes will show here.') : themesInner(g)),
    card('compass', 'Your compass', 'Where your journal is pointing.', few ? gEmpty('A few more nights and your compass will start to form.') : compassInner(g)),
    card('alive', 'Where you come alive', 'Top right is where your energy and focus meet.', few ? gEmpty('A few more nights and your map will fill in.') : aliveInner(g)),
    card('changed', `What changed since ${MON[+pk.slice(5) - 1]}`, 'How this month compares to last.', few ? gEmpty('A few more nights and changes will show here.') : changedInner(inMonth, prev, earlier, MON[+pk.slice(5) - 1])),
    card('threads', 'Threads that last', 'What keeps coming back, and what faded.', threadsInner(window), 'g-span2'),
    card('try', 'Try it before you decide', 'Small real-world experiments for the direction you’re exploring.', tryInner(experimentsFor(all, g))),
  ].join('');
}
function lastMonths(ym, n) { const out = [ym]; while (out.length < n) out.unshift(prevMonthOf(out[0])); return out; }

/* --- Year --- */
function growthYear(list, all) {
  if (!list.length) return card('stars', 'Your year in stars', 'Each star is a night you wrote. Brighter means lighter.', gEmpty('Your year fills in as letters arrive. Each night you write becomes a star.'), 'g-span3');
  const g = growthOf(list); const few = list.length < GROWTH_MIN;
  const from = `${list[0].date.slice(0, 7)}-01`; const to = gYear === journalDate().slice(0, 4) ? journalDate() : `${gYear}-12-31`;
  after.push(() => { skyState = { list, from, to, ticks: 'year', theme: () => null }; drawSky(); });
  const months = []; let k = from.slice(0, 7); while (k <= to.slice(0, 7)) { months.push(k); const [yy, mm] = k.split('-').map(Number); k = mm === 12 ? `${yy + 1}-01` : `${yy}-${pad(mm + 1)}`; }
  const first = list.filter((l) => l.date.startsWith(months[0])); const last = list.filter((l) => l.date.startsWith(months[months.length - 1]));
  const firstNeedle = growthOf(first).needle;
  return [
    card('stars', 'Your year in stars', 'Each star is a night you wrote. Brighter means lighter.', starsInner(), 'g-span2 g-stars'),
    card('themes', 'What took up your year', 'The themes you wrote about most.', few ? gEmpty('A few more nights and your themes will show here.') : themesInner(g)),
    card('compass', 'Your compass', 'Where your journal is pointing.', few ? gEmpty('A few more nights and your compass will start to form.') : compassInner(g, firstNeedle && firstNeedle !== g.needle ? { label: firstNeedle, month: MON[+months[0].slice(5) - 1] } : null)),
    card('alive', 'Where you come alive', 'Top right is where your energy and focus meet.', few ? gEmpty('A few more nights and your map will fill in.') : aliveInner(g)),
    card('changed', 'What changed since your first month', `${MONTH[+months[0].slice(5) - 1]} compared with ${MONTH[+months[months.length - 1].slice(5) - 1]}.`, few || months.length < 2 ? gEmpty('A few more months and changes will show here.') : changedInner(last, first, [], MON[+months[0].slice(5) - 1])),
    card('threads', 'Threads that last', 'What keeps coming back, and what faded.', threadsInner(months.map((ym) => ({ ym, list: list.filter((l) => l.date.startsWith(ym)) }))), 'g-span2'),
    card('try', 'Try it before you decide', 'Small real-world experiments for the direction you’re exploring.', tryInner(experimentsFor(all, g))),
    card('film', 'Your Life Film', 'One frame per month, with a line you wrote that month.', filmInner(list, months), 'g-span3'),
  ].join('');
}

function starsInner() {
  return `<div class="sky" id="sky"></div><p class="sky-legend"><span><i class="tone-dot tone-positive"></i>lighter night</span><span><i class="tone-dot tone-difficult"></i>heavier night</span></p>`;
}
function themesInner(g) {
  const top = g.themes.slice(0, 5); const max = Math.max(1, ...top.map(([, c]) => c));
  return `<ol class="g-rank">${top.map(([t, c]) => { const q = g.lineFor[t]; return `<li><button class="g-rank-row" data-gtheme="${t}" aria-label="${esc(cap(THEMES[t]))}, ${plural(c, 'night')}. Show these nights in Letters"><span class="g-rank-top"><b>${esc(cap(THEMES[t]))}</b><span class="fine">${plural(c, 'night')}</span></span><span class="bar"><i style="width:${((c / max) * 100).toFixed(1)}%"></i></span>${q ? `<span class="g-line">${esc(q.line)}</span>` : ''}</button></li>`; }).join('')}</ol>`;
}
function compassInner(g, earlier = null) {
  const pos = { loves: 'n', good_at: 'e', matters: 's', within_reach: 'w' };
  const ang = { loves: -90, good_at: 0, matters: 90, within_reach: 180 };
  let x = 0, y = 0; for (const [k] of COMPASS) { const r = (ang[k] * Math.PI) / 180; x += Math.cos(r) * g.weight[k]; y += Math.sin(r) * g.weight[k]; }
  const deg = x || y ? (Math.atan2(y, x) * 180) / Math.PI + 90 : 0;
  const sel = gSel?.kind === 'compass' ? gSel.key : null;
  const point = ([k, title]) => { const items = g.compass[k]; const letters = [...new Set(items.flatMap((i) => i.letters))];
    return `<button class="g-pt g-pt-${pos[k]} ${sel === k ? 'is-sel' : ''}" data-gcompass="${k}" ${items.length ? '' : 'disabled'} aria-pressed="${sel === k}" aria-label="${title}: ${items.length ? items.map((i) => esc(i.label)).join(', ') : 'Still forming'}"><span class="g-pt-k">${title}</span>${items.length ? items.map((i) => `<b>${esc(i.label)}</b>`).join('') : '<em>Still forming</em>'}${letters.length ? `<span class="fine">${plural(letters.length, 'night')}</span>` : ''}</button>`; };
  const selItems = sel ? [...new Set(g.compass[sel].flatMap((i) => i.letters))] : [];
  return `<div class="g-compass">
      ${COMPASS.map(point).join('')}
      <div class="g-dial" aria-hidden="true"><span class="g-ring"></span>${earlier ? `<span class="g-needle is-past" style="--a:${deg - 40}deg"></span>` : ''}<span class="g-needle" style="--a:${deg}deg"></span><span class="g-hub"></span></div>
    </div>
    ${g.needle ? `<p class="g-pointing">Pointing toward <b>${esc(g.needle)}</b></p>` : '<p class="g-pointing fine">Still forming</p>'}
    ${earlier ? `<p class="fine g-was">In ${esc(earlier.month)} you were pointing toward ${esc(earlier.label)}. Now ${esc(g.needle)}.</p>` : ''}
    ${selItems.length ? nightsList(selItems) : ''}`;
}
function aliveInner(g) {
  const dots = g.activities.slice(0, 8);
  if (dots.length < 3) return gEmpty('A few more nights and your map will fill in.');
  const W = 340, H = 260, P = 30, IN = 26; const X = (v) => P + IN + ((v + 2) / 4) * (W - 2 * (P + IN)); const Y = (v) => H - P - IN - ((v + 2) / 4) * (H - 2 * (P + IN));
  const sel = gSel?.kind === 'dot' ? gSel.key : null;
  // dots on the same spot fan out a little; each label takes the first free place beside its dot
  const spots = new Map();
  const boxes = [{ x0: W / 2 - 48, x1: W / 2 + 48, y0: P - 22, y1: P - 6 }, { x0: W / 2 - 36, x1: W / 2 + 36, y0: H - P + 8, y1: H - P + 24 }, { x0: P, x1: P + 40, y0: H / 2 + 3, y1: H / 2 + 17 }, { x0: W - P - 56, x1: W - P, y0: H / 2 + 3, y1: H / 2 + 17 }];
  const free = (bx) => bx.x0 >= 2 && bx.x1 <= W - 2 && bx.y0 >= 2 && bx.y1 <= H - 2 && !boxes.some((o) => bx.x0 < o.x1 && bx.x1 > o.x0 && bx.y0 < o.y1 && bx.y1 > o.y0);
  const placed = dots.map((d) => {
    let cx = X(d.b), cy = Y(d.e); const key = `${Math.round(cx / 8)}|${Math.round(cy / 8)}`; const k = spots.get(key) || 0; spots.set(key, k + 1);
    if (k) { const a = k * 2.4 + 2.4; cx += Math.cos(a) * 18 * Math.ceil(k / 3); cy += Math.sin(a) * 18 * Math.ceil(k / 3); }
    cx = Math.max(P / 2, Math.min(W - P / 2, cx)); cy = Math.max(P / 2, Math.min(H - P / 2, cy));
    const r = 5 + Math.min(5, d.n * 1.5);
    boxes.push({ x0: cx - r, x1: cx + r, y0: cy - r, y1: cy + r });
    return { d, cx, cy, r };
  });
  const out = placed.map(({ d, cx, cy, r }) => {
    const text = clip(d.name, 20); const w = text.length * 6.1;
    const opts = [
      { x: cx + r + 5, y: cy + 4, anchor: 'start', box: { x0: cx + r + 4, x1: cx + r + 6 + w, y0: cy - 7, y1: cy + 6 } },
      { x: cx - r - 5, y: cy + 4, anchor: 'end', box: { x0: cx - r - 6 - w, x1: cx - r - 4, y0: cy - 7, y1: cy + 6 } },
      { x: cx, y: cy - r - 6, anchor: 'middle', box: { x0: cx - w / 2, x1: cx + w / 2, y0: cy - r - 17, y1: cy - r - 4 } },
      { x: cx, y: cy + r + 13, anchor: 'middle', box: { x0: cx - w / 2, x1: cx + w / 2, y0: cy + r + 2, y1: cy + r + 15 } },
    ];
    const at = opts.find((o) => free(o.box)) || null; if (at) boxes.push(at.box);
    return `<g class="g-dot ${sel === gKey(d.name) ? 'is-sel' : ''} ${d.e > 0 && d.b > 0 ? 'is-hot' : ''}" data-gdot="${esc(gKey(d.name))}" tabindex="0" role="button" aria-label="${esc(d.name)}: ${plural(d.n, 'night')}"><circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r}"/>${at ? `<text x="${at.x.toFixed(1)}" y="${at.y.toFixed(1)}" text-anchor="${at.anchor}">${esc(text)}</text>` : `<title>${esc(d.name)}</title>`}</g>`;
  });
  return `<div class="g-map"><svg viewBox="0 0 ${W} ${H}" role="group" aria-label="Activities by energy and focus">
      <rect class="g-map-hot" x="${W / 2}" y="${P}" width="${W / 2 - P}" height="${H / 2 - P}" rx="10"/>
      <line class="g-axis" x1="${P}" x2="${W - P}" y1="${H / 2}" y2="${H / 2}"/><line class="g-axis" y1="${P}" y2="${H - P}" x1="${W / 2}" x2="${W / 2}"/>
      <text class="g-ax" x="${P}" y="${H / 2 + 14}">bored</text><text class="g-ax" x="${W - P}" y="${H / 2 + 14}" text-anchor="end">absorbed</text>
      <text class="g-ax" x="${W / 2}" y="${P - 10}" text-anchor="middle">gives you energy</text><text class="g-ax" x="${W / 2}" y="${H - P + 20}" text-anchor="middle">drains you</text>
      ${out.join('')}
    </svg></div>
    ${sel ? nightsList((dots.find((d) => gKey(d.name) === sel) || { letters: [] }).letters) : ''}`;
}
function changedInner(now, before, earlier, prevLabel) {
  const a = new Map(countThemes(now)); const b = new Map(countThemes(before)); const seen = new Set(earlier.flatMap(realThemes));
  const rows = [];
  for (const [t, n] of a) if (!b.has(t) && !seen.has(t) && earlier.length) rows.push({ k: 'new', t, d: n });
  for (const t of new Set([...a.keys(), ...b.keys()])) { const d = (a.get(t) || 0) - (b.get(t) || 0); if (Math.abs(d) >= 2 && !rows.some((r) => r.t === t)) rows.push({ k: d > 0 ? 'up' : 'down', t, d: Math.abs(d) }); }
  rows.sort((x, y) => (x.k === 'new') - (y.k === 'new') || y.d - x.d);
  if (!before.length) return gEmpty(`No nights from ${prevLabel} to compare with.`);
  if (!rows.length) return gEmpty(`About the same things came up as in ${prevLabel}.`);
  const icon = { up: '↑', down: '↓', new: '✦' };
  const say = (r) => (r.k === 'new' ? `New: ${THEMES[r.t]} showed up for the first time` : `${r.k === 'up' ? 'More' : 'Fewer'} nights about ${THEMES[r.t]}`);
  return `<ul class="g-changes">${rows.slice(0, 4).map((r) => `<li class="is-${r.k}"><span class="g-ic" aria-hidden="true">${icon[r.k]}</span><span>${esc(say(r))}</span></li>`).join('')}</ul>`;
}
function threadsInner(window) {
  const total = new Map();
  for (const { list } of window) for (const l of list) for (const t of new Set((l.content.interests || []).length ? (l.content.interests || []).map(gKey) : realThemes(l).map((x) => `#${x}`))) total.set(t, (total.get(t) || 0) + 1);
  const threads = [...total.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t);
  if (!threads.length) return gEmpty('A few more nights and the threads will show here.');
  const W = 640, row = 34, top = 10, left = 132, H = top + threads.length * row + 28; const step = (W - left - 20) / Math.max(1, window.length - 1);
  const label = (t) => (t.startsWith('#') ? cap(THEMES[t.slice(1)]) : window.flatMap((w) => w.list).flatMap((l) => l.content.interests || []).find((x) => gKey(x) === t) || t);
  const cols = window.map((w, i) => ({ ...w, x: left + i * step }));
  return `<div class="g-threads"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Threads across ${window.length} months">
      ${cols.map((c) => `<text class="g-ax" x="${c.x}" y="${H - 6}" text-anchor="middle">${MON[+c.ym.slice(5) - 1]}</text>`).join('')}
      ${threads.map((t, j) => {
        const y = top + j * row + 12; const pts = cols.map((c) => ({ x: c.x, n: c.list.filter((l) => ((l.content.interests || []).length ? (l.content.interests || []).map(gKey) : realThemes(l).map((x) => `#${x}`)).includes(t)).length }));
        const on = pts.filter((p) => p.n); const lastOn = pts.map((p) => p.n > 0).lastIndexOf(true); const faded = lastOn < pts.length - 2;
        return `<g class="g-thread ${faded ? 'is-faded' : ''}"><text class="g-tl" x="${left - 14}" y="${y + 4}" text-anchor="end">${esc(clip(label(t), 17))}</text>
          ${on.length > 1 ? `<line x1="${on[0].x}" x2="${on[on.length - 1].x}" y1="${y}" y2="${y}"/>` : ''}
          ${on.map((p) => `<circle cx="${p.x}" cy="${y}" r="${3 + Math.min(5, p.n * 1.4)}"/>`).join('')}
          ${faded ? `<text class="g-faded" x="${on[on.length - 1].x + 12}" y="${y + 4}">faded</text>` : ''}</g>`;
      }).join('')}
    </svg></div>`;
}
/* Experiments are the letters' own small steps that explore or connect, in the themes the
   compass is pointing toward; "Not for me" is the same step feedback the letter uses. */
function experimentsFor(all, g) {
  const themes = new Set(g.themes.slice(0, 3).map(([t]) => t));
  const seen = new Set();
  return [...all].sort((a, b) => b.date.localeCompare(a.date)).filter((l) => {
    const st = l.content.small_step; if (!st || !['exploration', 'connection'].includes(st.category)) return false;
    if (l.actions?.['step.0'] === 'skipped' || !realThemes(l).some((t) => themes.has(t))) return false;
    if (seen.has(gKey(st.text))) return false; seen.add(gKey(st.text)); return true;
  }).slice(0, 3);
}
function tryInner(list) {
  if (!list.length) return gEmpty('Small experiments will appear here as your letters suggest them.');
  return `<ul class="g-try">${list.map((l) => { const st = l.content.small_step; const done = l.actions?.['step.0'] === 'tried';
    return `<li class="${done ? 'is-done' : ''}"><span class="g-try-ic" aria-hidden="true">${st.category === 'connection' ? I.bubbles : I.star}</span><span class="g-try-t"><b>${esc(st.text)}</b><button class="link fine" data-open="${l.id}">${fmtDay(l.date)}${l.sample ? ', sample' : ''}</button></span>${done ? `<span class="fine g-tried">${I.check} Tried</span>` : `<button class="link" data-try-skip="${l.id}">Not for me</button>`}</li>`; }).join('')}</ul>`;
}
function filmInner(list, months) {
  const usedQ = new Set();
  return `<div class="g-film">${months.map((ym, i) => {
    const ls = list.filter((l) => l.date.startsWith(ym)); const top = countThemes(ls)[0]?.[0]; let q = null;
    for (const l of [...ls].reverse()) { const e = (l.content.evidence || []).find((x) => x && !usedQ.has(x)); if (e) { q = e; usedQ.add(e); break; } }
    const [a, b] = FRAME[top] || ['#4a3328', '#1c1411'];
    return ls.length ? `<button class="frame" data-film="${ym}" style="--g:${b};--a:${a};--i:${i}" aria-label="${MONTH[+ym.slice(5) - 1]}: open this month"><span class="k">${MON[+ym.slice(5) - 1]} ${ym.slice(0, 4)}${ls.some((l) => l.sample) ? ' · sample' : ''}</span><p>${q ? esc(q) : esc(cap(THEMES[top] || 'an ordinary month'))}</p><span class="fine">${plural(ls.length, 'night')}</span></button>`
      : `<div class="frame is-blank" style="--i:${i}"><span class="k">${MON[+ym.slice(5) - 1]} ${ym.slice(0, 4)}</span><p>No letters.</p><span></span></div>`; }).join('')}</div>`;
}

/* --- the sky (shared by Month and Year) --- */
let lastSkyKey = '';
function drawSky() {
  const el = $('#sky'); if (!el || !skyState) return;
  const { list, from, to, ticks } = skyState; const theme = skyState.theme();
  // a new month or year: stars come out one by one; clicks on the same sky don't replay it
  const skyKey = `${from}|${to}|${list.length}`; const fresh = skyKey !== lastSkyKey; lastSkyKey = skyKey;
  const W = el.clientWidth, H = el.clientHeight; const padX = Math.max(22, W * .05);
  const span = Math.max(1, dayDiff(to, from));
  const scale = W > 600 ? 1.4 : 1; const per = {};
  const stars = list.map((l) => {
    const r = seeded(l.id); const k = (per[l.date] = (per[l.date] || 0) + 1) - 1;
    const t = dayDiff(l.date, from) / span; const wave = Math.sin(t * Math.PI * 2.2 + .6) * .18;
    const yy = Math.max(24, Math.min(H - 44, H * (.44 + wave + (r() - .5) * .3)));
    const size = ({ positive: 5.2, mixed: 4.4, ordinary: 3.8, difficult: 3.6 }[l.content.tone] || 4) * scale * (ticks === 'year' ? .85 : 1);
    return { l, x: padX + t * (W - 2 * padX) + k * 12, y: yy, size, tw: 2.5 + r() * 3.5, dl: r() * 3 };
  });
  const chosen = theme ? stars.filter((s) => realThemes(s.l).includes(theme)) : [];
  const path = chosen.map((s, i) => `${i ? 'L' : 'M'} ${s.x.toFixed(1)} ${s.y.toFixed(1)}`).join(' ');
  let tickList = [];
  if (ticks === 'month') { const days = dayDiff(to, from) + 1; tickList = [1, 5, 10, 15, 20, 25, days].filter((d, i, a) => d <= days && a.indexOf(d) === i && !(d !== days && days - d < 3)).map((d) => ({ x: padX + ((d - 1) / span) * (W - 2 * padX), label: String(d) })); }
  else { let k = from.slice(0, 7); while (`${k}-01` <= to) { const off = dayDiff(`${k}-01`, from); tickList.push({ x: padX + (off / span) * (W - 2 * padX), label: MON[+k.slice(5) - 1] }); const [yy, mm] = k.split('-').map(Number); k = mm === 12 ? `${yy + 1}-01` : `${yy}-${pad(mm + 1)}`; } }
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${plural(stars.length, 'night')}${theme ? `, ${chosen.length} about ${esc(THEMES[theme])}` : ''}">
    <defs><radialGradient id="glow"><stop offset="0" style="stop-color:var(--light-1)" stop-opacity=".9"/><stop offset=".35" style="stop-color:rgb(var(--star-rgb))" stop-opacity=".35"/><stop offset="1" style="stop-color:rgb(var(--star-rgb))" stop-opacity="0"/></radialGradient></defs>
    ${tickList.map((t) => `<g class="ns-tick"><line x1="${t.x}" x2="${t.x}" y1="${H - 26}" y2="${H - 20}"/><text x="${t.x}" y="${H - 8}" text-anchor="middle">${t.label}</text></g>`).join('')}
    ${chosen.length > 1 ? `<path d="${path}" class="ns-line" pathLength="1"/>` : ''}
    ${stars.map((s, i) => { const on = !theme || realThemes(s.l).includes(theme); return `<g class="ns-star tone-${s.l.content.tone} ${on ? '' : 'is-off'} ${pTip === s.l.id ? 'is-sel' : ''} ${fresh ? 'ns-new' : ''}" transform="translate(${s.x.toFixed(1)} ${s.y.toFixed(1)})" style="--tw:${s.tw}s;--dl:${s.dl}s;--d:${Math.min(i * 45, 1600)}ms" tabindex="0" role="button" aria-label="${esc(fmtDay(s.l.date))}: ${esc(s.l.content.headline)}" data-star="${s.l.id}"><circle r="${(s.size * 4.2).toFixed(1)}" class="halo" fill="url(#glow)"/><path d="${sparkle(s.l.id, s.size * 1.7)}" class="core"/><circle r="16" fill="transparent"/></g>`; }).join('')}
    ${theme && chosen[0] ? `<text x="${Math.min(Math.max(chosen[0].x, 60), W - 60)}" y="${chosen[0].y - 18}" class="ns-label" text-anchor="middle">${esc(cap(THEMES[theme]))}</text>` : ''}
  </svg>${!stars.length ? '<p class="ns-empty">No kept letters here yet. Each night you write becomes a star.</p>' : ''}`;
  const tip = pTip && stars.find((s) => s.l.id === pTip);
  if (tip) {
    const up = tip.y > H / 2;
    const d = document.createElement('div'); d.className = `ns-tip ${up ? 'up' : ''}`;
    d.style.left = `${Math.min(Math.max(tip.x, 135), W - 135)}px`; d.style.top = `${up ? tip.y - 16 : tip.y + 16}px`;
    d.innerHTML = `<span class="k">${fmtDay(tip.l.date)}${tip.l.sample ? ', sample' : ''}</span><b>${esc(tip.l.content.headline)}</b><span class="fine">${realThemes(tip.l).map((t) => esc(THEMES[t])).join(', ')}</span><button class="link" data-open="${tip.l.id}">Read the letter</button>`;
    el.appendChild(d);
  }
}

/* --- Identity: who you might become --- */
let identArrive = false; // straight after the welcome: the centre glows first, then the directions
let identVeiled = false; let identFocus = null; let identRaf = 0; let identRevealAt = 0; let identHover = null;
function directions() {
  const list = keptLetters();
  return DIRECTIONS.map((def) => {
    const ev = list.filter((l) => (l.content.themes || []).some((t) => def.themes.includes(t))).sort((a, b) => b.date.localeCompare(a.date));
    const days = new Set(ev.map((l) => l.date)).size; const months = new Set(ev.map((l) => l.date.slice(0, 7))).size;
    const status = S.dirs?.[def.key] || (S.mode === 'sample' ? SAMPLE_DIRS[def.key] : null) || 'suggested';
    const explanation = ev.length ? `${plural(ev.length, 'kept letter')}${months > 1 ? `, across ${months} months,` : ''} touch on ${def.blurb}, for example “${ev[0].content.headline}”. A possibility you might recognise in yourself, if it fits. Not a label.` : 'No kept letters support this right now.';
    return { ...def, id: def.key, evidence: ev, days, status, sufficient: days >= 3, count: Math.max(1, ev.length), explanation };
  });
}
function bubbleLayout(items, W, H, cx0 = W * .5, cy0 = H * .5) {
  const out = {}; if (!W || !H) return out;
  const maxCount = Math.max(1, ...items.map((d) => d.count)); let lastSize = Infinity;
  // "you" sits at the centre; directions are placed around it, never on it
  const placed = [{ x: cx0, y: cy0, r: Math.min(56, Math.min(W, H) * .1) }];
  const short = Math.min(W, H); const minD = Math.max(80, short * .17); const maxD = Math.max(minD + 36, Math.min(short * .36, 220));
  [...items].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).forEach((d, i) => {
    let size = maxCount <= 1 ? (minD + maxD) / 2 : minD + (maxD - minD) * Math.sqrt((d.count - 1) / (maxCount - 1));
    size = Math.min(size, lastSize); // never larger than a direction with more letters
    const rnd = seeded(d.key); let best = null;
    for (let attempt = 0; attempt < 8 && !best; attempt++) {
      const r = size / 2; const gap = attempt < 3 ? Math.min(46, short * .07) : 14; // small screens: shrink until every direction fits
      for (let k = 0; k < 1400; k++) {
        const a = k * 2.399963 + rnd() * .6 + i * 1.7; const dist = short * .16 + Math.sqrt(k) * 9.5;
        const x = cx0 + Math.cos(a) * dist * 1.45, y = cy0 + Math.sin(a) * dist * .82;
        if (x - r < 14 || x + r > W - 14 || y - r < 14 || y + r > H - 14) continue;
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + r + gap)) { best = { x, y }; break; }
      }
      if (!best) size *= .82;
    }
    const r = size / 2;
    if (!best) best = { x: Math.min(W - r - 14, Math.max(r + 14, cx0 + (rnd() - .5) * W * .6)), y: Math.min(H - r - 14, Math.max(r + 14, cy0 + (rnd() - .5) * H * .6)) };
    placed.push({ ...best, r }); lastSize = size;
    out[d.id] = { ...best, size, amp: 5 + rnd() * 8, ampY: 6 + rnd() * 9, period: 9000 + rnd() * 7000, phase: rnd() * Math.PI * 2 };
  });
  // centre the whole constellation (you included) in the stage
  const box = placed.reduce((b, p) => ({ x0: Math.min(b.x0, p.x - p.r), x1: Math.max(b.x1, p.x + p.r), y0: Math.min(b.y0, p.y - p.r), y1: Math.max(b.y1, p.y + p.r) }), { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity });
  const dx = Math.max(14 - box.x0, Math.min(W - 14 - box.x1, W / 2 - (box.x0 + box.x1) / 2));
  const dy = Math.max(14 - box.y0, Math.min(H - 14 - box.y1, H / 2 - (box.y0 + box.y1) / 2));
  for (const id of Object.keys(out)) { out[id].x += dx; out[id].y += dy; }
  out.__core = { x: cx0 + dx, y: cy0 + dy };
  return out;
}
/* When a direction showed up: one row of the months it spans, a star per letter. */
/* Drawn at about the card’s width, so the line fills the card on any screen. */
function directionTimeline(f) {
  const all = keptLetters(); if (!all.length || !f.evidence.length) return '';
  const dates = all.map((l) => l.date).sort(); const from = `${dates[0].slice(0, 7)}-01`; const to = lastDayOf(dates[dates.length - 1].slice(0, 7));
  const span = Math.max(1, dayDiff(to, from)); const W = Math.round(Math.min(880, Math.max(300, window.innerWidth - 100))), H = 64, pad = 14; const x = (d) => pad + (dayDiff(d, from) / span) * (W - 2 * pad);
  const months = []; let k = from.slice(0, 7); while (`${k}-01` <= to) { months.push(k); const [yy, mm] = k.split('-').map(Number); k = mm === 12 ? `${yy + 1}-01` : `${yy}-${pad2(mm + 1)}`; }
  const ev = new Set(f.evidence.map((l) => l.id));
  return `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="${plural(f.evidence.length, 'letter')} about ${esc(f.name)}, from ${MON[+from.slice(5, 7) - 1]} to ${MON[+to.slice(5, 7) - 1]}">
    <path class="tl-line" d="M${pad} 30 C ${W * .3} 27, ${W * .6} 33, ${W - pad} 29"/>
    ${months.map((m) => `<text class="tl-m" x="${x(`${m}-01`).toFixed(1)}" y="${H - 4}">${MON[+m.slice(5) - 1]}</text>`).join('')}
    ${all.filter((l) => !ev.has(l.id)).map((l) => `<circle class="tl-dot" cx="${x(l.date).toFixed(1)}" cy="30" r="2"/>`).join('')}
    ${f.evidence.map((l, i) => `<path class="tl-star" style="--i:${i}" d="${sparkle(l.id, 7)}" transform="translate(${x(l.date).toFixed(1)} 30)" data-open="${l.id}" data-from-dir="${f.key}" tabindex="0" role="button" aria-label="Open the letter from ${fmtDay(l.date)}: ${esc(l.content.title || l.content.headline)}"/>`).join('')}
  </svg>`;
}
const pad2 = (n) => String(n).padStart(2, '0');
function vIdentity() {
  const all = directions();
  const visible = all.filter((d) => (d.status === 'confirmed' && d.evidence.length) || (d.status === 'suggested' && d.sufficient));
  if (param) {
    const f = visible.find((d) => d.key === param);
    if (f) return vDirection(f);
    param = null; try { history.replaceState(null, '', '#identity'); } catch (e) { /* fine */ } // unknown or popped
  }
  const n = nightsToFirst(all);
  after.push(() => startBubbles(visible));
  if (identArrive) after.push(() => { identArrive = false; });
  // home: the constellation comes first, with no heading or veil in front of it
  return `<h1 class="sr-only">Identity</h1>
    <section class="ident ${identArrive ? 'is-arriving' : ''}" aria-label="Your directions">
      ${visible.length ? `<div class="stage ${identVeiled ? 'is-veiled' : ''}" id="stage">
        <canvas class="stage-sky" aria-hidden="true"></canvas>
        <div class="parallax"><div class="stage-layer"><svg class="stage-links" aria-hidden="true"></svg></div></div>
      </div>
      <p class="fine legend">You are at the centre. Larger circles have more nights behind them, and brighter threads mean a stronger pull. Tap a direction to open it.</p>`
      : `<div class="empty"><span class="empty-mark" aria-hidden="true">${miniMap([])}</span><p class="lead">Write ${plural(n, 'more night')} to see your first direction.</p><p class="fine">A direction appears once kept letters from at least three different nights point to it.</p><button class="btn amber" data-go="tonight">Write tonight</button></div>`}
    </section>`;
}
/* A direction's own page: the bubble grows into its header (see openDirection). */
let dirShowAll = false; let dirChanging = false;
function vDirection(f) {
  const journals = [...f.evidence].sort((a, b) => b.date.localeCompare(a.date));
  const shown = dirShowAll ? journals : journals.slice(0, 5);
  const tries = dirExperiments(f);
  const decided = f.status === 'confirmed';
  const lineOf = (l) => { const t = (l.entries || []).map((e) => e.text).join(' ').replace(/\s+/g, ' ').trim(); return t; };
  return `<button class="link back dir-back" data-dir-back aria-label="Back to your map">${I.left}Your map</button>
    <header class="dir-head">
      <div class="dir-bubble bubble is-${f.status}" style="--s:var(--dir-s)" aria-hidden="true">${orbMarkup(f, 'calc(var(--dir-s) * .14)')}</div>
      <div class="dir-head-t">
        <p class="dir-st ${decided ? 'is-confirmed' : ''}">${decided ? 'Confirmed' : 'Suggested'}</p>
        <h1 class="dir-name">${esc(f.name)}</h1>
        <p class="dir-line">${esc(f.line)}</p>
        <p class="fine dir-note">A possibility, not a label.</p>
      </div>
      ${decided ? '' : `<div class="dir-decide" role="group" aria-label="Does ${esc(f.name)} fit you?">
        <button class="dir-fit" data-dir-fit="${f.key}">${I.check}<span>This fits me</span></button>
        <button class="dir-pop" data-dir-pop="${f.key}"><span class="dir-pop-ic" aria-hidden="true"></span><span>Pop it</span></button>
      </div>`}
    </header>
    <div class="dir-cards">
      <section class="g-card dir-wide" aria-labelledby="dir-when"><header class="g-card-h"><h2 class="g-t" id="dir-when">When it showed up</h2><p class="g-sub">The nights this direction appeared.</p></header><div class="g-card-b">${directionTimeline(f)}</div></section>
      <section class="g-card" aria-labelledby="dir-journals"><header class="g-card-h"><h2 class="g-t" id="dir-journals">Your journals about this</h2><p class="g-sub">${plural(journals.length, 'night')}, newest first.</p></header>
        <div class="g-card-b"><ul class="dir-journals">${shown.map((l) => `<li><button class="dir-j" data-open="${l.id}" data-from-dir="${f.key}"><span class="k">${fmtDay(l.date)}${l.sample ? ', sample' : ''}</span><b>${esc(l.content.title || l.content.headline)}</b><span class="dir-j-line">${esc(lineOf(l))}</span><span class="dir-j-go" aria-hidden="true">${I.right}</span></button></li>`).join('')}</ul>
        ${journals.length > 5 && !dirShowAll ? `<button class="btn sm secondary" data-dir-all>Show all ${journals.length}</button>` : ''}</div></section>
      ${tries.length ? `<section class="g-card" aria-labelledby="dir-try"><header class="g-card-h"><h2 class="g-t" id="dir-try">Try it</h2><p class="g-sub">Small ways to test this direction in real life.</p></header><div class="g-card-b">${tryInner(tries)}</div></section>` : ''}
    </div>
    ${decided ? `<div class="dir-mind">${dirChanging
      ? `<p class="fine">Not sure anymore?</p><div class="row"><button class="link" data-dir-unsure="${f.key}">Back to a suggestion</button><button class="link" data-dir-pop="${f.key}">Pop it</button></div>`
      : `<button class="link fine" data-dir-change>Changed your mind?</button>`}</div>` : ''}`;
}
/* Try it on a direction page: that direction's own letters' small steps that explore or
   connect, the same source as Growth's "Try it before you decide". */
function dirExperiments(f) {
  const seen = new Set();
  return [...f.evidence].sort((a, b) => b.date.localeCompare(a.date)).filter((l) => {
    const st = l.content.small_step; if (!st || !['exploration', 'connection'].includes(st.category) || l.actions?.['step.0'] === 'skipped') return false;
    if (seen.has(gKey(st.text))) return false; seen.add(gKey(st.text)); return true;
  }).slice(0, 2);
}
/* The bubble grows from the map into the page, and shrinks back on return. */
function flyBubble(fromRect, toEl, html, cls, done) {
  if (!fromRect || !toEl || reduceMotion()) { done?.(); return; }
  const to = toEl.getBoundingClientRect();
  const fly = document.createElement('div'); fly.className = `dir-fly bubble ${cls}`; fly.innerHTML = html; fly.setAttribute('aria-hidden', 'true');
  Object.assign(fly.style, { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px` }); fly.style.setProperty('--dir-s', `${to.width}px`);
  $('#layer').appendChild(fly);
  toEl.style.visibility = 'hidden';
  const sx = fromRect.width / to.width; const dx = fromRect.left + fromRect.width / 2 - (to.left + to.width / 2); const dy = fromRect.top + fromRect.height / 2 - (to.top + to.height / 2);
  fly.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx})` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'forwards' }).finished.then(() => {
    toEl.style.visibility = ''; fly.remove(); done?.();
  });
}
function openDirection(key) {
  const b = $(`.bubble[data-bubble="${key}"]`); const from = b?.getBoundingClientRect(); const cls = b ? [...b.classList].filter((c) => c.startsWith('is-')).join(' ') : '';
  const html = b?.innerHTML || '';
  identReturn = { key, scrollY: window.scrollY };
  dirShowAll = false; dirChanging = false;
  go('identity', key);
  const main = $('#main'); if (main && !reduceMotion()) main.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
  flyBubble(from, $('.dir-bubble'), html, cls);
}
let identReturn = null;
function closeDirection({ viaHistory = false } = {}) {
  const head = $('.dir-bubble'); const from = head?.getBoundingClientRect(); const html = head?.innerHTML || ''; const key = param || identReturn?.key;
  const cls = head ? [...head.classList].filter((c) => c.startsWith('is-')).join(' ') : '';
  if (viaHistory) { readHash(); render(); } else go('identity', null, { keepScroll: true });
  window.scrollTo(0, identReturn?.key === key ? identReturn.scrollY : 0);
  const land = () => { const b = $(`.bubble[data-bubble="${key}"]`); if (!b) return; flyBubble(from, b, html, cls, () => { b.classList.add('is-back'); setTimeout(() => b.classList.remove('is-back'), 1600); }); };
  requestAnimationFrame(() => requestAnimationFrame(land));
}

/* A direction's glowing bubble (the map and the top of its own page use the same one). */
const orbMarkup = (d, fs) => `<span class="orb"><svg class="orb-line" viewBox="0 0 100 100" aria-hidden="true"><path d="${wobble(d.key, 50, 50, 46, .045, 11)}"/><path class="orb-line2" d="${wobble(`${d.key}2`, 50, 50, 44, .05, 9)}"/></svg><span class="orb-st">${d.status === 'confirmed' ? 'confirmed' : 'suggested'}</span><span class="orb-name" style="font-size:${typeof fs === 'number' ? `${fs}px` : fs}">${esc(d.name)}</span><span class="orb-n">${plural(d.days, 'night')}</span></span>`;
/* The constellation: you in the middle, each direction on its own orbit, joined
   to you by a thread of light. Stars drift behind it at a different depth. */
function startBubbles(visible) {
  cancelAnimationFrame(identRaf);
  const stage = $('#stage'); if (!stage || !visible.length) return;
  const W = stage.clientWidth, H = stage.clientHeight;
  const geo = bubbleLayout(visible, W, H, W * .5, H * .5); const cx = geo.__core.x, cy = geo.__core.y;
  const par = stage.querySelector('.parallax'); const layer = stage.querySelector('.stage-layer'); const svg = stage.querySelector('.stage-links');
  const still = reduceMotion(); const fine = window.matchMedia('(pointer: fine)').matches;
  const max = Math.max(1, ...visible.map((d) => d.days));
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  const edges = [];
  for (let i = 0; i < visible.length; i++) for (let j = i + 1; j < visible.length; j++) {
    const ids = new Set(visible[i].evidence.map((l) => l.id));
    if (visible[j].evidence.some((l) => ids.has(l.id))) edges.push([visible[i].id, visible[j].id]);
  }
  svg.innerHTML = `<defs><radialGradient id="corehalo"><stop offset="0" style="stop-color:var(--light-2)" stop-opacity=".55"/><stop offset="1" style="stop-color:var(--ember)" stop-opacity="0"/></radialGradient></defs>`
    + visible.map((d) => { const g = geo[d.id]; return `<path class="orbit" d="${wobble(`orbit-${d.key}`, cx, cy, Math.hypot(g.x - cx, g.y - cy), .012, 18)}"/>`; }).join('')
    + edges.map(([a, b]) => `<line class="share" data-e="${a}|${b}"/>`).join('')
    + visible.map((d) => `<line class="spoke" data-s="${d.id}" style="--w:${(.9 + 2.4 * d.days / max).toFixed(2)}"/>`).join('');
  const core = document.createElement('div'); core.className = 'core'; core.setAttribute('aria-hidden', 'true');
  core.style.left = `${cx}px`; core.style.top = `${cy}px`;
  core.innerHTML = '<span class="core-light"></span><span class="core-label">you</span>';
  layer.appendChild(core);
  for (const d of visible) {
    const g = geo[d.id]; const fs = Math.max(13, Math.min(26, g.size / 7.6));
    const b = document.createElement('button'); b.type = 'button';
    b.className = `bubble is-${d.status} ${identFocus === d.id ? 'is-focused' : ''}`; b.dataset.bubble = d.id;
    b.style.width = b.style.height = `${g.size}px`; b.tabIndex = identVeiled ? -1 : 0;
    b.setAttribute('aria-label', `${d.name}, ${d.status === 'confirmed' ? 'confirmed' : 'suggested'}, ${plural(d.days, 'night')}`);
    b.innerHTML = orbMarkup(d, fs);
    layer.appendChild(b); d.el = b;
    b.addEventListener('pointerenter', () => hover(d.id)); b.addEventListener('pointerleave', () => hover(null));
    b.addEventListener('focus', () => hover(d.id)); b.addEventListener('blur', () => hover(null));
  }
  // the selected direction's letters circle it as small stars you can open
  const f = visible.find((d) => d.id === identFocus);
  const sats = f ? f.evidence.slice(0, 9).map((l, i, arr) => {
    const s = document.createElement('button'); s.type = 'button'; s.className = 'sat'; s.dataset.open = l.id; s.dataset.tip = `${fmtDay(l.date)}: ${l.content.headline}`;
    s.setAttribute('aria-label', `Open the letter from ${fmtDay(l.date)}: ${l.content.headline}`); s.style.setProperty('--i', i);
    s.innerHTML = `<svg viewBox="-10 -10 20 20" aria-hidden="true"><path d="${sparkle(l.id, 7)}"/></svg>`;
    layer.appendChild(s); return { el: s, a0: (i / arr.length) * Math.PI * 2 };
  }) : [];
  // other ways in: hovering a row in the list lights its circle on the map
  document.querySelectorAll('.dir-list [data-bubble]').forEach((el) => {
    el.addEventListener('pointerenter', () => hover(el.dataset.bubble)); el.addEventListener('pointerleave', () => hover(null));
  });
  const spokes = [...svg.querySelectorAll('.spoke')]; const shares = [...svg.querySelectorAll('.share')];
  function hover(id) {
    identHover = id;
    stage.classList.toggle('has-hover', !!id);
    for (const d of visible) d.el.classList.toggle('is-hover', d.id === id);
    spokes.forEach((ln) => ln.classList.toggle('is-active', ln.dataset.s === id || ln.dataset.s === identFocus));
    shares.forEach((ln) => { const [a, b] = ln.dataset.e.split('|'); ln.classList.toggle('is-active', [a, b].includes(id) || [a, b].includes(identFocus)); });
  }
  hover(null);
  // starfield behind, on its own canvas
  const sky = stage.querySelector('.stage-sky'); const dpr = Math.min(2, window.devicePixelRatio || 1);
  sky.width = W * dpr; sky.height = H * dpr; const g2 = sky.getContext('2d'); g2.setTransform(dpr, 0, 0, dpr, 0, 0);
  const rs = seeded('ident-sky'); const stars = Array.from({ length: Math.round((W * H) / 3800) }, () => ({ x: rs() * W, y: rs() * H, r: .4 + rs() * 1.3, a: .25 + rs() * .6, p: 1800 + rs() * 4200, ph: rs() * 6.3 }));
  // parallax: the sky moves less than the map, so the map floats above it
  let tx = 0, ty = 0, px = 0, py = 0;
  stage.onpointermove = fine && !still ? (e) => { const r = stage.getBoundingClientRect(); tx = (e.clientX - r.left) / r.width - .5; ty = (e.clientY - r.top) / r.height - .5; } : null;
  stage.onpointerleave = () => { tx = 0; ty = 0; };
  const ease = (k) => 1 - (1 - k) ** 3; const clamp = (k) => Math.max(0, Math.min(1, k));
  const pos = (id, t) => { const g = geo[id]; if (still) return g; const w = (t / g.period) * Math.PI * 2 + g.phase; return { x: g.x + Math.sin(w) * g.amp, y: g.y + Math.cos(w * .8) * g.ampY }; };
  const starFill = `rgb(${tone('star-rgb')})`;
  const frame = (t) => {
    if (!document.body.contains(stage)) return;
    px += (tx - px) * .06; py += (ty - py) * .06;
    par.style.transform = `translate3d(${(-px * 22).toFixed(2)}px, ${(-py * 16).toFixed(2)}px, 0)`;
    sky.style.transform = `translate3d(${(-px * 8).toFixed(2)}px, ${(-py * 6).toFixed(2)}px, 0) scale(1.04)`;
    g2.clearRect(0, 0, W, H);
    for (const s of stars) { g2.globalAlpha = still ? s.a : s.a * (.55 + .45 * Math.sin(t / s.p + s.ph)); g2.fillStyle = starFill; g2.beginPath(); g2.arc(s.x, s.y, s.r, 0, 6.283); g2.fill(); }
    g2.globalAlpha = 1;
    const since = identRevealAt && !still ? performance.now() - identRevealAt : Infinity;
    const cur = {};
    visible.forEach((d, i) => {
      const k = ease(clamp((since - 200 - i * 150) / 950)); const p = pos(d.id, t); const g = geo[d.id];
      const x = cx + (p.x - cx) * k, y = cy + (p.y - cy) * k; const s = .25 + .75 * k;
      cur[d.id] = { x, y, r: (g.size / 2) * s, k };
      d.el.style.transform = `translate3d(${(x - g.size / 2).toFixed(1)}px, ${(y - g.size / 2).toFixed(1)}px, 0) scale(${s.toFixed(3)})`;
      d.el.style.opacity = k.toFixed(3);
    });
    spokes.forEach((ln) => {
      const c = cur[ln.dataset.s]; const dx = c.x - cx, dy = c.y - cy, len = Math.hypot(dx, dy) || 1; const r0 = 30, r1 = c.r + 4;
      ln.style.visibility = len > r0 + r1 ? 'visible' : 'hidden'; ln.style.opacity = c.k.toFixed(3);
      ln.setAttribute('x1', cx + (dx / len) * r0); ln.setAttribute('y1', cy + (dy / len) * r0); ln.setAttribute('x2', c.x - (dx / len) * r1); ln.setAttribute('y2', c.y - (dy / len) * r1);
    });
    shares.forEach((ln) => {
      const [a, b] = ln.dataset.e.split('|'); const pa = cur[a], pb = cur[b]; const dx = pb.x - pa.x, dy = pb.y - pa.y, len = Math.hypot(dx, dy) || 1;
      ln.style.visibility = len > pa.r + pb.r + 8 ? 'visible' : 'hidden'; ln.style.opacity = Math.min(pa.k, pb.k).toFixed(3);
      ln.setAttribute('x1', pa.x + (dx / len) * (pa.r + 4)); ln.setAttribute('y1', pa.y + (dy / len) * (pa.r + 4)); ln.setAttribute('x2', pb.x - (dx / len) * (pb.r + 4)); ln.setAttribute('y2', pb.y - (dy / len) * (pb.r + 4));
    });
    if (f) { const c = cur[f.id]; const R = c.r + 24; sats.forEach((s, i) => { const a = s.a0 + (still ? 0 : t / 14000 * Math.PI * 2); s.el.style.transform = `translate3d(${(c.x + Math.cos(a) * R - 11).toFixed(1)}px, ${(c.y + Math.sin(a) * R * .92 - 11).toFixed(1)}px, 0)`; }); }
    if (!still) identRaf = requestAnimationFrame(frame);
  };
  identRaf = requestAnimationFrame(frame);
}
/* ----- memories and shared helpers ----- */
let confirmDelete = false; let memEditing = null; let confirmAccount = false; let freshFor = null;
function memRow(m) {
  const src = m.kind === 'told' ? 'You told Beyond' : m.letterIds.map((id) => findLetter(id)).filter(Boolean).map((l) => `<button class="link" data-open="${l.id}">${fmtDay(l.date)}</button>`).join(', ') || 'From a letter';
  if (memEditing === m.id) return `<li class="mem"><form class="mem-edit" data-memform="${m.id}"><label class="sr-only" for="mem-${m.id}">Edit memory</label><input id="mem-${m.id}" class="login-in" value="${esc(m.text)}" maxlength="140"><button class="btn sm amber" type="submit">Save</button><button class="link" type="button" data-memcancel>Cancel</button></form></li>`;
  return `<li class="mem ${memoryInUse(m) && !S.memoryPaused ? '' : 'is-off'}"><p>${esc(m.text)}</p>
    <span class="fine">${m.kind === 'told' ? src : `Learned from ${src}`}${m.sample ? ', sample' : ''}${!memoryInUse(m) ? '. Not used: its letter is kept out of Growth' : ''}</span>
    <span class="mem-acts">${m.sample ? '' : `<button class="link" data-memedit="${m.id}">Edit</button>`}<button class="link" data-memforget="${m.id}">Forget</button></span></li>`;
}
/* ----- all letters: by month, searchable, filterable ----- */
const arch = { q: '', month: '', theme: '', gold: false };
const escRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const searchTerms = (q) => [...new Set(String(q || '').trim().split(/\s+/).filter(Boolean))].slice(0, 8);
const termRe = (terms) => new RegExp(terms.map(escRe).sort((a, b) => b.length - a.length).join('|'), 'giu');
/* Escape first, then mark every match: case-insensitive, any language. */
function hl(text, terms) {
  const t = String(text ?? '');
  if (!terms.length) return esc(t);
  let out = ''; let last = 0;
  for (const m of t.matchAll(termRe(terms))) { if (!m[0]) continue; out += esc(t.slice(last, m.index)) + `<mark>${esc(m[0])}</mark>`; last = m.index + m[0].length; }
  return out + esc(t.slice(last));
}
function snippetOf(text, terms, n = 150) {
  const t = norm(text); const m = termRe(terms).exec(t); if (!m) return null;
  let from = Math.max(0, m.index - Math.floor((n - m[0].length) / 2)); let to = Math.min(t.length, from + n);
  // start and end on a word boundary where there is one nearby (English); Chinese has none, so it cuts anywhere
  const sp = t.indexOf(' ', from); if (from > 0 && sp !== -1 && sp < m.index && sp - from < 16) from = sp + 1;
  const ep = t.lastIndexOf(' ', to); if (to < t.length && ep > m.index + m[0].length && to - ep < 16) to = ep;
  return `${from > 0 ? '…' : ''}${hl(t.slice(from, to), terms)}${to < t.length ? '…' : ''}`;
}
/* The four places a word can be: title, summary, your own words, the to-dos. */
function letterFields(l) {
  return { title: l.content.title || l.content.headline || '', summary: l.content.recap || fillName(String(l.content.body || '')), words: (l.entries || []).map((e) => entryPlain(e.text)).join('\n\n'), todos: (l.content.steps || []).map((x) => x.text) };
}
function searchLetters(list, terms) {
  if (!terms.length) return list.map((l) => ({ l, hits: 0 }));
  const out = [];
  for (const l of list) {
    const f = letterFields(l); const hay = [f.title, f.summary, f.words, ...f.todos];
    if (!terms.every((t) => { const re = new RegExp(escRe(t), 'iu'); return hay.some((h) => re.test(h)); })) continue;
    const re = termRe(terms); let hits = 0; for (const h of hay) hits += (h.match(re) || []).length;
    out.push({ l, hits });
  }
  return out;
}
function archiveMatches() {
  const ready = allLetters().filter(delivered);
  const terms = searchTerms(arch.q);
  const filtered = ready.filter((l) => (!arch.month || l.date.startsWith(arch.month)) && (!arch.theme || (l.content.themes || []).includes(arch.theme)) && (!arch.gold || progress(l).complete));
  return { ready, terms, found: searchLetters(filtered, terms) };
}
function archiveCount() {
  const { ready, terms, found } = archiveMatches();
  const n = found.length; const hits = found.reduce((a, x) => a + x.hits, 0);
  const filtered = arch.month || arch.theme || arch.gold;
  if (terms.length) return `${n === 1 ? '1 letter matches' : `${n} letters match`} “${esc(arch.q.trim())}”${n ? `, ${plural(hits, 'mention')}` : ''}${filtered ? ' with these filters' : ''}.`;
  return filtered ? `${plural(n, 'letter')} of ${ready.length}.` : ''; // the header already says how many
}
function archiveResults() {
  const { ready, terms, found } = archiveMatches();
  if (!ready.length) return '<p class="fine">Your letters will collect here, month by month.</p>';
  if (!found.length) return `<p class="lead">Nothing matches${terms.length ? ` “${esc(arch.q.trim())}”` : ''}.</p><p class="fine">Try fewer words, another spelling, or <button class="link" data-act="arch-clear">clear the search and filters</button>.</p>`;
  const groups = {};
  for (const x of found) (groups[x.l.date.slice(0, 7)] = groups[x.l.date.slice(0, 7)] || []).push(x);
  const LABEL = { summary: 'Summary', words: 'Your words', todos: 'To-do' };
  return Object.entries(groups).map(([m, xs]) => `<section class="month-group" aria-labelledby="mg-${m}"><h2 class="lp-month" id="mg-${m}"><span>${MONTH[+m.slice(5) - 1]} ${m.slice(0, 4)}</span><small>${plural(xs.length, 'letter')}</small></h2>
    <ul class="lc-list">${xs.map(({ l }) => {
      if (!terms.length) return letterCard(l);
      const f = letterFields(l); let snip = '';
      for (const k of ['summary', 'words', 'todos']) {
        const hit = k === 'todos' ? f.todos.find((t) => termRe(terms).test(t)) : f[k];
        const sn = hit && snippetOf(hit, terms); if (sn) { snip = `<em>${LABEL[k]}</em> ${sn}`; break; }
      }
      return letterCard(l, { head: hl(f.title, terms), snip });
    }).join('')}</ul></section>`).join('');
}
function archive() {
  const ready = allLetters().filter(delivered);
  const months = [...new Set(ready.map((l) => l.date.slice(0, 7)))];
  const themes = [...new Set(ready.flatMap((l) => (l.content.themes || []).filter((t) => THEMES[t] && t !== 'ordinary')))].sort((a, b) => THEMES[a].localeCompare(THEMES[b]));
  if (arch.month && !months.includes(arch.month)) arch.month = '';
  if (arch.theme && !themes.includes(arch.theme)) arch.theme = '';
  return `<div class="arch-controls">
      <label class="search" for="arch-q">${I.search}<span class="sr-only">Search your letters</span><input id="arch-q" type="search" value="${esc(arch.q)}" placeholder="Search titles, summaries, your words and to-dos" autocomplete="off" spellcheck="false"></label>
      <div class="arch-filters" role="group" aria-label="Filters">
        <label class="chip-pick ${arch.month ? 'is-on' : ''}" for="arch-month"><span>Month</span><select id="arch-month"><option value="">All</option>${months.map((m) => `<option value="${m}" ${arch.month === m ? 'selected' : ''}>${MONTH[+m.slice(5) - 1]} ${m.slice(0, 4)}</option>`).join('')}</select></label>
        <label class="chip-pick ${arch.theme ? 'is-on' : ''}" for="arch-theme"><span>Theme</span><select id="arch-theme"><option value="">All</option>${themes.map((t) => `<option value="${t}" ${arch.theme === t ? 'selected' : ''}>${esc(cap(THEMES[t]))}</option>`).join('')}</select></label>
        <button class="filter-seal chip" data-act="arch-gold" aria-pressed="${arch.gold}">${goldSeal(18)}<span>Gold seal only</span></button>
      </div>
      <p class="arch-count" id="arch-count" aria-live="polite">${archiveCount()}</p>
    </div>
    <div id="arch-results">${archiveResults()}</div>`;
}
function refreshArchive() {
  const r = $('#arch-results'); const c = $('#arch-count'); if (!r || !c) return;
  r.innerHTML = archiveResults(); c.innerHTML = archiveCount();
  r.classList.remove('is-fresh'); void r.offsetWidth; r.classList.add('is-fresh');
  const g = $('[data-act="arch-gold"]'); if (g) g.setAttribute('aria-pressed', String(arch.gold));
}

/* ----- settings ----- */
function vSettings() {
  const own = S.letters.length; const mems = allMemories();
  return `<header class="page-head">
      <h1 class="display">Settings</h1>
      <p class="lead">How your letters are written, what Beyond remembers, your data, and where to find help.</p>
    </header>
    <section class="spread" id="mode"><h2 class="sec">Mode</h2><div class="stack">
      <button class="toggle" role="switch" aria-checked="${demoOn()}" data-act="toggle-sample"><span class="track"></span><span>Demo mode: Kit’s sample letters next to yours</span></button>
      <p class="fine">Beyond starts in Demo mode, for showing it to others such as judges. Kit is fictional; the sample letters show what months of Beyond look like. A night you seal is saved to your account and its letter is written by the AI, in both modes. Turn Demo mode off for Normal mode, just your own journal.</p>
    </div></section>
    <section class="spread" id="look"><h2 class="sec">Colours</h2><div class="stack">
      <div class="jthemes" role="group" aria-label="Colour theme">${JOURNAL_THEMES.map((t) => `<button class="jtheme" data-jtheme-pick="${t.id}" aria-pressed="${journalTheme() === t.id}" aria-label="${t.name}" title="${t.note}"><span class="jtheme-dot" style="--sw:${themeSwatch(t.bands)}" aria-hidden="true"></span><span class="jtheme-name">${t.name}</span></button>`).join('')}</div>
      <p class="fine">Only changes how Beyond looks on this device.</p>
    </div></section>
    <section class="spread" id="letters-settings"><h2 class="sec">Letters</h2><div class="stack">
      <h3 class="qh">Who writes your letters</h3>
      <div class="voices" role="group" aria-label="Letter voice">${voiceCards()}</div>
      <p class="fine">Applies to your next letter. The voice changes tone only, never the facts.</p>
      ${welcomeSupported ? `<h3 class="qh">What your letters call you</h3>
      <div class="row"><label class="sr-only" for="lname">What your letters call you</label><input id="lname" class="login-in" maxlength="${LETTER_NAME_MAX}" placeholder="Your name or a nickname (optional)" value="${esc(S.letterName || '')}" autocomplete="nickname"></div>
      <p class="fine">Beyond adds this to your letters itself. The letter writer never sees it.</p>` : ''}
      <h3 class="qh">When they arrive</h3>
      <div class="row"><label class="pick" for="dtime"><span>Arrives at</span><select id="dtime">${timeOptions(deliverTime())}</select></label></div>
      <button class="toggle" role="switch" aria-checked="${S.allowEarly !== false}" data-act="toggle-early"><span class="track"></span><span>Let me open a letter right away (“Read it now”)</span></button>
      <p class="fine">Beyond is built around sleeping on it, but it’s your letter. Turn this off if you’d rather not be tempted.</p>
      <h3 class="qh">Language</h3>
      <div class="row"><label class="pick" for="ylang"><span>Write letters in</span><select id="ylang">${LANGS.map(([k, l]) => `<option value="${k}" ${(S.lang || 'auto') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <p class="fine">Auto writes back in the language you wrote in. Your own words are always quoted exactly as you wrote them.</p>
      <div class="row"><label class="pick" for="slang"><span>When I talk</span><select id="slang">${speechOptions()}</select></label></div>
      <p class="fine">${mixedOK() ? 'Auto understands any mix of 粵語, 普通话 and English. Beyond records, turns it into text, then deletes the audio.' : SR ? 'Your browser turns your voice into text (Chrome uses Google’s speech service, Safari uses Apple’s), one language at a time. Beyond keeps only the words.' : 'This browser can’t turn speech into text. Use Chrome, Edge or Safari, or your device’s dictation.'}</p>
    </div></section>
    <section class="spread" id="memory"><h2 class="sec">Memory and privacy</h2><div class="stack">
      <h3 class="qh">What Beyond remembers</h3>
      <p class="fine">What your letters may remember about you. Each one shows where it came from. Edit or forget anything, any time.</p>
      ${mems.length ? `<ul class="mem-list">${mems.map(memRow).join('')}</ul>` : '<p class="fine">Nothing yet. Beyond learns at most two small things from a letter, and only things you wrote.</p>'}
      <form class="mem-add" id="mem-add"><label class="sr-only" for="mem-new">Tell Beyond something to remember</label><input id="mem-new" class="login-in" placeholder="Tell Beyond something to remember…" maxlength="140"><button class="btn sm amber" type="submit">Remember</button></form>
      <button class="toggle" role="switch" aria-checked="${!!S.memoryPaused}" data-act="mem-pause"><span class="track"></span><span>Pause memory (letters won’t use it)</span></button>
      <h3 class="qh">What the AI sees</h3>
      <p>${claudeState === 'checking' ? 'Connecting…' : claudeState === 'ready' ? `Letters are written by ${esc(aiLabel)} through Beyond’s letter service, after you seal a night.` : 'Beyond’s letter writer isn’t switched on yet. Sealed nights wait safely and are written as soon as it is.'}</p>
      <p class="fine">The AI sees only the entry it writes about, the headlines of a few earlier letters, and your memories (unless paused). It never sees letters you keep out of Growth.</p>
    </div></section>
    <section class="spread" id="data"><h2 class="sec">Your data</h2><div class="stack">
      <p>Saved to your Beyond account, private to you. Nothing you write is kept in this browser.</p>
      ${freshFor ? `<form class="mem-add" id="reauth-form"><label class="sr-only" for="reauth-pw">Password</label><input id="reauth-pw" class="login-in" type="password" autocomplete="current-password" placeholder="Your password" required><button class="btn sm amber" type="submit">Confirm it’s you</button><button class="link" type="button" data-act="reauth-google">Use Google</button></form><p class="fine">For your safety, downloading or deleting needs a fresh sign-in.</p>` : ''}
      <p><button class="link" data-act="export">Download a copy</button> <span class="fine">as a JSON file of everything in your account.</span></p>
      ${confirmDelete ? `<div class="notice warn"><b>Delete ${plural(own, 'letter')}, your memories and everything you wrote?</b><span>This can't be undone. Download a copy first if you might want it. Your account stays, empty.</span><div class="row"><button class="btn sm danger" data-act="delete-yes">Delete everything</button><button class="link" data-act="delete-no">Keep it</button></div></div>`
        : `<p><button class="link danger" data-act="delete">Delete my journal</button></p>`}
      ${!ACCOUNT.deletion ? '' : confirmAccount ? `<div class="notice warn"><b>Delete your Beyond account?</b><span>Your account and everything in it are removed for good within a few minutes. This can't be undone.</span><div class="row"><button class="btn sm danger" data-act="delete-account-yes">Delete my account</button><button class="link" data-act="delete-account-no">Keep it</button></div></div>`
        : `<p><button class="link danger" data-act="delete-account">Delete my account</button></p>`}
    </div></section>
    <section class="spread" id="help"><h2 class="sec">Need help?</h2><div class="stack">
      <p>Beyond is a journal, not a crisis service. If you’re struggling or in danger, people can help right now, free and confidential.</p>
      <ul class="help-list">${SUPPORT.slice(0, 3).map(helpRow).join('')}</ul>
      <p><button class="link" data-go="support">All human support in Hong Kong</button></p>
    </div></section>
    <section class="spread" id="account"><h2 class="sec">Account</h2><div class="stack">
      ${AUTH.user?.email ? `<p>Signed in as <b>${esc(AUTH.user.email)}</b>.</p>` : ''}
      ${AUTH.auth ? '<p><button class="btn sm" data-act="logout">Sign out</button></p>' : ''}
    </div></section>`;
}
const helpRow = (s) => `<li class="help"><b>${esc(s.phone || s.url.replace('https://', ''))}</b><span>${esc(s.name)}. ${esc(s.note)}</span>${s.url ? `<a class="link" href="${s.url}" target="_blank" rel="noreferrer">Open</a>` : `<button class="link" data-copy="${esc(s.phone)}">Copy</button>`}</li>`;
/* ----- sign in: Beyond accounts (email and password, or Google) ----- */
let loginMode = 'signin'; let loginNote = '';
function vLogin() {
  after.push(() => ($('#password-new') || $('#email'))?.focus());
  const m = loginMode;
  const title = { signin: 'Write tonight. A letter by morning.', signup: 'Start your journal.', forgot: 'Reset your password.', reset: 'Choose a new password.', sent: 'Check your email.' }[m];
  const google = m === 'signin' || m === 'signup' ? `<button class="link" type="button" data-act="google">Continue with Google</button>` : '';
  const fields = m === 'reset'
    ? `<label for="password-new" class="sr-only">New password</label><input id="password-new" class="login-in" type="password" autocomplete="new-password" placeholder="New password (8+ characters)" minlength="8" required>`
    : m === 'sent' ? ''
    : `<label for="email" class="sr-only">Email</label><input id="email" class="login-in" type="email" autocomplete="email" placeholder="Email" required>${m === 'forgot' ? '' : `<label for="password" class="sr-only">Password</label><input id="password" class="login-in" type="password" autocomplete="${m === 'signup' ? 'new-password' : 'current-password'}" placeholder="${m === 'signup' ? 'Password (8+ characters)' : 'Password'}" minlength="${m === 'signup' ? 8 : 1}" required>`}`;
  const submit = { signin: 'Sign in', signup: 'Create account', forgot: 'Send reset link', reset: 'Save password' }[m];
  const switches = {
    signin: `<button class="link" data-login="signup">New here? Create an account</button><span class="sp"></span><button class="link" data-login="forgot">Forgot password?</button>`,
    signup: `<button class="link" data-login="signin">Already have an account? Sign in</button>`,
    forgot: `<button class="link" data-login="signin">Back to sign in</button>`,
    reset: '',
    sent: `<button class="link" data-login="signin">Back to sign in</button>`,
  }[m];
  return `<section class="welcome login">
      <div class="lantern-wrap" style="--k:.85;--b:1.05" aria-hidden="true"><div class="lantern"></div></div>
      <p class="brand-line">${I.moon}<span>Beyond</span></p>
      <h1 class="display">${title}</h1>
      ${demoOn() && m === 'signin' ? `<p class="mode-note">You’re in <b>Demo mode</b>: after signing in you’ll see Kit’s fictional letters next to yours. To use Beyond just for yourself, switch to Normal mode in Settings.</p>` : ''}
      ${m === 'sent' ? `<p class="lead" style="max-width:36ch">${esc(loginNote)}</p>` : `<form class="login-form" id="login-form">${fields}<button class="btn amber" type="submit">${submit}</button>${google}</form>
      <p class="fine" id="login-err" role="alert">${esc(loginNote)}</p>`}
      <p class="fine">${switches}</p>
      <p class="fine">${backend.configured ? 'Your journal is private to your account. Nothing you write is kept in this browser.' : 'This copy of Beyond isn’t connected to its backend yet.'}</p>
      <p class="fine"><a class="link" href="/">About Beyond</a><span class="sp"></span><a class="link" href="/#/privacy">Privacy</a></p>
    </section>`;
}
async function exportJournal() {
  try {
    toast('Preparing your copy…');
    const data = JSON.stringify(await backend.exportAll(), null, 1);
    const filename = `beyond-journal-${journalDate()}.json`;
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000); toast('Saved a copy of your journal.');
  } catch (e) { needFreshSignIn(e, 'export'); }
}
function vSupport() {
  return `<header class="page-head"><button class="link back" data-back>${I.left}Back</button><h1 class="display">Talk to someone tonight.</h1>
      <p class="lead">Beyond isn't watched by a person and can't respond in an emergency. A morning letter is never emergency help. These people in Hong Kong can help right now, free and confidential.</p></header>
    <ul class="help-list">${SUPPORT.map(helpRow).join('')}</ul>
    <p class="fine">Checked on 8 Oct 2026 against Mind HK's “Find help now” page. Outside Hong Kong, call your local emergency number.</p>`;
}

/* ---------- toast ---------- */
function toastUndo(msg, undo) {
  const t = document.createElement('div'); t.className = 'toast toast-undo'; t.setAttribute('role', 'status');
  t.innerHTML = `<span>${esc(msg)}</span><button class="link">Undo</button>`;
  t.querySelector('button').addEventListener('click', () => { undo(); t.remove(); });
  $('#layer').appendChild(t); setTimeout(() => t.remove(), 5000);
}
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; $('#layer').appendChild(t); setTimeout(() => t.remove(), 2600); }

/* ---------- events ---------- */
document.addEventListener('click', async (ev) => {
  const star = ev.target.closest('[data-star]');
  if (star) return go('letter', star.dataset.star);
  const el = ev.target.closest('button, a, [data-close], [data-gdot], [data-open]');
  if (!el) { if (route === 'growth' && pTip && !ev.target.closest('.ns-tip')) { pTip = null; drawSky(); } return; }
  const d = el.dataset;
  if (d.close !== undefined) return closeSheet();
  if (d.stepDone || d.stepSkip) {
    const L = findLetter(d.stepDone || d.stepSkip); if (!L) return;
    const actions = { ...(L.actions || {}) }; const was = progress(L).complete;
    const want = d.stepDone ? 'tried' : 'skipped';
    if (actions['step.0'] === want) delete actions['step.0']; else actions['step.0'] = want;
    patchLetter(L.id, { actions });
    const now = progress({ ...L, actions }).complete;
    render();
    if (now && !was) { toast('Small steps, actually taken. This letter now has a gold seal.'); $('.lt-seal')?.classList.add('is-new'); }
    return;
  }
  if (d.check !== undefined) {
    const L = findLetter(sheetId); const k = `step.${d.check}`; const actions = { ...(L.actions || {}) };
    const before = progress(L).complete;
    if (actions[k] === 'tried') delete actions[k]; else actions[k] = 'tried';
    patchLetter(L.id, { actions });
    const nowDone = progress({ ...L, actions }).complete;
    return drawSheet({ burst: actions[k] === 'tried' ? +d.check : null, celebrate: nowDone && !before });
  }
  if (d.skip !== undefined) {
    const L = findLetter(sheetId); const k = `step.${d.skip}`; const actions = { ...(L.actions || {}) };
    const before = progress(L).complete;
    if (actions[k] === 'skipped') delete actions[k]; else actions[k] = 'skipped';
    patchLetter(L.id, { actions });
    return drawSheet({ celebrate: progress({ ...L, actions }).complete && !before });
  }
  if (d.todo) return openSheet(d.todo);
  if (d.go) { go(d.go); if (d.to) $(`#${d.to}`)?.scrollIntoView({ block: 'start' }); return; }
  if (d.open) { pTip = null; letterFromDir = d.fromDir || null; letterFromBook = d.fromBook || null; return go('letter', d.open); }
  if (d.bk) return flipBook(d.bk);
  if (d.bkDay) { const sheet = $('.bk-sheet'); flipBook(d.bkDay); if (sheet) closeCalSheet(); return; }
  if (d.bkMonth) { const [y, m] = (BK.month || journalDate().slice(0, 7)).split('-').map(Number); const t = new Date(y, m - 1 + Number(d.bkMonth), 1); BK.month = `${t.getFullYear()}-${pad(t.getMonth() + 1)}`; const box = el.closest('.bk-cal'); paintNav(); box?.querySelector(`.bk-mo[data-bk-month="${d.bkMonth}"]:not([disabled])`)?.focus(); return; }
  if (d.bkCal !== undefined) return openCalSheet();
  if (d.bkSheetClose !== undefined) return closeCalSheet();
  if (d.bookDay) { BK.at = d.bookDay; BK.month = null; return go('tonight', null, { keepBook: true }); }
  // a letter opened from the book goes back to that page
  if (d.letterBackBook) { BK.at = d.letterBackBook; if (location.hash.startsWith('#letter')) { try { return history.back(); } catch (e) { /* fall through */ } } return go('tonight', null, { keepBook: true }); }
  // the letter was opened from that direction page in this visit, so step back to it rather than stacking another entry
  if (d.letterBackDir) { if (location.hash.startsWith('#letter')) { try { return history.back(); } catch (e) { /* fall through */ } } return go('identity', d.letterBackDir); }
  if (d.back !== undefined) { if (history.length > 1) history.back(); else go('settings'); return; }
  if (d.imode) { if (voice.state === 'rec') stopRecording(); if (voice.state === 'dictate') voice.state = 'idle'; S.inputMode = d.imode; save(); return render(); }
  if (d.memedit) { memEditing = d.memedit; return render(); }
  if (d.memcancel !== undefined) { memEditing = null; return render(); }
  if (d.memforget) {
    const m = allMemories().find((x) => x.id === d.memforget); if (!m) return;
    if (m.sample) S.hiddenSampleMem = [...(S.hiddenSampleMem || []), m.id];
    else return forgetMemory(m);
    save(); toast('Forgotten.'); return render();
  }
  if (d.slang) {
    S.speechLang = d.slang; save(); paintVoice();
    if (voice.state === 'rec') { voice.relisten = true; stopRecording(); }
    return;
  }
  if (d.lang) { S.lang = d.lang; save(); document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === S.lang))); return; }
  if (d.voice) { S.voice = d.voice; save(); document.querySelectorAll('[data-voice]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.voice === S.voice))); if (route === 'settings') toast(`Your next letter comes from your ${VOICES[S.voice].name}`); return; }
  if (d.month !== undefined) { if (!d.month) return; pMonth = d.month; gSel = null; return render(); }
  if (d.theme) { if (param === 'year') yTheme = yTheme === d.theme ? null : d.theme; else pTheme = pTheme === d.theme ? null : d.theme; pTip = null; return render(); }
  if (d.ptab) { pTip = null; gSel = null; return go('growth', d.ptab === 'month' ? null : d.ptab); }
  if (d.film) { pMonth = d.film; gSel = null; return go('growth'); }
  if (d.gyear !== undefined) { if (!d.gyear) return; gYear = d.gyear; gSel = null; return render(); }
  if (d.gtheme) { arch.theme = d.gtheme; arch.q = ''; arch.month = ''; return go('letters'); }
  if (d.gcompass) { gSel = gSel?.kind === 'compass' && gSel.key === d.gcompass ? null : { kind: 'compass', key: d.gcompass }; return render(); }
  if (d.gdot) { gSel = gSel?.kind === 'dot' && gSel.key === d.gdot ? null : { kind: 'dot', key: d.gdot }; return render(); }
  if (d.trySkip) { const L = findLetter(d.trySkip); if (!L) return; patchLetter(L.id, { actions: { ...(L.actions || {}), 'step.0': 'skipped' } }); toast('Not for me. Future letters will suggest something different.'); return render(); }
  if (d.bubble) return openDirection(d.bubble);
  if (d.dir) { S.dirs = { ...(S.dirs || {}), [d.dir]: d.st }; save(); const name = DIRECTIONS.find((x) => x.key === d.dir)?.name; toast({ confirmed: `${name} is now on your map.`, dismissed: 'Dismissed. It won’t be suggested again unless you restore it.', removed: 'Removed from your map.', suggested: 'Restored to suggestions.' }[d.st]); if (d.st !== 'confirmed') identFocus = null; return render(); }
  if (d.q !== undefined) {
    const det = $('details.words-d'); if (det) det.open = true;
    const m = $(`#q-${d.q}`); if (m) { m.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' }); m.classList.add('is-flash'); setTimeout(() => m.classList.remove('is-flash'), 1600); } return;
  }
  if (d.private) { const L = findLetter(d.private); const next = !L.private; patchLetter(L.id, { private: next }); toast(next ? 'Kept out of Growth. The letter stays here.' : 'This night is back in Growth.'); return render(); }
  if (d.onbReason) {
    const k = d.onbReason; if (W.reasons.has(k)) W.reasons.delete(k); else W.reasons.add(k);
    el.setAttribute('aria-checked', String(W.reasons.has(k)));
    if (k === 'other') { const box = $('.onb-other'); if (box) { box.hidden = !W.reasons.has('other'); if (!box.hidden) $('#onb-other')?.focus(); } }
    return paintWelcome();
  }
  if (d.onbVoice) {
    W.voice = d.onbVoice; S.voice = d.onbVoice; save(); // the same letter-voice setting Settings shows
    document.querySelectorAll('[data-onb-voice]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.onbVoice === W.voice)));
    return paintWelcome();
  }
  if (d.dirBack !== undefined) return closeDirection();
  if (d.dirAll !== undefined) { dirShowAll = true; return render(); }
  if (d.dirChange !== undefined) { dirChanging = true; return render(); }
  if (d.dirUnsure) { const k = d.dirUnsure; S.dirs = { ...(S.dirs || {}) }; S.dirs[k] = 'suggested'; save(); dirChanging = false; return render(); }
  if (d.dirFit) {
    S.dirs = { ...(S.dirs || {}), [d.dirFit]: 'confirmed' }; save(); dirChanging = false; render();
    $('.dir-bubble')?.classList.add('is-confirming');
    return;
  }
  if (d.dirPop) {
    const k = d.dirPop; const before = (S.dirs || {})[k]; const name = DIRECTIONS.find((x) => x.key === k)?.name || '';
    const head = $('.dir-bubble'); el.disabled = true;
    if (head && !reduceMotion()) { head.classList.add('is-popping'); await sleep(480); }
    S.dirs = { ...(S.dirs || {}), [k]: 'dismissed' }; save(); dirChanging = false;
    go('identity', null);
    toastUndo(`Popped ${name}.`, () => { S.dirs = { ...(S.dirs || {}) }; if (before === undefined) delete S.dirs[k]; else S.dirs[k] = before; save(); if (route === 'identity') render(); });
    return;
  }
  if (d.jthemePick) { setJournalTheme(d.jthemePick); return render(); }
  if (d.presentOpen) return closePresent(d.presentOpen);
  if (d.presentLater !== undefined) return closePresent();
  if (d.openenv) { el.disabled = true; return openEnvelope($('#env'), d.openenv); }
  if (d.retry) { writeLetter(d.retry); return render(); }
  if (d.login) { loginMode = d.login; loginNote = ''; return render(); }
  if (d.copy) { try { await navigator.clipboard.writeText(d.copy); toast(`Copied ${d.copy}`); } catch (e) { const r = document.createRange(); r.selectNodeContents(el.parentElement.querySelector('b')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } return; }
  switch (d.act) {
    case 'onb-next': if (!welcomeOk()) return; W.step = Math.min(3, W.step + 1); render(); window.scrollTo(0, 0); return;
    case 'onb-done': if (!welcomeOk()) return; return finishWelcome();
    case 'onb-back': W.step = Math.max(0, W.step - 1); render(); window.scrollTo(0, 0); return;
    case 'toggle-early': S.allowEarly = S.allowEarly === false; save(); toast(S.allowEarly ? '“Read it now” is on.' : 'Letters will wait for the morning.'); return render();
    case 'mem-pause': S.memoryPaused = !S.memoryPaused; save(); toast(S.memoryPaused ? 'Memory paused. Letters won’t use it.' : 'Memory is on again.'); return render();
    case 'export': return exportJournal();
    case 'logout': return signOut();
    case 'google': try { el.disabled = true; await backend.google(); } catch (e) { el.disabled = false; loginNote = 'Google sign-in isn’t available right now.'; render(); } return;
    case 'reauth-google': try { await backend.google(); } catch (e) { toast('Google sign-in isn’t available right now.'); } return;
    case 'delete-account': confirmAccount = true; return render();
    case 'delete-account-no': confirmAccount = false; return render();
    case 'delete-account-yes': el.disabled = true; return deleteAccount();
    case 'ui-lang': setUiLang(uiLang() === 'zh' ? 'en' : 'zh'); return render();
    case 'own': S.mode = 'own'; save(); toast('Normal mode: just your own journal. Demo mode is in Settings.'); pMonth = null; return render();
    case 'arch-gold': arch.gold = !arch.gold; return refreshArchive();
    case 'arch-clear': Object.assign(arch, { q: '', month: '', theme: '', gold: false }); return render();
    case 'toggle-sample': S.mode = S.mode === 'sample' ? 'own' : 'sample'; pMonth = null; save(); toast(demoOn() ? 'Demo mode: sample nights and Kit’s sample letters are back.' : 'Normal mode: just your own journal.'); return render();
    case 'seal': el.disabled = true; return seal();
    case 'orb': return orbTap();
    case 'skip': el.disabled = true; return skipToMorning();
    case 'reveal': identVeiled = false; identRevealAt = performance.now(); return render();
    case 'delete': confirmDelete = true; return render();
    case 'delete-no': confirmDelete = false; return render();
    case 'delete-yes': el.disabled = true; return clearJournal();
  }
});
document.addEventListener('submit', async (ev) => {
  const f = ev.target; ev.preventDefault();
  if (f.id === 'login-form') return submitLogin(f);
  if (f.id === 'reauth-form') return submitReauth(f);
  if (f.id === 'mem-add') {
    const t = clip($('#mem-new').value, 140); if (!t) return;
    return addMemory(t);
  }
  if (f.dataset.memform) {
    const t = clip(f.querySelector('input').value, 140); const m = S.memories.find((x) => x.id === f.dataset.memform);
    memEditing = null;
    if (m && t && t !== m.text) return editMemory(m, t);
    render();
  }
});
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'arch-q') { arch.q = ev.target.value; refreshArchive(); }
});
document.addEventListener('change', async (ev) => {
  const t = ev.target;
  if (t.id === 'arch-month' || t.id === 'arch-theme') { arch[t.id === 'arch-month' ? 'month' : 'theme'] = t.value; t.closest('.chip-pick')?.classList.toggle('is-on', !!t.value); refreshArchive(); }
  if (t.id === 'dtime') { S.deliverTime = t.value; save(); toast(`New letters will arrive at ${t.value}.`); }
  if (t.id === 'lname') { S.letterName = t.value.trim().slice(0, LETTER_NAME_MAX) || null; save(); toast(S.letterName ? 'Your letters will use that name.' : 'Your letters won’t use a name.'); }
  if (t.id === 'ylang') { S.lang = t.value; save(); }
  if (t.id === 'slang') { S.speechLang = t.value; save(); toast(`When you talk, Beyond listens in ${t.selectedOptions[0].textContent}.`); }
  if (t.id === 'tdtime' || t.id === 'ltime') {
    S.deliverTime = t.value; save();
    if (t.id === 'ltime') { const L = pendingNight(); if (L) patchLetter(L.id, { deliverAt: deliverAtFor(L.date) }); }
    toast(`Your letter${t.id === 'ltime' ? '' : 's'} will arrive at ${t.value}.`); if (t.id === 'ltime') render();
  }
});
document.addEventListener('keydown', (ev) => {
  const g = ev.target.closest?.('[data-star]');
  if (g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); return go('letter', g.dataset.star); }
  const dot = ev.target.closest?.('[data-gdot], .tl-star[data-open]');
  if (dot && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); dot.dispatchEvent(new MouseEvent('click', { bubbles: true })); return; }
  if (ev.key === 'Escape') { if ($('.sheet-wrap')) closeSheet(); else if (pTip) { pTip = null; drawSky(); } }
});
let rz, lastW = window.innerWidth;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (route === 'identity') { if (Math.abs(window.innerWidth - lastW) > 40) render(); } else if (route === 'growth') drawSky(); lastW = window.innerWidth; }, 150); });

/* ---------- boot ---------- */
function start() {
  if (!needsWelcome() && ['welcome', 'login'].includes(route)) route = 'identity';
  if (route === 'login') route = 'identity';
  render(); stateReady = true;
  setTimeout(presentLetters, 700);
}
/* ---------- Beyond account glue ----------
   Everything below connects the views above to your account. Journal text is
   only ever in memory here; the backend is the single source of truth. */
let synced = null; // settings as the server last confirmed them
let ACCOUNT = { deletion: false, letters: false, voice: false };
let syncing = false; let syncAgain = false;
const SETTING_FIELDS = [['voice', 'voice'], ['lang', 'letter_language'], ['deliverTime', 'delivery_time'], ['allowEarly', 'allow_early'], ['memoryPaused', 'memory_paused'], ['onboarded', 'onboarded'], ['dirs', 'directions']];
const WELCOME_FIELDS = [['welcomeSeen', 'welcome_seen'], ['welcomeReasons', 'welcome_reasons'], ['welcomeOther', 'welcome_other'], ['letterName', 'letter_name']];
const settingFields = () => [...SETTING_FIELDS, ...(welcomeSupported ? WELCOME_FIELDS : []), ...(draftSupported ? [['draft', 'draft']] : [])];
const settingValue = (k) => (k === 'dirs' ? { ...(S.dirs || {}) } : k === 'allowEarly' ? S.allowEarly !== false : k === 'memoryPaused' || k === 'onboarded' || k === 'welcomeSeen' ? !!S[k]
  : k === 'welcomeReasons' ? [...(S.welcomeReasons || [])] : k === 'welcomeOther' || k === 'letterName' ? S[k] || null
  : k === 'draft' ? (S.draft.trim() ? S.draft.slice(0, MAX_NIGHT) : null) : S[k]);
function applySettings(s) {
  synced = s;
  S.voice = s.voice; S.lang = s.letter_language; S.deliverTime = s.delivery_time; S.allowEarly = s.allow_early;
  S.memoryPaused = s.memory_paused; S.onboarded = s.onboarded; S.dirs = { ...(s.directions || {}) };
  welcomeSupported = typeof s.welcome_seen === 'boolean';
  S.welcomeSeen = !!s.welcome_seen; S.welcomeReasons = [...(s.welcome_reasons || [])]; S.welcomeOther = s.welcome_other ?? null; S.letterName = s.letter_name ?? null;
  draftSupported = Object.hasOwn(s, 'draft');
  if (draftSupported && s.draft && !S.draft.trim()) S.draft = s.draft; // unsealed words from last time
}
async function syncSettings() {
  if (!synced) return;
  if (syncing) { syncAgain = true; return; }
  const patch = {};
  for (const [k, f] of settingFields()) { const v = settingValue(k); if (JSON.stringify(v) !== JSON.stringify(synced[f])) patch[f] = v; }
  if (!Object.keys(patch).length) return;
  syncing = true;
  try { synced = await backend.updateSettings(patch, synced.revision); }
  catch (e) {
    if (e?.code === 'conflict') { try { synced = await backend.settings(); syncAgain = true; } catch (x) { /* next change retries */ } }
    else if (e?.code !== 'unauthorized' && Object.keys(patch).some((k) => k !== 'draft')) toast('Couldn’t save that setting. Check your connection.');
  }
  syncing = false;
  if (syncAgain) { syncAgain = false; syncSettings(); }
}

/* Letters as the views expect them. */
function toLetter(x) {
  return {
    id: x.id, entryId: x.entry_id, date: x.journal_date,
    entries: x.entry ? [{ id: x.entry.id, t: hhmm(new Date(x.entry.created_at)), text: x.entry.text }] : [],
    status: x.status === 'queued' ? 'writing' : x.status, content: asLetter(x.content), deliverAt: x.deliver_at,
    sealedAt: hhmm(new Date(x.created_at)), readAt: x.read_at, actions: { ...(x.steps || {}) }, private: x.private,
    createdAt: x.created_at, early: x.early, by: x.status === 'ready' ? 'claude' : null, model: x.model,
    error: x.error ? ERR[x.error] || ERR.unavailable : null, revision: x.revision,
  };
}
function mergeLetter(x) {
  const next = toLetter(x); const i = S.letters.findIndex((l) => l.id === next.id);
  const was = i === -1 ? null : S.letters[i].status;
  if (i === -1) S.letters.push(next); else S.letters[i] = next;
  // A newly written letter may have taught Beyond something: show it with the letter.
  if (was === 'writing' && next.status === 'ready') memoriesTask = refreshMemories();
  return next;
}
let memoriesTask = null;
async function refreshMemories() {
  try { S.memories = (await backend.memories()).map(toMemory); } catch (e) { /* shown on the next refresh */ }
}
function toMemory(m) {
  return {
    id: m.id, text: m.text, kind: m.kind, revision: m.revision, sourceEntryId: m.source_entry_id,
    get letterIds() { return this.sourceEntryId ? S.letters.filter((l) => l.entryId === this.sourceEntryId).map((l) => l.id) : []; },
  };
}
function toNotes(list) { const out = {}; for (const n of list) out[n.key] = { text: n.text, n: n.letter_count, by: n.model || 'Claude', at: n.created_at }; return out; }

/* One request at a time per letter, so ticks and opens arrive in order. */
const letterQueues = new Map();
function sendLetterPatch(L, body, before) {
  const prev = letterQueues.get(L.id) || Promise.resolve();
  const next = prev.then(async () => {
    try { const fresh = mergeLetter(await backend.updateLetter(L.id, body)); if (sheetId === fresh.id) drawSheet(); }
    catch (e) {
      const cur = S.letters.find((l) => l.id === L.id);
      if (cur) Object.assign(cur, { readAt: before.readAt, early: before.early, private: before.private, actions: before.actions, deliverAt: before.deliverAt });
      toast(e?.code === 'forbidden' ? '“Read it now” is turned off in Settings.' : 'Couldn’t save that. Check your connection.');
      if (!document.querySelector('.bk-sealing, .overnight')) { if (sheetId) drawSheet(); else render(); }
    }
  });
  letterQueues.set(L.id, next);
  return next;
}

/* Sealing saves the night to your account, then asks for its letter. A retry of
   the same words reuses the same key, so a flaky connection never saves twice.
   Writing again the same night adds to that night's entry, so the morning brings
   one letter over everything written that day. A night whose letter has already
   arrived (Skip to morning, or after it's read) starts a new one instead.
   The cutoff between nights is 4am (journalDate): everything sealed before then
   is in that night's letter, which is rewritten over all of it at each sealing
   and delivered at the morning time; from 4am, writing belongs to the next night. */
let sealKey = null; let sealText = null;
const MAX_NIGHT = 20000; // the server's limit for one entry
let nightEntry = null; // tonight's entry, remembered even while its letter is asked for again
async function sealNight(text, date) {
  const open = S.letters.find((l) => l.date === date && l.entryId && !l.readAt && !delivered(l));
  const arrived = (id) => S.letters.some((l) => l.entryId === id && (l.readAt || delivered(l)));
  const entryId = open?.entryId ?? (nightEntry?.date === date && !arrived(nightEntry.entryId) ? nightEntry.entryId : null);
  // each later sealing starts with its time on a line of its own, so the book can show it
  const part = `[${hhmm()}]\n${text}`;
  const fits = !open || (open.entries[0]?.text || '').length + 2 + part.length <= MAX_NIGHT;
  if (entryId && fits) {
    nightEntry = { date, entryId };
    const x = await backend.addToNight(entryId, part, date, deliverAtFor(date));
    S.letters = S.letters.filter((l) => l.entryId !== entryId); // its old letter is gone with the edit
    const L = mergeLetter(x);
    watchLetters();
    return L;
  }
  if (sealText !== text) { sealKey = crypto.randomUUID(); sealText = text; }
  const x = await backend.seal(text, sealKey, date, deliverAtFor(date));
  sealKey = null; sealText = null;
  const L = mergeLetter(x);
  nightEntry = { date, entryId: L.entryId };
  watchLetters();
  return L;
}

/* While a letter is being written, look again now and then. */
let watchTimer = null;
function watchLetters() {
  clearTimeout(watchTimer);
  if (!AUTH.user) return;
  const writing = S.letters.some((l) => l.status === 'writing');
  watchTimer = setTimeout(async () => { await refresh(); watchLetters(); }, writing && claudeState === 'ready' ? 15000 : 120000);
}
function waitForLetter(id, ms = 150000) {
  if (inflight.has(id)) return inflight.get(id);
  const task = (async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      await sleep(3500);
      try { mergeLetter(await backend.letter(id)); } catch (e) { break; }
      const L = S.letters.find((l) => l.id === id);
      if (!L || L.status !== 'writing') break;
    }
    if (memoriesTask) await memoriesTask;
    inflight.delete(id);
  })();
  inflight.set(id, task);
  return task;
}
let refreshing = null;
async function refresh() {
  if (!AUTH.user || refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const before = JSON.stringify(S.letters.map((l) => [l.id, l.status, l.revision]));
      const deliveredBefore = S.letters.filter(delivered).length;
      const [letters, memories, notes] = await Promise.all([backend.letters(), backend.memories(), backend.notes()]);
      S.letters = letters.map(toLetter); S.memories = memories.map(toMemory); S.notes = toNotes(notes);
      const changed = before !== JSON.stringify(S.letters.map((l) => [l.id, l.status, l.revision])) || deliveredBefore !== S.letters.filter(delivered).length;
      const busy = route === 'welcome' || document.querySelector('.bk-sealing, .overnight, .sheet-wrap') || (route === 'tonight' && !$('#book') && $('#entry') && document.activeElement === $('#entry')) || (document.activeElement?.id === 'arch-q') || memEditing;
      if (changed && !busy) { if (route === 'tonight' && $('#book')) { paintBook(null, { keepWrite: true }); syncSkip(); } else render(); presentLetters(); }
    } catch (e) { /* offline for a moment: keep what's here */ }
    refreshing = null;
  })();
  return refreshing;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { refresh(); if (claudeState !== 'ready') checkAI(); } else if (draftTimer) saveDraft(true); });
setInterval(() => {
  // A sealed letter arrives at its time even if nothing else happens.
  if (!AUTH.user || route !== 'tonight' || document.querySelector('.bk-sealing, .overnight, .sheet-wrap')) return;
  presentLetters();
}, 30000);

/* Memory */
async function addMemory(text) {
  try { const m = await backend.createMemory(text, crypto.randomUUID()); S.memories = [...S.memories, toMemory(m)]; toast('Beyond will remember that.'); }
  catch (e) { toast('Couldn’t save that. Check your connection.'); }
  render();
}
async function editMemory(m, text) {
  try { const x = await backend.updateMemory(m.id, text, m.revision); S.memories = S.memories.map((y) => (y.id === m.id ? toMemory(x) : y)); }
  catch (e) { toast(e?.code === 'conflict' ? 'That memory changed elsewhere. Showing the latest.' : 'Couldn’t save that. Check your connection.'); await refresh(); }
  render();
}
async function forgetMemory(m) {
  try { await backend.deleteMemory(m.id); S.memories = S.memories.filter((x) => x.id !== m.id); toast('Forgotten. Beyond won’t learn it again from old letters.'); }
  catch (e) { toast('Couldn’t forget that just now. Try again.'); }
  render();
}

/* Account */
function needFreshSignIn(e, action) {
  if (e?.code === 'forbidden') { freshFor = action; if (route !== 'settings') go('settings'); else render(); setTimeout(() => { $('#reauth-pw')?.focus(); $('#data')?.scrollIntoView({ block: 'start' }); }, 50); return; }
  toast(e?.code === 'unauthorized' ? 'Please sign in again.' : 'That didn’t work. Check your connection and try again.');
}
async function submitReauth(f) {
  const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
  try {
    await backend.reauth($('#reauth-pw').value);
    const action = freshFor; freshFor = null; render();
    if (action === 'export') return exportJournal();
    if (action === 'clear') return clearJournal();
    if (action === 'account') return deleteAccount();
  } catch (e) { btn.disabled = false; toast('That password didn’t work.'); }
}
async function clearJournal() {
  const keep = { voice: S.voice, letter_language: S.lang, delivery_time: S.deliverTime, allow_early: S.allowEarly !== false, onboarded: true, ...(welcomeSupported ? { welcome_seen: true } : {}) };
  try {
    await backend.clearAll();
    confirmDelete = false;
    S.letters = []; S.demoLetters = []; S.demoNights = []; S.memories = []; S.notes = {}; S.dirs = {}; S.draft = ''; resetBook();
    try { const fresh = await backend.settings(); synced = await backend.updateSettings(keep, fresh.revision); applySettings(synced); } catch (e) { /* defaults are fine */ }
    toast('Your journal was deleted.'); render();
  } catch (e) { confirmDelete = false; needFreshSignIn(e, 'clear'); }
}
async function deleteAccount() {
  try {
    await backend.deleteAccount();
    resetToLogin('Your account is being deleted. Everything in it will be gone within a few minutes.');
  } catch (e) { confirmAccount = false; needFreshSignIn(e, 'account'); }
}
async function signOut() {
  try { await backend.signOut(); } catch (e) { /* the local session is gone either way */ }
  resetToLogin('');
}
function resetToLogin(note) {
  clearTimeout(watchTimer); closeSheet(false);
  AUTH = { auth: true, user: null }; synced = null;
  const prefs = loadPrefs(); S = { ...fresh(), ...prefs }; resetBook();
  loginMode = 'signin'; loginNote = note || ''; route = 'login'; param = null;
  try { history.replaceState(null, '', '/app'); } catch (e) { /* fine */ }
  render();
}
async function submitLogin(f) {
  const btn = f.querySelector('button[type=submit]'); btn.disabled = true; loginNote = '';
  const err = (msg) => { loginNote = msg; const p = $('#login-err'); if (p) p.textContent = msg; btn.disabled = false; };
  const email = $('#email')?.value.trim(); const password = $('#password')?.value || '';
  try {
    if (loginMode === 'signin') return signedIn(await backend.signIn(email, password));
    if (loginMode === 'signup') {
      if (password.length < 8) return err('Use at least 8 characters for your password.');
      const user = await backend.signUp(email, password);
      if (user) return signedIn(user);
      loginMode = 'sent'; loginNote = 'We sent you a link to confirm your email. Open it on this device to start your journal.'; return render();
    }
    if (loginMode === 'forgot') { await backend.resetPassword(email); loginMode = 'sent'; loginNote = 'If that email has a Beyond account, a reset link is on its way. Open it on this device.'; return render(); }
    if (loginMode === 'reset') {
      const pw = $('#password-new').value; if (pw.length < 8) return err('Use at least 8 characters for your password.');
      await backend.updatePassword(pw); toast('Your new password is saved.');
      const user = await backend.session(); return user ? signedIn(user) : resetToLogin('Sign in with your new password.');
    }
  } catch (e) {
    err(e?.code === 'auth_failed' ? (loginMode === 'signin' ? 'That email and password don’t match. Try again, or reset your password.' : 'That didn’t work. Check the details and try again.') : 'Can’t reach Beyond. Check your connection.');
  }
}
async function loadAll() {
  const [settings, letters, memories, notes, account] = await Promise.all([backend.settings(), backend.letters(), backend.memories(), backend.notes(), backend.account().catch(() => ACCOUNT)]);
  applySettings(settings); ACCOUNT = account;
  S.letters = letters.map(toLetter); S.memories = memories.map(toMemory); S.notes = toNotes(notes);
  claudeState = account.letters ? 'ready' : 'off'; SERVER_STT = !!account.voice;
  // Letters are timed in the zone you write in.
  try { const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; if (tz && tz !== settings.timezone) synced = await backend.updateSettings({ timezone: tz }, settings.revision); } catch (e) { /* keep the old zone */ }
}
async function signedIn(user) {
  AUTH = { auth: true, user };
  $('#app').innerHTML = '<div class="booting"><div class="lantern"></div></div>';
  try { await loadAll(); }
  catch (e) { AUTH = { auth: true, user: null }; synced = null; loginNote = e?.code === 'unauthorized' || e?.code === 'forbidden' ? 'Please sign in again.' : 'Beyond couldn’t load your journal. Check your connection and try again.'; route = 'login'; render(); return; }
  try { history.replaceState(null, '', `/app${location.hash}`); } catch (e) { /* fine */ }
  readHash(); start(); watchLetters();
}
async function boot(callback) {
  setAmbient('full');
  $('#app').innerHTML = '<div class="booting"><div class="lantern"></div></div>';
  backend.onSignedOut(() => resetToLogin('You were signed out. Sign in again to continue.'));
  if (!backend.configured) { route = 'login'; render(); return; }
  if (new URLSearchParams(location.search).has('signup')) loginMode = 'signup';
  if (callback) {
    try { await backend.completeCallback(); } catch (e) { loginNote = 'That sign-in link didn’t work. It may have expired; try again.'; }
  }
  let user = null;
  try { user = await backend.session(); } catch (e) { loginNote = 'Can’t reach Beyond. Check your connection.'; }
  if (user && backend.recovering()) { AUTH = { auth: true, user }; loginMode = 'reset'; route = 'login'; render(); return; }
  if (!user) { route = 'login'; try { history.replaceState(null, '', `/app${location.search.includes('signup') ? '?signup=1' : ''}`); } catch (e) { /* fine */ } render(); return; }
  return signedIn(user);
}
boot(location.pathname.startsWith('/auth/callback'));

}


