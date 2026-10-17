/* ======================================================================
   Beyond — the journal app.
   Write tonight, nothing replies, a letter arrives in the morning.
   Ported from the prototype (client/web/app.src.html); storage and letter
   writing go through Beyond's backend. Journal text is kept in memory only,
   never in browser storage.
   PC redesign: ink on night, letters on paper, hand-drawn marks instead of
   boxes. Tabs: Identity, Journal (the tonight page), Letters, Patterns, centred; language and
   Settings sit at the top right.
   Identity is home: the app opens on it and the Beyond mark returns to it.
   Letters holds every letter, Settings holds memories.
   ====================================================================== */
/* eslint-disable */
import SAMPLE_DATA from './sample.json';
import { uiLang, setUiLang, startTranslating } from './i18n';

let started = false;
export function startJournal(backend) {
if (started) return;
started = true;
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
function fresh() { return { v: 2, onboarded: false, mode: 'own', voice: 'friend', lang: 'auto', inputMode: 'type', deliverTime: '08:00', allowEarly: true, draft: '', letters: [], demoNights: [], sampleMeta: {}, notes: {}, dirs: {}, memories: [], memoryPaused: false, forgotten: [], hiddenSampleMem: [], savedAt: 0 }; }
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
      id: s.id, sample: true, by: 'sample', date, entries: s.entries, content: s.content, status: 'ready',
      deliverAt: deliverAtFor(date), early: true, readAt: meta.readAt !== undefined ? meta.readAt : (s.unread ? null : 'earlier'),
      actions: meta.actions || { ...s.actions }, private: meta.private !== undefined ? meta.private : s.private,
    };
  });
}
function allLetters() {
  const list = demoOn() ? [...S.letters, ...sampleLetters()] : [...S.letters];
  return list.sort((a, b) => b.date.localeCompare(a.date) || (b.createdAt || '').localeCompare(a.createdAt || ''));
}
const findLetter = (id) => allLetters().find((l) => l.id === id);
const delivered = (l) => l.status === 'ready' && (l.early || Date.now() >= Date.parse(l.deliverAt));
function patchLetter(id, patch) {
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
   came from is kept in Patterns. */
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
  if (route === 'login' || !AUTH.user) return;
  if (route !== 'tonight') render(); else refreshTonightNote();
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
    if (!document.querySelector('.ascend, .overnight')) render();
    watchLetters();
  })();
}

