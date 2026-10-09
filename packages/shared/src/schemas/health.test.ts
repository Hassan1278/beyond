import { describe, expect, expectTypeOf, it } from 'vitest';
import * as shared from '../index';
import {
  apiErrorCodeSchema,
  apiErrorSchema,
  healthLiveSchema,
  healthReadySchema,
  type ApiError,
  type ApiErrorCode,
  type HealthLive,
  type HealthReady,
} from './health';

const requestId = '123e4567-e89b-42d3-a456-426614174000';
const errorCodes = [
  'bad_request',
  'unauthorized',
  'forbidden',
  'not_found',
  'conflict',
  'rate_limited',
  'not_ready',
  'internal_error',
] as const;
const notReady = {
  error: { code: 'not_ready', message: 'Service is not ready.', request_id: requestId },
} as const;

const healthCases = [
  { name: 'live', schema: healthLiveSchema, status: 'alive' },
  { name: 'ready', schema: healthReadySchema, status: 'ready' },
] as const;

describe.each(healthCases)('public $name health', ({ schema, status }) => {
  it('accepts only the exact success envelope', () => {
    const input = { data: { status } };

    expect(schema.parse(input)).toStrictEqual(input);
  });

  it.each(['alive', 'ready', 'not_ready', 'unhealthy', true, undefined])(
    'requires its own status literal instead of %j',
    (value) => {
      expect(schema.safeParse({ data: { status: value } }).success).toBe(value === status);
    },
  );

  it.each(['db', 'schema', 'config', 'ai', 'request_id'])('rejects nested detail %s', (field) => {
    expect(schema.safeParse({ data: { status, [field]: 'internal' } }).success).toBe(false);
  });

  it.each(['db', 'schema', 'error', 'request_id'])('rejects outer detail %s', (field) => {
    expect(schema.safeParse({ data: { status }, [field]: 'internal' }).success).toBe(false);
  });

  it.each([{}, { status: 'ready' }, { data: {} }, { data: null }, null, notReady])(
    'rejects missing or incorrect envelopes %j',
    (input) => {
      expect(schema.safeParse(input).success).toBe(false);
    },
  );
});

describe('apiErrorSchema', () => {
  it('defines exactly the agreed stable error codes', () => {
    expect(apiErrorCodeSchema.options).toStrictEqual([...errorCodes]);
    expectTypeOf<ApiErrorCode>().toEqualTypeOf<(typeof errorCodes)[number]>();
  });

  it.each(errorCodes)('accepts the exact %s error envelope', (code) => {
    const input = { error: { code, message: 'A safe fictional message.', request_id: requestId } };

    expect(apiErrorSchema.parse(input)).toStrictEqual(input);
    expectTypeOf(apiErrorSchema.parse(input)).toEqualTypeOf<ApiError>();
  });

  it('represents not-ready as an error, never health success data', () => {
    expect(apiErrorSchema.parse(notReady)).toStrictEqual(notReady);
    expect(apiErrorSchema.safeParse({ data: { status: 'not_ready' } }).success).toBe(false);
  });

  it.each(['unknown', 'NOT_READY', 503, undefined, null])('rejects invalid code %j', (code) => {
    expect(apiErrorSchema.safeParse({ error: { ...notReady.error, code } }).success).toBe(false);
  });

  it.each([undefined, null, 123, {}, []])('requires a string message instead of %j', (message) => {
    expect(apiErrorSchema.safeParse({ error: { ...notReady.error, message } }).success).toBe(false);
  });

  it('does not impose an undocumented nonblank message restriction', () => {
    const input = { error: { ...notReady.error, message: '' } };

    expect(apiErrorSchema.parse(input)).toStrictEqual(input);
  });

  it.each([undefined, null, '', 'not-a-uuid', requestId.replaceAll('-', ''), 123])(
    'rejects invalid request_id %j',
    (request_id) => {
      expect(apiErrorSchema.safeParse({ error: { ...notReady.error, request_id } }).success).toBe(
        false,
      );
    },
  );

  it('requires snake_case request_id inside error', () => {
    const { code, message } = notReady.error;

    expect(apiErrorSchema.safeParse({ error: { code, message, requestId } }).success).toBe(false);
    expect(
      apiErrorSchema.safeParse({ error: { code, message }, request_id: requestId }).success,
    ).toBe(false);
  });

  it.each(['stack', 'db', 'schema', 'requestId'])(
    'rejects internal or unknown field %s',
    (field) => {
      expect(
        apiErrorSchema.safeParse({ error: { ...notReady.error, [field]: 'internal' } }).success,
      ).toBe(false);
    },
  );

  it.each(['data', 'status', 'request_id', 'extra'])('rejects outer field %s', (field) => {
    expect(apiErrorSchema.safeParse({ ...notReady, [field]: 'internal' }).success).toBe(false);
  });

  it.each([{}, { error: {} }, { error: null }, { data: { status: 'ready' } }, null])(
    'rejects incomplete or success envelopes %j',
    (input) => {
      expect(apiErrorSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe('shared health and error exports', () => {
  it('re-exports the real schemas and inferred types', () => {
    expect(shared.healthLiveSchema).toBe(healthLiveSchema);
    expect(shared.healthReadySchema).toBe(healthReadySchema);
    expect(shared.apiErrorCodeSchema).toBe(apiErrorCodeSchema);
    expect(shared.apiErrorSchema).toBe(apiErrorSchema);
    expectTypeOf(healthLiveSchema.parse({ data: { status: 'alive' } })).toEqualTypeOf<HealthLive>();
    expectTypeOf(
      healthReadySchema.parse({ data: { status: 'ready' } }),
    ).toEqualTypeOf<HealthReady>();
    expectTypeOf<HealthLive['data']['status']>().toEqualTypeOf<'alive'>();
    expectTypeOf<HealthReady['data']['status']>().toEqualTypeOf<'ready'>();
    expectTypeOf<shared.HealthLive>().toEqualTypeOf<HealthLive>();
    expectTypeOf<shared.HealthReady>().toEqualTypeOf<HealthReady>();
    expectTypeOf<shared.ApiErrorCode>().toEqualTypeOf<ApiErrorCode>();
    expectTypeOf<shared.ApiError>().toEqualTypeOf<ApiError>();
  });
});
