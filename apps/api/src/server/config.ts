import 'server-only';

import { parseWritingConfig, type WritingConfig } from './config-parser';

export function loadWritingConfig(): WritingConfig {
  return parseWritingConfig({
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY,
    CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
  });
}
