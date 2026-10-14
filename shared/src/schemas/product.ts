import { z } from 'zod';
import { entryTextSchema, entryCursorSchema, entryListQuerySchema } from './entries';

const revision = z.int().min(1).max(2_147_483_647);
const timestamp = entryCursorSchema.shape.created_at;
const shortText = entryTextSchema.refine((value) => value.length <= 2_000);
export const timezoneSchema = z
  .string()
  .max(100)
  .regex(/^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+\-]+)+)$/)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: value });
      return true;
    } catch {
      return false;
    }
  });
/** Letters arrive at a quarter hour between 05:00 and 12:45 local time. */
export const deliveryTimeSchema = z.string().regex(/^(0[5-9]|1[0-2]):(00|15|30|45)$/);
export const directionKeySchema = z.enum([
  'young-entrepreneur',
  'maker-builder',
  'creative-explorer',
  'curious-learner',
  'community-builder',
  'world-explorer',
]);
export const directionsSchema = z.partialRecord(
  directionKeySchema,
  z.enum(['suggested', 'confirmed', 'dismissed', 'removed']),
);
export const settingsSchema = z.strictObject({
  timezone: timezoneSchema,
  morning_time: z.enum(['07:00', '07:30', '08:00']),
  voice: z.enum(['friend', 'mentor', 'future', 'diary']),
  memory_paused: z.boolean(),
  reflection_enabled: z.literal(false),
  letter_language: z.enum(['auto', 'en', 'zh-hant', 'zh-hans']),
  delivery_time: deliveryTimeSchema,
  allow_early: z.boolean(),
  onboarded: z.boolean(),
  directions: directionsSchema,
  revision,
  updated_at: timestamp,
});
export const patchSettingsSchema = z
  .strictObject({
    timezone: timezoneSchema.optional(),
    morning_time: settingsSchema.shape.morning_time.optional(),
    voice: settingsSchema.shape.voice.optional(),
    memory_paused: z.boolean().optional(),
    letter_language: settingsSchema.shape.letter_language.optional(),
    delivery_time: deliveryTimeSchema.optional(),
    allow_early: z.boolean().optional(),
    onboarded: z.boolean().optional(),
    directions: directionsSchema.optional(),
    expected_revision: revision,
  })
  .refine((value) => Object.keys(value).length > 1);
export const memorySchema = z.strictObject({
  id: z.uuid(),
  text: shortText,
  source_entry_id: z.uuid().nullable(),
  kind: z.enum(['told', 'learned', 'edited']),
  created_at: timestamp,
  revision,
  updated_at: timestamp,
});
export const createMemorySchema = z.strictObject({
  text: shortText,
  source_entry_id: z.uuid().nullable(),
  approved: z.literal(true),
  idempotency_key: z.uuid(),
});
export const patchMemorySchema = z.strictObject({
  text: shortText,
  approved: z.literal(true),
  expected_revision: revision,
});
export const todoSchema = z.strictObject({
  id: z.uuid(),
  title: shortText,
  completed: z.boolean(),
  revision,
  created_at: timestamp,
  updated_at: timestamp,
});
export const createTodoSchema = z.strictObject({ title: shortText, idempotency_key: z.uuid() });
export const patchTodoSchema = z
  .strictObject({
    title: shortText.optional(),
    completed: z.boolean().optional(),
    expected_revision: revision,
  })
  .refine((value) => Object.keys(value).length > 1);
export const memoryListSchema = z.strictObject({
  items: memorySchema.array().max(100),
  next_cursor: entryListQuerySchema.shape.cursor.unwrap().nullable(),
});
export const todoListSchema = z.strictObject({
  items: todoSchema.array().max(100),
  next_cursor: entryListQuerySchema.shape.cursor.unwrap().nullable(),
});
export const deletingAccountSchema = z.strictObject({ status: z.literal('deleting') });
export type Settings = z.infer<typeof settingsSchema>;
export type PatchSettings = z.infer<typeof patchSettingsSchema>;
export type Memory = z.infer<typeof memorySchema>;
export type CreateMemory = z.infer<typeof createMemorySchema>;
export type PatchMemory = z.infer<typeof patchMemorySchema>;
export type Todo = z.infer<typeof todoSchema>;
export type CreateTodo = z.infer<typeof createTodoSchema>;
export type PatchTodo = z.infer<typeof patchTodoSchema>;
export type MemoryList = z.infer<typeof memoryListSchema>;
export type TodoList = z.infer<typeof todoListSchema>;
