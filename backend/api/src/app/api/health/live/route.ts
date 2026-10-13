import { checkLiveness } from '../../../../server/health-check';
import { dataResponse } from '../../../../server/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export function GET(): Response {
  return dataResponse(checkLiveness());
}
