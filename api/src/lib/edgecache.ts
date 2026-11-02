import type { Context, Next } from 'hono';
import type { Env } from './env.ts';

/**
 * Edge cache for the public reads, so a traffic spike is absorbed by Cloudflare instead of Postgres.
 * Only anonymous GETs are cached: a request carrying a session cookie always reads fresh, so owners
 * see their own actions immediately. Keyed by full URL; cached only when the CORS origin is the site's
 * own (the allow-origin header is baked into the cached response).
 */
export function edgeCache(seconds: number) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    const origin = c.req.header('origin');
    const cacheable =
      c.req.method === 'GET' &&
      !/isitslop_session=/.test(c.req.header('cookie') ?? '') &&
      (!origin || origin === c.env.PUBLIC_SITE_URL) &&
      typeof caches !== 'undefined';
    if (!cacheable) return next();
    const cache = caches.default;
    const key = new Request(c.req.url, { method: 'GET' });
    const hit = await cache.match(key);
    if (hit) return hit;
    await next();
    if (c.res.status !== 200) return;
    c.res.headers.set('cache-control', `public, max-age=${seconds}`);
    const put = cache.put(key, c.res.clone());
    try {
      c.executionCtx.waitUntil(put);
    } catch {
      await put;
    }
  };
}
