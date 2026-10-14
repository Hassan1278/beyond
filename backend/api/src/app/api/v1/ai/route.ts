import { handleLetterRequest } from '@/server/letter-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(request: Request): Promise<Response> {
  return handleLetterRequest(request, 'ai');
}
export { handler as GET, handler as OPTIONS };
