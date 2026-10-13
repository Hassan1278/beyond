import { handleReflectionRequest } from '@/server/reflection-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return handleReflectionRequest(request, 'request', (await context.params).id);
}
export { handler as POST, handler as DELETE, handler as OPTIONS };
