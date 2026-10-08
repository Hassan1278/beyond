export interface WritingConfig {
  readonly supabaseUrl: string;
  readonly supabasePublishableKey: string;
  readonly corsAllowedOrigins: readonly string[];
}

export type WritingEnvironment = Readonly<Record<string, string | undefined>>;

function invalidConfig(): never {
  throw new Error('Invalid writing configuration.');
}

function parseHttpUrl(value: string): URL {
  if (!/^https?:\/\//i.test(value) || /[\s\\?#*\p{Cc}]/u.test(value)) {
    invalidConfig();
  }

  const authority = value.slice(value.indexOf('://') + 3).split('/')[0];
  if (!authority || authority.includes('@')) {
    invalidConfig();
  }

  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) {
      invalidConfig();
    }
    return url;
  } catch {
    invalidConfig();
  }
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '[::1]' || /^127(?:\.\d{1,3}){3}$/.test(hostname);
}

export function parseSupabaseUrl(value: string | undefined): string {
  const input = value?.trim() ?? '';
  const url = parseHttpUrl(input);
  if (
    (url.protocol === 'http:' && !isLoopbackHost(url.hostname)) ||
    !/^https?:\/\/[^/]+\/?$/i.test(input)
  ) {
    invalidConfig();
  }
  return url.origin;
}

export function parseBrowserOrigin(value: string): string {
  const url = parseHttpUrl(value);
  if (value !== url.origin || (url.protocol === 'http:' && !isLoopbackHost(url.hostname))) {
    invalidConfig();
  }
  return url.origin;
}

export function parseCorsAllowedOrigins(value: string | undefined): readonly string[] {
  const origins = (value ?? '').split(',').map((origin) => parseBrowserOrigin(origin.trim()));
  return Object.freeze([...new Set(origins)]);
}

export function isAllowedBrowserOrigin(config: WritingConfig, origin: string): boolean {
  try {
    return config.corsAllowedOrigins.includes(parseBrowserOrigin(origin));
  } catch {
    return false;
  }
}

export function parseWritingConfig(environment: WritingEnvironment): WritingConfig {
  const supabaseUrl = parseSupabaseUrl(environment.SUPABASE_URL);
  const supabasePublishableKey = environment.SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(supabasePublishableKey)) {
    invalidConfig();
  }

  return Object.freeze({
    supabaseUrl,
    supabasePublishableKey,
    corsAllowedOrigins: parseCorsAllowedOrigins(environment.CORS_ALLOWED_ORIGINS),
  });
}
