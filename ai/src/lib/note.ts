import { z } from 'zod';
import { VOICES } from './wording';
import type { StructuredRequest, Validation } from './providers';

const MONTH = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** A month (YYYY-MM) or year (Y2026) note over the person's kept letters. */
export const noteInputSchema = z.strictObject({
  version: z.literal(2),
  key: z.string().regex(/^(\d{4}-(0[1-9]|1[0-2])|Y\d{4})$/),
  voice: z.enum(['friend', 'mentor', 'future', 'diary']),
  language: z.enum(['auto', 'en', 'zh-hant', 'zh-hans']),
  letters: z
    .array(
      z.strictObject({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        headline: z.string().max(400).nullable(),
        tone: z.string().max(20).nullable(),
        themes: z.array(z.string().max(40)).max(10),
        theirWords: z.array(z.string().max(400)).max(4),
        openQuestions: z.array(z.string().max(400)).max(10),
        todos: z
          .array(
            z.strictObject({
              text: z.string().max(400),
              status: z.enum(['tried', 'skipped', 'untouched']),
            }),
          )
          .max(3),
      }),
    )
    .min(1)
    .max(400),
});
export type NoteInput = z.infer<typeof noteInputSchema>;

const LANGUAGE = {
  en: 'English',
  'zh-hant': 'Traditional Chinese (Hong Kong)',
  'zh-hans': 'Simplified Chinese',
} as const;

export function noteRequest(input: NoteInput): StructuredRequest {
  const isYear = input.key.startsWith('Y');
  const voice = VOICES[input.voice];
  const letters = input.letters.map((l) => ({
    ...l,
    themes: l.themes.filter((t) => t !== 'ordinary' && t !== 'achievement'),
  }));
  const span = isYear
    ? `the year so far (${input.key.slice(1)})`
    : MONTH[Number(input.key.slice(5)) - 1];
  const language =
    input.language === 'auto' ? 'the language most of the letters use' : LANGUAGE[input.language];
  const user = `You write a short note for "Beyond", a quiet journaling app for students and young adults in Hong Kong. Below are the person's letters from ${span}: headline, tone, themes, short phrases they wrote, and which to-dos they did.
Write ONE paragraph of ${isYear ? '4–5' : '3–4'} sentences, in the voice "${voice.name}" (${voice.desc}). Language: ${language}. Notice what kept coming back and how it changed${isYear ? ' across the months' : ' across the month'}, and end with one specific, grounded encouragement. Quote at most two of their own phrases exactly as given in theirWords. Tentative language, no diagnosis, no lists, no exclamation marks, nothing that isn't in the data.
Reply with only JSON: {"text": string}

Letters:
${JSON.stringify(letters).slice(0, 40000)}`;
  return {
    system:
      'You are the writing engine of Beyond, a quiet journaling app. Follow the instructions in the user message exactly and return only the JSON object it asks for.',
    user,
    schema: { type: 'object', required: ['text'], properties: { text: { type: 'string' } } },
    name: 'beyond_note',
    maxTokens: 900,
  };
}

export function validateNote(raw: unknown): Validation<{ text: string }> {
  const value = raw && typeof raw === 'object' ? (raw as Record<string, unknown>).text : undefined;
  const text = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return { ok: false, problems: ['text is empty'] };
  return { ok: true, value: { text: text.length > 1400 ? `${text.slice(0, 1399)}…` : text } };
}
