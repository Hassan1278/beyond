import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Requires an existing production build. No database acceptance is implied.
const root = process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url));
const environment = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' };
for (const key of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'CORS_ALLOWED_ORIGINS']) {
  delete environment[key];
}
const server = spawn(
  process.execPath,
  [
    path.join(root, 'node_modules/next/dist/bin/next'),
    'start',
    '--hostname',
    '127.0.0.1',
    '--port',
    '3002',
  ],
  { cwd: path.join(root, 'backend/api'), env: environment, stdio: ['ignore', 'pipe', 'pipe'] },
);

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('API startup timed out.')), 15_000);
    server.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    server.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`API exited before startup: ${code}`));
    });
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('Ready')) {
        clearTimeout(timer);
        resolve();
      }
    });
  });

  for (const [route, expectedStatus] of [
    ['/api/health/live', 200],
    ['/api/health/ready', 503],
  ]) {
    const response = await fetch(`http://127.0.0.1:3002${route}`, {
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(response.status, expectedStatus);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.match(response.headers.get('X-Request-Id') ?? '', /^[0-9a-f-]{36}$/i);
    const body = await response.json();
    if (expectedStatus === 200) {
      assert.deepEqual(body, { data: { status: 'alive' } });
    } else {
      assert.deepEqual(body, {
        error: {
          code: 'not_ready',
          message: 'Service is not ready.',
          request_id: response.headers.get('X-Request-Id'),
        },
      });
    }
    console.log(`PASS production HTTP: ${route} -> ${expectedStatus}, no-store, safe envelope`);
  }
} finally {
  server.kill();
}
