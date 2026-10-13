import { handleAccountRequest, handleAccountDataRequest } from '../../../../server/account-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(request: Request): Promise<Response> {
  return handleAccountDataRequest(request);
}
export async function DELETE(request: Request): Promise<Response> {
  return handleAccountRequest(request);
}
export async function OPTIONS(request: Request): Promise<Response> {
  if (request.headers.get('Access-Control-Request-Method') === 'GET')
    return handleAccountDataRequest(request);
  return handleAccountRequest(request);
}
