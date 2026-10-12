import { execFileSync, spawnSync } from 'node:child_process';
// Local acceptance only. CLI keys stay in memory and never appear in output.
try {
  const status = JSON.parse(
    execFileSync('node_modules/.bin/supabase', ['status', '--output', 'json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15000,
    }),
  );
  const url = new URL(status.API_URL);
  if (
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    url.port !== '55321' ||
    url.protocol !== 'http:'
  )
    throw new Error('Local target required.');
  const key = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  if (typeof key !== 'string') throw new Error('Public key unavailable.');
  const result = spawnSync('npm', ['run', 'build:web'], {
    env: {
      ...process.env,
      NEXT_TELEMETRY_DISABLED: '1',
      NEXT_PUBLIC_SUPABASE_URL: url.origin,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:3002',
    },
    stdio: 'inherit',
    timeout: 180000,
  });
  if (result.status !== 0) process.exitCode = 1;
} catch {
  console.error('Could not build the web client against guarded local Supabase.');
  process.exitCode = 1;
}
