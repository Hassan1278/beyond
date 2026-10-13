import { z } from 'zod';

export const accountSchema = z.strictObject({
  status: z.literal('active'),
  capabilities: z.strictObject({
    account_deletion: z.boolean(),
    reflections: z.boolean(),
    voice_transcription: z.literal(false),
  }),
});
export const clearedAccountDataSchema = z.strictObject({ status: z.literal('cleared') });
export type Account = z.infer<typeof accountSchema>;
