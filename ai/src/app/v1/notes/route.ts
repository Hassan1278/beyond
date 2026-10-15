import { handle } from '../../../lib/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 300;

export function POST(request: Request): Promise<Response> {
  return handle('notes', request);
}
