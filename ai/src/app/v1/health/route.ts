import { handle } from '../../../lib/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 10;

export function GET(request: Request): Promise<Response> {
  return handle('health', request);
}
