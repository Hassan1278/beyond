import 'server-only';
import { createService, type Route } from './service';

let service: ReturnType<typeof createService> | null = null;

/** Reads the environment once per instance; keys are only ever used server-side. */
export function handle(route: Route, request: Request): Promise<Response> {
  service ??= createService(process.env);
  return service(route, request);
}
