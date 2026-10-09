import 'server-only';
import { loadWritingConfig } from './config';
import { errorResponse } from './http';
import { createProductHandler } from './product';
export async function handleProductRequest(
  request: Request,
  kind: 'settings' | 'memories' | 'todos',
  id?: string,
): Promise<Response> {
  try {
    return await createProductHandler(loadWritingConfig())(request, kind, id);
  } catch {
    const response = errorResponse('not_ready');
    response.headers.set('Vary', 'Origin');
    return response;
  }
}
