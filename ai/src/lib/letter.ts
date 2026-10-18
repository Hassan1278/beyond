import { z } from 'zod';
import { THEME_KEYS } from './wording';
import { LETTER_SYSTEM_PROMPT } from './letter-prompt';
import type { StructuredRequest, Validation } from './providers';

const text = (max: number) => z.string().min(1).max(max);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** What the backend sends for one letter (version 2 of the contract). */
export const letterInputSchema = z.strictObject({
  version: z.literal(2),
  request_id: z.uuid(),
  journal_date: day,
  language: z.enum(['auto', 'en', 'zh-hant', 'zh-hans']),
  voice: z.enum(['friend', 'mentor', 'future', 'diary']),
  memories: z.array(text(2000)).max(20),
  earlier_letters: z
    .array(
      z.strictObject({
        date: day,
        headline: z.string().max(400).nullable(),
        themes: z.array(z.string().max(40)).max(10),
        openQuestions: z.array(z.string().max(400)).max(10),
        stepsTheyMarkedNotForMe: z.array(z.string().max(400)).max(3),
      }),
    )
    .max(4),
  entries: z
    .array(
      z.strictObject({
        id: z.uuid(),
        written_at: z.string().regex(/^\d{2}:\d{2}$/),
        text: text(20000),
      }),
    )
    .min(1)
    .max(8),
});
export type LetterInput = z.infer<typeof letterInputSchema>;

/** Letter format version 3: one flowing letter, one question, one small step. */
export const NIGHT_TYPES = ['heavy', 'good', 'mixed', 'comparison', 'decision', 'quiet'];
export const STEP_CATEGORIES = [
  'reflection',
  'connection',
  'rest',
  'focus',
  'movement',
  'exploration',
];
const VOICE_NAMES: Record<string, string> = {
  friend: 'Friend',
  mentor: 'Mentor',
  future: 'Future you',
  diary: 'Just the notes',
};
const LANGUAGE_NAMES: Record<string, string> = {
  auto: 'Auto',
  en: 'English',
  'zh-hant': 'Traditional Chinese',
  'zh-hans': 'Simplified Chinese',
};

/** The structure the model is asked for (tool input / JSON mode). Checked again by validateLetter. */
export const LETTER_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: [
    'safety_flag',
    'night_type',
    'title',
    'body',
    'reflection_question',
    'small_step',
    'themes',
    'evidence',
  ],
  properties: {
    safety_flag: { type: 'string', enum: ['none', 'watch', 'urgent'] },
    night_type: { type: 'string', enum: NIGHT_TYPES },
    title: { type: 'string' },
    body: { type: 'string' },
    reflection_question: { type: ['string', 'null'] },
    small_step: {
      type: ['object', 'null'],
      required: ['text', 'minutes', 'category'],
      properties: {
        text: { type: 'string' },
        minutes: { type: 'number' },
        category: { type: 'string', enum: STEP_CATEGORIES },
      },
    },
    themes: { type: 'array', items: { type: 'string', enum: THEME_KEYS } },
    evidence: { type: 'array', items: { type: 'string' } },
    activities: {
      type: 'array',
      items: {
        type: 'object',
        required: ['name', 'energy', 'absorption'],
        properties: {
          name: { type: 'string' },
          energy: { type: 'number' },
          absorption: { type: 'number' },
        },
      },
    },
    compass: {
      type: 'object',
      properties: {
        loves: { type: 'array', items: { type: 'string' } },
        good_at: { type: 'array', items: { type: 'string' } },
        matters: { type: 'array', items: { type: 'string' } },
        within_reach: { type: 'array', items: { type: 'string' } },
      },
    },
    interests: { type: 'array', items: { type: 'string' } },
    remember: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        required: ['text', 'entryId'],
        properties: { text: { type: 'string' }, entryId: { type: 'string' } },
      },
    },
  },
};

