import { isWritingReady } from '../../../../server/health';
import { dataResponse, errorResponse } from '../../../../server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<Response> {
  return (await isWritingReady())
    ? dataResponse({ status: 'ready' } as const)
    : errorResponse('not_ready');
}
