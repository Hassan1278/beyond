import 'server-only';
import { loadWritingConfig } from './config';
import { parseAccountConfig, createAccountDeleteHandler, createAccountProcessor } from './account';
import { errorResponse } from './http';
export async function handleAccountRequest(request: Request): Promise<Response> {
  try {
    return await createAccountDeleteHandler(loadWritingConfig(), () =>
      parseAccountConfig(process.env),
    )(request);
  } catch {
    return errorResponse('not_ready');
  }
}
export async function handleAccountProcessing(request: Request): Promise<Response> {
  try {
    return await createAccountProcessor(
      loadWritingConfig(),
      parseAccountConfig(process.env),
    )(request);
  } catch {
    return errorResponse('not_ready');
  }
}