export function letterRequest(input: LetterInput): StructuredRequest {
  const prompt = {
    date: input.journal_date,
    voice: VOICE_NAMES[input.voice],
    letter_language: LANGUAGE_NAMES[input.language],
    memories: input.memories,
    past_entries: input.earlier_letters.map((l) => ({
      date: l.date,
      title: l.headline,
      themes: l.themes,
      open_questions: l.openQuestions,
    })),
    step_feedback: input.earlier_letters.flatMap((l) =>
      l.stepsTheyMarkedNotForMe.map((text) => ({ step: text, feedback: 'Not for me' })),
    ),
    entry: input.entries.map((e) => ({ id: e.id, written_at: e.written_at, text: e.text })),
  };
  return {
    system: LETTER_SYSTEM_PROMPT,
    user: `Write the letter for this night. Reply with only the JSON object.\n\n${JSON.stringify(prompt, null, 1)}`,
    schema: LETTER_JSON_SCHEMA,
    name: 'beyond_letter',
    maxTokens: 3000,
  };
}

const norm = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const clip = (s: unknown, n: number) => {
  const t = norm(s);
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
};
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const obj = (v: unknown): Record<string, unknown> =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
const shortList = (v: unknown, max: number, len: number) =>
  [
    ...new Set(
      list(v)
        .map((x) => clip(x, len))
        .filter(Boolean),
    ),
  ].slice(0, max);
const level = (v: unknown) => Math.max(-2, Math.min(2, Math.round(Number(v) || 0)));

/** The letter body: paragraphs kept, spaces tidied, at most 4000 characters. */
function cleanBody(v: unknown): string {
  return String(v ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) =>
      p
        .split('\n')
        .map((line) => line.replace(/[ \t]+/g, ' ').trim())
        .join('\n')
        .trim(),
    )
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 4000);
}

const CJK = /[㐀-鿿]/;
const HANS = /[这们说时国过还见么没东车门问会对开关让给发长现实学习觉经]/g;
const HANT = /[這們說時國過還見麼沒東車門問會對開關讓給發長現實學習覺經嘅咗唔]/g;
function writtenIn(input: LetterInput, body: string): string {
  if (input.language !== 'auto') return input.language;
  const t = body.replace(/\{\{name\}\}/g, '');
  const zh = CJK.test(t);
  const en = /[a-z]{3,}/i.test(t.replace(/[㐀-鿿]/g, ''));
  if (zh && en) return 'mixed';
  if (!zh) return 'en';
  return (t.match(HANS) || []).length > (t.match(HANT) || []).length ? 'zh-hans' : 'zh-hant';
}

const SAFETY_CONTACTS =
  'Emergency: 999\nShall We Talk / mental health support hotline: 18111 (24 hours)\nThe Samaritans Hong Kong: 2896 0000 (24 hours)\nOpen Up (online chat for young people): openup.hk';
const TONE: Record<string, string> = {
  heavy: 'difficult',
  good: 'positive',
  mixed: 'mixed',
  comparison: 'mixed',
  decision: 'mixed',
  quiet: 'ordinary',
};

export interface LetterContent {
  version: 3;
  voice: string;
  language: string;
  title: string;
  headline: string;
  body: string;
  reflection_question: string | null;
  small_step: { text: string; minutes: number; category: string } | null;
  steps: Array<{ text: string; kind: string; minutes: number; why: string }>;
  openQuestions: string[];
  night_type: string;
  safety_flag: string;
  safetyConcern: boolean;
  tone: string;
  themes: string[];
  evidence: string[];
  activities: Array<{ name: string; energy: number; absorption: number }>;
  compass: { loves: string[]; good_at: string[]; matters: string[]; within_reach: string[] };
  interests: string[];
  remember: Array<{ text: string; entryId: string }>;
}

/**
 * Checks for a version 3 letter: a body with no headings and no quotation marks
 * around the person's words, exactly one question and one step (none when urgent),
 * evidence that really is their words, and only known vocabularies.
 * Older fields (headline, steps, tone, openQuestions, safetyConcern) are filled in
 * from the new ones so the database, notes and older app screens keep working.
 */