/* ---------- routing ---------- */
function go(r, p = null, opts = {}) {
  route = r; param = p;
  const token = p ? `${route}-${p}` : route;
  if (!opts.replace && location.hash.slice(1) !== token) { try { history.pushState(null, '', `#${token}`); } catch (e) { /* frame may refuse */ } }
  render(); if (!opts.keepScroll) window.scrollTo(0, 0);
}
function readHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  const m = h.match(/^(letter|patterns)-(.+)$/);
  if (h === 'patterns-identity') { route = 'identity'; param = null; } // old links
  else if (m) { route = m[1]; param = m[2]; }
  else if (h === 'you') { route = 'settings'; param = null; } // old links
  else if (h === 'profile') { route = 'letters'; param = null; } // old links
  else if (['tonight', 'letters', 'identity', 'patterns', 'settings', 'support', 'welcome'].includes(h)) { route = h; param = null; }
}
window.addEventListener('popstate', () => { closeSheet(false); readHash(); render(); });

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
  // the Settings cog: eight square teeth around a ring
  gear: `<svg viewBox="0 0 24 24" ${HAND}><path d="M19.1 9.8L21.8 10.3L21.8 13.7L19.1 14.2L18.5 15.5L20.2 17.7L17.7 20.2L15.5 18.5L14.2 19.1L13.7 21.8L10.3 21.8L9.8 19.1L8.5 18.5L6.3 20.2L3.8 17.7L5.5 15.5L4.9 14.2L2.2 13.7L2.2 10.3L4.9 9.8L5.5 8.5L3.8 6.3L6.3 3.8L8.5 5.5L9.8 4.9L10.3 2.2L13.7 2.2L14.2 4.9L15.5 5.5L17.7 3.8L20.2 6.3L18.5 8.5Z"/><circle cx="12" cy="12" r="3.4"/></svg>`,
  search: `<svg viewBox="0 0 24 24" ${HAND}><path d="M10.6 4.2c3.6 0 6.4 2.8 6.3 6.3-.1 3.5-3 6.2-6.4 6.1-3.4-.1-6.1-2.9-6-6.3.1-3.3 2.8-6.1 6.1-6.1Z"/><path d="M15.4 15.6c1.6 1.5 3.2 3 4.9 4.6"/></svg>`,
  left: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m14 6-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m10 6 6 6-6 6"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  crescent: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 3.2a9 9 0 1 0 5.3 13.7A7.4 7.4 0 0 1 15.5 3.2Z"/></svg>',
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
  if (!S.onboarded && !['support', 'login'].includes(route)) route = 'welcome';
  document.body.classList.add('night');
  setAmbient(route === 'tonight' || route === 'welcome' ? 'full' : 'soft');
  if (route === 'you') route = 'settings';
  if (route === 'profile') route = 'letters';
  const views = { welcome: vWelcome, login: vLogin, tonight: vTonight, letters: vLetters, letter: vLetter, identity: vIdentity, patterns: vPatterns, settings: vSettings, support: vSupport };
  const html = (views[route] || vTonight)();
  const unread = allLetters().some((l) => delivered(l) && !l.readAt);
  setAmbient(route === 'login' ? 'full' : undefined);
  const here = (r) => route === r || (r === 'letters' && route === 'letter');
  // a new page enters with one short rise; staying on a page re-renders in place
  const entering = route !== lastRoute; lastRoute = route;
  if (entering && route === 'identity' && !identVeiled) identRevealAt = performance.now();
  const nav = route === 'welcome' || route === 'login' ? '' : `
    <header class="topbar">
      <button class="brand" data-go="identity" aria-label="Beyond, Identity">${I.moon}<span>Beyond</span></button>
      <nav class="tabs" aria-label="Main">
        ${[['identity', 'Identity', I.bubbles], ['tonight', 'Journal', I.moon], ['letters', 'Letters', I.mail], ['patterns', 'Patterns', I.sky]].map(([r, l, ic]) =>
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

/* ----- welcome ----- */
let welcomeStep = 0;
const NOISE = ["what's next", 'everyone else', 'lunch alone?', 'group chat', '將來', 'GPA', 'which major?', '唔知', 'should I', 'behind', 'notifications', '比較', 'new campus', 'seen 11:47pm', 'internship?', '一個人'];
function vWelcome() {
  if (welcomeStep === 0) {
    const r = seeded('beyond-noise');
    const words = NOISE.map((w) => `<span style="left:${(r() * 86).toFixed(1)}%;top:${(r() * 62).toFixed(1)}%;--s:${(18 + r() * 34).toFixed(0)}px;--r:${((r() - .5) * 14).toFixed(1)}deg;--t:${(6 + r() * 6).toFixed(1)}s;--dl:${(-r() * 6).toFixed(1)}s;--dx:${((r() - .5) * 40).toFixed(0)}px;--dy:${((r() - .5) * 30).toFixed(0)}px">${esc(w)}</span>`).join('');
    after.push(() => setTimeout(() => $('.welcome')?.classList.add('is-quiet'), 1800));
    return `<section class="welcome">
      <div class="noise" aria-hidden="true">${words}</div>
      <p class="brand-line">${I.moon}<span>Beyond, a journal that writes back in the morning</span></p>
      <h1 class="display">Write tonight. Nothing replies. A letter arrives in the morning.</h1>
      <ol class="how">
        <li><b>Journal</b>Write or just talk about whatever is on your mind. No feed, no likes, no reply.</li>
        <li><b>Overnight</b>It's sealed. Claude reads it next to your earlier nights.</li>
        <li><b>Morning</b>A short letter, and three small to-dos you can tick off.</li>
      </ol>
      <div class="row"><button class="btn amber" data-act="start-own">Start my journal</button></div>
      ${demoOn() ? `<p class="mode-note">You’re in <b>Demo mode</b>: Kit’s fictional letters are shown next to yours. To use Beyond just for yourself, switch to Normal mode in Settings.</p>` : ''}
      <p class="fine">${OFFLINE ? 'Offline trial: letters here are simple templates. The online version writes them with Claude.' : LOCAL ? (isGuest() ? 'Judge preview: you have your own empty journal, and Claude writes your letters.' : 'Letters are written by Claude. Your journal is saved to your Beyond account, private to you.') : 'Letters are written by Claude on your own claude.ai account. Your journal stays in this browser.'}</p>
    </section>`;
  }
  return `<section class="welcome" style="align-content:center">
    <p class="lead">One choice before tonight.</p>
    <h1 class="display" style="max-width:18ch">Who should write your morning letters?</h1>
    <div class="voices" role="group" aria-label="Letter voice">${voiceCards()}</div>
    <p class="fine">The voice changes the tone only. Every letter quotes your exact words and never invents anything. You can change this later.</p>
    <div class="row"><button class="btn amber" data-act="finish-welcome">Start writing</button></div>
  </section>`;
}
function voiceCards() {
  return Object.entries(VOICES).map(([k, v]) => `<button class="voice" data-voice="${k}" aria-pressed="${S.voice === k}"><b>${v.name}</b><span>${v.desc}</span><i>“${esc(v.example)}”</i></button>`).join('');
}

/* ----- tonight: open and write ----- */
let promptTimer = null; let lastWords = 0;
const SPEAK_PROMPTS = ['Just say it. Nothing replies.', 'Start with how today felt.', '今日發生咗咩？慢慢講。', 'What’s still on your mind?', 'Say it the way you’d say it to yourself.', '今天怎么样？想到哪说到哪。'];
function vTonight() {
  clearInterval(promptTimer); cancelAnimationFrame(voice.raf);
  const sealed = pendingNight();
  if (sealed) return vSealed(sealed);
  const speak = false; // one page: type, or tap the microphone and talk
  const words = countWords(S.draft); lastWords = words;
  after.push(() => {
    const ta = $('#entry'); if (!ta) return;
    // Speak: a fixed window that follows the newest words, so they stay in view under the light.
    const grow = () => { ta.style.height = 'auto'; const h = Math.max(ta.scrollHeight, window.innerHeight * (speak ? 0.16 : 0.58)); ta.style.height = `${speak ? Math.min(h, window.innerHeight * 0.22) : h}px`; if (speak) ta.scrollTop = ta.scrollHeight; };
    grow();
    if (!speak && window.matchMedia('(pointer: fine)').matches) ta.focus({ preventScroll: true });
    let lastLen = ta.value.length;
    ta.addEventListener('input', () => {
      S.draft = ta.value; save(); grow();
      const added = ta.value.length - lastLen; lastLen = ta.value.length;
      if (added > 0) voice.impulse = Math.min(1, voice.impulse + 0.25 + added * 0.03);
      lastWords = countWords(ta.value);
      $('#b-seal').disabled = !ta.value.trim();
      if (hasCrisis(ta.value) && !$('#crisis').childElementCount) $('#crisis').innerHTML = supportInline();
    });
    if (hasCrisis(ta.value)) $('#crisis').innerHTML = supportInline();
    paintVoice();
    const list = speak ? SPEAK_PROMPTS : PROMPTS; let i = 0;
    promptTimer = setInterval(() => {
      const p = $('#prompt'); if (!p || route !== 'tonight') return clearInterval(promptTimer);
      if (ta.value.trim() || voice.state === 'rec') return;
      i = (i + 1) % list.length; p.innerHTML = `<span>${esc(list[i])}</span>`;
    }, 5200);
  });
  // Journal: a blank page. The date and one quiet question, then room to write.
  return `<section class="tn ${speak ? 'is-speak' : ''}">
      <header class="tn-head">
        <p class="tn-date">${fmtDay(journalDate())}</p>
        <h1 class="tn-prompt" id="prompt"><span>${esc((speak ? SPEAK_PROMPTS : PROMPTS)[0])}</span></h1>
      </header>
      <label for="entry" class="sr-only">Tonight's entry</label>
      <div class="entry-wrap">
        <textarea id="entry" class="paper-in" placeholder="Start anywhere">${esc(S.draft)}</textarea>
        <button class="mic" id="orb" data-act="orb" type="button" aria-label="Talk instead of typing"><span class="glyph" id="glyph">${I.mic}</span></button>
      </div>
      <p class="voice-hint" id="vhint" aria-live="polite"></p>
      <div id="crisis" style="width:100%"></div>
      <div class="tn-bar">
        <button class="btn amber" data-act="seal" id="b-seal" ${S.draft.trim() ? '' : 'disabled'}>Seal tonight</button>
      </div>
    </section>`;
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
/* A small orrery: you in the middle, each direction circling on a tilted orbit,
   passing behind and in front of you, joined by a thread of light. New
   journals show three seeds of light, lit one by one as nights point the same way. */
function startOrrery(canvas, vis, most) {
  if (!canvas) return;
  const box = canvas.parentElement; const W = box.clientWidth, H = box.clientHeight; if (!W || !H) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1); canvas.width = W * dpr; canvas.height = H * dpr;
  const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const still = reduceMotion(); const cx = W / 2, cy = H / 2; const tilt = -.2;
  const empty = !vis.length; const max = Math.max(1, ...vis.map((d) => d.days));
  const bodies = empty
    ? [0, 1, 2].map((i) => ({ key: `seed${i}`, orbit: 0, phase: (i / 3) * Math.PI * 2, size: 3.2, lit: i < Math.min(2, most), confirmed: false }))
    : vis.slice(0, 4).map((d, i) => ({ key: d.key, orbit: i, phase: seeded(d.key)() * Math.PI * 2, size: 3 + 4.6 * Math.sqrt(d.days / max), lit: true, confirmed: d.status === 'confirmed' }));
  const orbits = empty ? [{ rx: W * .3, ry: W * .3 * .34 }] : [0, 1, 2, 3].slice(0, Math.max(1, bodies.length)).map((i) => { const rx = W * (.21 + i * .075); return { rx, ry: rx * .36 }; });
  const rs = seeded('orrery-sky'); const stars = Array.from({ length: 26 }, () => ({ x: rs() * W, y: rs() * H, r: .3 + rs() * .9, a: .2 + rs() * .5, p: 1500 + rs() * 3000, ph: rs() * 6.3 }));
  let hot = 0, hotT = 0; const glance = canvas.closest('.glance');
  glance?.addEventListener('pointerenter', () => { hotT = 1; }); glance?.addEventListener('pointerleave', () => { hotT = 0; });
  glance?.addEventListener('focus', () => { hotT = 1; }); glance?.addEventListener('blur', () => { hotT = 0; });
  const t0 = performance.now(); let angle = 0; let last = t0;
  const at = (o, a) => { const x = Math.cos(a) * o.rx, y = Math.sin(a) * o.ry; return { x: cx + x * Math.cos(tilt) - y * Math.sin(tilt), y: cy + x * Math.sin(tilt) + y * Math.cos(tilt), depth: Math.sin(a) }; };
  const ease = (k) => 1 - (1 - k) ** 3;
  function orb(b, p, k) {
    const s = (.7 + .42 * (p.depth + 1) / 2) * (empty ? 1 : k) * (1 + hot * .12); const r = b.size * s; const a = (.55 + .45 * (p.depth + 1) / 2) * (b.lit ? 1 : .35);
    g.save(); g.globalAlpha = a;
    if (b.lit) { g.shadowColor = b.confirmed ? 'rgba(243,198,142,.95)' : 'rgba(243,190,130,.75)'; g.shadowBlur = 10 + hot * 10; }
    const grd = g.createRadialGradient(p.x - r * .35, p.y - r * .4, r * .1, p.x, p.y, r);
    grd.addColorStop(0, b.lit ? '#fff3dc' : '#c9b8a4'); grd.addColorStop(.55, b.lit ? (b.confirmed ? '#f3c68e' : '#e8b07a') : '#7d6a58'); grd.addColorStop(1, b.lit ? 'rgba(227,149,90,.35)' : 'rgba(125,106,88,.2)');
    g.fillStyle = grd; g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill(); g.restore();
  }
  const frame = (now) => {
    if (!document.body.contains(canvas)) return;
    const dt = Math.min(50, now - last); last = now;
    hot += (hotT - hot) * .08; angle += dt * (0.00018 + hot * 0.0006);
    const since = now - t0;
    g.clearRect(0, 0, W, H);
    for (const st of stars) { g.globalAlpha = still ? st.a : st.a * (.5 + .5 * Math.sin(now / st.p + st.ph)); g.fillStyle = '#fbe9d2'; g.beginPath(); g.arc(st.x, st.y, st.r, 0, 6.283); g.fill(); }
    g.globalAlpha = 1;
    // orbits, drawn as tilted rings
    orbits.forEach((o, i) => { g.save(); g.translate(cx, cy); g.rotate(tilt); g.beginPath(); g.ellipse(0, 0, o.rx, o.ry, 0, 0, Math.PI * 2); g.strokeStyle = `rgba(243,230,211,${(.1 + hot * .08).toFixed(3)})`; g.lineWidth = 1; g.stroke(); g.restore(); });
    const placed = bodies.map((b, i) => { const k = still ? 1 : ease(Math.min(1, Math.max(0, (since - 150 - i * 160) / 1100))); const o = orbits[b.orbit]; const sp = 1 / (1 + b.orbit * .45); const a = b.phase + angle * sp * 6 + (1 - k) * -2.2; const p = at({ rx: o.rx * (empty ? 1 : k), ry: o.ry * (empty ? 1 : k) }, a); return { b, p, k, a, o }; });
    // comet tails along the orbit behind each lit body
    for (const { b, k, a, o } of placed) {
      if (!b.lit || still) continue;
      for (let j = 1; j <= 14; j++) { const q = at({ rx: o.rx * (empty ? 1 : k), ry: o.ry * (empty ? 1 : k) }, a - j * .045); g.globalAlpha = (1 - j / 14) * .28 * (.6 + .4 * (q.depth + 1) / 2) * (1 + hot); g.fillStyle = '#f3c68e'; g.beginPath(); g.arc(q.x, q.y, Math.max(.4, b.size * .32 * (1 - j / 14)), 0, 6.283); g.fill(); }
    }
    g.globalAlpha = 1;
    // threads of light from you to each direction
    if (!empty) for (const { p, k } of placed) {
      g.save(); g.globalAlpha = (.28 + hot * .5) * k; g.strokeStyle = '#f3c68e'; g.lineWidth = 1; g.setLineDash([2, 5]); g.lineDashOffset = still ? 0 : -now / 60;
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(p.x, p.y); g.stroke(); g.restore();
    }
    // behind you, then you, then in front of you
    placed.filter((x) => x.p.depth < 0).forEach(({ b, p, k }) => orb(b, p, k));
    const pulse = still ? 0 : (Math.sin(now / 700) + 1) / 2; const flare = still ? 0 : Math.max(0, 1 - since / 900);
    const R = (empty ? 8 : 11) + pulse * 1.3 + hot * 2 + flare * 6;
    const halo = g.createRadialGradient(cx, cy, 0, cx, cy, R * 4.2); halo.addColorStop(0, `rgba(255,224,170,${(.42 + hot * .2 + flare * .3).toFixed(3)})`); halo.addColorStop(1, 'rgba(227,149,90,0)');
    g.fillStyle = halo; g.beginPath(); g.arc(cx, cy, R * 4.2, 0, 6.283); g.fill();
    const core = g.createRadialGradient(cx - R * .25, cy - R * .3, 0, cx, cy, R); core.addColorStop(0, '#fff8ec'); core.addColorStop(.45, '#ffd9a0'); core.addColorStop(1, '#e8945a');
    g.fillStyle = core; g.beginPath(); g.arc(cx, cy, R, 0, 6.283); g.fill();
    if (!still) { const ph = (now % 3200) / 3200; g.globalAlpha = (1 - ph) * .5; g.strokeStyle = '#f3c68e'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R + ph * 26, 0, 6.283); g.stroke(); g.globalAlpha = 1; }
    placed.filter((x) => x.p.depth >= 0).forEach(({ b, p, k }) => orb(b, p, k));
    if (!still) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
function claudeNote() {
  if (claudeState !== 'off') return demoOn() ? 'Demo mode: seal a night and Claude writes its letter, usually within a minute. Then tap Skip to morning.' : '';
  return 'Beyond’s letter writer isn’t switched on yet. Seal tonight anyway: your letter is kept safe and written as soon as it is.';
}
function refreshTonightNote() { const n = $('#claude-note'); if (n) n.textContent = claudeNote(); }
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
  h.addColorStop(0, `rgba(243,198,142,${(0.14 + 0.3 * L).toFixed(3)})`); h.addColorStop(0.55, `rgba(227,149,90,${(0.05 + 0.12 * L).toFixed(3)})`); h.addColorStop(1, 'rgba(227,149,90,0)');
  g.fillStyle = h; g.fillRect(0, 0, W, W);
  for (let k = 0; k < 3; k++) {
    const ph = ((ts / 3400) + k / 3) % 1; const rr = r0 * (1.08 + ph * (0.85 + L * 0.9));
    g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.strokeStyle = `rgba(243,198,142,${((1 - ph) * (0.14 + 0.36 * L)).toFixed(3)})`; g.lineWidth = 1; g.stroke();
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

/* ----- seal: words go into the lantern, the lantern rises ----- */
async function seal() {
  if (voice.state === 'rec') stopRecording(true);
  voice.state = 'idle';
  const ta = $('#entry'); const text = (ta?.value || '').trim();
  if (!text) return;
  const date = journalDate();
  window.scrollTo(0, 0); // the words float up into a light above the page
  const rect = ta.getBoundingClientRect(); const lrect = { left: window.innerWidth / 2 - 48, top: Math.max(72, rect.top - 120), width: 96, height: 96 };
  let L;
  try { L = await sealNight(text, date); }
  catch (e) {
    const b = $('#b-seal'); if (b) b.disabled = false;
    toast(e?.code === 'rate_limited' ? 'Today’s letters are used up. Your words are still here.' : e?.code === 'unauthorized' ? 'Please sign in again. Your words are still here.' : 'Couldn’t seal tonight. Your words are still here; check your connection and try again.');
    return;
  }
  S.draft = ''; save();
  await ascend(text, L.id, rect, lrect);
  go('tonight');
}
function starPositions(id, n) {
  const r = seeded(id); const out = [];
  for (let i = 0; i < n; i++) out.push({ x: 8 + r() * 84, y: 6 + r() * 44, tw: 2.5 + r() * 3, dl: r() * 3 });
  return out;
}
async function ascend(text, id, rect, lrect) {
  const layer = $('#layer');
  // English splits into words; Chinese (no spaces) into single characters, so long lines wrap and float up one by one.
  const CJK = /[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]/;
  const words = (text.match(/[\u3000-\u303f\u3400-\u9fff\uff00-\uffef]|[^\s\u3000-\u303f\u3400-\u9fff\uff00-\uffef]+/g) || []).slice(0, 140);
  const ov = document.createElement('div'); ov.className = 'ascend'; ov.setAttribute('role', 'status');
  const top = Math.min(Math.max(rect.top + 20, 80), window.innerHeight * 0.55);
  ov.innerHTML = `<span class="stars" aria-hidden="true"></span>
    <div class="words" style="left:${rect.left + 22}px;top:${top}px;width:${Math.max(120, rect.width - 44)}px">${words.map((w) => `<span class="w">${esc(w)}${CJK.test(w) ? '' : ' '}</span>`).join('')}</div>
    <div class="lantern" style="left:${lrect.left}px;top:${lrect.top}px;width:${lrect.width}px;height:${lrect.height}px;--k:1;--b:1.05"></div>
    <p class="cap">Sealed. Nothing replies tonight.</p>`;
  layer.appendChild(ov);
  const lantern = ov.querySelector('.lantern');
  const lx = lrect.left + lrect.width / 2, ly = lrect.top + lrect.height / 2;
  if (!reduceMotion()) {
    await sleep(350);
    const spans = [...ov.querySelectorAll('.w')];
    const step = Math.min(30, 1300 / Math.max(1, spans.length));
    const anims = spans.map((s, i) => {
      const b = s.getBoundingClientRect();
      const tx = lx - (b.left + b.width / 2), ty = ly - (b.top + b.height / 2);
      return s.animate([{ transform: 'none', opacity: 1 }, { transform: `translate(${tx * .6}px, ${ty * .6}px) scale(.6)`, opacity: .8, offset: .6 }, { transform: `translate(${tx}px, ${ty}px) scale(.1)`, opacity: 0 }],
        { duration: 1100, delay: i * step, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished;
    });
    lantern.animate([{ filter: 'brightness(1) drop-shadow(0 0 30px rgba(243,170,100,.55))' }, { filter: 'brightness(1.6) drop-shadow(0 0 70px rgba(243,170,100,.9))' }], { duration: 1100 + spans.length * step, fill: 'forwards' });
    await Promise.all(anims);
    await lantern.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${window.innerWidth * .18}px, ${-(ly - window.innerHeight * .08)}px) scale(.3)` }], { duration: 1800, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' }).finished;
    starPositions(id, 26).forEach((st, i) => { const d = document.createElement('i'); d.className = 's'; d.style.left = `${st.x}%`; d.style.top = `${st.y}%`; ov.appendChild(d); d.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.6)' }, { opacity: .9, transform: 'scale(1)' }], { duration: 700, delay: i * 40, fill: 'forwards' }); });
  }
  ov.classList.add('is-done');
  await sleep(reduceMotion() ? 400 : 1700);
  await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).finished;
  ov.remove();
}

