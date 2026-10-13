import { handleProductRequest } from '../../../../../server/product-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context): Promise<Response> {
  return handleProductRequest(request, 'todos', (await context.params).id);
}
export async function PATCH(request: Request, context: Context): Promise<Response> {
  return handleProductRequest(request, 'todos', (await context.params).id);
}
export async function DELETE(request: Request, context: Context): Promise<Response> {
  return handleProductRequest(request, 'todos', (await context.params).id);
}
export async function OPTIONS(request: Request, context: Context): Promise<Response> {
  return handleProductRequest(request, 'todos', (await context.params).id);
}
