import { z } from 'zod';
import {
  ACTION_KINDS,
  LENSES,
  LETTER_EXAMPLE,
  LETTER_RULES,
  LETTER_SHAPE,
  THEME_KEYS,
  VOICES,
} from './wording';
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

/** The structure the model is asked for (tool input / JSON mode). Checked again by validateLetter. */
export const LETTER_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: [
    'language',
    'greeting',
    'signoff',
    'headline',
    'recap',
    'analysis',
    'challenge',
    'advice',
    'encouragement',
    'steps',
    'themes',
    'openQuestions',
    'wins',
    'tone',
    'safetyConcern',
    'remember',
  ],
  properties: {
    language: { type: 'string', enum: ['en', 'zh-hant', 'zh-hans', 'mixed'] },
    greeting: { type: 'string' },
    signoff: { type: 'string' },
    headline: { type: 'string' },
    recap: { type: 'string' },
    analysis: {
      type: 'array',
      minItems: 2,
      maxItems: 2,
      items: {
        type: 'object',
        required: ['lens', 'title', 'text', 'quote', 'entryId'],
        properties: {
          lens: { type: 'string', enum: LENSES },
          title: { type: 'string' },
          text: { type: 'string' },
          quote: { type: 'string' },
          entryId: { type: 'string' },
        },
      },
    },
    challenge: {
      type: 'object',
      required: ['issue', 'cause'],
      properties: { issue: { type: 'string' }, cause: { type: 'string' } },
    },
    advice: {
      type: 'object',
      required: ['text', 'why'],
      properties: { text: { type: 'string' }, why: { type: 'string' } },
    },
    encouragement: { type: 'string' },
    steps: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        required: ['text', 'kind', 'minutes', 'why'],
        properties: {
          text: { type: 'string' },
          kind: { type: 'string', enum: ACTION_KINDS },
          minutes: { type: 'number' },
          why: { type: 'string' },
        },
      },
    },
    themes: { type: 'array', items: { type: 'string', enum: THEME_KEYS } },
    openQuestions: { type: 'array', items: { type: 'string' } },
    wins: {
      type: 'array',
      items: {
        type: 'object',
        properties: { text: { type: 'string' }, entryId: { type: 'string' } },
      },
    },
    tone: { type: 'string', enum: ['difficult', 'mixed', 'positive', 'ordinary'] },
    safetyConcern: { type: 'boolean' },
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

const SYSTEM =
  'You are the writing engine of Beyond, a quiet journaling app. Follow the instructions in the user message exactly and return only the JSON object it asks for.';

