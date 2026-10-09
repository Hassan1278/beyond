import { fileURLToPath } from 'node:url';
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
    ],
  },
});
