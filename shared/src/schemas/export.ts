import { z } from 'zod';
import { letterSchema, noteSchema } from './letters';
import { entrySchema, entryCursorSchema, entryListQuerySchema } from './entries';
import { memorySchema, todoSchema, settingsSchema } from './product';

export const accountExportQuerySchema = z
  .strictObject({
    section: z.enum(['settings', 'entries', 'memories', 'todos', 'letters', 'notes']),
    limit: entryListQuerySchema.shape.limit.refine((v) => v === undefined || Number(v) <= 50),
    cursor: entryListQuerySchema.shape.cursor,
  })
  .refine(
    (v) =>
      !['settings', 'notes'].includes(v.section) ||
      (v.limit === undefined && v.cursor === undefined),
  );
export const accountExportMetadataSchema = z.strictObject({
  format_version: z.literal(1),
  exported_at: entryCursorSchema.shape.created_at,
});
const page = {
  ...accountExportMetadataSchema.shape,
  next_cursor: entryListQuerySchema.shape.cursor.unwrap().nullable(),
};
export const accountExportPageSchema = z.discriminatedUnion('section', [
  z.strictObject({ ...page, section: z.literal('letters'), items: letterSchema.array().max(50) }),
  accountExportMetadataSchema.extend({
    section: z.literal('notes'),
    items: noteSchema.array().max(200),
  }),
  accountExportMetadataSchema.extend({ section: z.literal('settings'), settings: settingsSchema }),
  z.strictObject({ ...page, section: z.literal('entries'), items: entrySchema.array().max(50) }),
  z.strictObject({ ...page, section: z.literal('memories'), items: memorySchema.array().max(50) }),
  z.strictObject({ ...page, section: z.literal('todos'), items: todoSchema.array().max(50) }),
]);
export type AccountExportQuery = z.infer<typeof accountExportQuerySchema>;
export type AccountExportPage = z.infer<typeof accountExportPageSchema>;
