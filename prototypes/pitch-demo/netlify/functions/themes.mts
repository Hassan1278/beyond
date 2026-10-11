/**
 * Netlify adapter for theme reading. Mirrors `letter.mts`: Netlify functions
 * speak the Web Request/Response API, so the node-style handler in
 * `api/themes.ts` is reused through its exported pieces rather than its http
 * plumbing.
 */
import { isConfigured } from '../../api/letter.js';
import { readThemes, validate } from '../../api/themes.js';

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

  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const parsed = validate(body);
  if (typeof parsed === 'string') return json(400, { error: parsed });

  try {
    return json(200, await readThemes(parsed));
  } catch (err) {
    console.error('[beyond] themes failed', err);
    return json(502, { error: 'themes unavailable' });
  }
}

export const config = { path: '/api/themes' };
