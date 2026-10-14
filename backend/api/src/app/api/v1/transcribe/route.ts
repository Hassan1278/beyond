import { handleLetterRequest } from '@/server/letter-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 180;
async function handler(request: Request): Promise<Response> {
  return handleLetterRequest(request, 'transcribe');
}
export { handler as POST, handler as OPTIONS };
