import { handleAccountDataRequest } from '../../../../../server/account-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function DELETE(request: Request): Promise<Response> {
  return handleAccountDataRequest(request, true);
}
export async function OPTIONS(request: Request): Promise<Response> {
  return handleAccountDataRequest(request, true);
}
