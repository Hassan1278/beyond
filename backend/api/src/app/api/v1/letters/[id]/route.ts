import { handleLetterRequest } from '@/server/letter-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleLetterRequest(request, 'letter', (await context.params).id);
}
export { handler as GET, handler as PATCH, handler as OPTIONS };
