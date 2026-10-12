import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** The serverless handlers, by the path they answer on. */
const ROUTES = ['/api/letter', '/api/themes'] as const;

/**
 * Serves the same handlers the deployed functions use, so live AI letters and
 * theme reading both work in `npm run dev` without a second implementation.
 */
function beyondApi(env: Record<string, string>): Plugin {
  return {
    name: 'beyond-api',
    apply: 'serve',
    configureServer(server) {
      // Vite only exposes VITE_-prefixed vars to the client; the key lives here,
      // on the node side, and is put into process.env for the SDK to pick up.
      if (env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY) {
        process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;
      }
      if (env.BEYOND_MODEL) process.env.BEYOND_MODEL ||= env.BEYOND_MODEL;
      if (env.BEYOND_EFFORT) process.env.BEYOND_EFFORT ||= env.BEYOND_EFFORT;

      for (const route of ROUTES) {
        server.middlewares.use(route, (req, res) => {
          void (async () => {
            try {
              const { default: handler } = await server.ssrLoadModule(`${route}.ts`);
              await handler(req, res);
            } catch (err) {
              server.config.logger.error(`[beyond] ${route} unavailable`);
              res.statusCode = 500;
              res.setHeader('cache-control', 'no-store');
              res.setHeader('content-type', 'application/json');
              res.end(JSON.stringify({ error: 'request unavailable' }));
            }
          })();
        });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Relative base so the same build works on Vercel, Netlify and a GitHub
    // Pages subpath. Override with BEYOND_BASE=/repo-name/ if you prefer.
    base: env.BEYOND_BASE || './',
    plugins: [react(), beyondApi(env)],
    server: { host: true },
    build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 700 },
  };
});