export function validateLetter(raw: unknown, input: LetterInput): Validation<LetterContent> {
  const problems: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { ok: false, problems: ['not an object'] };
  const r = raw as Record<string, unknown>;
  const entries = input.entries;
  const ids = new Set(entries.map((e) => e.id));
  const full = norm(entries.map((e) => e.text).join('\n')).toLowerCase();
  const safety = ['none', 'watch', 'urgent'].includes(String(r.safety_flag))
    ? String(r.safety_flag)
    : 'none';
  const urgent = safety === 'urgent';
  const title = clip(r.title, 80);
  let body = cleanBody(r.body);
  if (!title) problems.push('title is empty');
  if (!body) problems.push('body is empty');
  if (/^\s*(#|\*\*|[-•*] )/m.test(body) || /\*\*/.test(body))
    problems.push('the body must be plain paragraphs: no headings, bullets or bold');
  for (const m of body.matchAll(/[“"「『]([^”"」』]{6,})[”"」』]/g)) {
    if (full.includes(norm(m[1]).toLowerCase())) {
      problems.push(
        'do not put quotation marks around the user’s words; weave them into your sentences',
      );
      break;
    }
  }
  const question = urgent ? null : clip(r.reflection_question, 220) || null;
  const step = obj(r.small_step);
  const smallStep =
    urgent || !norm(step.text)
      ? null
      : {
          text: clip(step.text, 220),
          minutes: Math.min(15, Math.max(1, Math.round(Number(step.minutes) || 10))),
          category: STEP_CATEGORIES.includes(String(step.category))
            ? String(step.category)
            : 'reflection',
        };
  if (!urgent && !question) problems.push('needs exactly one reflection question');
  if (!urgent && !smallStep) problems.push('needs exactly one small step');
  if (problems.length) return { ok: false, problems };
  if (urgent && !/999/.test(body)) body = `${body}\n\n${SAFETY_CONTACTS}`;
  const evidence = shortList(r.evidence, 6, 160).filter((e) =>
    full.includes(
      norm(e)
        .replace(/^["“「『']|["”」』']$/g, '')
        .toLowerCase(),
    ),
  );
  const compass = obj(r.compass);
  const quiet = urgent || safety === 'watch' || r.night_type === 'heavy';
  const night = NIGHT_TYPES.includes(String(r.night_type)) ? String(r.night_type) : 'mixed';
  return {
    ok: true,
    value: {
      version: 3,
      voice: input.voice,
      language: writtenIn(input, body),
      title,
      headline: title,
      body,
      reflection_question: question,
      small_step: smallStep,
      steps: smallStep
        ? [{ text: smallStep.text, kind: smallStep.category, minutes: smallStep.minutes, why: '' }]
        : [],
      openQuestions: question ? [question] : [],
      night_type: night,
      safety_flag: safety,
      safetyConcern: safety !== 'none',
      tone: TONE[night] ?? 'mixed',
      themes: [
        ...new Set(
          list(r.themes).filter(
            (t): t is string => typeof t === 'string' && THEME_KEYS.includes(t),
          ),
        ),
      ].slice(0, 3),
      evidence,
      activities: urgent
        ? []
        : list(r.activities)
            .map(obj)
            .filter((a) => norm(a.name))
            .slice(0, 6)
            .map((a) => ({
              name: clip(a.name, 40),
              energy: level(a.energy),
              absorption: level(a.absorption),
            })),
      compass: {
        loves: urgent ? [] : shortList(compass.loves, 2, 50),
        good_at: urgent ? [] : shortList(compass.good_at, 2, 50),
        matters: urgent ? [] : shortList(compass.matters, 2, 50),
        within_reach: urgent ? [] : shortList(compass.within_reach, 2, 50),
      },
      interests: urgent ? [] : shortList(r.interests, 3, 40),
      remember: quiet
        ? []
        : list(r.remember)
            .map(obj)
            .filter((m) => norm(m.text) && typeof m.entryId === 'string' && ids.has(m.entryId))
            .slice(0, 2)
            .map((m) => ({
              text: clip(m.text, 120).replace(/[.。]$/, ''),
              entryId: String(m.entryId),
            })),
    },
  };
}
