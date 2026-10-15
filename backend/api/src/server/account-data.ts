import { accountSchema, clearedAccountDataSchema } from '@beyond/shared';
import { hasRecentSignIn, parseAccountConfig } from './account';
import { aiStatus, parseAiServiceConfig } from './letters';
import { requireBudget } from './budget';
import {
  isAllowedBrowserOrigin,
  type WritingConfig,
  type WritingEnvironment,
} from './config-parser';
import { dataResponse, errorResponse } from './http';
import {
  authenticate,
  fail,
  preflight,
  readBody,
  rpc,
  withCors,
  WritingFailure,
} from './transport';

export function createAccountDataHandler(
  config: WritingConfig,
  env: WritingEnvironment,
  fetcher: typeof fetch = fetch,
) {
  return async (request: Request, clear = false): Promise<Response> => {
    let origin: string | null = null;
    try {
      const incoming = request.headers.get('Origin');
      if (incoming !== null) {
        if (!isAllowedBrowserOrigin(config, incoming)) fail('forbidden');
        origin = incoming;
      }
      const methods = clear ? ['DELETE'] : ['GET'];
      if (request.method === 'OPTIONS')
        return withCors(preflight(request, origin, methods), origin, true);
      if (!methods.includes(request.method) || new URL(request.url).search) fail('bad_request');
      const headers = await authenticate(request, config, fetcher);
      await requireBudget(request, config, fetcher, headers);
      if (clear) {
        if (!hasRecentSignIn(request.headers.get('Authorization'))) fail('forbidden');
        await readBody(request, { mustBeEmpty: true });
        const result = clearedAccountDataSchema.safeParse(
          await rpc(config, fetcher, headers, 'account_data_clear', {}),
        );
        if (!result.success) fail('internal_error');
        return withCors(dataResponse(result.data), origin);
      }
      let deletion = false;
      let ai = null;
      try {
        ai = parseAiServiceConfig(env);
      } catch {
        /* letters stay queued until the AI service is configured */
      }
      try {
        parseAccountConfig(env);
        deletion = true;
      } catch {
        /* optional feature is disabled */
      }
      const status = await aiStatus(ai, fetcher);
      return withCors(
        dataResponse(
          accountSchema.parse({
            status: 'active',
            capabilities: {
              account_deletion: deletion,
              letters: status.letters,
              voice_transcription: status.transcribe,
            },
          }),
        ),
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
