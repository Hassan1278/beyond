import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Serves the same `/api/letter` handler the deployed function uses, so live AI
 * letters work in `npm run dev` without a second implementation.
 */
function letterApi(env: Record<string, string>): Plugin {
  return {
    name: 'beyond-letter-api',
    apply: 'serve',
    configureServer(server) {
      // Vite only exposes VITE_-prefixed vars to the client; the key lives here,
      // on the node side, and is put into process.env for the SDK to pick up.
      if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
      }
      if (env.BEYOND_MODEL) process.env.BEYOND_MODEL ||= env.BEYOND_MODEL;
      if (env.BEYOND_EFFORT) process.env.BEYOND_EFFORT ||= env.BEYOND_EFFORT;

      server.middlewares.use('/api/letter', (req, res, next) => {
        void (async () => {
          try {
            const { default: handler } = await server.ssrLoadModule('/api/letter.ts');
            await handler(req, res);
          } catch (err) {
            server.config.logger.error(`[beyond] /api/letter crashed: ${String(err)}`);
            next(err as Error);
          }
        })();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Relative base so the same build works on Vercel, Netlify and a GitHub
    // Pages subpath. Override with BEYOND_BASE=/repo-name/ if you prefer.
    base: env.BEYOND_BASE || './',
    plugins: [react(), letterApi(env)],
    server: { host: true },
    build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 700 },
  };
});