export function letterRequest(input: LetterInput): StructuredRequest {
  const voice = VOICES[input.voice];
  const prompt = {
    journalDate: input.journal_date,
    language: input.language,
    voice: voice.name,
    voiceGuide: voice.prompt,
    allowedThemes: THEME_KEYS,
    memories: input.memories,
    entries: input.entries.map((e) => ({ id: e.id, writtenAt: e.written_at, text: e.text })),
    earlierLetters: input.earlier_letters,
  };
  const user = `${LETTER_RULES}\n\nReply with only one JSON object of exactly this shape (analysis: exactly 2 items; steps: exactly 3 items):\n${LETTER_SHAPE}\n\n${LETTER_EXAMPLE}\n\nInput:\n${JSON.stringify(prompt, null, 1)}`;
  return {
    system: SYSTEM,
    user,
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

export interface LetterContent {
  voice: string;
  greeting: string;
  signoff: string;
  language: string;
  headline: string;
  recap: string;
  analysis: Array<{
    lens: string;
    title: string;
    text: string;
    quote: string;
    entryId: string | null;
  }>;
  challenge: { issue: string; cause: string } | null;
  advice: { text: string; why: string };
  encouragement: string;
  steps: Array<{ text: string; kind: string; minutes: number; why: string }>;
  themes: string[];
  openQuestions: string[];
  wins: Array<{ text: string; entryId: string | null }>;
  tone: string;
  safetyConcern: boolean;
  remember: Array<{ text: string; entryId: string }>;
}

/**
 * The prototype's checks: quotes must be the person's exact words, exactly
 * three steps, nothing outside the allowed vocabularies, clipped lengths.
 */
export function validateLetter(raw: unknown, input: LetterInput): Validation<LetterContent> {
  const problems: string[] = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return { ok: false, problems: ['not an object'] };
  const r = raw as Record<string, unknown>;
  const entries = input.entries;
  const ids = new Set(entries.map((e) => e.id));
  const full = norm(entries.map((e) => e.text).join('\n'));
  const single = entries.length === 1 ? entries[0]!.id : null;
  const headline = clip(r.headline, 140);
  const recap = clip(r.recap, 900);
  if (!headline) problems.push('headline is empty');
  if (!recap) problems.push('recap is empty');
  const analysis = list(r.analysis)
    .map(obj)
    .filter((a) => norm(a.text))
    .slice(0, 2)
    .map((a) => {
      let quote = clip(a.quote, 200).replace(/^["“「『']|["”」』']$/g, '');
      if (quote && !full.includes(quote)) quote = '';
      let entryId = typeof a.entryId === 'string' && ids.has(a.entryId) ? a.entryId : null;
      if (quote) entryId = entries.find((e) => norm(e.text).includes(quote))?.id ?? entryId;
      return {
        lens: LENSES.includes(String(a.lens)) ? String(a.lens) : 'pattern',
        title: clip(a.title, 70) || 'A possible reading',
        text: clip(a.text, 500),
        quote,
        entryId: entryId ?? single,
      };
    });
  if (!analysis.length) problems.push('no insights');
  const advice = obj(r.advice);
  const adviceText = clip(advice.text, 600);
  if (!adviceText) problems.push('advice is empty');
  const steps = list(r.steps)
    .map(obj)
    .filter((s) => norm(s.text))
    .slice(0, 3)
    .map((s) => ({
      text: clip(s.text, 160),
      kind: ACTION_KINDS.includes(String(s.kind)) ? String(s.kind) : 'practical',
      minutes: Math.min(60, Math.max(1, Math.round(Number(s.minutes) || 10))),
      why: clip(s.why, 200),
    }));
  if (steps.length < 3) problems.push(`needs exactly 3 steps (got ${steps.length})`);
  if (problems.length) return { ok: false, problems };
  const challenge = obj(r.challenge);
  const issue = clip(challenge.issue, 120);
  const safetyConcern = r.safetyConcern === true;
  return {
    ok: true,
    value: {
      voice: input.voice,
      greeting: clip(r.greeting, 120),
      signoff: String(r.signoff ?? '')
        .replace(/[ \t]+/g, ' ')
        .trim()
        .slice(0, 120),
      language: ['en', 'zh', 'zh-hant', 'zh-hans', 'mixed'].includes(String(r.language))
        ? String(r.language)
        : 'mixed',
      headline,
      recap,
      analysis,
      challenge: issue ? { issue, cause: clip(challenge.cause, 400) } : null,
      advice: { text: adviceText, why: clip(advice.why, 240) },
      encouragement: clip(r.encouragement, 400),
      steps,
      themes: [
        ...new Set(
          list(r.themes).filter(
            (t): t is string => typeof t === 'string' && THEME_KEYS.includes(t),
          ),
        ),
      ].slice(0, 5),
      openQuestions: list(r.openQuestions)
        .map((q) => clip(q, 200))
        .filter(Boolean)
        .slice(0, 3),
      wins: list(r.wins)
        .map(obj)
        .filter((w) => norm(w.text))
        .slice(0, 4)
        .map((w) => ({
          text: clip(w.text, 200),
          entryId: typeof w.entryId === 'string' && ids.has(w.entryId) ? w.entryId : null,
        })),
      tone: ['difficult', 'mixed', 'positive', 'ordinary'].includes(String(r.tone))
        ? String(r.tone)
        : 'mixed',
      safetyConcern,
      remember: safetyConcern
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
