import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiErrorSchema, healthReadySchema } from '@beyond/shared';

vi.mock('../../../../server/health', () => ({ isWritingReady: vi.fn() }));
import { isWritingReady } from '../../../../server/health';
import { GET } from './route';

afterEach(() => vi.resetAllMocks());

describe('readiness route wiring (unit tests, not database acceptance)', () => {
  it('returns only a generic no-store 503 when configuration or schema is unavailable', async () => {
    vi.mocked(isWritingReady).mockResolvedValue(false);
    const response = await GET();
    const body = apiErrorSchema.parse(await response.json());
    expect(response.status).toBe(503);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Request-Id')).toBe(body.error.request_id);
    expect(body.error.code).toBe('not_ready');
    expect(body.error.message).toBe('Service is not ready.');
  });

  it('returns only the declared public success shape when the check succeeds', async () => {
    vi.mocked(isWritingReady).mockResolvedValue(true);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(healthReadySchema.parse(await response.json())).toStrictEqual({
      data: { status: 'ready' },
    });
  });
});
