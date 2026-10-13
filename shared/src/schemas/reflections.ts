import { z } from 'zod';
import { entryCursorSchema, entryListQuerySchema, entryTextSchema } from './entries';
import { settingsSchema, todoSchema } from './product';
const revision = z.int().min(1).max(2_147_483_647);
const short = entryTextSchema.refine((text) => text.length <= 2000);
const part = z
  .string()
  .max(5000)
  .refine(
    (text) =>
      !text.includes('\u0000') &&
      !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(text),
  );
export const letterSchema = z.strictObject({
  greet: part,
  said: part.refine((text) => text.trim().length > 0),
  rec: part,
  step: part,
  sign: part,
});
export const provenanceSchema = z.strictObject({
  model: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_.:/-]+$/),
  prompt_version: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_.-]+$/),
});
export const generatedActionSchema = z.strictObject({ id: z.uuid(), title: short });
export const aiInputSchema = z.strictObject({
  version: z.literal(1),
  request_id: z.uuid(),
  entry: z.strictObject({ id: z.uuid(), revision, text: entryTextSchema }),
  voice: settingsSchema.shape.voice,
  memories: z.array(z.strictObject({ id: z.uuid(), text: short })).max(20),
  corrections: z
    .array(z.strictObject({ id: z.uuid(), text: short }))
    .max(5)
    .default([]),
});
export const aiOutputSchema = z.strictObject({
  version: z.literal(1),
  request_id: z.uuid(),
  entry_revision: revision,
  letter: letterSchema,
  actions: z
    .array(generatedActionSchema)
    .max(5)
    .refine((rows) => new Set(rows.map((r) => r.id)).size === rows.length),
  provenance: provenanceSchema,
});
export const reflectionSchema = z.strictObject({
  id: z.uuid(),
  entry_id: z.uuid(),
  entry_revision: revision,
  voice: settingsSchema.shape.voice,
  letter: letterSchema,
  actions: z
    .array(generatedActionSchema.extend({ decision: z.enum(['pending', 'accepted', 'rejected']) }))
    .max(5),
  provenance: provenanceSchema,
  correction: short.nullable(),
  revision,
  created_at: entryCursorSchema.shape.created_at,
  updated_at: entryCursorSchema.shape.created_at,
});
export const reflectionListSchema = z.strictObject({
  items: z.array(reflectionSchema).max(100),
  next_cursor: entryListQuerySchema.shape.cursor.unwrap().nullable(),
});
export const requestReflectionSchema = z.strictObject({
  expected_revision: revision,
  consent: z.literal(true),
});
export const reflectionJobSchema = z.strictObject({
  id: z.uuid(),
  entry_id: z.uuid(),
  entry_revision: revision,
  status: z.enum(['pending', 'completed', 'failed']),
  due_at: entryCursorSchema.shape.created_at,
});
export const correctionSchema = z.strictObject({ text: short, expected_revision: revision });
export const reflectionDecisionSchema = z.strictObject({
  action_id: z.uuid(),
  decision: z.enum(['accepted', 'rejected']),
});
export const reflectionDecisionResultSchema = z.strictObject({
  reflection: reflectionSchema,
  todo: todoSchema.nullable(),
});
export type Reflection = z.infer<typeof reflectionSchema>;
export type AiInput = z.infer<typeof aiInputSchema>;
export type AiOutput = z.infer<typeof aiOutputSchema>;
