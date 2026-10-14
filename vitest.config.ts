import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            '@beyond/shared': fileURLToPath(new URL('./shared/src/index.ts', import.meta.url)),
          },
        },
        test: {
          name: 'backend',
          environment: 'node',
          include: ['shared/src/**/*.test.ts', 'backend/api/src/**/*.test.ts'],
          passWithNoTests: false,
        },
      },
      {
        test: {
          name: 'ai',
          environment: 'node',
          include: ['ai/src/**/*.test.ts'],
          passWithNoTests: false,
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            '@beyond/shared': fileURLToPath(new URL('./shared/src/index.ts', import.meta.url)),
          },
        },
        test: {
          name: 'frontend',
          environment: 'jsdom',
          include: [
            'frontend/ui/src/**/*.test.ts',
            'frontend/ui/src/**/*.test.tsx',
            'frontend/mobile/src/secure-session.test.ts',
          ],
          passWithNoTests: false,
        },
      },
    ],
  },
});
