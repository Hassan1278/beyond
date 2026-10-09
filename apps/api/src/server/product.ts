import {
  settingsSchema,
  patchSettingsSchema,
  memorySchema,
  createMemorySchema,
  todoSchema,
  createTodoSchema,
  patchTodoSchema,
  memoryListSchema,
  todoListSchema,
  entryParamsSchema,
} from '@beyond/shared';
import { isAllowedBrowserOrigin, type WritingConfig } from './config-parser';
import { dataResponse, errorResponse } from './http';
import {
  WritingFailure,
  fail,
  withCors,
  preflight,
  authenticate,
  rpc,
  readBody,
  encodeCursor,
  listQuery,
} from './transport';

type Kind = 'settings' | 'memories' | 'todos';
export function createProductHandler(config: WritingConfig, injectedFetch: typeof fetch = fetch) {
  return async (request: Request, kind: Kind, id?: string): Promise<Response> => {
    let origin: string | null = null;
    try {
      const requestedOrigin = request.headers.get('Origin');
      if (requestedOrigin !== null) {
        if (!isAllowedBrowserOrigin(config, requestedOrigin)) fail('forbidden');
        origin = requestedOrigin;
      }
      const methods =
        kind === 'settings'
          ? ['GET', 'PATCH']
          : id === undefined
            ? ['GET', 'POST']
            : kind === 'todos'
              ? ['GET', 'PATCH', 'DELETE']
              : ['GET', 'DELETE'];
      if (request.method === 'OPTIONS')
        return withCors(preflight(request, origin, methods), origin, true);
      if (!methods.includes(request.method)) fail('bad_request');
      const headers = await authenticate(request, config, injectedFetch);
      const url = new URL(request.url);
      const entryId =
        id === undefined ? undefined : entryParamsSchema.parse({ id }).id.toLowerCase();
      if (
        !(request.method === 'GET' && kind !== 'settings' && id === undefined) &&
        url.search !== ''
      )
        fail('bad_request');
      const call = (name: string, params: Record<string, unknown>) =>
        rpc(config, injectedFetch, headers, name, params);
      const parse = <T>(
        schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
        value: unknown,
        code: 'bad_request' | 'internal_error',
      ): T => {
        const result = schema.safeParse(value);
        if (!result.success) fail(code);
        return result.data as T;
      };
      let data: unknown;
      if (kind === 'settings') {
        if (request.method === 'PATCH') {
          const { expected_revision, ...patch } = parse(
            patchSettingsSchema,
            await readBody(request),
            'bad_request',
          );
          data = parse(
            settingsSchema,
            await call('settings_update', {
              p_patch: patch,
              p_expected_revision: expected_revision,
            }),
            'internal_error',
          );
        } else data = parse(settingsSchema, await call('settings_get', {}), 'internal_error');
      } else if (request.method === 'POST') {
        if (kind === 'memories') {
          const body = parse(createMemorySchema, await readBody(request), 'bad_request');
          data = parse(
            memorySchema,
            await call('memory_create', {
              p_text: body.text,
              p_source_entry_id: body.source_entry_id,
              p_approved: body.approved,
              p_idempotency_key: body.idempotency_key,
            }),
            'internal_error',
          );
        } else {
          const body = parse(createTodoSchema, await readBody(request), 'bad_request');
          data = parse(
            todoSchema,
            await call('todo_create', {
              p_title: body.title,
              p_idempotency_key: body.idempotency_key,
            }),
            'internal_error',
          );
        }
      } else if (request.method === 'PATCH') {
        const { expected_revision, ...patch } = parse(
          patchTodoSchema,
          await readBody(request),
          'bad_request',
        );
        data = parse(
          todoSchema,
          await call('todo_update', {
            p_id: entryId,
            p_patch: patch,
            p_expected_revision: expected_revision,
          }),
          'internal_error',
        );
      } else if (request.method === 'DELETE') {
        data = parse(
          entryParamsSchema,
          await call('product_delete', { p_kind: kind, p_id: entryId }),
          'internal_error',
        );
      } else if (entryId !== undefined) {
        const value = await call('product_get', { p_kind: kind, p_id: entryId });
        data =
          kind === 'memories'
            ? parse(memorySchema, value, 'internal_error')
            : parse(todoSchema, value, 'internal_error');
      } else {
        const { limit, cursor } = listQuery(url);
        const result = await call('product_list', {
          p_kind: kind,
          p_limit: limit + 1,
          p_before_created_at: cursor?.created_at ?? null,
          p_before_id: cursor?.id ?? null,
        });
        const rows =
          kind === 'memories'
            ? parse(memorySchema.array().max(limit + 1), result, 'internal_error')
            : parse(todoSchema.array().max(limit + 1), result, 'internal_error');
        const items = rows.slice(0, limit);
        const last = items.at(-1);
        const page = {
          items,
          next_cursor:
            rows.length > limit && last
              ? encodeCursor({ created_at: last.created_at, id: last.id })
              : null,
        };
        data =
          kind === 'memories'
            ? parse(memoryListSchema, page, 'internal_error')
            : parse(todoListSchema, page, 'internal_error');
      }
      if (entryId !== undefined && (data as { id?: unknown }).id !== entryId)
        fail('internal_error');
      return withCors(dataResponse(data), origin);
    } catch (error) {
      // Malformed path IDs are input errors; upstream resources are parsed separately.
      const code =
        error instanceof WritingFailure
          ? error.code
          : error instanceof Error && error.name === 'ZodError'
            ? 'bad_request'
            : 'internal_error';
      return withCors(errorResponse(code), origin, request.method === 'OPTIONS');
    }
  };
}
