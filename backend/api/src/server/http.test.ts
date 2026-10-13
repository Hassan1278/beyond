import { describe, expect, it } from 'vitest';
import { apiErrorSchema, healthLiveSchema, healthReadySchema } from '@beyond/shared';
import { dataResponse, errorResponse } from './http';

describe('safe HTTP envelopes', () => {
  it.each([
    { status: 'alive', schema: healthLiveSchema },
    { status: 'ready', schema: healthReadySchema },
  ] as const)('keeps public $status output minimal and uncached', async ({ status, schema }) => {
    const response = dataResponse({ status });
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('X-Request-Id')).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(body).toStrictEqual({ data: { status } });
    expect(schema.safeParse(body).success).toBe(true);
  });

  it('returns only a generic not-ready error and a generated request ID', async () => {
    const response = errorResponse('not_ready');
    const body: unknown = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toStrictEqual({
      error: {
        code: 'not_ready',
        message: 'Service is not ready.',
        request_id: response.headers.get('X-Request-Id'),
      },
    });
    expect(apiErrorSchema.safeParse(body).success).toBe(true);
    const serialized = JSON.stringify(body);
    for (const forbidden of ['supabase', 'apikey', 'schema', 'PGRST', 'sb_publishable', 'stack']) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('generates a new UUID for every success and error response', () => {
    const responses = [dataResponse({ status: 'alive' }), errorResponse('not_ready')];
    const ids = responses.map((response) => response.headers.get('X-Request-Id'));

    expect(new Set(ids).size).toBe(responses.length);
    expect(ids.every((id) => id !== null)).toBe(true);
  });

  it.each([
    ['bad_request', 400],
    ['unauthorized', 401],
    ['forbidden', 403],
    ['not_found', 404],
    ['conflict', 409],
    ['rate_limited', 429],
    ['not_ready', 503],
    ['internal_error', 500],
  ] as const)('maps %s to its fixed safe status %s', async (code, status) => {
    const response = errorResponse(code);
    const body: unknown = await response.json();

    expect(response.status).toBe(status);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(apiErrorSchema.safeParse(body).success).toBe(true);
  });
});
