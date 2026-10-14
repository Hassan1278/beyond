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
    // The initial schema's gate can pass before this release's later migrations exist.
    const response = await fetcher(`${config.supabaseUrl}/rest/v1/rpc/api_release_ready`, {
      method: 'POST',
      headers: {
        apikey: config.supabasePublishableKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_release: 'beyond-letters-v1' }),
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
