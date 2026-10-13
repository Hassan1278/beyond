import { handleAccountProcessing } from '../../../../../../server/account-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 60;
export async function POST(request: Request): Promise<Response> {
  return handleAccountProcessing(request);
}
