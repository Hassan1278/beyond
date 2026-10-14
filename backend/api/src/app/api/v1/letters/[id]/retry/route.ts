import { handleLetterRequest } from '@/server/letter-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleLetterRequest(request, 'retry', (await context.params).id);
}
export { handler as POST, handler as OPTIONS };
