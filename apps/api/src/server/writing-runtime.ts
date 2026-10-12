import 'server-only';

import { loadWritingConfig } from './config';
import { errorResponse } from './http';
import { createWritingHandler } from './writing';

export async function handleWritingRequest(request: Request, id?: string): Promise<Response> {
  try {
    return await createWritingHandler(loadWritingConfig(), fetch, true)(request, id);
  } catch {
    const response = errorResponse('not_ready');
    response.headers.set(
      'Vary',
      request.method === 'OPTIONS'
        ? 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers'
        : 'Origin',
    );
    return response;
  }
}
