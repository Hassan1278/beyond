import assert from 'node:assert/strict';
import { runBrowserAcceptance } from './browser-acceptance.mjs';
import { runProductAcceptance } from './product-acceptance.mjs';
import { execFileSync, spawn } from 'node:child_process';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

// Usage: node tests/api-writing-acceptance.mjs [isolated-mirror-root]
// Requires running local Supabase for project beyond and an existing API production build.
// Never starts/resets Supabase, builds the API, or reads/deletes existing users.
const root = path.resolve(process.argv[2] ?? fileURLToPath(new URL('../', import.meta.url)));
const apiDirectory = path.join(root, 'backend/api');
const apiUrl = 'http://127.0.0.1:3002';
const collection = '/api/v1/entries';
const allowedOrigin = 'http://127.0.0.1:3000';
const deniedOrigin = 'http://127.0.0.1:3001';
const container = 'supabase_db_beyond';
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const accountTriggerSecret = randomBytes(32).toString('hex');
const capturedUsers = new Map();
const removedUserIds = new Set();
const capturedEntries = new Map();
const interruption = new AbortController();
let localVerified = false;
let supabaseUrl;
let publishableKey;
let adminKey;
let server;
let serverFailure = false;
let passedGroups = 0;
let stage = 'local safety prerequisites';

function check(condition, message) {
  // assert.ok avoids automatically including upstream bodies, tokens, or table rows.
  assert.ok(condition, message);
}

function same(actual, expected, message) {
  check(isDeepStrictEqual(actual, expected), message);
}

function validUuid(value) {
  check(typeof value === 'string' && uuidPattern.test(value), 'A captured UUID is invalid.');
  return value.toLowerCase();
}

function testUserId(user) {
  const id = validUuid(user.id);
  check(capturedUsers.get(id) === user, 'Operation must target a captured fictional test user.');
  return id;
}

function testEntryId(entry, user) {
  const id = validUuid(entry.id);
  check(
    capturedEntries.get(id) === testUserId(user),
    'Operation must target a captured test entry.',
  );
  return id;
}

function command(binary, args) {
  // Both streams are captured, including CLI status JSON; never print command errors/output.
  return execFileSync(binary, args, {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 15_000,
    maxBuffer: 2 * 1024 * 1024,
    windowsHide: true,
  }).trim();
}

function localUrl(value, protocols, port, pathname) {
  check(typeof value === 'string', 'Required local status URL is unavailable.');
  const url = new URL(value);
  check(
    protocols.includes(url.protocol) &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) &&
      url.port === port &&
      url.pathname === pathname &&
      !url.search &&
      !url.hash,
    'Status must point to the expected loopback endpoint.',
  );
  return url;
}

function loadLocalStatus() {
  const binary =
    process.env.SUPABASE_CLI_BINARY ??
    path.join(
      root,
      process.platform === 'win32'
        ? 'node_modules/@supabase/cli-windows-x64/bin/supabase.exe'
        : 'node_modules/.bin/supabase',
    );
  const status = JSON.parse(command(binary, ['status', '--workdir', root, '--output', 'json']));
  check(
    status !== null && typeof status === 'object' && !Array.isArray(status),
    'Invalid CLI status.',
  );
  const api = localUrl(status.API_URL, ['http:'], '55321', '/');
  check(!api.username && !api.password, 'Local API URL must not contain credentials.');
  // The database name and exact Docker container are checked before any admin REST/SQL call.
  localUrl(status.DB_URL, ['postgres:', 'postgresql:'], '55322', '/postgres');
  const config = readFileSync(path.join(root, 'supabase/config.toml'), 'utf8');
  check(/^project_id\s*=\s*"beyond"\s*(?:#.*)?$/m.test(config), 'Local project must be beyond.');
  const inspected = JSON.parse(
    command('docker', [
      'inspect',
      '--type',
      'container',
      '--format',
      '[{{json .Name}},{{json .State.Running}},{{json .HostConfig.PortBindings}}]',
      container,
    ]),
  );
  check(
    inspected[0] === `/${container}` && inspected[1] === true,
    'Expected local DB container is not running.',
  );
  check(
    Array.isArray(inspected[2]?.['5432/tcp']) &&
      inspected[2]['5432/tcp'].some((binding) => binding.HostPort === '55322'),
    'Expected database container must expose the local database port.',
  );
  // Deliberately no ANON_KEY fallback: the API requires a real publishable key.
  // If CLI field names change, adjust only this status mapping; never log status values.
  publishableKey = status.PUBLISHABLE_KEY ?? status.SUPABASE_PUBLISHABLE_KEY;
  adminKey = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
  check(
    typeof publishableKey === 'string' && /^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey),
    'CLI publishable-key mapping is unavailable.',
  );
  check(
    typeof adminKey === 'string' && adminKey.length > 0,
    'CLI local admin-key mapping is unavailable.',
  );
  check(adminKey !== publishableKey, 'Admin and publishable credentials must be distinct.');
  check(
    existsSync(path.join(apiDirectory, '.next/BUILD_ID')),
    'An API production build is required.',
  );
  // Next loads dotenv files itself; a clean mirror must not reintroduce secrets/hosted settings.
  for (const directory of [root, apiDirectory]) {
    for (const name of ['.env', '.env.local', '.env.production', '.env.production.local']) {
      check(
        !existsSync(path.join(directory, name)),
        'Use an isolated mirror without API dotenv files.',
      );
    }
  }
  supabaseUrl = api.origin;
  localVerified = true;
  same(sql('SELECT pg_catalog.current_database();'), 'postgres', 'Unexpected local database name.');
  return status;
}

function sql(statement) {
  check(localVerified, 'Local target verification must precede admin SQL.');
  return command('docker', [
    'exec',
    container,
    'psql',
    '-X',
    '-A',
    '-t',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-c',
    statement,
  ]);
}

async function request(base, route, init = {}) {
  check(!interruption.signal.aborted, 'Acceptance runner was interrupted.');
  const response = await fetch(`${base}${route}`, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.any([AbortSignal.timeout(5000), interruption.signal]),
  });
  const text = await response.text();
  return { response, body: text === '' ? null : JSON.parse(text) };
}

