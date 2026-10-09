import { afterEach, describe, expect, it, vi } from 'vitest';
import { GET, dynamic, revalidate, runtime } from './route';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GET /api/health/live', () => {
  it('is a dynamic Node handler with revalidation disabled', () => {
    expect(runtime).toBe('nodejs');
    expect(dynamic).toBe('force-dynamic');
    expect(revalidate).toBe(0);
  });

  it('stays alive without configuration or a reachable database or AI service', async () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unavailable.'));
    const response = GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toStrictEqual({ data: { status: 'alive' } });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
