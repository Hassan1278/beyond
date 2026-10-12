import { handleProductRequest } from '../../../../server/product-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export async function GET(request: Request): Promise<Response> {
  return handleProductRequest(request, 'todos');
}
export async function POST(request: Request): Promise<Response> {
  return handleProductRequest(request, 'todos');
}
export async function OPTIONS(request: Request): Promise<Response> {
  return handleProductRequest(request, 'todos');
}
