/**
 * Netlify adapter. Netlify functions speak the Web Request/Response API, so the
 * node-style handler in `api/letter.ts` is reused through its exported pieces
 * rather than its http plumbing.
 */
import {
  BodyFailure,
  isConfigured,
  overLimit,
  readWebBody,
  validate,
  writeLetter,
} from '../../api/letter.js';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'GET') {
    return json(200, {
      ok: isConfigured(),
      model: process.env.BEYOND_MODEL || 'claude-opus-5-5',
      effort: process.env.BEYOND_EFFORT || 'low',
    });
  }
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });
  if (!isConfigured()) return json(503, { error: 'no ANTHROPIC_API_KEY on this host' });
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (overLimit(ip)) return json(429, { error: 'too many requests from here this hour' });

  let body: unknown = null;
  try {
    body = await readWebBody(req);
  } catch (error) {
    return json(error instanceof BodyFailure ? error.status : 400, {
      error: 'invalid request body',
    });
  }

  const parsed = validate(body);
  if (typeof parsed === 'string') return json(400, { error: parsed });

  try {
    return json(200, await writeLetter(parsed));
  } catch {
    console.error('[beyond] letter unavailable');
    return json(502, { error: 'letter unavailable' });
  }
}

export const config = { path: '/api/letter' };
