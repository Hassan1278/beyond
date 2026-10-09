import {
  createEntryBodySchema,
  patchEntryBodySchema,
  entryParamsSchema,
  entrySchema,
  entryListSchema,
  entryCursorSchema,
} from '@beyond/shared';
import { isAllowedBrowserOrigin, type WritingConfig } from './config-parser';
import { dataResponse, errorResponse } from './http';
import {
  WritingFailure,
  isRecord,
  fail,
  withCors,
  preflight,
  authenticate,
  rpc,
  readBody,
  encodeCursor,
  listQuery,
} from './transport';

const collectionMethods = ['GET', 'POST'] as const;
const itemMethods = ['GET', 'PATCH', 'DELETE'] as const;
type Entry = ReturnType<typeof entrySchema.parse>;
const rpcEntriesSchema = entrySchema.array().max(101);

function resource(value: unknown, expectedId?: string): Entry {
  const parsed = entrySchema.safeParse(value);
  if (!parsed.success || (expectedId !== undefined && parsed.data.id !== expectedId)) {
    fail('internal_error');
  }
  return parsed.data;
}

export function createWritingHandler(
  config: WritingConfig,
  injectedFetch: typeof fetch = fetch,
): (request: Request, id?: string) => Promise<Response> {
  return async (request, id) => {
    let origin: string | null = null;
    const isPreflight = request.method === 'OPTIONS';
    try {
      const requestedOrigin = request.headers.get('Origin');
      if (requestedOrigin !== null) {
        if (!isAllowedBrowserOrigin(config, requestedOrigin)) {
          fail('forbidden');
        }
        origin = requestedOrigin;
      }
      const methods: readonly string[] = id === undefined ? collectionMethods : itemMethods;
      if (isPreflight) {
        return withCors(preflight(request, origin, methods), origin, true);
      }
      if (!methods.includes(request.method)) {
        fail('bad_request');
      }

      const headers = await authenticate(request, config, injectedFetch);
      const url = new URL(request.url);
      let entryId: string | undefined;
      if (id !== undefined) {
        const parsed = entryParamsSchema.safeParse({ id });
        if (!parsed.success) {
          fail('bad_request');
        }
        entryId = parsed.data.id.toLowerCase();
      }
      if (!(request.method === 'GET' && entryId === undefined) && url.search !== '') {
        fail('bad_request');
      }

      let data: unknown;
      if (request.method === 'POST') {
        const parsed = createEntryBodySchema.safeParse(await readBody(request));
        if (!parsed.success) {
          fail('bad_request');
        }
        const result = await rpc(config, injectedFetch, headers, 'entry_create', {
          p_text: parsed.data.text,
          p_idempotency_key: parsed.data.idempotency_key,
          p_reflection_opt_in: false,
        });
        if (
          !isRecord(result) ||
          Object.keys(result).length !== 2 ||
          typeof result.created !== 'boolean'
        ) {
          fail('internal_error');
        }
        data = resource(result.entry);
      } else if (request.method === 'PATCH') {
        const parsed = patchEntryBodySchema.safeParse(await readBody(request));
        if (!parsed.success) {
          fail('bad_request');
        }
        data = resource(
          await rpc(config, injectedFetch, headers, 'entry_update', {
            p_id: entryId,
            p_text: parsed.data.text,
            p_expected_revision: parsed.data.expected_revision,
          }),
          entryId,
        );
      } else if (request.method === 'DELETE') {
        const result = await rpc(config, injectedFetch, headers, 'entry_delete', { p_id: entryId });
        const parsed = entryParamsSchema.safeParse(result);
        if (!parsed.success || parsed.data.id !== entryId) {
          fail('internal_error');
        }
        data = parsed.data;
      } else if (entryId !== undefined) {
        data = resource(
          await rpc(config, injectedFetch, headers, 'entry_get', { p_id: entryId }),
          entryId,
        );
      } else {
        const { limit, cursor } = listQuery(url);
        const result = await rpc(config, injectedFetch, headers, 'entry_list', {
          p_limit: limit + 1,
          p_before_created_at: cursor?.created_at ?? null,
          p_before_id: cursor?.id ?? null,
        });
        if (!Array.isArray(result) || result.length > Math.min(101, limit + 1)) {
          fail('internal_error');
        }
        const parsed = rpcEntriesSchema.safeParse(result);
        if (!parsed.success) {
          fail('internal_error');
        }
        const entries = parsed.data.slice(0, limit);
        const lastEntry = entries.at(-1);
        const page = entryListSchema.safeParse({
          entries,
          next_cursor:
            parsed.data.length > limit && lastEntry !== undefined
              ? encodeCursor(
                  entryCursorSchema.parse({ created_at: lastEntry.created_at, id: lastEntry.id }),
                )
              : null,
        });
        if (!page.success) {
          fail('internal_error');
        }
        data = page.data;
      }
      return withCors(dataResponse(data), origin);
    } catch (error) {
      return withCors(
        errorResponse(error instanceof WritingFailure ? error.code : 'internal_error'),
        origin,
        isPreflight,
      );
    }
  };
}
