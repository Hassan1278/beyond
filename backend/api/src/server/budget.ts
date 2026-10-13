import type { WritingConfig } from './config-parser';
import { fail, rpc } from './transport';

/** Database-backed per-user counters are shared across API instances. */
export async function requireBudget(
  request: Request,
  config: WritingConfig,
  fetcher: typeof fetch,
  headers: Readonly<Record<string, string>>,
): Promise<void> {
  const allowed = await rpc(config, fetcher, headers, 'api_request_budget', {
    p_write: !['GET', 'HEAD'].includes(request.method),
  });
  if (allowed === false) fail('rate_limited');
  if (allowed !== true) fail('not_ready');
}
