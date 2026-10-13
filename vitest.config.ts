import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@beyond/shared': fileURLToPath(
              new URL('./packages/shared/src/index.ts', import.meta.url),
            ),
          },
        },
        test: {
          name: 'backend',
          environment: 'node',
          include: ['packages/shared/src/**/*.test.ts', 'apps/api/src/**/*.test.ts'],
          passWithNoTests: false,
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            '@beyond/shared': fileURLToPath(
              new URL('./packages/shared/src/index.ts', import.meta.url),
            ),
          },
        },
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: [
            'packages/app-ui/src/**/*.test.ts',
            'packages/app-ui/src/**/*.test.tsx',
            'apps/mobile/src/secure-session.test.ts',
          ],
          passWithNoTests: false,
        },
      },
    ],
  },
});
