import 'server-only';
import { loadWritingConfig } from './config';
import {
  createReflectionHandler,
  createReflectionProcessor,
  parseReflectionConfig,
} from './reflections';
import { errorResponse } from './http';
export async function handleReflectionRequest(
  request: Request,
  kind: 'list' | 'item' | 'request' | 'actions',
  id?: string,
): Promise<Response> {
  try {
    return await createReflectionHandler(loadWritingConfig(), process.env)(request, kind, id);
  } catch {
    const response = errorResponse('not_ready');
    response.headers.set('Vary', 'Origin');
    return response;
  }
}
export async function handleReflectionProcess(request: Request): Promise<Response> {
  try {
    return await createReflectionProcessor(
      loadWritingConfig(),
      parseReflectionConfig(process.env),
    )(request);
  } catch {
    return errorResponse('not_ready');
  }
}
