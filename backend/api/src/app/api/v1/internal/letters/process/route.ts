import { handleLetterProcessing } from '@/server/letter-runtime';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Each claimed letter may wait up to 170 s for the AI service.
export const maxDuration = 300;
export const POST = handleLetterProcessing;
