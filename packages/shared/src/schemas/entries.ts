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

export type CreateEntryBody = z.infer<typeof createEntryBodySchema>;
export type PatchEntryBody = z.infer<typeof patchEntryBodySchema>;
export type EntryParams = z.infer<typeof entryParamsSchema>;
