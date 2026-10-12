import { describe, expect, it } from 'vitest';
import {
  isAllowedBrowserOrigin,
  parseBrowserOrigin,
  parseCorsAllowedOrigins,
  parseSupabaseUrl,
  parseWritingConfig,
  type WritingEnvironment,
} from './config-parser';

const environment = {
  SUPABASE_URL: 'https://database.example.test',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fictional_key',
  CORS_ALLOWED_ORIGINS: 'https://web.example.test,http://localhost:3000',
} as const;

const invalidMessage = 'Invalid writing configuration.';

function expectInvalidConfig(operation: () => unknown): void {
  expect(operation).toThrowError(new Error(invalidMessage));
}

describe('parseWritingConfig', () => {
  it('loads only writing settings without admin, job or AI configuration', () => {
    const config = parseWritingConfig(environment);

    expect(config).toStrictEqual({
      supabaseUrl: environment.SUPABASE_URL,
      supabasePublishableKey: environment.SUPABASE_PUBLISHABLE_KEY,
      corsAllowedOrigins: ['https://web.example.test', 'http://localhost:3000'],
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.corsAllowedOrigins)).toBe(true);
  });

  it('ignores unrelated optional feature settings', () => {
    expect(
      parseWritingConfig({
        ...environment,
        SUPABASE_SECRET_KEY: 'fictional-invalid-admin-value',
        AI_SERVICE_URL: 'not-a-url',
        AI_SERVICE_TOKEN: '',
        JOB_TRIGGER_SECRET: '',
      }),
    ).toStrictEqual(parseWritingConfig(environment));
  });

  it.each(Object.keys(environment))('rejects missing or blank %s generically', (name) => {
    const missing: Record<string, string | undefined> = { ...environment };
    delete missing[name];

    expectInvalidConfig(() => parseWritingConfig(missing));
    expectInvalidConfig(() => parseWritingConfig({ ...environment, [name]: '   ' }));
  });

  it.each([
    'sb_secret_fictional_admin_key',
    'fictional-legacy-token',
    'sb_publishable_',
    'sb_publishable_fictional\r\nInjected: value',
    'sb_publishable_fictional key',
  ])('rejects non-publishable or unsafe key %j without echoing it', (key) => {
    expectInvalidConfig(() =>
      parseWritingConfig({ ...environment, SUPABASE_PUBLISHABLE_KEY: key }),
    );
  });

  it('trims environment values without returning extra configuration fields', () => {
    const spaced: WritingEnvironment = {
      SUPABASE_URL: ` ${environment.SUPABASE_URL}/ `,
      SUPABASE_PUBLISHABLE_KEY: ` ${environment.SUPABASE_PUBLISHABLE_KEY} `,
      CORS_ALLOWED_ORIGINS: ' https://web.example.test , http://localhost:3000 ',
    };

    expect(parseWritingConfig(spaced)).toStrictEqual(parseWritingConfig(environment));
  });
});

describe('parseSupabaseUrl', () => {
  it.each([
    ['https://database.example.test', 'https://database.example.test'],
    ['https://database.example.test/', 'https://database.example.test'],
    ['https://database.example.test:8443', 'https://database.example.test:8443'],
    ['http://localhost:54321', 'http://localhost:54321'],
    ['http://127.0.0.1:54321/', 'http://127.0.0.1:54321'],
    ['http://127.0.0.2:54321', 'http://127.0.0.2:54321'],
    ['http://[::1]:54321', 'http://[::1]:54321'],
  ])('accepts HTTPS or loopback HTTP %s', (input, canonical) => {
    expect(parseSupabaseUrl(input)).toBe(canonical);
  });

  it.each([
    undefined,
    '',
    'not-a-url',
    'https:database.example.test',
    'ftp://database.example.test',
    'http://database.example.test',
    'http://192.168.1.2:54321',
    'http://0.0.0.0:54321',
    'http://localhost.example.test:54321',
    'http://[::2]:54321',
    'https://fictional-user:fictional-password@database.example.test',
    'https://@database.example.test',
    'https://*.example.test',
    'https://database.example.test?fictional-key=hidden',
    'https://database.example.test?',
    'https://database.example.test#fictional-secret',
    'https://database.example.test#',
    'https://database.example.test/rest/v1',
    'https://database.example.test/path/..',
    'https://database.example.test/%2e',
    'https://database.example.test\\rest',
    'https://data\nbase.example.test',
    'https://database.example.test\u0000',
  ])('rejects unsafe or non-origin URL %j with only a generic error', (value) => {
    expectInvalidConfig(() => parseSupabaseUrl(value));
  });
});

describe('exact browser origins', () => {
  it('parses comma-separated canonical origins and deduplicates exact matches', () => {
    expect(
      parseCorsAllowedOrigins(
        ' https://web.example.test, http://localhost:3000, https://web.example.test ',
      ),
    ).toStrictEqual(['https://web.example.test', 'http://localhost:3000']);
  });

  it.each(['https://web.example.test', 'http://localhost:3000', 'http://[::1]:3000'])(
    'accepts canonical origin %s',
    (origin) => {
      expect(parseBrowserOrigin(origin)).toBe(origin);
    },
  );

  it.each([
    undefined,
    '',
    '   ',
    ',',
    'https://web.example.test,',
    ',https://web.example.test',
    '*',
    'https://*.example.test',
    'null',
    'file://web.example.test',
    'https://web.example.test/',
    'https://web.example.test/path',
    'https://web.example.test/path/..',
    'https://web.example.test?token=fictional',
    'https://web.example.test?',
    'https://web.example.test#fictional',
    'https://web.example.test#',
    'https://fictional-user:fictional-password@web.example.test',
    'https://@web.example.test',
    'https://WEB.example.test',
    'https://web.example.test:443',
    'http://localhost:80',
    'http://remote.example.test',
    'https://web.example.test\\',
    'https://web.example.test,https://not\ncanonical.example.test',
  ])('rejects invalid or noncanonical allowlist %j generically', (value) => {
    expectInvalidConfig(() => parseCorsAllowedOrigins(value));
  });

  it('checks untrusted origins by exact canonical equality, not prefix or normalization', () => {
    const config = parseWritingConfig(environment);

    expect(isAllowedBrowserOrigin(config, 'https://web.example.test')).toBe(true);
    expect(isAllowedBrowserOrigin(config, 'http://localhost:3000')).toBe(true);
    for (const origin of [
      'https://other.example.test',
      'https://web.example.test.attacker.test',
      'https://web.example.test:8443',
      'http://web.example.test',
      'https://WEB.example.test',
      'https://web.example.test/',
      'https://web.example.test:443',
      ' https://web.example.test ',
      'null',
      '*',
    ]) {
      expect(isAllowedBrowserOrigin(config, origin)).toBe(false);
    }
  });
});