function vSealed(L) {
  const n = L.entries.reduce((a, e) => a + countWords(e.text), 0);
  const stars = starPositions(L.id, 26);
  const status = L.status === 'writing' ? `<p class="status"><i></i>${L.demo ? 'Preparing your sample letter' : claudeState === 'off' ? 'Sealed and waiting for the letter writer' : 'Claude is writing quietly'}</p>`
    : L.status === 'failed' ? `<p class="status err"><i></i>The letter couldn't be written yet</p>`
    : `<p class="status ok"><i></i>Written and sealed until ${atTime(L)}</p>`;
  return `<section class="sealed">
      ${stars.map((s) => `<i class="s" style="left:${s.x}%;top:${s.y * 0.7}%;--tw:${s.tw}s;--dl:${s.dl}s"></i>`).join('')}
      <span class="mini-lantern" aria-hidden="true"></span>
      <div class="env" aria-hidden="true"><div class="env-back"></div><div class="env-paper"><i></i><i style="width:80%"></i><i style="width:60%"></i></div><div class="env-pocket"></div><div class="env-flap"></div><div class="env-seal">${I.crescent}</div></div>
      <h1 class="display sm">Sealed for the night.</h1>
      <p class="lead">${plural(n, 'word')} written at ${L.sealedAt || '—'}. Sleep well. It will be waiting here.</p>
      <label class="pick" for="ltime"><span>Arrives at</span><select id="ltime">${timeOptions(atTime(L))}</select></label>
      ${status}
      ${L.status === 'failed' ? `<p class="notice warn">${esc(L.error)}</p><div class="row"><button class="btn sm" data-retry="${L.id}">Try again</button></div>` : ''}
      ${!canSkip() ? '' : isDemoSkip() ? `<button class="btn amber" data-act="skip" ${L.status === 'failed' ? 'disabled' : ''}>Skip to morning</button>
      <p class="fine">Demo: Skip to morning shows the letter now. It doesn't change your device's clock.</p>`
        : `<button class="link" data-act="readnow" ${L.status === 'failed' ? 'disabled' : ''}>Read it now</button>
      <p class="fine">Can’t wait? That’s fine. You can turn this off in Settings.</p>`}
    </section>`;
}

/* ----- overnight: the night passes while Claude finishes ----- */
const toMin = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const fmtMin = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
async function overnight(L, { now: readNow = false } = {}) {
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
  if (readNow) {
    const task = L.status !== 'writing' ? null : claudeState === 'ready' ? waitForLetter(L.id) : null;
    clock.textContent = hhmm(); txt.textContent = task ? (L.demo ? 'Finishing your sample letter…' : 'Claude is finishing your letter…') : 'Opening your letter…'; ov.querySelector('.ov-note').textContent = '';
    if (task) await task; else await sleep(fast ? 50 : 900);
    const done = findLetter(L.id);
    if (!done || done.status !== 'ready') { await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished; ov.remove(); render(); if (done?.status === 'writing') toast(claudeState === 'ready' ? 'Still being written. It will be here soon.' : 'Your letter is sealed and waiting for the letter writer.'); return; }
    patchLetter(L.id, { early: true }); go('letter', L.id);
    await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).finished; ov.remove(); return;
  }
  requestAnimationFrame(() => ov.classList.add('is-late'));
  const at = toMin(atTime(L)); const before = fmtMin(at - 20);
  await roll(toMin(hhmm()), toMin(before), fast ? 200 : 2600);
  const task = L.status !== 'writing' ? null : claudeState === 'ready' ? waitForLetter(L.id) : null;
  if (task) {
    txt.textContent = L.demo ? 'Finishing your sample letter…' : 'Claude is still writing your letter…';
    const slow = setTimeout(() => { txt.textContent = 'Still writing. This can take up to a minute.'; }, 9000);
    await task; clearTimeout(slow);
  }
  const now = findLetter(L.id);
  if (!now || now.status !== 'ready') {
    await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'forwards' }).finished; ov.remove(); render(); return;
  }
  ov.classList.add('is-dawn'); txt.textContent = 'Good morning. Your letter is here.';
  await roll(toMin(before), at, fast ? 100 : 1500);
  await sleep(fast ? 100 : 900);
  patchLetter(L.id, { early: true });
  go('letter', L.id);
  await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }).finished; ov.remove();
}