async function adminRequest(route, init = {}) {
  check(localVerified, 'Local target verification must precede admin REST.');
  check(!interruption.signal.aborted, 'Acceptance runner was interrupted.');
  // Once user creation starts, allow its bounded response to supply the cleanup UUID on interruption.
  const response = await fetch(`${supabaseUrl}/auth/v1/admin${route}`, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: {
      apikey: adminKey,
      Authorization: `Bearer ${adminKey}`,
      'Content-Type': 'application/json',
    },
  });
  const text = await response.text();
  return { response, body: text === '' ? null : JSON.parse(text) };
}

function userHeaders(user) {
  testUserId(user);
  return { apikey: publishableKey, Authorization: `Bearer ${user.token}` };
}

async function rest(user, route, init = {}) {
  return request(supabaseUrl, `/rest/v1${route}`, {
    ...init,
    headers: { ...userHeaders(user), 'Content-Type': 'application/json', ...init.headers },
  });
}

async function api(route, user, init = {}) {
  check(!serverFailure && server !== undefined, 'Production API process is not running.');
  if (user) {
    const id = validUuid(user.id);
    check(
      capturedUsers.get(id) === user || removedUserIds.has(id),
      'API bearer must belong to a captured test user.',
    );
  }
  return request(apiUrl, route, {
    ...init,
    headers: { ...(user ? { Authorization: `Bearer ${user.token}` } : {}), ...init.headers },
  });
}

function json(method, body, headers = {}) {
  return {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  };
}

function statusIs(result, expected, errorCode) {
  if (result.response.status !== expected)
    console.error(`HTTP assertion: expected ${expected}, received ${result.response.status}.`);
  assert.equal(result.response.status, expected, 'Unexpected HTTP status.');
  if (errorCode !== undefined) {
    check(result.body?.error?.code === errorCode, 'Unexpected safe API error code.');
    check(
      result.response.headers.get('Cache-Control') === 'no-store',
      'Errors must not be cached.',
    );
    check(
      uuidPattern.test(result.response.headers.get('X-Request-Id') ?? ''),
      'Missing request UUID.',
    );
    check(
      result.body.error.request_id === result.response.headers.get('X-Request-Id'),
      'Request IDs must agree.',
    );
  }
  return result.body;
}

function resource(result, expectedText) {
  const body = statusIs(result, 200);
  check(body !== null && typeof body === 'object', 'Missing data envelope.');
  same(Object.keys(body), ['data'], 'Unexpected resource envelope fields.');
  const entry = body.data;
  check(entry !== null && typeof entry === 'object', 'Missing entry resource.');
  same(
    Object.keys(entry).sort(),
    ['created_at', 'id', 'reflection_opt_in', 'revision', 'text', 'updated_at'],
    'Only public resource fields may be returned.',
  );
  validUuid(entry.id);
  check(entry.text === expectedText, 'Fictional text bytes must be preserved.');
  check(
    entry.reflection_opt_in === false && Number.isInteger(entry.revision) && entry.revision >= 1,
    'Invalid entry state.',
  );
  check(
    timestampPattern.test(entry.created_at) && timestampPattern.test(entry.updated_at),
    'Resource timestamps must preserve microseconds.',
  );
  check(
    result.response.headers.get('Cache-Control') === 'no-store',
    'Resources must not be cached.',
  );
  return entry;
}

function creationBody(text, key = randomUUID()) {
  return { text, idempotency_key: key, reflection_opt_in: false };
}

async function create(user, body) {
  const entry = resource(await api(collection, user, json('POST', body)), body.text);
  const id = validUuid(entry.id);
  const owner = testUserId(user);
  check(
    !capturedEntries.has(id) || capturedEntries.get(id) === owner,
    'Entry ID ownership changed.',
  );
  capturedEntries.set(id, owner);
  return entry;
}

