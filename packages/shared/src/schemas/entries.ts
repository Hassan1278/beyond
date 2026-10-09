import { z } from 'zod';

const entryTextSchema = z
  .string()
  .min(1)
  .max(20_000)
  .refine((text) => text.trim().length > 0, { message: 'Text must not be blank.' })
  .refine(
    (text) =>
      !text.includes('\u0000') &&
      !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text),
    { message: 'Text must contain valid Unicode without NUL characters.' },
  );

export const createEntryBodySchema = z.strictObject({
  text: entryTextSchema,
  idempotency_key: z.uuid(),
  // Scheduling remains disabled until the next-morning resolver is proven.
  reflection_opt_in: z.literal(false),
});

export const patchEntryBodySchema = z.strictObject({
  text: entryTextSchema,
  expected_revision: z.int().min(1).max(2_147_483_647),
});

export const entryParamsSchema = z.strictObject({
  id: z.uuid(),
});

const utcTimestampSchema = z.iso
  .datetime({ offset: false })
  .refine((value) => !value.startsWith('0000-'), { message: 'Timestamp year must be positive.' });
const opaqueCursorSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+$/);

export const entrySchema = z.strictObject({
  id: z.uuid(),
  text: entryTextSchema,
  revision: z.int().min(1).max(2_147_483_647),
  reflection_opt_in: z.literal(false),
  created_at: utcTimestampSchema,
  updated_at: utcTimestampSchema,
});

export const entryCursorSchema = z.strictObject({
  created_at: utcTimestampSchema,
  id: z.uuid(),
});

export const entryListQuerySchema = z.strictObject({
  limit: z
    .string()
    .regex(/^(?:[1-9][0-9]?|100)$/)
    .optional(),
  cursor: opaqueCursorSchema.optional(),
});

export const entryListSchema = z.strictObject({
  entries: entrySchema.array().max(100),
  next_cursor: opaqueCursorSchema.nullable(),
});

export type Entry = z.infer<typeof entrySchema>;
export type EntryList = z.infer<typeof entryListSchema>;
export type EntryCursor = z.infer<typeof entryCursorSchema>;
export type CreateEntryBody = z.infer<typeof createEntryBodySchema>;
export type PatchEntryBody = z.infer<typeof patchEntryBodySchema>;
export type EntryParams = z.infer<typeof entryParamsSchema>;