/* ----- letter ----- */
let opening = null;
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
  if (!L.readAt && opening !== L.id) {
    return `<button class="link back" data-go="letters">${I.left}Letters</button>
      <section class="env-stage">
        <span class="stars" aria-hidden="true"></span>
        <p class="tn-date">${fmtDay(L.date)}${L.sample ? ', Kit’s sample' : L.demo ? ', demo letter' : ''}</p>
        <h1 class="display sm">From your ${esc(v.name)}</h1>
        <div class="env" id="env"><div class="env-back"></div><div class="env-paper"><i></i><i style="width:80%"></i><i style="width:60%"></i></div><div class="env-pocket"></div><div class="env-flap"></div><div class="env-seal">${I.crescent}</div></div>
        <button class="btn amber" data-openenv="${L.id}">Open the letter</button>
      </section>`;
  }
  const highlight = (e) => {
    let html = esc(e.text);
    for (const [i, a] of (c.analysis || []).entries()) if (a.quote && a.entryId === e.id) { const q = esc(a.quote); html = html.replace(q, `<mark id="q-${i}">${q}</mark>`); }
    return html;
  };
  const p = progress(L);
  const by = L.by === 'claude' ? `Written by ${L.model ? esc(L.model) : 'Claude'}. Every quote is checked against your words.`
    : L.by === 'template' ? 'A plain template letter. No AI was available when it was written.'
    : L.by === 'demo' ? 'Demo mode: a pre-written sample letter, matched to what you wrote and quoting your own words. Nothing was sent to an AI or saved to your account.'
    : 'Kit’s sample letter, pre-written for the demo. Kit isn’t a real person.';
  const fresh = opening === L.id; if (fresh) opening = null;
  const insights = (c.analysis || []).slice(0, 2);
  const enc = c.encouragement || c.closing;
  return `<button class="link back" data-go="letters">${I.left}Letters</button>
    <article class="letter paper ${fresh ? 'reveal' : ''}" lang="${{ en: 'en', 'zh-hans': 'zh-Hans' }[c.language] || 'zh-Hant-HK'}">
      <span class="paper-moon" aria-hidden="true">${I.moon}${I.star}</span>
      <div class="letter-meta" style="--i:0"><span>${fmtDay(L.date)}${L.sample ? ', sample' : L.demo ? ', demo letter' : ''}</span><span>From your ${esc(v.name)}</span></div>
      ${c.safetyConcern ? `<div class="notice warn" style="--i:0"><b>Please don't carry this alone.</b><span>Beyond isn't watched by a person. If you're struggling, people can help right now.</span><button class="btn sm" data-go="support" style="justify-self:start">See who to talk to</button></div>` : ''}
      <header style="--i:1">${greet ? `<p class="greet">${esc(greet)}</p>` : ''}<h1 class="headline">${esc(c.headline)}</h1></header>
      <section class="ls" style="--i:2">${secLabel('recap')}<div class="ls-body"><p>${esc(c.recap)}</p></div></section>
      <section class="ls" style="--i:3">${secLabel('insight')}<div class="ls-body">
        ${insights.map((a, i) => `<div class="insight"><b>${esc(a.title)}</b><p>${esc(a.text)}</p>${a.quote ? `<button class="quote" data-q="${i}" title="Show where you wrote this">“${esc(a.quote)}”</button>` : ''}</div>`).join('')}
      </div></section>
      ${c.challenge ? `<section class="ls" style="--i:4">${secLabel('challenge')}<div class="ls-body"><p class="issue">${esc(c.challenge.issue)}</p>${c.challenge.cause ? `<p class="cause"><b>Why</b><span>${esc(c.challenge.cause)}</span></p>` : ''}</div></section>` : ''}
      <section class="ls" style="--i:5">${secLabel('improve')}<div class="ls-body"><p>${esc(c.advice.text)}</p></div></section>
      ${enc || sign ? `<section class="ls" style="--i:6">${secLabel('encourage')}<div class="ls-body">${enc ? `<p>${esc(enc)}</p>` : ''}${sign ? `<p class="signoff">${esc(sign)}</p>` : ''}</div></section>` : ''}
      <button class="todo-cta" data-todo="${L.id}" style="--i:7">${ring(L)}<span class="t"><b>Today's 3 to-dos</b><span>${p.complete ? 'All done. Gold seal earned.' : `${p.done} of ${p.need} done. Tap to check them off.`}</span></span></button>
      <details class="words-d" style="--i:8"><summary>Your words from that night</summary>
        <ul class="words">${L.entries.map((e) => `<li><span class="k">${esc(e.t || '')}</span><p>${highlight(e)}</p></li>`).join('')}</ul>
      </details>
      ${(() => { const learned = (S.memories || []).filter((m) => m.letterIds.includes(L.id)); return learned.length ? `<div class="remembers" style="--i:9"><span class="k">Beyond will remember</span><ul>${learned.map((m) => `<li>${esc(m.text)}</li>`).join('')}</ul><button class="link" data-go="settings" data-to="memory">See, edit or forget</button></div>` : ''; })()}
      <div class="provenance" style="--i:9"><span>${by}</span>
        <button class="toggle" role="switch" aria-checked="${!!L.private}" data-private="${L.id}"><span class="track"></span><span>Keep this night out of Patterns</span></button>
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
      <div class="sheet-head">${ring(L, 52)}<div class="t"><span class="sheet-date">${fmtDay(L.date)}${L.sample ? ', sample' : L.demo ? ', demo' : ''}</span><h2 id="sheet-t">Today's 3 to-dos</h2></div><button class="x" data-close aria-label="Close">${I.x}</button></div>
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

