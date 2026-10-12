import { z } from 'zod';
import {
  reflectionSchema,
  reflectionListSchema,
  reflectionJobSchema,
  requestReflectionSchema,
  correctionSchema,
  reflectionDecisionSchema,
  reflectionDecisionResultSchema,
  entryParamsSchema,
  aiInputSchema,
  aiOutputSchema,
} from '@beyond/shared';
import {
  isAllowedBrowserOrigin,
  type WritingConfig,
  type WritingEnvironment,
} from './config-parser';
import { dataResponse, errorResponse } from './http';
import { requireBudget } from './budget';
import { validTrigger } from './account';
import {
  authenticate,
  fail,
  preflight,
  readBody,
  rpc,
  withCors,
  WritingFailure,
  listQuery,
  encodeCursor,
} from './transport';
export interface ReflectionConfig {
  secretKey: string;
  triggerSecret: string;
  serviceUrl: string;
  serviceToken: string;
}
export function parseReflectionConfig(env: WritingEnvironment): ReflectionConfig {
  if (env.REFLECTIONS_ENABLED !== 'true') throw new Error('Reflections disabled.');
  const secretKey = env.SUPABASE_SECRET_KEY ?? '';
  const triggerSecret = env.REFLECTION_JOB_TRIGGER_SECRET ?? '';
  const serviceToken = env.AI_SERVICE_TOKEN ?? '';
  const raw = env.AI_SERVICE_URL ?? '';
  const url = new URL(raw);
  if (
    !/^(?:sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+)$/.test(secretKey) ||
    !/^[-A-Za-z0-9_]{32,256}$/.test(triggerSecret) ||
    !/^[-A-Za-z0-9_]{32,256}$/.test(serviceToken) ||
    url.origin !== raw ||
    url.username ||
    url.password ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
  )
    throw new Error('Invalid reflection configuration.');
  return { secretKey, triggerSecret, serviceUrl: url.origin, serviceToken };
}
export function createReflectionHandler(
  config: WritingConfig,
  env: WritingEnvironment,
  fetcher: typeof fetch = fetch,
) {
  return async (
    request: Request,
    kind: 'list' | 'item' | 'request' | 'actions',
    id?: string,
  ): Promise<Response> => {
    let origin: string | null = null;
    try {
      const incoming = request.headers.get('Origin');
      if (incoming !== null) {
        if (!isAllowedBrowserOrigin(config, incoming)) fail('forbidden');
        origin = incoming;
      }
      const methods =
        kind === 'list'
          ? ['GET']
          : kind === 'request'
            ? ['POST', 'DELETE']
            : kind === 'actions'
              ? ['POST']
              : ['GET', 'PATCH'];
      if (request.method === 'OPTIONS')
        return withCors(preflight(request, origin, methods), origin, true);
      if (!methods.includes(request.method)) fail('bad_request');
      const headers = await authenticate(request, config, fetcher);
      await requireBudget(request, config, fetcher, headers);
      if (kind !== 'list' && new URL(request.url).search) fail('bad_request');
      const resourceId =
        id === undefined ? undefined : entryParamsSchema.parse({ id }).id.toLowerCase();
      const call = (name: string, params: Record<string, unknown>) =>
        rpc(config, fetcher, headers, name, params);
      const parse = <T>(
        schema: z.ZodType<T>,
        value: unknown,
        code: 'bad_request' | 'internal_error',
      ): T => {
        const p = schema.safeParse(value);
        if (!p.success) fail(code);
        return p.data;
      };
      let data: unknown;
      if (kind === 'request') {
        if (request.method === 'POST') {
          try {
            parseReflectionConfig(env);
          } catch {
            fail('not_ready');
          }
          const body = parse(requestReflectionSchema, await readBody(request), 'bad_request');
          data = parse(
            reflectionJobSchema,
            await call('reflection_request', {
              p_entry_id: resourceId,
              p_expected_revision: body.expected_revision,
            }),
            'internal_error',
          );
          if ((data as { entry_id: string }).entry_id !== resourceId) fail('internal_error');
        } else {
          await readBody(request, { mustBeEmpty: true });
          data = parse(
            entryParamsSchema,
            await call('reflection_cancel', { p_entry_id: resourceId }),
            'internal_error',
          );
        }
      } else if (kind === 'actions') {
        const body = parse(reflectionDecisionSchema, await readBody(request), 'bad_request');
        data = parse(
          reflectionDecisionResultSchema,
          await call('reflection_decide', {
            p_id: resourceId,
            p_action_id: body.action_id,
            p_decision: body.decision,
          }),
          'internal_error',
        );
        if ((data as { reflection: { id: string } }).reflection.id !== resourceId)
          fail('internal_error');
      } else if (kind === 'item') {
        if (request.method === 'PATCH') {
          const body = parse(correctionSchema, await readBody(request), 'bad_request');
          data = parse(
            reflectionSchema,
            await call('reflection_correct', {
              p_id: resourceId,
              p_text: body.text,
              p_expected_revision: body.expected_revision,
            }),
            'internal_error',
          );
        } else
          data = parse(
            reflectionSchema,
            await call('reflection_get', { p_id: resourceId }),
            'internal_error',
          );
        if ((data as { id: string }).id !== resourceId) fail('internal_error');
      } else {
        const { limit, cursor } = listQuery(new URL(request.url));
        const rows = parse(
          reflectionSchema.array().max(limit + 1),
          await call('reflection_list', {
            p_limit: limit + 1,
            p_before_created_at: cursor?.created_at ?? null,
            p_before_id: cursor?.id ?? null,
          }),
          'internal_error',
        );
        const items = rows.slice(0, limit);
        const last = items.at(-1);
        data = parse(
          reflectionListSchema,
          { items, next_cursor: rows.length > limit && last ? encodeCursor(last) : null },
          'internal_error',
        );
      }
      return withCors(dataResponse(data), origin);
    } catch (error) {
      return withCors(
        errorResponse(
          error instanceof WritingFailure
            ? error.code
            : error instanceof z.ZodError
              ? 'bad_request'
              : 'internal_error',
        ),
        origin,
        request.method === 'OPTIONS',
      );
    }
  };
}
/** Versioned HTTP handoff. No providers, prompts, fallbacks or AI writes live here. */
export async function generateReflection(
  config: ReflectionConfig,
  input: z.infer<typeof aiInputSchema>,
  fetcher: typeof fetch = fetch,
) {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error('Service deadline.'));
    }, 25_000);
  });
  try {
    return await Promise.race([
      (async () => {
        const response = await fetcher(config.serviceUrl + '/v1/reflections', {
          method: 'POST',
          cache: 'no-store',
          redirect: 'error',
          signal: controller.signal,
          headers: {
            Authorization: 'Bearer ' + config.serviceToken,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(aiInputSchema.parse(input)),
        });
        if (!response.ok || !response.body) throw new Error('Service unavailable.');
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8', { fatal: true });
        let bytes = 0,
          text = '';
        try {
          for (;;) {
            const n = await reader.read();
            if (n.done) break;
            bytes += n.value.byteLength;
            if (bytes > 128_000) throw new Error('Invalid service response.');
            text += decoder.decode(n.value, { stream: true });
          }
          text += decoder.decode();
        } finally {
          void reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
        const output = aiOutputSchema.parse(JSON.parse(text));
        if (
          output.request_id !== input.request_id ||
          output.entry_revision !== input.entry.revision
        )
          throw new Error('Stale service response.');
        return output;
      })(),
      deadline,
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}
export function createReflectionProcessor(
  config: WritingConfig,
  job: ReflectionConfig,
  fetcher: typeof fetch = fetch,
) {
  return async (request: Request): Promise<Response> => {
    try {
      if (request.method !== 'POST' || new URL(request.url).search) fail('bad_request');
      if (request.headers.has('Origin') || !validTrigger(request, job.triggerSecret))
        fail('unauthorized');
      const body = z
        .strictObject({ limit: z.int().min(1).max(5).optional() })
        .safeParse(await readBody(request));
      if (!body.success) fail('bad_request');
      const headers = { apikey: job.secretKey, Authorization: 'Bearer ' + job.secretKey };
      const call = (name: string, params: Record<string, unknown>) =>
        rpc(config, fetcher, headers, name, params);
      const jobs = z
        .array(z.strictObject({ id: z.uuid(), lease_token: z.uuid() }))
        .max(5)
        .parse(await call('reflection_claim', { p_limit: body.data.limit ?? 3 }));
      let completed = 0,
        retried = 0;
      await Promise.all(
        jobs.map(async (j) => {
          const fence = { p_id: j.id, p_lease_token: j.lease_token };
          try {
            const input = aiInputSchema.parse(await call('reflection_input', fence));
            if (input.request_id !== j.id) throw new Error('Invalid job.');
            const output = await generateReflection(job, input, fetcher);
            if (
              (await call('reflection_finish', {
                ...fence,
                p_output: output,
                p_context_ids: [...input.memories, ...input.corrections].map((m) => m.id),
              })) !== true
            )
              throw new Error('Commit failed.');
            completed++;
          } catch {
            retried++;
            try {
              await call('reflection_retry', fence);
            } catch {
              /* Expired leases recover independently. */
            }
          }
        }),
      );
      return dataResponse({ claimed: jobs.length, completed, retried });
    } catch (error) {
      return errorResponse(error instanceof WritingFailure ? error.code : 'internal_error');
    }
  };
}
