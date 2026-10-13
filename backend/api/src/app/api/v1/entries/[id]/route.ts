import { handleWritingRequest } from '../../../../../server/writing-runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type EntryContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: EntryContext): Promise<Response> {
  return handleWritingRequest(request, (await context.params).id);
}

export async function PATCH(request: Request, context: EntryContext): Promise<Response> {
  return handleWritingRequest(request, (await context.params).id);
}

export async function DELETE(request: Request, context: EntryContext): Promise<Response> {
  return handleWritingRequest(request, (await context.params).id);
}

export async function OPTIONS(request: Request, context: EntryContext): Promise<Response> {
  return handleWritingRequest(request, (await context.params).id);
}