async function createUser(label, runId) {
  const email = `writing-acceptance-${runId}-${label}@example.invalid`;
  const password = `Fictional-only-A1!${randomBytes(24).toString('hex')}`;
  const result = await adminRequest(
    '/users',
    json('POST', { email, password, email_confirm: true }),
  );
  check(result.response.ok, 'Fictional local user creation failed.');
  const id = validUuid(result.body?.id);
  check(!capturedUsers.has(id), 'Auth returned a duplicate test user.');
  const user = { id, token: undefined, email, password };
  // Capture immediately, before email/login assertions, for failure cleanup.
  capturedUsers.set(id, user);
  check(result.body.email === email, 'Auth did not return the requested fictional email.');
  const login = await request(
    supabaseUrl,
    '/auth/v1/token?grant_type=password',
    json('POST', { email, password }, { apikey: publishableKey }),
  );
  statusIs(login, 200);
  check(
    login.body?.user?.id === id &&
      typeof login.body?.access_token === 'string' &&
      login.body.access_token.length > 0,
    'Fictional local password login failed.',
  );
  user.token = login.body.access_token;
  return user;
}

async function removeUser(user) {
  const id = testUserId(user);
  check(localVerified, 'Local target verification must precede cleanup.');
  // Cleanup is independent of interruption, but every fetch still has a five-second deadline.
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
    headers: {
      apikey: adminKey,
      Authorization: `Bearer ${adminKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ should_soft_delete: false }),
  });
  await response.text();
  check(response.ok || response.status === 404, 'Captured local test user cleanup failed.');
  removedUserIds.add(id);
  capturedUsers.delete(id);
}

function startServer() {
  // Allowlist OS plumbing instead of spreading process.env (no secret/JWT/service-role/AI keys).
  const environment = {};
  for (const key of [
    'PATH',
    'Path',
    'SystemRoot',
    'SYSTEMROOT',
    'WINDIR',
    'ComSpec',
    'COMSPEC',
    'PATHEXT',
    'TEMP',
    'TMP',
    'TMPDIR',
    'LANG',
    'LC_ALL',
    'TZ',
  ]) {
    if (process.env[key] !== undefined) environment[key] = process.env[key];
  }
  Object.assign(environment, {
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    SUPABASE_URL: supabaseUrl,
    SUPABASE_PUBLISHABLE_KEY: publishableKey,
    CORS_ALLOWED_ORIGINS: allowedOrigin,
    AI_SERVICE_URL: 'http://127.0.0.1:59999',
    ACCOUNT_DELETION_ENABLED: 'true',
    SUPABASE_SECRET_KEY: adminKey,
    ACCOUNT_JOB_TRIGGER_SECRET: accountTriggerSecret,
  });
  server = spawn(
    process.execPath,
    [
      path.join(root, 'node_modules/next/dist/bin/next'),
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      '3002',
    ],
    { cwd: apiDirectory, env: environment, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true },
  );
  server.on('error', () => {
    serverFailure = true;
  });
  server.on('exit', () => {
    serverFailure = true;
  });
  server.stderr.on('data', () => {});
  return new Promise((resolve, reject) => {
    let startupOutput = '';
    const finish = (error) => {
      clearTimeout(timer);
      server.off('error', onError);
      server.off('exit', onExit);
      interruption.signal.removeEventListener('abort', onInterrupt);
      server.stdout.off('data', onData);
      server.stdout.resume();
      if (error) reject(error);
      else resolve();
    };
    const onError = () => finish(new Error('Production API startup failed.'));
    const onExit = () => finish(new Error('Production API exited before Ready.'));
    const onInterrupt = () => finish(new Error('Acceptance runner was interrupted.'));
    const onData = (chunk) => {
      // Handle split Ready messages without ever emitting raw server stdout/stderr.
      startupOutput = (startupOutput + chunk.toString()).slice(-4096);
      if (/\bReady\b/.test(startupOutput)) finish();
    };
    const timer = setTimeout(() => finish(new Error('Production API startup timed out.')), 20_000);
    server.once('error', onError);
    server.once('exit', onExit);
    server.stdout.on('data', onData);
    interruption.signal.addEventListener('abort', onInterrupt, { once: true });
    if (interruption.signal.aborted) onInterrupt();
  });
}

async function stopServer() {
  if (!server?.pid || server.exitCode !== null || server.signalCode !== null) return;
  await new Promise((resolve, reject) => {
    let forcedTimer;
    const done = () => {
      clearTimeout(timer);
      clearTimeout(forcedTimer);
      server.off('exit', done);
      resolve();
    };
    const timer = setTimeout(() => {
      // Only the process spawned by this runner is terminated; never kill by port/name.
      server.kill('SIGKILL');
      forcedTimer = setTimeout(() => {
        server.off('exit', done);
        reject(new Error('Production API cleanup failed.'));
      }, 5000);
    }, 5000);
    server.once('exit', done);
    server.kill('SIGTERM');
  });
}

async function concurrent(operations) {
  // Drain every request before any assertion can trigger user/server cleanup.
  const results = await Promise.allSettled(operations);
  check(
    results.every((result) => result.status === 'fulfilled'),
    'A concurrent local request failed.',
  );
  return results.map((result) => result.value);
}

async function group(name, run) {
  stage = name;
  await run();
  check(!interruption.signal.aborted, 'Acceptance runner was interrupted.');
  console.log(`PASS ${name}`);
  passedGroups += 1;
}

async function directRows(user) {
  const result = await rest(
    user,
    '/journal_entries?select=id,owner_id,text,reflection_opt_in,revision,created_at,updated_at,deleted_at',
  );
  statusIs(result, 200);
  check(Array.isArray(result.body), 'Direct selected-column read must return rows.');
  check(
    result.body.every((row) => row.owner_id === user.id && row.deleted_at === null),
    'Direct read leaked another owner or a tombstone.',
  );
  return result.body;
}

function rpcFailure(result, expectedStatus, message) {
  // These are strict HTTP acceptance requirements, not a client-side remapping of SQLSTATE P0001.
  statusIs(result, expectedStatus);
  check(
    result.body?.code === 'P0001' && result.body?.message === message,
    'Unexpected direct RPC error.',
  );
}

async function main() {
  let failure = false;
  let cleanupFailure = false;
  let completed = false;
  let first;
  let second;
  const onInterrupt = () => interruption.abort();
  process.on('SIGINT', onInterrupt);
  process.on('SIGTERM', onInterrupt);
  try {
    const status = loadLocalStatus();
    stage = 'production API startup';
    await startServer();
    await group('real readiness with an unreachable AI service', async () => {
      const ready = await api('/api/health/ready');
      same(
        statusIs(ready, 200),
        { data: { status: 'ready' } },
        'Real readiness must succeed without fixtures.',
      );
      check(
        ready.response.headers.get('Cache-Control') === 'no-store',
        'Readiness must not be cached.',
      );
    });

    stage = 'fictional local user setup';
    const runId = randomUUID();
    first = await createUser('first', runId);
    second = await createUser('second', runId);
    check(first.id !== second.id, 'Two distinct fictional owners are required.');

    const hasLegacySecret = typeof status.JWT_SECRET === 'string' && status.JWT_SECRET.length > 0;
    await group(
      hasLegacySecret
        ? 'authentication including a genuinely signed expired legacy token'
        : 'authentication (JWT_SECRET unavailable; optional legacy expiry check not run)',
      async () => {
        statusIs(await api(collection), 401, 'unauthorized');
        statusIs(
          await api(collection, undefined, {
            headers: { Authorization: 'Bearer malformed token' },
          }),
          401,
          'unauthorized',
        );
        statusIs(
          await api(collection, undefined, { headers: { Authorization: 'Bearer not-a-jwt' } }),
          401,
          'unauthorized',
        );
        const now = Math.floor(Date.now() / 1000);
        const claims = {
          sub: first.id,
          session_id: JSON.parse(
            Buffer.from(first.token.split('.')[1], 'base64url').toString('utf8'),
          ).session_id,
          role: 'authenticated',
          aud: 'authenticated',
          iss: `${supabaseUrl}/auth/v1`,
          iat: now - 600,
          exp: now + 600,
        };
        const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
        const unsigned = `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.`;
        statusIs(
          await api(collection, undefined, { headers: { Authorization: `Bearer ${unsigned}` } }),
          401,
          'unauthorized',
        );
        if (hasLegacySecret) {
          const sign = (exp, amr) => {
            const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ ...claims, exp, ...(amr ? { amr } : {}) })}`;
            return `${data}.${createHmac('sha256', status.JWT_SECRET).update(data).digest('base64url')}`;
          };
          // A fresh control proves this local legacy key is accepted before expiry is tested.
          statusIs(
            await api(collection, undefined, {
              headers: { Authorization: `Bearer ${sign(now + 600)}` },
            }),
            200,
          );
          statusIs(
            await api(collection, undefined, {
              headers: { Authorization: `Bearer ${sign(now - 300)}` },
            }),
            401,
            'unauthorized',
          );
          const fresh = sign(now + 600, [{ method: 'password', timestamp: now }]);
          const old = sign(now + 600, [{ method: 'password', timestamp: now - 600 }]);
          statusIs(
            await api('/api/v1/account/export?section=settings', undefined, {
              headers: { Authorization: `Bearer ${fresh}` },
            }),
            200,
          );
          // A currently valid signed JWT with an old sign-in must fail after fresh Auth verification.
          statusIs(
            await api('/api/v1/account/export?section=settings', undefined, {
              headers: { Authorization: `Bearer ${old}` },
            }),
            403,
            'forbidden',
          );
          const params = {
            p_section: 'settings',
            p_limit: null,
            p_before_created_at: null,
            p_before_id: null,
          };
          statusIs(
            await rest(
              first,
              '/rpc/account_export_page',
              json('POST', params, { Authorization: `Bearer ${fresh}` }),
            ),
            200,
          );
          rpcFailure(
            await rest(
              first,
              '/rpc/account_export_page',
              json('POST', params, { Authorization: `Bearer ${old}` }),
            ),
            400,
            'forbidden',
          );
        }
      },
    );

    await group('browser CORS and native no-Origin access', async () => {
      const preflightHeaders = {
        Origin: allowedOrigin,
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization, content-type',
      };
      const allowed = await api(collection, undefined, {
        method: 'OPTIONS',
        headers: preflightHeaders,
      });
      statusIs(allowed, 204);
      check(
        allowed.body === null &&
          allowed.response.headers.get('Access-Control-Allow-Origin') === allowedOrigin,
        'Allowed preflight must be empty with the exact origin.',
      );
      check(
        allowed.response.headers.get('Access-Control-Allow-Methods')?.includes('POST'),
        'Preflight methods are missing.',
      );
      statusIs(
        await api(collection, undefined, {
          method: 'OPTIONS',
          headers: { ...preflightHeaders, Origin: deniedOrigin },
        }),
        403,
        'forbidden',
      );
      const denied = await api(collection, first, { headers: { Origin: deniedOrigin } });
      statusIs(denied, 403, 'forbidden');
      check(
        denied.response.headers.get('Access-Control-Allow-Origin') === null,
        'Disallowed origin was reflected.',
      );
      const browser = await api(collection, first, { headers: { Origin: allowedOrigin } });
      statusIs(browser, 200);
      check(
        browser.response.headers.get('Access-Control-Allow-Origin') === allowedOrigin,
        'Browser origin was not allowed.',
      );
      const native = await api(collection, first);
      statusIs(native, 200);
      check(
        native.response.headers.get('Access-Control-Allow-Origin') === null,
        'Native access should not invent an Origin.',
      );
    });

    const original = creationBody('  Fictional cedar journal\n\twith untouched whitespace.  \n');
    let entry;
    let otherEntry;
    await group('create replay, byte preservation, and strict owner/opt-in input', async () => {
      entry = await create(first, original);
      check(entry.revision === 1, 'Creation must start at revision one.');
      same(
        resource(await api(collection, first, json('POST', original)), original.text),
        entry,
        'Identical creation replay must return the current resource.',
      );
      statusIs(
        await api(
          collection,
          first,
          json('POST', { ...original, text: `${original.text}different` }),
        ),
        409,
        'conflict',
      );
      statusIs(
        await api(
          collection,
          first,
          json('POST', { ...creationBody('Fictional opt-in'), reflection_opt_in: true }),
        ),
        400,
        'bad_request',
      );
      statusIs(
        await api(
          collection,
          first,
          json('POST', { ...creationBody('Fictional injection'), owner_id: second.id }),
        ),
        400,
        'bad_request',
      );
      otherEntry = await create(second, creationBody('Fictional second-owner lantern.'));
    });

    await group('cross-owner API get, patch, and delete isolation', async () => {
      statusIs(await api(`${collection}/${entry.id}`, second), 404, 'not_found');
      statusIs(
        await api(
          `${collection}/${entry.id}`,
          second,
          json('PATCH', { text: 'Fictional unauthorized edit.', expected_revision: 1 }),
        ),
        404,
        'not_found',
      );
      statusIs(
        await api(`${collection}/${entry.id}`, second, { method: 'DELETE' }),
        404,
        'not_found',
      );
      same(
        resource(await api(`${collection}/${entry.id}`, first), original.text),
        entry,
        'Cross-owner calls changed the resource.',
      );
    });

    await group(
      'direct selected-column RLS, private-column denial, and insertion denial',
      async () => {
        const firstRows = await directRows(first);
        const secondRows = await directRows(second);
        same(
          firstRows.map((row) => row.id),
          [entry.id],
          'First owner must see only its actual row.',
        );
        same(
          secondRows.map((row) => row.id),
          [otherEntry.id],
          'Second owner must see only its actual row.',
        );
        statusIs(await rest(first, '/journal_entries?select=original_text'), 403);
        statusIs(
          await rest(
            first,
            '/journal_entries',
            json('POST', {
              owner_id: first.id,
              idempotency_key: randomUUID(),
              text: 'Fictional direct insertion.',
              original_text: 'Fictional direct insertion.',
              reflection_opt_in: false,
              revision: 1,
              created_at: '2001-01-01T00:00:00.123001Z',
              updated_at: '2001-01-01T00:00:00.123001Z',
            }),
          ),
          403,
        );
        same(
          (await directRows(first)).map((row) => row.id),
          [entry.id],
          'Denied insertion created a row.',
        );
      },
    );

    await group('direct cross-owner RPC denies access with P0001 not_found', async () => {
      for (const [name, params] of [
        ['entry_get', { p_id: entry.id }],
        [
          'entry_update',
          { p_id: entry.id, p_text: 'Fictional direct cross-owner edit.', p_expected_revision: 1 },
        ],
        ['entry_delete', { p_id: entry.id }],
      ]) {
        // PostgREST maps P0001 to 400; product API maps this stable code to 404.
        rpcFailure(await rest(second, `/rpc/${name}`, json('POST', params)), 400, 'not_found');
      }
    });

    let concurrentEntry;
    const concurrentBody = creationBody('Fictional eight-way concurrent creation.');
    await group('eight concurrent creates share one ID and one actual row', async () => {
      const responses = await concurrent(
        Array.from({ length: 8 }, () => create(first, concurrentBody)),
      );
      concurrentEntry = responses[0];
      check(
        responses.every((current) => isDeepStrictEqual(current, concurrentEntry)),
        'Concurrent creations diverged.',
      );
      const owner = testUserId(first);
      const id = testEntryId(concurrentEntry, first);
      const key = validUuid(concurrentBody.idempotency_key);
      same(
        sql(
          `SELECT count(*) FROM public.journal_entries WHERE owner_id = '${owner}'::uuid AND idempotency_key = '${key}'::uuid;`,
        ),
        '1',
        'Concurrent creates must leave exactly one actual row.',
      );
      check(
        (await directRows(first)).filter((row) => row.id === id).length === 1,
        'Concurrent row is not visible exactly once.',
      );
    });

    await group('concurrent revision edits yield one success and one conflict', async () => {
      const edits = ['Fictional concurrent edit alpha.', '  Fictional concurrent edit beta.\n'];
      const responses = await concurrent(
        edits.map((text) =>
          api(
            `${collection}/${concurrentEntry.id}`,
            first,
            json('PATCH', { text, expected_revision: concurrentEntry.revision }),
          ),
        ),
      );
      same(
        responses.map((result) => result.response.status).sort(),
        [200, 409],
        'Exactly one concurrent edit may win.',
      );
      const winner = responses.findIndex((result) => result.response.status === 200);
      statusIs(responses[1 - winner], 409, 'conflict');
      const updated = resource(responses[winner], edits[winner]);
      check(
        updated.id === concurrentEntry.id && updated.revision === concurrentEntry.revision + 1,
        'Concurrent edit must increment the same entry once.',
      );
      check(updated.created_at === concurrentEntry.created_at, 'An edit changed creation time.');
      same(
        resource(await api(`${collection}/${updated.id}`, first), edits[winner]),
        updated,
        'Winning edit is not current.',
      );
      concurrentEntry = updated;
    });

    await group('edit and creation replay return the current resource', async () => {
      const editedText = '\tFictional revised cedar text.  \n';
      const edited = resource(
        await api(
          `${collection}/${entry.id}`,
          first,
          json('PATCH', { text: editedText, expected_revision: entry.revision }),
        ),
        editedText,
      );
      check(
        edited.id === entry.id &&
          edited.revision === entry.revision + 1 &&
          edited.created_at === entry.created_at,
        'Edit must preserve identity and increment revision.',
      );
      statusIs(
        await api(
          `${collection}/${entry.id}`,
          first,
          json('PATCH', { text: editedText, expected_revision: entry.revision }),
        ),
        409,
        'conflict',
      );
      same(
        resource(await api(collection, first, json('POST', original)), editedText),
        edited,
        'Original creation replay must return the edited current resource.',
      );
      statusIs(
        await api(collection, first, json('POST', { ...original, text: editedText })),
        409,
        'conflict',
      );
      entry = edited;
    });

    await group('delete, reserved idempotency key, and scrubbed SQL tombstone', async () => {
      const id = testEntryId(entry, first);
      const owner = testUserId(first);
      same(
        statusIs(await api(`${collection}/${id}`, first, { method: 'DELETE' }), 200),
        { data: { id } },
        'Invalid deletion envelope.',
      );
      statusIs(await api(`${collection}/${id}`, first), 404, 'not_found');
      statusIs(
        await api(
          `${collection}/${id}`,
          first,
          json('PATCH', { text: 'Fictional post-delete edit.', expected_revision: entry.revision }),
        ),
        404,
        'not_found',
      );
      statusIs(await api(`${collection}/${id}`, first, { method: 'DELETE' }), 404, 'not_found');
      statusIs(await api(collection, first, json('POST', original)), 409, 'conflict');
      statusIs(
        await api(
          collection,
          first,
          json('POST', { ...original, text: 'Fictional different deleted-key text.' }),
        ),
        409,
        'conflict',
      );
      check(
        !(await directRows(first)).some((row) => row.id === id),
        'Tombstones must be hidden by RLS.',
      );
      const tombstone = JSON.parse(
        sql(`SELECT pg_catalog.jsonb_build_object(
        'text', text, 'original_text', original_text, 'reflection_opt_in', reflection_opt_in,
        'revision', revision, 'created_at', created_at, 'updated_at', updated_at,
        'deleted_marker', deleted_at IS NOT NULL AND pg_catalog.isfinite(deleted_at))
        FROM public.journal_entries WHERE id = '${id}'::uuid AND owner_id = '${owner}'::uuid;`),
      );
      // deleted_at is the retained tombstone marker; content and resource timestamps must be NULL.
      same(
        tombstone,
        {
          text: null,
          original_text: null,
          reflection_opt_in: null,
          revision: null,
          created_at: null,
          updated_at: null,
          deleted_marker: true,
        },
        'Tombstone was not completely scrubbed.',
      );
    });

    await group(
      'limit-one pagination has no gaps/duplicates and preserves microsecond cursors',
      async () => {
        const entries = [concurrentEntry];
        for (let index = 0; index < 3; index += 1) {
          entries.push(await create(first, creationBody(`Fictional pagination row ${index + 1}.`)));
        }
        const ids = entries.map((current) => testEntryId(current, first));
        const owner = testUserId(first);
        const timestamps = ['123001', '123002', '123003', '123003'];
        // Only captured fictional rows are adjusted: same millisecond, distinct microseconds, plus an ID tie-break.
        const cases = ids
          .map(
            (id, index) =>
              `WHEN '${id}'::uuid THEN TIMESTAMPTZ '2001-01-01 00:00:00.${timestamps[index]}+00'`,
          )
          .join(' ');
        sql(`UPDATE public.journal_entries SET created_at = CASE id ${cases} END
        WHERE owner_id = '${owner}'::uuid AND id IN (${ids.map((id) => `'${id}'::uuid`).join(', ')}) AND deleted_at IS NULL;`);
        const expected = ids
          .map((id, index) => ({ id, created_at: `2001-01-01T00:00:00.${timestamps[index]}Z` }))
          .sort((left, right) =>
            left.created_at === right.created_at
              ? left.id < right.id
                ? 1
                : -1
              : left.created_at < right.created_at
                ? 1
                : -1,
          );
        same(
          (await directRows(first)).map((row) => row.id).sort(),
          [...ids].sort(),
          'Actual live rows differ from captured pagination rows.',
        );
        const seen = [];
        const cursors = new Set();
        let cursor = null;
        for (let index = 0; index < expected.length; index += 1) {
          const query = `${collection}?limit=1${cursor === null ? '' : `&cursor=${encodeURIComponent(cursor)}`}`;
          const pageResult = await api(query, first);
          const page = statusIs(pageResult, 200)?.data;
          check(
            page && Array.isArray(page.entries) && page.entries.length === 1,
            'Each page must contain exactly one live entry.',
          );
          const current = page.entries[0];
          const source = entries.find((candidate) => candidate.id === expected[index].id);
          check(
            current.id === expected[index].id &&
              current.text === source.text &&
              current.revision === source.revision,
            'Pagination order or current content is incorrect.',
          );
          check(
            current.created_at === expected[index].created_at,
            'Microsecond creation timestamp was truncated.',
          );
          check(!seen.includes(current.id), 'Pagination returned a duplicate ID.');
          seen.push(current.id);
          if (index === expected.length - 1) {
            check(page.next_cursor === null, 'Final page must not have a continuation.');
          } else {
            cursor = page.next_cursor;
            check(
              typeof cursor === 'string' && /^[A-Za-z0-9_-]+$/.test(cursor) && !cursors.has(cursor),
              'Invalid or repeated cursor.',
            );
            cursors.add(cursor);
            const bytes = Buffer.from(cursor, 'base64url');
            check(bytes.toString('base64url') === cursor, 'Cursor encoding is not canonical.');
            same(
              JSON.parse(bytes.toString('utf8')),
              { created_at: current.created_at, id: current.id },
              'Cursor must retain the exact six-digit timestamp and ID.',
            );
          }
        }
        same(
          seen,
          expected.map((current) => current.id),
          'Pagination missed a captured live row.',
        );
      },
    );

    await group('invalid JSON, Unicode, bodies, revisions, and pagination input', async () => {
      for (const body of [
        {},
        null,
        [],
        { ...creationBody(''), text: '' },
        creationBody(' \t\n'),
        creationBody('x'.repeat(20_001)),
        creationBody('Fictional\u0000invalid'),
        creationBody('Fictional\uD800invalid'),
        { ...creationBody('Fictional invalid key.'), idempotency_key: 'not-a-uuid' },
        { text: 'Fictional missing opt-in.', idempotency_key: randomUUID() },
      ])
        statusIs(await api(collection, first, json('POST', body)), 400, 'bad_request');
      for (const init of [
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' },
        {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify(original),
        },
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: new Uint8Array([0x7b, 0xff, 0x7d]),
        },
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: ' '.repeat(128_001),
        },
      ])
        statusIs(await api(collection, first, init), 400, 'bad_request');
      for (const body of [
        { text: 'Fictional invalid revision.', expected_revision: 0 },
        { text: 'Fictional invalid revision.', expected_revision: 1.5 },
        { text: 'Fictional invalid revision.', expected_revision: '1' },
        { text: 'Fictional invalid revision.', expected_revision: 2_147_483_648 },
        {
          text: 'Fictional injected patch.',
          expected_revision: concurrentEntry.revision,
          owner_id: second.id,
        },
      ])
        statusIs(
          await api(`${collection}/${concurrentEntry.id}`, first, json('PATCH', body)),
          400,
          'bad_request',
        );
      for (const query of [
        'limit=0',
        'limit=101',
        'limit=1&limit=1',
        'unexpected=1',
        'cursor=not-json',
      ]) {
        statusIs(await api(`${collection}?${query}`, first), 400, 'bad_request');
      }
      statusIs(await api(`${collection}/not-a-uuid`, first), 400, 'bad_request');
    });

    if (process.env.TEST_CONNECTED_BROWSER === 'true')
      await runBrowserAcceptance({
        root,
        group,
        check,
        createUser,
        randomUUID,
        api,
        rest,
        json,
        statusIs,
      });

    await runProductAcceptance({
      api,
      rest,
      sql,
      json,
      statusIs,
      check,
      same,
      group,
      first,
      second,
      createUser,
      randomUUID,
      triggerSecret: accountTriggerSecret,
    });

    await group(
      'deleting profile blocks native bearer with 403 and direct RPC with P0001 forbidden',
      async () => {
        const owner = testUserId(first);
        same(
          sql(`WITH changed AS (
        UPDATE public.profiles SET status = 'deleting' WHERE id = '${owner}'::uuid RETURNING id
        ) SELECT count(*) FROM changed;`),
          '1',
          'Only the captured profile must be marked deleting.',
        );
        statusIs(await api(collection, first), 403, 'forbidden');
        statusIs(await api(`${collection}/${concurrentEntry.id}`, first), 403, 'forbidden');
        statusIs(
          await api(collection, first, json('POST', creationBody('Fictional blocked creation.'))),
          403,
          'forbidden',
        );
        check(
          (await directRows(first)).length === 0,
          'Deleting profile still exposes direct table rows.',
        );
        for (const [name, params] of [
          ['entry_get', { p_id: concurrentEntry.id }],
          [
            'entry_create',
            {
              p_text: 'Fictional blocked RPC.',
              p_idempotency_key: randomUUID(),
              p_reflection_opt_in: false,
            },
          ],
        ])
          rpcFailure(await rest(first, `/rpc/${name}`, json('POST', params)), 400, 'forbidden');
        // No reset is needed: this captured fictional user is hard-deleted in finally.
      },
    );
    completed = true;
  } catch {
    // Do not propagate fetch/CLI/assertion errors: they can contain credentials or upstream data.
    failure = true;
  } finally {
    // Independently attempt both owners, even after setup/test/cleanup failure. No listing or bulk deletion.
    for (const user of [...capturedUsers.values()]) {
      let removed = false;
      for (let attempt = 0; attempt < 2 && !removed; attempt += 1) {
        try {
          await removeUser(user);
          removed = true;
        } catch {
          // Retry only the same captured UUID, never discover replacement cleanup targets.
        }
      }
      if (!removed) cleanupFailure = true;
    }
    try {
      if (removedUserIds.size > 0) {
        const ids = [...removedUserIds].map((id) => `'${validUuid(id)}'::uuid`).join(', ');
        try {
          // Failure cleanup is scoped only to captured fictional UUIDs whose Auth deletion succeeded.
          sql(`DELETE FROM private.account_deletions WHERE user_id IN (${ids});`);
          same(
            sql(`SELECT (SELECT count(*) FROM auth.users WHERE id IN (${ids})) +
            (SELECT count(*) FROM public.profiles WHERE id IN (${ids})) +
            (SELECT count(*) FROM public.journal_entries WHERE owner_id IN (${ids})) +
            (SELECT count(*) FROM public.user_settings WHERE owner_id IN (${ids})) +
            (SELECT count(*) FROM public.approved_memories WHERE owner_id IN (${ids})) +
            (SELECT count(*) FROM public.todos WHERE owner_id IN (${ids})) +
            (SELECT count(*) FROM private.account_deletions WHERE user_id IN (${ids})) +
            (SELECT count(*) FROM private.reflection_jobs WHERE owner_id IN (${ids})) +
            (SELECT count(*) FROM public.reflections WHERE owner_id IN (${ids})) +
            (SELECT count(*) FROM private.api_request_budgets WHERE owner_id IN (${ids}));`),
            '0',
            'Captured fictional users and their rows must be removed.',
          );
        } catch {
          cleanupFailure = true;
        }
      }
      if (completed && !cleanupFailure && first && second) {
        await group(
          'deleted fictional users revoke existing API bearers and local cleanup',
          async () => {
            check(capturedUsers.size === 0, 'Both captured test users must be removed.');
            for (const user of [first, second]) {
              statusIs(await api(collection, user), 401, 'unauthorized');
            }
          },
        );
      }
    } catch {
      failure = true;
    } finally {
      try {
        await stopServer();
      } catch {
        cleanupFailure = true;
      }
      process.off('SIGINT', onInterrupt);
      process.off('SIGTERM', onInterrupt);
    }
  }
  if (cleanupFailure)
    throw new Error(
      'Writing acceptance cleanup failed for captured local resources; no upstream output is emitted.',
    );
  if (failure || interruption.signal.aborted)
    throw new Error(`Writing acceptance failed in ${stage}; no upstream output is emitted.`);
  console.log(`PASS group count: ${passedGroups}`);
}

await main();
