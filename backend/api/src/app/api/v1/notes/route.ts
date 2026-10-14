import { handleLetterRequest } from '@/server/letter-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Writing a note waits for the AI service (two attempts at most).
export const maxDuration = 300;
async function handler(request: Request): Promise<Response> {
  return handleLetterRequest(request, 'notes');
}
export { handler as GET, handler as POST, handler as OPTIONS };