/* ----- letters: the latest one as a cover, then every letter, searchable ----- */
function letterRow(l, extra = '') {
  const d = parse(l.date); const p = progress(l);
  return `<li class="lrow">
    <button class="lmain" data-open="${l.id}"><time>${d.getDate()}<small>${WD[d.getDay()]}</small></time>
      <span class="head">${!l.readAt ? '<i class="new" aria-label="New"></i>' : ''}<span class="h">${extra && extra.head ? extra.head : esc(l.content.headline)}</span>${l.sample ? '<span class="smp">sample</span>' : l.demo ? '<span class="smp">demo</span>' : ''}${extra && extra.snip ? `<span class="snip">${extra.snip}</span>` : ''}</span></button>
    <button class="ring-btn" data-todo="${l.id}" aria-label="To-dos for ${fmtDay(l.date)}: ${p.complete ? 'all done, gold seal' : `${p.done} of ${p.need} done`}">${ring(l, 40)}</button>
  </li>`;
}
function vLetters() {
  const list = allLetters();
  const ready = list.filter(delivered);
  const pending = S.letters.filter((l) => !delivered(l));
  const nights = new Set(list.map((l) => l.date)).size;
  const firstNight = list.length ? list.reduce((m, l) => (l.date < m.date ? l : m)) : null;
  const seals = ready.filter((l) => progress(l).complete).length;
  const cover = ready[0];
  if (nights >= 5 && !countedUp) { countedUp = true; after.push(() => countUp($('.count-up'))); }
  after.push(() => { tiltCover($('.cover')); riseOnScroll('.month-group'); });
  return `<header class="page-head">
      <h1 class="display">Letters</h1>
      <p class="lead">${nights ? `<span class="count-up" data-n="${nights}">${nights}</span> ${nights === 1 ? 'night' : 'nights'} written since ${fmtLong(firstNight.date)}. ${plural(ready.length, 'letter')} arrived, ${seals} with a gold seal.` : 'Your morning letters collect here.'}</p>
    </header>
    ${sampleBanner()}
    ${pending.length ? `<p class="arrived">${I.mail}<span>Your letter for ${fmtDay(pending[0].date)} arrives at ${atTime(pending[0])}.</span> <button class="link" data-go="tonight">Open Journal</button></p>` : ''}
    ${!cover ? `<section class="empty"><span class="empty-mark" aria-hidden="true">${I.moon}${I.star}</span><p class="lead">No letters yet. Write tonight and the first one arrives tomorrow morning.</p><button class="btn amber" data-go="tonight">Write tonight</button></section>` : `
    <section class="cover-wrap" aria-label="Latest letter">
      <article class="cover paper">
        <span class="paper-moon" aria-hidden="true">${I.moon}${I.star}</span>
        <p class="cover-k">${!cover.readAt ? 'New letter' : 'Latest letter'}, ${fmtDay(cover.date)}${cover.sample ? ', sample' : cover.demo ? ', demo letter' : ''}</p>
        <button class="cover-h" data-open="${cover.id}">${esc(cover.content.headline)}</button>
        <p class="cover-r">${esc(clip(cover.content.recap, 240))}</p>
        <div class="row"><button class="btn sm" data-open="${cover.id}">Read the letter</button><button class="todo-cta cover-todo" data-todo="${cover.id}">${ring(cover, 40)}<span class="t"><b>Today's 3 to-dos</b><span>${progress(cover).complete ? 'Gold seal earned.' : `${progress(cover).done} of ${progress(cover).need} done`}</span></span></button></div>
      </article>
    </section>
    <section class="spread" id="archive"><div class="sec-col"><h2 class="sec">All letters</h2><p class="fine">Search titles, summaries, the words you wrote and your to-dos, in any language.</p></div><div>${archive()}</div></section>`}`;
}
/* The cover letter leans toward the pointer, like paper picked up off a desk. */
function tiltCover(el) {
  if (!el || reduceMotion() || !window.matchMedia('(pointer: fine)').matches) return;
  let raf = 0;
  el.addEventListener('pointermove', (e) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--ry', `${((x - .5) * 7).toFixed(2)}deg`); el.style.setProperty('--rx', `${((.5 - y) * 6).toFixed(2)}deg`);
      el.style.setProperty('--sx', `${(x * 100).toFixed(1)}%`); el.style.setProperty('--sy', `${(y * 100).toFixed(1)}%`); el.classList.add('is-tilting'); });
  });
  el.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); el.classList.remove('is-tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
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

/* ----- patterns: Month · Year · Identity ----- */
const PTABS = [['month', 'Month'], ['year', 'Year']];
const DIRECTIONS = [
  { key: 'young-entrepreneur', name: 'Young Entrepreneur', themes: ['business'], blurb: 'turning ideas into something people can use or buy' },
  { key: 'maker-builder', name: 'Maker & Builder', themes: ['technology'], blurb: 'building things like apps, sites and prototypes' },
  { key: 'creative-explorer', name: 'Creative Explorer', themes: ['creativity'], blurb: 'making things for the joy of making them' },
  { key: 'curious-learner', name: 'Curious Learner', themes: ['learning'], blurb: 'following questions because they interest you' },
  { key: 'community-builder', name: 'Community Builder', themes: ['community'], blurb: 'bringing people together and showing up for others' },
  { key: 'world-explorer', name: 'World Explorer', themes: ['nature', 'travel'], blurb: 'getting outside and seeing new places' },
];
const SAMPLE_DIRS = { 'community-builder': 'confirmed', 'curious-learner': 'suggested', 'creative-explorer': 'suggested' };
/* Pre-written notes for Kit's sample (so Month and Year show a note even offline). */
const SAMPLE_NOTES = {
  month: { anchor: ['l_d18', 'l_d19', 'l_d20', 'l_d21', 'l_d22', 'l_d23'], text: 'This month sounds different from the first weeks of term. Feeling alone came up only once, and even then you wrote “I didn’t feel lost after hanging up”. Most of your nights were about Tuesdays with the kids and Saturdays with the photo society, and on one of them you walked over to someone standing alone at the door, “exactly like me in my first week”. The question about your major is still open, but you’ve started answering it with real conversations instead of guesses.' },
  year: { text: 'Your year so far started with a question about what to want next, and the first weeks at university were the loneliest stretch of it. After that, two threads kept growing: helping kids learn on Tuesdays, and asking questions in class until you forgot to check the time. You don’t have a job title in mind, and you don’t need one yet. What your nights point to is something you wrote yourself: “I like helping people figure things out”.' },
};
function sampleNote(key) {
  if (!demoOn() || !SAMPLE.length) return null;
  if (key.startsWith('Y')) return key.slice(1) === sampleDate(SAMPLE[SAMPLE.length - 1]).slice(0, 4) ? SAMPLE_NOTES.year.text : null;
  const count = {}; for (const id of SAMPLE_NOTES.month.anchor) { const s = SAMPLE.find((x) => x.id === id); if (s) { const ym = sampleDate(s).slice(0, 7); count[ym] = (count[ym] || 0) + 1; } }
  const best = Object.entries(count).sort((a, b) => b[1] - a[1])[0];
  return best && best[0] === key ? SAMPLE_NOTES.month.text : null;
}
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

function vPatterns() {
  const tab = param === 'year' ? 'year' : 'month';
  const body = tab === 'year' ? pYear() : pMonthView();
  const sub = { month: 'What took up this month, what changed, and what you did.', year: 'Your year as one sky, and one frame per month in your own words.' }[tab];
  return `<header class="page-head">
      <h1 class="display">Your patterns, not their highlight reel.</h1>
      <div class="page-aside"><nav class="switch" aria-label="Patterns views">${PTABS.map(([k, l]) => `<button data-ptab="${k}" ${tab === k ? 'aria-current="page"' : ''}>${l}</button>`).join('')}</nav>
      <p class="lead">${sub}</p></div>
    </header>
    ${sampleBanner()}
    ${body}`;
}
function skyCard(label, chips, selected) {
  return `<section class="sky-wrap" aria-label="${esc(label)}">
      <div class="sky-head"><p>${esc(label)}</p><p class="sky-legend"><span><i class="tone-dot tone-positive"></i>lighter night</span><span><i class="tone-dot tone-difficult"></i>heavier night</span></p></div>
      <div class="sky" id="sky"></div>
      ${chips.length ? `<div class="chips sky-chips" role="group" aria-label="Draw a theme's constellation">${chips.map(([t, c]) => `<button class="chip" data-theme="${t}" aria-pressed="${selected === t}">${esc(cap(THEMES[t]))}<small>${c}</small></button>`).join('')}</div>` : ''}
    </section>`;
}

/* --- Month --- */
function pMonthView() {
  const list = keptLetters();
  const months = monthKeys(list);
  const cur = journalDate().slice(0, 7);
  if (!pMonth || (!months.includes(pMonth) && pMonth !== cur)) {
    const counts = Object.fromEntries(months.map((m) => [m, list.filter((l) => l.date.startsWith(m)).length]));
    pMonth = (counts[cur] || 0) >= 3 ? cur : ([...months].reverse().find((m) => counts[m] >= 3) || months[months.length - 1] || cur);
  }
  const inMonth = list.filter((l) => l.date.startsWith(pMonth)).sort((a, b) => a.date.localeCompare(b.date));
  const [y, m] = pMonth.split('-').map(Number);
  const idx = months.indexOf(pMonth);
  const older = idx === -1 ? months[months.length - 1] : months[idx - 1];
  const newer = idx >= 0 ? months[idx + 1] : null;
  const themes = countThemes(inMonth);
  if (pTheme && !themes.some(([t]) => t === pTheme)) pTheme = null;
  if (!autoDrawn[pMonth] && themes.length) { autoDrawn[pMonth] = true; const first = themes[0][0]; const forMonth = pMonth; setTimeout(() => { if (route === 'patterns' && !param && !pTheme && pMonth === forMonth) { pTheme = first; render(); } }, 1400); }
  // what changed
  const pk = prevMonthOf(pMonth); const prev = list.filter((l) => l.date.startsWith(pk));
  const pc = new Map(countThemes(prev)); const tc = new Map(themes);
  const changes = [...new Set([...tc.keys(), ...pc.keys()])].map((t) => ({ t, before: pc.get(t) || 0, after: tc.get(t) || 0 }))
    .filter((c) => Math.abs(c.after - c.before) >= 2).sort((a, b) => Math.abs(b.after - b.before) - Math.abs(a.after - a.before)).slice(0, 3);
  // what you did
  let tried = 0, total = 0, seals = 0; const done = [];
  for (const l of inMonth) { const p = progress(l); tried += p.done; total += p.total; if (p.complete) seals++; l.content.steps.forEach((st, i) => { if (l.actions?.[`step.${i}`] === 'tried') done.push({ text: st.text, id: l.id }); }); }
  // still on your mind
  const open = [...inMonth].reverse().flatMap((l) => (l.content.openQuestions || []).map((q) => ({ q, l }))).slice(0, 3);
  const used = new Set();
  const quoteFor = (t) => { for (const l of [...inMonth].reverse()) if (realThemes(l).includes(t)) { const a = (l.content.analysis || []).find((x) => x.quote && !used.has(x.quote)); if (a) { used.add(a.quote); return { q: a.quote, l }; } } return null; };
  after.push(() => { skyState = { list: inMonth, from: `${pMonth}-01`, to: lastDayOf(pMonth), ticks: 'month', theme: () => pTheme }; drawSky(); });
  const short = (ym) => MON[+ym.slice(5) - 1];
  return `<div class="month-nav">
      <button class="iconbtn" data-month="${older || ''}" ${older ? '' : 'disabled'} aria-label="Previous month">${I.left}</button>
      <h2 class="h2">${MONTH[m - 1]} ${y}</h2>
      <button class="iconbtn" data-month="${newer || ''}" ${newer ? '' : 'disabled'} aria-label="Next month">${I.right}</button></div>
    ${skyCard(`${plural(inMonth.length, 'night')} written`, themes.slice(0, 6), pTheme)}
    ${inMonth.length ? `<div class="qcards">
      <section class="qcard"><h3 class="k">What took up your month</h3>
        ${themes.slice(0, 3).map(([t, c]) => { const q = quoteFor(t); return `<div class="theme-line"><div class="tl-top"><b>${esc(cap(THEMES[t]))}</b><span class="fine">${c} of ${plural(inMonth.length, 'night')}</span></div><span class="bar"><i class="tone-positive" style="width:${(c / inMonth.length) * 100}%"></i></span>${q ? `<button class="quote" data-open="${q.l.id}">“${esc(q.q)}”</button>` : ''}</div>`; }).join('') || '<p class="fine">Mostly ordinary days.</p>'}
      </section>
      <section class="qcard"><h3 class="k">What changed since ${short(pk)}</h3>
        ${!prev.length ? `<p class="fine">No kept letters from ${short(pk)} to compare with.</p>` : !changes.length ? `<p class="fine">About the same things came up as in ${short(pk)}.</p>`
          : `<ul class="changes">${changes.map((c) => `<li><b>${esc(cap(THEMES[c.t]))}</b><span class="dots" aria-label="${c.before} nights in ${short(pk)}, ${c.after} this month"><span class="was">${'<i></i>'.repeat(Math.min(c.before, 10)) || '<em>none</em>'}</span><span class="arrow">→</span><span class="now">${'<i></i>'.repeat(Math.min(c.after, 10)) || '<em>none</em>'}</span></span><span class="fine">${c.after > c.before ? 'more' : 'less'} often</span></li>`).join('')}</ul>`}
        <p class="fine">Counted in nights. “Less often” doesn't mean it's solved.</p>
      </section>
      <section class="qcard"><h3 class="k">What you did</h3>
        <span class="big">${tried}<small> of ${total} to-dos</small></span>
        ${seals ? `<p class="fine">${plural(seals, 'letter')} earned a gold seal.</p>` : ''}
        ${done.length ? `<ul class="done-list">${done.slice(0, 4).map((x) => `<li><span class="tick">${I.check}</span><button class="link" data-open="${x.id}">${esc(x.text)}</button></li>`).join('')}</ul>` : '<p class="fine">Nothing ticked off this month. That’s fine; every to-do is optional.</p>'}
      </section>
      <section class="qcard"><h3 class="k">Still on your mind</h3>
        ${open.length ? `<ul class="open-list">${open.map((o) => `<li><button class="quote" data-open="${o.l.id}">“${esc(o.q)}”</button><span class="fine">${fmtDay(o.l.date)}</span></li>`).join('')}</ul>` : '<p class="fine">No open questions in this month’s letters.</p>'}
      </section>
    </div>
    ${noteCard(pMonth, `A note on ${MONTH[m - 1]}`, inMonth.length)}` : `<p class="lead">No kept letters in this month yet.</p>`}`;
}

/* --- Year --- */
function pYear() {
  const list = keptLetters().sort((a, b) => a.date.localeCompare(b.date));
  if (!list.length) return `<p class="lead">Your year fills in as letters arrive. Each night you write becomes a star.</p>`;
  const from = `${list[0].date.slice(0, 7)}-01`; const to = journalDate();
  const themes = countThemes(list).slice(0, 5);
  if (yTheme && !themes.some(([t]) => t === yTheme)) yTheme = null;
  after.push(() => { skyState = { list, from, to, ticks: 'year', theme: () => yTheme }; drawSky(); });
  const months = []; let k = from.slice(0, 7); const cur = to.slice(0, 7);
  while (k <= cur) { months.push(k); const [yy, mm] = k.split('-').map(Number); k = mm === 12 ? `${yy + 1}-01` : `${yy}-${pad(mm + 1)}`; }
  const usedQ = new Set();
  const frames = months.map((ym) => {
    const ls = list.filter((l) => l.date.startsWith(ym));
    const top = countThemes(ls)[0]?.[0];
    let q = null;
    for (const l of [...ls].reverse()) { if (top && !realThemes(l).includes(top)) continue; const a = (l.content.analysis || []).find((x) => x.quote && !usedQ.has(x.quote)); if (a) { q = a.quote; usedQ.add(q); break; } }
    return { ym, n: ls.length, top, q, finished: ym < cur, sample: ls.some((l) => l.sample) };
  });
  const [ny, nm] = cur.split('-').map(Number); const next = nm === 12 ? `${ny + 1}-01` : `${ny}-${pad(nm + 1)}`;
  const year = to.slice(0, 4);
  return `${skyCard(`${plural(list.length, 'night')} kept since ${MONTH[+from.slice(5, 7) - 1]}`, themes, yTheme)}
    <section class="film-wrap" aria-labelledby="film-h">
      <div class="film-head"><h2 id="film-h" class="h2">Your Life Film</h2><p class="fine">One frame per month, with a line you wrote that month. Nobody else is in it to compare against.</p></div>
      <div class="film" tabindex="0" aria-label="Life Film frames">
        ${frames.map((f, i) => { const [a, b] = FRAME[f.top] || ['#4a3328', '#1c1411']; return f.n
          ? `<button class="frame" data-film="${f.ym}" style="--g:${b};--a:${a};--i:${i}" aria-label="${MONTH[+f.ym.slice(5) - 1]}: open this month"><span class="k">${MON[+f.ym.slice(5) - 1]} ${f.ym.slice(0, 4)}${f.sample ? ' · sample' : ''}</span><p>${f.q ? `“${esc(f.q)}”` : esc(cap(THEMES[f.top] || 'an ordinary month'))}</p><span class="k">${f.finished ? plural(f.n, 'night') : `In progress · ${plural(f.n, 'night')}`}${f.top ? ` · ${esc(THEMES[f.top])}` : ''}</span></button>`
          : `<div class="frame is-blank" style="--i:${i}"><span class="k">${MON[+f.ym.slice(5) - 1]} ${f.ym.slice(0, 4)}</span><p>No letters.</p><span></span></div>`; }).join('')}
        <div class="frame is-blank"><span class="k">${MON[+next.slice(5) - 1]} ${next.slice(0, 4)}</span><p>Not written yet.</p><span></span></div>
      </div>
    </section>
    ${noteCard(`Y${year}`, `A note on your year so far`, list.filter((l) => l.date.startsWith(year)).length)}`;
}

/* --- notes written by the AI (month and year) --- */
function noteCard(key, title, n) {
  const sn = !S.notes[key] && sampleNote(key);
  const note = S.notes[key] || (sn ? { text: sn, n, by: 'sample' } : null); const busy = noteInflight === key;
  return `<section class="qcard note"><h3 class="k">${esc(title)}</h3>
    ${note ? `<p>${esc(note.text)}</p><span class="fine">${note.by === 'sample' ? 'Kit’s sample note, pre-written for the demo.' : note.by === 'demo' ? `A pre-written sample note for demo mode, built from ${plural(note.n, 'letter')} and their own words.` : `Written by ${esc(note.by || 'Claude')} from ${plural(note.n, 'letter')}.`}</span>${note.n !== n ? `<button class="btn sm secondary" data-note="${key}">Write it again</button>` : ''}`
      : busy ? `<p class="writing">Reading your letters…</p>`
      : claudeState === 'ready' ? `<p class="fine">A short note that quotes only your own words.</p><button class="btn sm amber" data-note="${key}">Write this note</button>`
      : `<p class="fine">Notes are written by Beyond’s letter writer, which isn’t switched on yet.</p>`}
    ${noteErr && !busy ? `<p class="fine" style="color:var(--rose)">${esc(noteErr)}</p>` : ''}
  </section>`;
}
let noteInflight = null; let noteErr = '';
async function writeNote(key) {
  if (noteInflight) return;
  if (claudeState !== 'ready') return;
  noteInflight = key; noteErr = ''; render();
  try {
    const n = await backend.writeNote(key);
    S.notes[key] = { text: n.text, n: n.letter_count, by: n.model || 'Claude', at: n.created_at };
  } catch (e) {
    noteErr = e?.code === 'rate_limited' ? 'Today’s notes are used up. Try again tomorrow.' : e?.code === 'conflict' ? 'There are no kept letters here yet.' : 'The note couldn’t be written. Try again.';
  }
  noteInflight = null; if (route === 'patterns') render();
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
  if (ticks === 'month') { const days = dayDiff(to, from) + 1; tickList = [1, 8, 15, 22, 29].filter((d) => d <= days).map((d) => ({ x: padX + ((d - 1) / span) * (W - 2 * padX), label: String(d) })); }
  else { let k = from.slice(0, 7); while (`${k}-01` <= to) { const off = dayDiff(`${k}-01`, from); tickList.push({ x: padX + (off / span) * (W - 2 * padX), label: MON[+k.slice(5) - 1] }); const [yy, mm] = k.split('-').map(Number); k = mm === 12 ? `${yy + 1}-01` : `${yy}-${pad(mm + 1)}`; } }
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${plural(stars.length, 'night')}${theme ? `, ${chosen.length} about ${esc(THEMES[theme])}` : ''}">
    <defs><radialGradient id="glow"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="#fbe9d2" stop-opacity=".35"/><stop offset="1" stop-color="#fbe9d2" stop-opacity="0"/></radialGradient></defs>
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
function directionTimeline(f) {
  const all = keptLetters(); if (!all.length || !f.evidence.length) return '';
  const dates = all.map((l) => l.date).sort(); const from = `${dates[0].slice(0, 7)}-01`; const to = lastDayOf(dates[dates.length - 1].slice(0, 7));
  const span = Math.max(1, dayDiff(to, from)); const W = 600, H = 64, pad = 14; const x = (d) => pad + (dayDiff(d, from) / span) * (W - 2 * pad);
  const months = []; let k = from.slice(0, 7); while (`${k}-01` <= to) { months.push(k); const [yy, mm] = k.split('-').map(Number); k = mm === 12 ? `${yy + 1}-01` : `${yy}-${pad2(mm + 1)}`; }
  const ev = new Set(f.evidence.map((l) => l.id));
  return `<svg class="tl" viewBox="0 0 ${W} ${H}" role="img" aria-label="${plural(f.evidence.length, 'letter')} about ${esc(f.name)}, from ${MON[+from.slice(5, 7) - 1]} to ${MON[+to.slice(5, 7) - 1]}">
    <path class="tl-line" d="M${pad} 30 C ${W * .3} 27, ${W * .6} 33, ${W - pad} 29"/>
    ${months.map((m) => `<text class="tl-m" x="${x(`${m}-01`).toFixed(1)}" y="${H - 4}">${MON[+m.slice(5) - 1]}</text>`).join('')}
    ${all.filter((l) => !ev.has(l.id)).map((l) => `<circle class="tl-dot" cx="${x(l.date).toFixed(1)}" cy="30" r="2"/>`).join('')}
    ${f.evidence.map((l, i) => `<path class="tl-star" style="--i:${i}" d="${sparkle(l.id, 7)}" transform="translate(${x(l.date).toFixed(1)} 30)"/>`).join('')}
  </svg>`;
}
const pad2 = (n) => String(n).padStart(2, '0');
function vIdentity() {
  const all = directions();
  const visible = all.filter((d) => (d.status === 'confirmed' && d.evidence.length) || (d.status === 'suggested' && d.sufficient));
  const hidden = all.filter((d) => d.status === 'dismissed' || d.status === 'removed');
  const f = visible.find((d) => d.id === identFocus) || null;
  if (!f) identFocus = null;
  const n = nightsToFirst(all); const kept = keptLetters().length;
  const max = Math.max(1, ...visible.map((d) => d.days));
  after.push(() => startBubbles(visible));
  // home: the constellation comes first, with no heading or veil in front of it
  return `<h1 class="sr-only">Identity</h1>
    <section class="ident" aria-label="Your directions">
      ${visible.length ? `<div class="stage ${identVeiled ? 'is-veiled' : ''} ${f ? 'has-focus' : ''}" id="stage">
        <canvas class="stage-sky" aria-hidden="true"></canvas>
        <div class="parallax"><div class="stage-layer"><svg class="stage-links" aria-hidden="true"></svg></div></div>
      </div>
      <p class="fine legend">You are at the centre. Larger circles have more nights behind them, and brighter threads mean a stronger pull. Select a direction to see its letters circle it.</p>`
      : `<div class="empty"><span class="empty-mark" aria-hidden="true">${miniMap([])}</span><p class="lead">Write ${plural(n, 'more night')} to see your first direction.</p><p class="fine">A direction appears once kept letters from at least three different nights point to it.</p><button class="btn amber" data-go="tonight">Write tonight</button></div>`}
    </section>
    <div class="spread ${f ? 'is-focus' : ''}">
      ${f ? `<section class="focus" aria-label="${esc(f.name)}">
        <div class="focus-top"><p class="focus-st ${f.status === 'confirmed' ? 'is-confirmed' : ''}">${f.status === 'confirmed' ? 'Confirmed by you' : 'A possibility'}</p><button class="x-btn" data-bubble="" aria-label="Close">${I.x}</button></div>
        <h2 class="focus-name">${esc(f.name)}</h2>
        <p class="focus-expl">${esc(f.explanation)}</p>
        <div class="strength"><p><b>${f.days}</b> of your ${plural(kept, 'kept night')}</p><span class="meter" aria-hidden="true"><i style="--w:${Math.max(4, (f.days / Math.max(1, kept)) * 100).toFixed(1)}%"></i></span></div>
        <h3 class="qh">When it showed up</h3>
        ${directionTimeline(f)}
        <h3 class="qh">Evidence: ${plural(f.evidence.length, 'letter')}</h3>
        <ul class="ev-list">${f.evidence.slice(0, 6).map((l) => `<li><span class="k">${fmtDay(l.date)}${l.sample ? ', sample' : ''}</span><button class="link" data-open="${l.id}">${esc(l.content.headline)}</button></li>`).join('')}</ul>
        <div class="row">${f.status === 'suggested' ? `<button class="btn sm amber" data-dir="${f.key}" data-st="confirmed">This fits me</button><button class="link" data-dir="${f.key}" data-st="dismissed">Not for me</button>` : `<button class="link" data-dir="${f.key}" data-st="removed">Remove from my map</button>`}</div>
      </section>` : `<h2 class="sec">All directions</h2>`}
      <section class="dirs">${f ? '<h3 class="qh">All directions</h3>' : ''}
        ${visible.length ? `<ul class="dir-list">${visible.map((d) => `<li class="${d.id === identFocus ? 'is-current' : ''}"><button class="link" data-bubble="${d.id}">${esc(d.name)}</button><span class="fine">${d.status === 'confirmed' ? '<b class="is-confirmed">Confirmed</b>' : 'Suggested'}, ${plural(d.days, 'night')}</span><span class="dir-bar" aria-hidden="true"><i style="--w:${((d.days / max) * 100).toFixed(1)}%"></i></span></li>`).join('')}</ul>` : '<p class="fine">Nothing yet.</p>'}
        ${hidden.length ? `<details class="words-d"><summary>Dismissed or removed (${hidden.length})</summary><ul class="dir-list">${hidden.map((d) => `<li><span>${esc(d.name)}</span><button class="link" data-dir="${d.key}" data-st="suggested">Restore</button></li>`).join('')}</ul></details>` : ''}
        <p class="fine">Suggested only when kept letters from at least three different nights point to it. Private letters are never used.</p>
      </section>
    </div>`;
}
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
  svg.innerHTML = `<defs><radialGradient id="corehalo"><stop offset="0" stop-color="#ffe9c4" stop-opacity=".55"/><stop offset="1" stop-color="#e3955a" stop-opacity="0"/></radialGradient></defs>`
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
    b.innerHTML = `<span class="orb"><svg class="orb-line" viewBox="0 0 100 100" aria-hidden="true"><path d="${wobble(d.key, 50, 50, 46, .045, 11)}"/><path class="orb-line2" d="${wobble(`${d.key}2`, 50, 50, 44, .05, 9)}"/></svg><span class="orb-st">${d.status === 'confirmed' ? 'confirmed' : 'suggested'}</span><span class="orb-name" style="font-size:${fs}px">${esc(d.name)}</span><span class="orb-n">${plural(d.days, 'night')}</span></span>`;
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
  const frame = (t) => {
    if (!document.body.contains(stage)) return;
    px += (tx - px) * .06; py += (ty - py) * .06;
    par.style.transform = `translate3d(${(-px * 22).toFixed(2)}px, ${(-py * 16).toFixed(2)}px, 0)`;
    sky.style.transform = `translate3d(${(-px * 8).toFixed(2)}px, ${(-py * 6).toFixed(2)}px, 0) scale(1.04)`;
    g2.clearRect(0, 0, W, H);
    for (const s of stars) { g2.globalAlpha = still ? s.a : s.a * (.55 + .45 * Math.sin(t / s.p + s.ph)); g2.fillStyle = '#fbe9d2'; g2.beginPath(); g2.arc(s.x, s.y, s.r, 0, 6.283); g2.fill(); }
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
const fmtLong = (s) => { const d = parse(s); return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`; };
function memRow(m) {
  const src = m.kind === 'told' ? 'You told Beyond' : m.letterIds.map((id) => findLetter(id)).filter(Boolean).map((l) => `<button class="link" data-open="${l.id}">${fmtDay(l.date)}</button>`).join(', ') || 'From a letter';
  if (memEditing === m.id) return `<li class="mem"><form class="mem-edit" data-memform="${m.id}"><label class="sr-only" for="mem-${m.id}">Edit memory</label><input id="mem-${m.id}" class="login-in" value="${esc(m.text)}" maxlength="140"><button class="btn sm amber" type="submit">Save</button><button class="link" type="button" data-memcancel>Cancel</button></form></li>`;
  return `<li class="mem ${memoryInUse(m) && !S.memoryPaused ? '' : 'is-off'}"><p>${esc(m.text)}</p>
    <span class="fine">${m.kind === 'told' ? src : `Learned from ${src}`}${m.sample ? ', sample' : ''}${!memoryInUse(m) ? '. Not used: its letter is kept out of Patterns' : ''}</span>
    <span class="mem-acts">${m.sample ? '' : `<button class="link" data-memedit="${m.id}">Edit</button>`}<button class="link" data-memforget="${m.id}">Forget</button></span></li>`;
}
let countedUp = false;
function countUp(el) {
  if (!el || reduceMotion()) return;
  const n = +el.dataset.n; const t0 = performance.now(); const dur = 1100;
  const tick = (t) => { const k = Math.min(1, (t - t0) / dur); el.textContent = String(Math.round(n * (1 - (1 - k) ** 3))); if (k < 1 && document.body.contains(el)) requestAnimationFrame(tick); };
  el.textContent = '0'; requestAnimationFrame(tick);
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
  return { title: l.content.headline || '', summary: l.content.recap || '', words: (l.entries || []).map((e) => e.text).join('\n\n'), todos: (l.content.steps || []).map((x) => x.text) };
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
  return filtered ? `${plural(n, 'letter')} of ${ready.length}.` : `${plural(ready.length, 'letter')}.`;
}
function archiveResults() {
  const { ready, terms, found } = archiveMatches();
  if (!ready.length) return '<p class="fine">Your letters will collect here, month by month.</p>';
  if (!found.length) return `<p class="lead">Nothing matches${terms.length ? ` “${esc(arch.q.trim())}”` : ''}.</p><p class="fine">Try fewer words, another spelling, or <button class="link" data-act="arch-clear">clear the search and filters</button>.</p>`;
  const groups = {};
  for (const x of found) (groups[x.l.date.slice(0, 7)] = groups[x.l.date.slice(0, 7)] || []).push(x);
  const LABEL = { summary: 'Summary', words: 'Your words', todos: 'To-do' };
  return Object.entries(groups).map(([m, xs]) => `<section class="month-group"><h3><b>${MONTH[+m.slice(5) - 1]}</b> ${m.slice(0, 4)}<span>${plural(xs.length, 'letter')}</span></h3>
    <ul class="lrows">${xs.map(({ l }) => {
      if (!terms.length) return letterRow(l);
      const f = letterFields(l); let snip = '';
      for (const k of ['summary', 'words', 'todos']) {
        const hit = k === 'todos' ? f.todos.find((t) => termRe(terms).test(t)) : f[k];
        const sn = hit && snippetOf(hit, terms); if (sn) { snip = `<em>${LABEL[k]}</em> ${sn}`; break; }
      }
      return letterRow(l, { head: hl(f.title, terms), snip });
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
      <div class="arch-filters">
        <label class="pick" for="arch-month"><span>Month</span><select id="arch-month"><option value="">All</option>${months.map((m) => `<option value="${m}" ${arch.month === m ? 'selected' : ''}>${MONTH[+m.slice(5) - 1]} ${m.slice(0, 4)}</option>`).join('')}</select></label>
        <label class="pick" for="arch-theme"><span>Theme</span><select id="arch-theme"><option value="">All</option>${themes.map((t) => `<option value="${t}" ${arch.theme === t ? 'selected' : ''}>${esc(cap(THEMES[t]))}</option>`).join('')}</select></label>
        <button class="filter-seal" data-act="arch-gold" aria-pressed="${arch.gold}">${goldSeal(20)}<span>Gold seal only</span></button>
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
    <section class="spread" id="letters-settings"><h2 class="sec">Letters</h2><div class="stack">
      <h3 class="qh">Who writes your letters</h3>
      <div class="voices" role="group" aria-label="Letter voice">${voiceCards()}</div>
      <p class="fine">Applies to your next letter. The voice changes tone only, never the facts.</p>
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
      <p class="fine">The AI sees only the entry it writes about, the headlines of a few earlier letters, and your memories (unless paused). It never sees letters you keep out of Patterns.</p>
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
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg; $('#layer').appendChild(t); setTimeout(() => t.remove(), 2600); }

/* ---------- events ---------- */
document.addEventListener('click', async (ev) => {
  const star = ev.target.closest('[data-star]');
  if (star) { pTip = pTip === star.dataset.star ? null : star.dataset.star; return drawSky(); }
  const el = ev.target.closest('button, a, [data-close]');
  if (!el) { if (route === 'patterns' && pTip && !ev.target.closest('.ns-tip')) { pTip = null; drawSky(); } return; }
  const d = el.dataset;
  if (d.close !== undefined) return closeSheet();
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
  if (d.open) { pTip = null; return go('letter', d.open); }
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
  if (d.month !== undefined) { if (!d.month) return; pMonth = d.month; pTheme = null; pTip = null; return render(); }
  if (d.theme) { if (param === 'year') yTheme = yTheme === d.theme ? null : d.theme; else pTheme = pTheme === d.theme ? null : d.theme; pTip = null; return render(); }
  if (d.ptab) { pTip = null; identFocus = null; return go('patterns', d.ptab === 'month' ? null : d.ptab); }
  if (d.film) { pMonth = d.film; pTheme = null; pTip = null; return go('patterns'); }
  if (d.note) return writeNote(d.note);
  if (d.bubble !== undefined) { identVeiled = false; identFocus = d.bubble && identFocus !== d.bubble ? d.bubble : null; render(); if (identFocus) $('.focus')?.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'nearest' }); return; }
  if (d.dir) { S.dirs = { ...(S.dirs || {}), [d.dir]: d.st }; save(); const name = DIRECTIONS.find((x) => x.key === d.dir)?.name; toast({ confirmed: `${name} is now on your map.`, dismissed: 'Dismissed. It won’t be suggested again unless you restore it.', removed: 'Removed from your map.', suggested: 'Restored to suggestions.' }[d.st]); if (d.st !== 'confirmed') identFocus = null; return render(); }
  if (d.q !== undefined) {
    const det = $('details.words-d'); if (det) det.open = true;
    const m = $(`#q-${d.q}`); if (m) { m.scrollIntoView({ behavior: reduceMotion() ? 'auto' : 'smooth', block: 'center' }); m.classList.add('is-flash'); setTimeout(() => m.classList.remove('is-flash'), 1600); } return;
  }
  if (d.private) { const L = findLetter(d.private); const next = !L.private; patchLetter(L.id, { private: next }); toast(next ? 'Kept out of Patterns. The letter stays here.' : 'This night is back in Patterns.'); return render(); }
  if (d.openenv) {
    const env = $('#env'); el.disabled = true;
    if (env) env.classList.add('is-open');
    await sleep(reduceMotion() ? 50 : 1500);
    opening = d.openenv; patchLetter(d.openenv, { readAt: new Date().toISOString() });
    render(); window.scrollTo(0, 0); return;
  }
  if (d.retry) { writeLetter(d.retry); return render(); }
  if (d.login) { loginMode = d.login; loginNote = ''; return render(); }
  if (d.copy) { try { await navigator.clipboard.writeText(d.copy); toast(`Copied ${d.copy}`); } catch (e) { const r = document.createRange(); r.selectNodeContents(el.parentElement.querySelector('b')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } return; }
  switch (d.act) {
    case 'start-own': welcomeStep = 1; return render();
    case 'toggle-early': S.allowEarly = S.allowEarly === false; save(); toast(S.allowEarly ? '“Read it now” is on.' : 'Letters will wait for the morning.'); return render();
    case 'mem-pause': S.memoryPaused = !S.memoryPaused; save(); toast(S.memoryPaused ? 'Memory paused. Letters won’t use it.' : 'Memory is on again.'); return render();
    case 'export': return exportJournal();
    case 'logout': return signOut();
    case 'google': try { el.disabled = true; await backend.google(); } catch (e) { el.disabled = false; loginNote = 'Google sign-in isn’t available right now.'; render(); } return;
    case 'reauth-google': try { await backend.google(); } catch (e) { toast('Google sign-in isn’t available right now.'); } return;
    case 'delete-account': confirmAccount = true; return render();
    case 'delete-account-no': confirmAccount = false; return render();
    case 'delete-account-yes': el.disabled = true; return deleteAccount();
    case 'finish-welcome': S.onboarded = true; save(); return go('tonight');
    case 'ui-lang': setUiLang(uiLang() === 'zh' ? 'en' : 'zh'); return render();
    case 'own': S.mode = 'own'; save(); toast('Normal mode: just your own journal. Demo mode is in Settings.'); pMonth = null; return render();
    case 'arch-gold': arch.gold = !arch.gold; return refreshArchive();
    case 'arch-clear': Object.assign(arch, { q: '', month: '', theme: '', gold: false }); return render();
    case 'toggle-sample': S.mode = S.mode === 'sample' ? 'own' : 'sample'; pMonth = null; save(); toast(demoOn() ? 'Demo mode: sample nights and Kit’s sample letters are back.' : 'Normal mode: just your own journal.'); return render();
    case 'seal': el.disabled = true; return seal();
    case 'orb': return orbTap();
    case 'readnow': { const L = pendingNight(); if (L) { el.disabled = true; return overnight(L, { now: true }); } return; }
    case 'skip': { const L = pendingNight(); if (L) { el.disabled = true; return overnight(L); } return; }
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
  if (t.id === 'arch-month') { arch.month = t.value; refreshArchive(); }
  if (t.id === 'arch-theme') { arch.theme = t.value; refreshArchive(); }
  if (t.id === 'dtime') { S.deliverTime = t.value; save(); toast(`New letters will arrive at ${t.value}.`); }
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
  if (g && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); pTip = g.dataset.star; drawSky(); $(`[data-star="${pTip}"]`)?.focus(); }
  if (ev.key === 'Escape') { if ($('.sheet-wrap')) closeSheet(); else if (pTip) { pTip = null; drawSky(); } }
});
let rz, lastW = window.innerWidth;
window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (route === 'identity') { if (Math.abs(window.innerWidth - lastW) > 40) render(); } else if (route === 'patterns') drawSky(); lastW = window.innerWidth; }, 150); });

/* ---------- boot ---------- */
function start() {
  if (S.onboarded && ['welcome', 'login'].includes(route)) route = 'identity';
  if (route === 'login') route = 'identity';
  render(); stateReady = true;
}
/* ---------- Beyond account glue ----------
   Everything below connects the views above to your account. Journal text is
   only ever in memory here; the backend is the single source of truth. */
let synced = null; // settings as the server last confirmed them
let ACCOUNT = { deletion: false, letters: false, voice: false };
let syncing = false; let syncAgain = false;
const SETTING_FIELDS = [['voice', 'voice'], ['lang', 'letter_language'], ['deliverTime', 'delivery_time'], ['allowEarly', 'allow_early'], ['memoryPaused', 'memory_paused'], ['onboarded', 'onboarded'], ['dirs', 'directions']];
const settingValue = (k) => (k === 'dirs' ? { ...(S.dirs || {}) } : k === 'allowEarly' ? S.allowEarly !== false : k === 'memoryPaused' || k === 'onboarded' ? !!S[k] : S[k]);
function applySettings(s) {
  synced = s;
  S.voice = s.voice; S.lang = s.letter_language; S.deliverTime = s.delivery_time; S.allowEarly = s.allow_early;
  S.memoryPaused = s.memory_paused; S.onboarded = s.onboarded; S.dirs = { ...(s.directions || {}) };
}
async function syncSettings() {
  if (!synced) return;
  if (syncing) { syncAgain = true; return; }
  const patch = {};
  for (const [k, f] of SETTING_FIELDS) { const v = settingValue(k); if (JSON.stringify(v) !== JSON.stringify(synced[f])) patch[f] = v; }
  if (!Object.keys(patch).length) return;
  syncing = true;
  try { synced = await backend.updateSettings(patch, synced.revision); }
  catch (e) {
    if (e?.code === 'conflict') { try { synced = await backend.settings(); syncAgain = true; } catch (x) { /* next change retries */ } }
    else if (e?.code !== 'unauthorized') toast('Couldn’t save that setting. Check your connection.');
  }
  syncing = false;
  if (syncAgain) { syncAgain = false; syncSettings(); }
}

/* Letters as the views expect them. */
function toLetter(x) {
  return {
    id: x.id, entryId: x.entry_id, date: x.journal_date,
    entries: x.entry ? [{ id: x.entry.id, t: hhmm(new Date(x.entry.created_at)), text: x.entry.text }] : [],
    status: x.status === 'queued' ? 'writing' : x.status, content: x.content, deliverAt: x.deliver_at,
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
      if (!document.querySelector('.ascend, .overnight')) { if (sheetId) drawSheet(); else render(); }
    }
  });
  letterQueues.set(L.id, next);
  return next;
}

