import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseWritingConfig } from './config-parser';
import { checkLiveness, checkWritingReadiness } from './health-check';
import { errorResponse } from './http';

const config = parseWritingConfig({
  SUPABASE_URL: 'https://database.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fictional_key',
  CORS_ALLOWED_ORIGINS: 'https://web.example.test',
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('checkLiveness', () => {
  it('reports process liveness without loading configuration or contacting dependencies', () => {
    const fetcher = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Unavailable.'));

    expect(checkLiveness()).toStrictEqual({ status: 'alive' });
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe('checkWritingReadiness (unit fixtures, not live database acceptance)', () => {
  it('fails closed on missing writing configuration without fetching', async () => {
    const fetcher = vi.fn<typeof fetch>();

    expect(await checkWritingReadiness(() => parseWritingConfig({}), fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('does not expose arbitrary configuration exceptions', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const configSource = () => {
      throw new Error('Fictional private configuration detail.');
    };

    expect(await checkWritingReadiness(configSource, fetcher)).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('requires a POST schema RPC returning boolean true with a bounded signal', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout');
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(true));

    expect(await checkWritingReadiness(() => config, fetcher)).toBe(true);
    expect(timeout).toHaveBeenCalledExactlyOnceWith(1500);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(
      'https://database.example.test/rest/v1/rpc/api_release_ready',
      {
        method: 'POST',
        headers: {
          apikey: config.supabasePublishableKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_release: 'connected-text-v1' }),
        cache: 'no-store',
        redirect: 'error',
        signal: expect.any(AbortSignal),
      },
    );
  });

  it.each([false, null, 'true', 1, {}, { ready: true }, [true]].map((result) => ({ result })))(
    'rejects non-true RPC result $result',
    async ({ result }) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(result));

      expect(await checkWritingReadiness(() => config, fetcher)).toBe(false);
      expect(fetcher).toHaveBeenCalledOnce();
    },
  );

  it.each([401, 403, 404, 500, 503])('rejects non-OK RPC status %s', async (status) => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(true, { status }));

    expect(await checkWritingReadiness(() => config, fetcher)).toBe(false);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('fails closed on an older schema even when its original readiness RPC returns true', async () => {
    const response = Response.json(
      { code: 'PGRST202', message: 'Fictional missing schema RPC detail.' },
      { status: 404 },
    );
    const fetcher = vi
      .fn<typeof fetch>()
      .mockImplementation(async (input) =>
        String(input).endsWith('/rpc/api_release_ready') ? response : Response.json(true),
      );
    const json = vi.spyOn(response, 'json');

    expect(await checkWritingReadiness(() => config, fetcher)).toBe(false);
    expect(json).not.toHaveBeenCalled();
  });

  it.each(['not-json', '', '<html>Unavailable</html>', 'true trailing-data'])(
    'rejects malformed RPC body %j',
    async (body) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(body));

      expect(await checkWritingReadiness(() => config, fetcher)).toBe(false);
    },
  );

  it('rejects an empty successful response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 204 }));

    expect(await checkWritingReadiness(() => config, fetcher)).toBe(false);
  });

  it('maps fetch exceptions to not-ready without propagating their details', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('Fictional private DB detail.'));

    expect(await checkWritingReadiness(() => config, fetcher)).toBe(false);
  });

  it('fails closed when response-body parsing throws', async () => {
    const response = Response.json(true);
    vi.spyOn(response, 'json').mockRejectedValue(new Error('Fictional body read failure.'));
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);

    expect(await checkWritingReadiness(() => config, fetcher)).toBe(false);
  });

  it('keeps fictional database and key details out of the public failure envelope', async () => {
    const privateDetail = 'Fictional private DB schema detail.';
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error(privateDetail));
    const ready = await checkWritingReadiness(() => config, fetcher);

    expect(ready).toBe(false);
    const response = errorResponse('not_ready');
    const body: unknown = await response.json();

    expect(response.status).toBe(503);
    expect(body).toStrictEqual({
      error: {
        code: 'not_ready',
        message: 'Service is not ready.',
        request_id: response.headers.get('X-Request-Id'),
      },
    });
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain(privateDetail);
    expect(serialized).not.toContain(config.supabasePublishableKey);
    expect(serialized).not.toContain(config.supabaseUrl);
  });

  it('rejects true if the deadline expired while reading the body', async () => {
    const controller = new AbortController();
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(controller.signal);
    const response = Response.json(true);
    vi.spyOn(response, 'json').mockImplementation(async () => {
      controller.abort();
      return true;
    });
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);

    expect(await checkWritingReadiness(() => config, fetcher)).toBe(false);
  });

  it('aborts a pending fetch with the real 1500 ms timeout signal', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        if (!signal) {
          reject(new Error('Missing deadline signal.'));
          return;
        }
        signal.addEventListener('abort', () => reject(new Error('Timed out.')), {
          once: true,
        });
      });
    });

    expect(await checkWritingReadiness(() => config, fetcher)).toBe(false);
    const signal = fetcher.mock.calls[0]?.[1]?.signal;
    expect(signal?.aborted).toBe(true);
    expect(signal?.reason).toBeInstanceOf(DOMException);
    expect(signal?.reason.name).toBe('TimeoutError');
  });
});
