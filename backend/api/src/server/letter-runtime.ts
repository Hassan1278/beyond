import 'server-only';
import { loadWritingConfig } from './config';
import { errorResponse } from './http';
import {
  createLetterHandler,
  createLetterProcessor,
  parseLetterWorkerConfig,
  type LetterRoute,
} from './letters';

export async function handleLetterRequest(
  request: Request,
  route: LetterRoute,
  id?: string,
): Promise<Response> {
  try {
    return await createLetterHandler(loadWritingConfig(), process.env)(request, route, id);
  } catch {
    const response = errorResponse('not_ready');
    response.headers.set('Vary', 'Origin');
    return response;
  }
}

export async function handleLetterProcessing(request: Request): Promise<Response> {
  try {
    return await createLetterProcessor(
      loadWritingConfig(),
      parseLetterWorkerConfig(process.env),
    )(request);
  } catch {
    return errorResponse('not_ready');
  }
}
