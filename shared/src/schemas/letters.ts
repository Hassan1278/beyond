import { z } from 'zod';
import { entryCursorSchema, entryListQuerySchema, entryTextSchema } from './entries';

const revision = z.int().min(1).max(2_147_483_647);
const timestamp = entryCursorSchema.shape.created_at;
const day = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
const text = (max: number) => z.string().max(max);
const model = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_.:/-]+$/);

export const voiceSchema = z.enum(['friend', 'mentor', 'future', 'diary']);
export const letterLanguageSchema = z.enum(['auto', 'en', 'zh-hant', 'zh-hans']);
export const stepKeySchema = z.enum(['step.0', 'step.1', 'step.2']);
export const stepStateSchema = z.enum(['tried', 'skipped']);
export const noteKeySchema = z.string().regex(/^(\d{4}-(0[1-9]|1[0-2])|Y\d{4})$/);

/** A written letter, as checked by the AI service. Unknown extra keys are dropped. */
export const letterContentSchema = z.object({
  voice: voiceSchema,
  greeting: text(200),
  signoff: text(200),
  language: z.enum(['en', 'zh', 'zh-hant', 'zh-hans', 'mixed']),
  headline: text(200).min(1),
  recap: text(1000).min(1),
  analysis: z
    .array(
      z.object({
        lens: z.enum(['pattern', 'feeling', 'strength', 'need', 'context']),
        title: text(100),
        text: text(600),
        quote: text(240),
        entryId: z.uuid().nullable(),
      }),
    )
    .min(1)
    .max(2),
  challenge: z.object({ issue: text(160), cause: text(500) }).nullable(),
  advice: z.object({ text: text(700).min(1), why: text(300) }),
  encouragement: text(500),
  steps: z
    .array(
      z.object({
        text: text(200).min(1),
        kind: z.enum(['rest', 'connection', 'exploration', 'practical', 'reflection']),
        minutes: z.int().min(1).max(60),
        why: text(240),
      }),
    )
    .length(3),
  themes: z.array(z.string().regex(/^[a-z]{2,20}$/)).max(5),
  openQuestions: z.array(text(240)).max(3),
  wins: z.array(z.object({ text: text(240), entryId: z.uuid().nullable() })).max(4),
  tone: z.enum(['difficult', 'mixed', 'positive', 'ordinary']),
  safetyConcern: z.boolean(),
  remember: z.array(z.object({ text: text(140).min(1), entryId: z.uuid() })).max(2),
});

export const letterSchema = z.strictObject({
  id: z.uuid(),
  entry_id: z.uuid(),
  journal_date: day,
  voice: voiceSchema,
  language: letterLanguageSchema,
  status: z.enum(['queued', 'ready', 'failed']),
  content: letterContentSchema.nullable(),
  model: model.nullable(),
  written_at: timestamp.nullable(),
  deliver_at: timestamp,
  read_at: timestamp.nullable(),
  early: z.boolean(),
  private: z.boolean(),
  steps: z.partialRecord(stepKeySchema, stepStateSchema),
  error: z.enum(['unavailable', 'invalid_output', 'refused']).nullable(),
  revision,
  created_at: timestamp,
  updated_at: timestamp,
  entry: z.strictObject({ id: z.uuid(), text: entryTextSchema, created_at: timestamp }).nullable(),
});

export const letterListSchema = z.strictObject({
  items: letterSchema.array().max(100),
  next_cursor: entryListQuerySchema.shape.cursor.unwrap().nullable(),
});

/** Sealing a night: the explicit request for a letter about this saved entry. */
export const requestLetterSchema = z.strictObject({
  entry_id: z.uuid(),
  expected_revision: revision,
  journal_date: day,
  deliver_at: timestamp,
  consent: z.literal(true),
});

export const patchLetterSchema = z
  .strictObject({
    read: z.literal(true).optional(),
    early: z.literal(true).optional(),
    private: z.boolean().optional(),
    steps: z.partialRecord(stepKeySchema, stepStateSchema).optional(),
    deliver_at: timestamp.optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

export const noteSchema = z.strictObject({
  key: noteKeySchema,
  text: text(2000).min(1),
  letter_count: z.int().min(1).max(400),
  model: model.nullable(),
  created_at: timestamp,
});
export const noteListSchema = z.strictObject({ items: noteSchema.array().max(200) });
export const writeNoteSchema = z.strictObject({ key: noteKeySchema });

export const aiStatusSchema = z.strictObject({
  letters: z.boolean(),
  notes: z.boolean(),
  transcribe: z.boolean(),
});
/** Empty text means no speech was heard. */
export const transcriptSchema = z.strictObject({ text: text(20000) });
export const spokenLanguageSchema = z.enum(['mixed', 'yue-Hant-HK', 'zh-CN', 'en-US']);

/* ---- Backend <-> AI service contract (version 2). Clients never see these. ---- */
const earlierLetter = z.strictObject({
  date: day,
  headline: z.string().max(400).nullable(),
  themes: z.array(z.string().max(40)).max(10),
  openQuestions: z.array(z.string().max(400)).max(10),
  stepsTheyMarkedNotForMe: z.array(z.string().max(400)).max(3),
});
export const aiLetterInputSchema = z.strictObject({
  version: z.literal(2),
  request_id: z.uuid(),
  journal_date: day,
  language: letterLanguageSchema,
  voice: voiceSchema,
  memories: z.array(z.string().min(1).max(2000)).max(20),
  earlier_letters: z.array(earlierLetter).max(4),
  entries: z
    .array(
      z.strictObject({
        id: z.uuid(),
        written_at: z.string().regex(/^\d{2}:\d{2}$/),
        text: entryTextSchema,
      }),
    )
    .min(1)
    .max(8),
});
export const aiLetterOutputSchema = z.strictObject({
  version: z.literal(2),
  request_id: z.uuid(),
  content: letterContentSchema,
  model,
});
export const noteInputRowSchema = z.strictObject({
  id: z.uuid(),
  date: day,
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
});
export const noteInputSchema = z.strictObject({
  key: noteKeySchema,
  voice: voiceSchema,
  language: letterLanguageSchema,
  letters: noteInputRowSchema.array().max(400),
});
export const aiNoteOutputSchema = z.strictObject({ text: text(2000).min(1), model });
export const aiHealthSchema = z.strictObject({
  letters: z.boolean(),
  notes: z.boolean(),
  transcribe: z.boolean(),
  provider: z.enum(['anthropic', 'openai']).nullable(),
  model: model.nullable(),
});

export type LetterContent = z.infer<typeof letterContentSchema>;
export type Letter = z.infer<typeof letterSchema>;
export type LetterList = z.infer<typeof letterListSchema>;
export type RequestLetter = z.infer<typeof requestLetterSchema>;
export type PatchLetter = z.infer<typeof patchLetterSchema>;
export type Note = z.infer<typeof noteSchema>;
export type AiStatus = z.infer<typeof aiStatusSchema>;
export type SpokenLanguage = z.infer<typeof spokenLanguageSchema>;
export type AiLetterInput = z.infer<typeof aiLetterInputSchema>;
