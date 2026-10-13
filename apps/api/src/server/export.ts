import { z } from 'zod';
import {
  accountExportQuerySchema,
  accountExportPageSchema,
  accountExportMetadataSchema,
  entrySchema,
  memorySchema,
  todoSchema,
  reflectionSchema,
} from '@beyond/shared';
import { isAllowedBrowserOrigin, type WritingConfig } from './config-parser';
import { hasRecentSignIn } from './account';
import { dataResponse, errorResponse } from './http';
import { requireBudget } from './budget';
import {
  authenticate,
  decodeCursor,
  encodeCursor,
  fail,
  preflight,
  rpc,
  withCors,
  WritingFailure,
} from './transport';

export function createAccountExportHandler(
  config: WritingConfig,
  fetcher: typeof fetch = fetch,
  enforceBudget = false,
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
        return withCors(preflight(request, origin, ['GET']), origin, true);
      if (request.method !== 'GET') fail('bad_request');
      const headers = await authenticate(request, config, fetcher);
      if (enforceBudget) await requireBudget(request, config, fetcher, headers);
      if (!hasRecentSignIn(request.headers.get('Authorization'))) fail('forbidden');
      const raw: Record<string, string> = {};
      for (const [key, value] of new URL(request.url).searchParams) {
        if (Object.hasOwn(raw, key)) fail('bad_request');
        Object.defineProperty(raw, key, { value, enumerable: true });
      }
      const parsed = accountExportQuerySchema.safeParse(raw);
      if (!parsed.success) fail('bad_request');
      const query = parsed.data;
      const limit = Number(query.limit ?? '20');
      const cursor = query.cursor ? decodeCursor(query.cursor) : null;
      const value = await rpc(config, fetcher, headers, 'account_export_page', {
        p_section: query.section,
        p_limit: query.section === 'settings' ? null : limit + 1,
        p_before_created_at: cursor?.created_at ?? null,
        p_before_id: cursor?.id ?? null,
      });
      let result: unknown;
      if (query.section === 'settings') result = value;
      else {
        const row =
          query.section === 'entries'
            ? entrySchema
            : query.section === 'memories'
              ? memorySchema
              : query.section === 'reflections'
                ? reflectionSchema
                : todoSchema;
        const batch = accountExportMetadataSchema
          .extend({ section: z.literal(query.section), items: row.array().max(limit + 1) })
          .safeParse(value);
        if (!batch.success) fail('internal_error');
        const items = batch.data.items.slice(0, limit);
        const last = items.at(-1);
        result = {
          ...batch.data,
          items,
          next_cursor:
            batch.data.items.length > limit && last
              ? encodeCursor({ created_at: last.created_at, id: last.id })
              : null,
        };
      }
      const output = accountExportPageSchema.safeParse(result);
      if (!output.success || output.data.section !== query.section) fail('internal_error');
      const response = dataResponse(output.data);
      response.headers.set(
        'Content-Disposition',
        `attachment; filename="beyond-${query.section}.json"`,
      );
      response.headers.set('X-Content-Type-Options', 'nosniff');
      return withCors(response, origin);
    } catch (error) {
      return withCors(
        errorResponse(error instanceof WritingFailure ? error.code : 'internal_error'),
        origin,
        request.method === 'OPTIONS',
      );
    }
  };
}
