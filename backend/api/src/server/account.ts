import { Buffer } from 'node:buffer';
import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { deletingAccountSchema } from '@beyond/shared';
import {
  isAllowedBrowserOrigin,
  type WritingConfig,
  type WritingEnvironment,
} from './config-parser';
import { dataResponse, errorResponse } from './http';
import {
  WritingFailure,
  fail,
  withCors,
  preflight,
  verifyIdentity,
  rpc,
  boundedUpstream,
  readBody,
} from './transport';

export interface AccountConfig {
  secretKey: string;
  triggerSecret: string;
}
export function parseAccountConfig(env: WritingEnvironment): AccountConfig {
  if (env.ACCOUNT_DELETION_ENABLED !== 'true') throw new Error('Account deletion is disabled.');
  const secretKey = env.SUPABASE_SECRET_KEY ?? '';
  const triggerSecret = env.ACCOUNT_JOB_TRIGGER_SECRET ?? '';
  // GoTrue local legacy service JWTs and hosted sb_secret keys are both server-only.
  if (
    !/^(?:sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)$/.test(secretKey) ||
    !/^[A-Za-z0-9_-]{32,256}$/.test(triggerSecret)
  )
    throw new Error('Invalid account cleanup configuration.');
  return { secretKey, triggerSecret };
}
export function hasRecentSignIn(authorization: string | null, now = Date.now()): boolean {
  // Call only after Supabase has freshly verified this SAME bearer. Decoding is not authentication.
  try {
    const token = authorization?.replace(/^Bearer /i, '') ?? '';
    const claims = JSON.parse(
      Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'),
    ) as { amr?: unknown };
    if (!Array.isArray(claims.amr)) return false;
    return claims.amr.some((item: unknown) => {
      if (typeof item !== 'object' || item === null) return false;
      const record = item as { method?: unknown; timestamp?: unknown };
      return (
        typeof record.method === 'string' &&
        ['password', 'oauth', 'totp', 'sso', 'webauthn'].includes(record.method) &&
        typeof record.timestamp === 'number' &&
        Number.isInteger(record.timestamp) &&
        record.timestamp * 1000 <= now + 30_000 &&
        now - record.timestamp * 1000 <= 300_000
      );
    });
  } catch {
    return false;
  }
}
export function createAccountDeleteHandler(
  config: WritingConfig,
  enabled: () => AccountConfig,
  fetcher: typeof fetch = fetch,
  enforceSession = false,
) {
  return async (request: Request): Promise<Response> => {
    let origin: string | null = null;
    try {
      const incoming = request.headers.get('Origin');
      if (incoming !== null) {
        if (!isAllowedBrowserOrigin(config, incoming)) fail('forbidden');
        origin = incoming;
      }
      if (request.method === 'OPTIONS')
        return withCors(preflight(request, origin, ['DELETE']), origin, true);
      if (request.method !== 'DELETE' || new URL(request.url).search) fail('bad_request');
      const { userId } = await verifyIdentity(request, config, fetcher);
      if (
        enforceSession &&
        (await rpc(
          config,
          fetcher,
          {
            apikey: config.supabasePublishableKey,
            Authorization: request.headers.get('Authorization')!,
          },
          'account_session_active',
          {},
        )) !== true
      )
        fail('unauthorized');
      if (!hasRecentSignIn(request.headers.get('Authorization'))) fail('forbidden');
      // Next.js may wrap a bodyless DELETE in an empty stream; inspect bytes,
      // with the same deadline/cancellation boundary as other private requests.
      await readBody(request, { mustBeEmpty: true });
      let account: AccountConfig;
      try {
        account = enabled();
      } catch {
        fail('not_ready');
      }
      const headers = { apikey: account.secretKey, Authorization: `Bearer ${account.secretKey}` };
      const result = deletingAccountSchema.safeParse(
        await rpc(config, fetcher, headers, 'account_delete_begin', { p_user_id: userId }),
      );
      if (!result.success) fail('internal_error');
      const response = dataResponse(result.data);
      return withCors(
        new Response(response.body, { status: 202, headers: response.headers }),
        origin,
      );
    } catch (error) {
      return withCors(
        errorResponse(error instanceof WritingFailure ? error.code : 'internal_error'),
        origin,
        request.method === 'OPTIONS',
      );
    }
  };
}
const claimsSchema = z.array(z.strictObject({ user_id: z.uuid(), lease_token: z.uuid() })).max(10);
const processingBody = z.strictObject({ limit: z.int().min(1).max(10).optional() });
export function validTrigger(request: Request, expected: string): boolean {
  const value = request.headers.get('Authorization') ?? '';
  if (value.length > 300) return false;
  return timingSafeEqual(
    createHash('sha256').update(value).digest(),
    createHash('sha256').update(`Bearer ${expected}`).digest(),
  );
}
export function createAccountProcessor(
  config: WritingConfig,
  account: AccountConfig,
  fetcher: typeof fetch = fetch,
) {
  return async (request: Request): Promise<Response> => {
    try {
      if (request.method !== 'POST' || new URL(request.url).search) fail('bad_request');
      if (request.headers.has('Origin') || !validTrigger(request, account.triggerSecret))
        fail('unauthorized');
      const body = processingBody.safeParse(await readBody(request));
      if (!body.success) fail('bad_request');
      const headers = { apikey: account.secretKey, Authorization: `Bearer ${account.secretKey}` };
      const call = (name: string, params: Record<string, unknown>) =>
        rpc(config, fetcher, headers, name, params);
      const parsed = claimsSchema.safeParse(
        await call('account_delete_claim', { p_limit: body.data.limit ?? 5 }),
      );
      if (!parsed.success) fail('internal_error');
      let completed = 0,
        retried = 0;
      // Parallel within a bounded batch; each job has its own fence and 60-second lease.
      await Promise.all(
        parsed.data.map(async (job) => {
          const params = { p_user_id: job.user_id, p_lease_token: job.lease_token };
          try {
            if ((await call('account_delete_purge', params)) !== true) fail('internal_error');
            await boundedUpstream(
              fetcher,
              `${config.supabaseUrl}/auth/v1/admin/users/${job.user_id}`,
              {
                method: 'DELETE',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ should_soft_delete: false }),
              },
              async (response) => {
                // Consume inside the deadline; no provider response is returned or logged.
                await response.text();
                if (!response.ok && response.status !== 404) fail('not_ready');
              },
            );
            if ((await call('account_delete_finish', params)) !== true) fail('internal_error');
            completed++;
          } catch {
            retried++;
            // A failed retry RPC still leaves a durable expired-lease recovery path.
            try {
              await call('account_delete_retry', params);
            } catch {
              /* lease expiry recovers */
            }
          }
        }),
      );
      return dataResponse({ claimed: parsed.data.length, completed, retried });
    } catch (error) {
      return errorResponse(error instanceof WritingFailure ? error.code : 'internal_error');
    }
  };
}
