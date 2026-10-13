import 'server-only';
import { loadWritingConfig } from './config';
import { errorResponse } from './http';
import { createAccountExportHandler } from './export';
export async function handleAccountExport(request: Request): Promise<Response> {
  try {
    return await createAccountExportHandler(loadWritingConfig(), fetch, true)(request);
  } catch {
    return errorResponse('not_ready');
  }
}
