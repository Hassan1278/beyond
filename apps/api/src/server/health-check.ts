import type { WritingConfig } from './config-parser';

export function checkLiveness(): { readonly status: 'alive' } {
  return { status: 'alive' };
}

export async function checkWritingReadiness(
  configSource: () => WritingConfig,
  fetcher: typeof fetch,
): Promise<boolean> {
  try {
    const config = configSource();
    const signal = AbortSignal.timeout(1500);
    // A migration must provide this RPC; connectivity alone never establishes readiness.
    const response = await fetcher(`${config.supabaseUrl}/rest/v1/rpc/api_schema_ready`, {
      method: 'POST',
      headers: {
        apikey: config.supabasePublishableKey,
        'Content-Type': 'application/json',
      },
      body: '{}',
      cache: 'no-store',
      redirect: 'error',
      signal,
    });

    if (!response.ok) {
      return false;
    }
    const result: unknown = await response.json();
    return !signal.aborted && result === true;
  } catch {
    return false;
  }
}
