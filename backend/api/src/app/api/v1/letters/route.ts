import { handleLetterRequest } from '@/server/letter-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(request: Request): Promise<Response> {
  return handleLetterRequest(request, 'letters');
}
export { handler as GET, handler as POST, handler as OPTIONS };
