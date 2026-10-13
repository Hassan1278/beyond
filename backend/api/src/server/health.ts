import 'server-only';

import { loadWritingConfig } from './config';
import { checkWritingReadiness } from './health-check';

export function isWritingReady(): Promise<boolean> {
  return checkWritingReadiness(loadWritingConfig, fetch);
}
