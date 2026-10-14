/**
 * The letter half of local acceptance: a stub model endpoint that speaks the
 * Anthropic Messages API, plus the real AI service (ai/) pointed at it. The API
 * under test calls the AI service exactly as in production; only the model is
 * fictional. Every request the model receives is kept so tests can prove what
 * left the backend (and what didn't).
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

export const AI_PORT = 3003;
const MODEL_PORT = 3005;

function letterFor(input) {
  const entry = input.entries[0];
  const words = entry.text.split(/\s+/).slice(0, 4).join(' ');
  return {
    language: 'en',
    greeting: 'Good morning.',
    signoff: 'Until tonight.',
    headline: 'A fictional letter about your night',
    recap: 'You wrote about your night.',
    analysis: [
      {
        lens: 'feeling',
        title: 'Your words',
        text: 'It might matter.',
        quote: words,
        entryId: entry.id,
      },
      {
        lens: 'pattern',
        title: 'A thread',
        text: 'It might come back.',
        quote: '',
        entryId: entry.id,
      },
    ],
    challenge: { issue: 'Nothing needs fixing', cause: 'An ordinary night.' },
    advice: { text: 'Try one small thing.', why: 'You wrote it down.' },
    encouragement: 'You took a few minutes for yourself.',
    steps: [
      { text: 'Walk ten minutes', kind: 'rest', minutes: 10, why: 'Rest.' },
      { text: 'Message a friend', kind: 'connection', minutes: 3, why: 'Connection.' },
      { text: 'Write one line', kind: 'reflection', minutes: 3, why: 'Reflection.' },
    ],
    themes: ['ordinary'],
    openQuestions: [],
    wins: [],
    tone: 'ordinary',
    safetyConcern: false,
    remember: [{ text: 'Fictional learned memory', entryId: entry.id }],
  };
}

export function startModelStub() {
  const requests = [];
  const server = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      requests.push({ path: req.url, headers: req.headers, body: raw });
      const body = JSON.parse(raw || '{}');
      const tool = body.tools?.[0]?.name;
      const user = body.messages?.[0]?.content ?? '';
      let input = {};
      if (tool === 'beyond_letter')
        input = letterFor(JSON.parse(user.slice(user.lastIndexOf('Input:\n') + 7)));
      if (tool === 'beyond_note') input = { text: 'A fictional note about the month.' };
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(
        JSON.stringify({
          stop_reason: 'tool_use',
          content: [{ type: 'tool_use', name: tool, input }],
        }),
      );
    });
  });
  return new Promise((resolve) =>
    server.listen(MODEL_PORT, '127.0.0.1', () =>
      resolve({ requests, close: () => server.close() }),
    ),
  );
}

/** Starts the built AI service against the stub. Returns its bearer and a stop(). */
export async function startAiService(root) {
  const token = randomBytes(32).toString('hex');
  const child = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules/next/dist/bin/next'),
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(AI_PORT),
    ],
    {
      cwd: path.join(root, 'ai'),
      env: {
        PATH: process.env.PATH ?? '',
        NODE_ENV: 'production',
        NEXT_TELEMETRY_DISABLED: '1',
        AI_SERVICE_TOKEN: token,
        ANTHROPIC_API_KEY: 'sk-ant-fictional-local-key',
        ANTHROPIC_BASE_URL: `http://127.0.0.1:${MODEL_PORT}`,
        ANTHROPIC_MODEL: 'fixture-model',
      },
      stdio: ['ignore', 'ignore', 'ignore'],
    },
  );
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${AI_PORT}/v1/health`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(500),
      });
      if (r.ok) break;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  return {
    token,
    url: `http://127.0.0.1:${AI_PORT}`,
    stop: () => {
      if (child.exitCode === null) child.kill('SIGTERM');
    },
  };
}
