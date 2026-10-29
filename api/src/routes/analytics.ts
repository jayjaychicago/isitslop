import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { readGa4, revokeGoogleToken, type AnalyticsConfig, type AnalyticsReading } from '../lib/analytics.ts';
import { open, seal } from '../lib/github-auth.ts';
import { getEntry, publicEntry, type EntryRow } from '../lib/entries.ts';
import { requireOwner } from './grade.ts';
import { currentUser, isAdminUser } from '../lib/session.ts';
import type { Sql } from '../lib/db.ts';

export const analytics = new Hono<{ Bindings: Env }>();

/** After Google sign-in offered several properties, the owner picks one here. */
analytics.post('/entries/:id/analytics', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (!(await requireOwner(c, e, sql))) return c.json({ error: 'sign in as the owner' }, 401);
  if (e.analytics_provider !== 'ga4' || !e.analytics_config) return c.json({ error: 'connect Google first (GET /v1/google/login?entry=...)' }, 428);
  const body = (await c.req.json().catch(() => ({}))) as { propertyId?: string; propertyName?: string };
  const propertyId = String(body.propertyId ?? '').trim();
  if (!/^\d+$/.test(propertyId)) return c.json({ error: 'propertyId must be the numeric GA4 property ID' }, 400);
  const prev = await open(c.env, e.analytics_config);
  if (!prev) return c.json({ error: 'could not read the stored Google connection; sign in again' }, 500);
  const cfg: AnalyticsConfig = { ...(JSON.parse(prev) as AnalyticsConfig), propertyId, propertyName: body.propertyName };
  const reading = await readGa4(c.env, cfg);
  if (typeof reading === 'string') return c.json({ error: reading }, 422);
  await sql`update entries set analytics_provider = 'ga4', analytics_config = ${await seal(c.env, JSON.stringify(cfg))} where id = ${e.id}`;
  return c.json({ entry: publicEntry({ ...e, analytics_provider: 'ga4' }), reading, note: 'Connected. Request a grade to use it.' });
});

analytics.delete('/entries/:id/analytics', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (!(await requireOwner(c, e, sql))) return c.json({ error: 'sign in as the owner' }, 401);
  const revoked = await revokeStoredGoogle(c.env, e);
  await sql`update entries set analytics_provider = null, analytics_config = null where id = ${e.id}`;
  return c.json({ ok: true, revoked });
});

/**
 * Erase every trace of Google Analytics for an entry: revoke the grant, drop the connection, and strip the
 * popularity half out of every grade (score, the two counts, the property name), leaving quality in place.
 * Owner, operator (ADMIN_GITHUB_LOGINS) or admin token.
 */
analytics.delete('/entries/:id/analytics/data', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  const auth = (c.req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const isAdmin = (!!c.env.ADMIN_TOKEN && auth === c.env.ADMIN_TOKEN) || isAdminUser(c.env, await currentUser(c, sql));
  if (!isAdmin && !(await requireOwner(c, e, sql))) return c.json({ error: 'sign in as the owner' }, 401);
  const revoked = await revokeStoredGoogle(c.env, e);
  await sql`update entries set analytics_provider = null, analytics_config = null where id = ${e.id}`;
  const rows = await sql`
    update grades set popularity_score = null, popularity_input = null, sloppy = null,
      verdict = 'unknown_' || split_part(verdict, '_', 2)
    where entry_id = ${e.id} and (popularity_score is not null or popularity_input is not null)
    returning id` as { id: string }[];
  return c.json({ ok: true, revoked, gradesPurged: rows.length });
});

/** Revoke the entry's Google grant, if any, before its stored token is erased. True when Google confirmed. */
export async function revokeStoredGoogle(env: Env, e: EntryRow): Promise<boolean> {
  if (e.analytics_provider !== 'ga4' || !e.analytics_config) return false;
  const raw = await open(env, e.analytics_config);
  if (!raw) return false;
  const cfg = JSON.parse(raw) as AnalyticsConfig;
  return cfg.refreshToken ? revokeGoogleToken(cfg.refreshToken) : false;
}

/** Read the entry's connected Google Analytics now. Null if none connected or no property picked; string on error. */
export async function readAnalytics(env: Env, _sql: Sql, e: EntryRow): Promise<AnalyticsReading | string | null> {
  if (e.analytics_provider !== 'ga4' || !e.analytics_config) return null;
  const raw = await open(env, e.analytics_config);
  if (!raw) return 'could not decrypt analytics config';
  const cfg = JSON.parse(raw) as AnalyticsConfig;
  if (!cfg.propertyId) return null;
  return readGa4(env, cfg);
}
