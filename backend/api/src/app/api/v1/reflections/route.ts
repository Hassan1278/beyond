import { handleReflectionRequest } from '@/server/reflection-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(request: Request): Promise<Response> {
  return handleReflectionRequest(request, 'list');
}
export { handler as GET, handler as OPTIONS };