/* Sealing saves the night to your account, then asks for its letter. A retry of
   the same words reuses the same key, so a flaky connection never saves twice. */
let sealKey = null; let sealText = null;
async function sealNight(text, date) {
  if (sealText !== text) { sealKey = crypto.randomUUID(); sealText = text; }
  const x = await backend.seal(text, sealKey, date, deliverAtFor(date));
  sealKey = null; sealText = null;
  const L = mergeLetter(x);
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
      const busy = document.querySelector('.ascend, .overnight, .sheet-wrap') || (route === 'tonight' && $('#entry') && document.activeElement === $('#entry')) || (document.activeElement?.id === 'arch-q') || memEditing;
      if (changed && !busy) render();
    } catch (e) { /* offline for a moment: keep what's here */ }
    refreshing = null;
  })();
  return refreshing;
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { refresh(); if (claudeState !== 'ready') checkAI(); } });
setInterval(() => {
  // A sealed letter arrives at its time even if nothing else happens.
  if (!AUTH.user || route !== 'tonight' || document.querySelector('.ascend, .overnight, .sheet-wrap')) return;
  const sealed = pendingNight();
  if (!sealed && $('.sealed')) render();
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
  const keep = { voice: S.voice, letter_language: S.lang, delivery_time: S.deliverTime, allow_early: S.allowEarly !== false, onboarded: true };
  try {
    await backend.clearAll();
    confirmDelete = false;
    S.letters = []; S.demoNights = []; S.memories = []; S.notes = {}; S.dirs = {}; S.draft = '';
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
  const prefs = loadPrefs(); S = { ...fresh(), ...prefs };
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


