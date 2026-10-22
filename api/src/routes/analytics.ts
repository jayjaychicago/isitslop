import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { PROVIDERS, providerList, type AnalyticsConfig, type AnalyticsReading } from '../lib/analytics.ts';
import { open, seal } from '../lib/github-auth.ts';
import { getEntry, publicEntry, type EntryRow } from '../lib/entries.ts';
import { requireOwner } from './grade.ts';
import type { Sql } from '../lib/db.ts';

export const analytics = new Hono<{ Bindings: Env }>();

analytics.get('/analytics/providers', (c) => c.json({ providers: providerList(c.env) }));

/** Connect analytics. The key is tested once, then stored encrypted. Owner key required. */
analytics.post('/entries/:id/analytics', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (!(await requireOwner(c, e))) return c.json({ error: 'invalid owner key' }, 401);
  if (!c.env.TOKEN_KEY) return c.json({ error: 'TOKEN_KEY not configured' }, 503);
  const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
  const provider = PROVIDERS[String(body.provider ?? '')];
  if (!provider) return c.json({ error: `provider must be one of ${Object.keys(PROVIDERS).join(', ')}` }, 400);
  const cfg: AnalyticsConfig = { apiKey: String(body.apiKey ?? '').trim() };
  // Google: keep the refresh token from the sign-in step; the owner only picks the property here.
  if (provider.id === 'ga4' && e.analytics_provider === 'ga4' && e.analytics_config) {
    const prev = await open(c.env, e.analytics_config);
    if (prev) cfg.refreshToken = (JSON.parse(prev) as AnalyticsConfig).refreshToken;
  }
  for (const f of provider.fields) {
    const v = body[f.key];
    if (typeof v === 'string' && v.trim()) cfg[f.key] = v.trim();
    else if (f.required) return c.json({ error: `${f.key} is required for ${provider.name}` }, 400);
  }
  const reading = await provider.read(cfg, c.env);
  if (typeof reading === 'string') return c.json({ error: reading }, 422);
  await sql`update entries set analytics_provider = ${provider.id}, analytics_config = ${await seal(c.env, JSON.stringify(cfg))} where id = ${e.id}`;
  return c.json({ entry: publicEntry({ ...e, analytics_provider: provider.id }), reading, note: 'Connected. Request a grade to use it.' });
});

analytics.delete('/entries/:id/analytics', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (!(await requireOwner(c, e))) return c.json({ error: 'invalid owner key' }, 401);
  await sql`update entries set analytics_provider = null, analytics_config = null where id = ${e.id}`;
  return c.json({ ok: true });
});

/** Read the entry's connected analytics now. Null if none connected; string on provider error. */
export async function readAnalytics(env: Env, _sql: Sql, e: EntryRow): Promise<AnalyticsReading | string | null> {
  if (!e.analytics_provider || !e.analytics_config) return null;
  const provider = PROVIDERS[e.analytics_provider];
  if (!provider) return `unknown provider ${e.analytics_provider}`;
  const raw = await open(env, e.analytics_config);
  if (!raw) return 'could not decrypt analytics config';
  return provider.read(JSON.parse(raw) as AnalyticsConfig, env);
}
