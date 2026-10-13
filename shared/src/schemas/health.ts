import { z } from 'zod';

export const healthLiveSchema = z.strictObject({
  data: z.strictObject({
    status: z.literal('alive'),
  }),
});

export const healthReadySchema = z.strictObject({
  data: z.strictObject({
    status: z.literal('ready'),
  }),
});

export const apiErrorCodeSchema = z.enum([
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'not_ready',
  'internal_error',
]);

export const apiErrorSchema = z.strictObject({
  error: z.strictObject({
    code: apiErrorCodeSchema,
    message: z.string(),
    request_id: z.uuid(),
  }),
});

export type HealthLive = z.infer<typeof healthLiveSchema>;
export type HealthReady = z.infer<typeof healthReadySchema>;
export type ApiErrorCode = z.infer<typeof apiErrorCodeSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;
