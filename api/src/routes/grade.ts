import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { TERMS_VERSION } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { sha256 } from '../lib/crypto.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { normalizeTarget } from '../lib/url.ts';
import { collectRepoFacts, scoreQuality, QUALITY_VERSION } from '../heuristics/quality.ts';
import { scorePopularity } from '../heuristics/popularity.ts';
import { readAnalytics } from './analytics.ts';
import { sloppy, verdict } from '../heuristics/verdict.ts';
import { getEntry, publicGrade, type EntryRow, type GradeRow } from '../lib/entries.ts';
import { ownerGithubToken } from './github.ts';
import { currentUser } from '../lib/session.ts';
import type { Context } from 'hono';
import type { Sql } from '../lib/db.ts';

export const grade = new Hono<{ Bindings: Env }>();

/** The signed-in user owns the entry, or the request carries the entry's owner key (API use). */
export async function requireOwner(c: Context<{ Bindings: Env }>, e: EntryRow, sql?: Sql): Promise<boolean> {
  const auth = c.req.header('authorization') ?? '';
  const key = auth.replace(/^Bearer\s+/i, '').trim();
  if (key && e.owner_key_hash && (await sha256(key)) === e.owner_key_hash) return true;
  const u = await currentUser(c, sql ?? db(c.env.DATABASE_URL));
  return !!u && !!e.owner_user_id && u.id === e.owner_user_id;
}

/**
 * onAnalyticsError: 'fail' (the owner's button: they see the message) or 'degrade' (the daily refresh:
 * Popularity becomes unknown with the reason, Quality still refreshes, and the entry remembers the error).
 */
export type GradeOptions = { refreshQuality: boolean; refreshPopularity: boolean; onAnalyticsError?: 'fail' | 'degrade' };

/**
 * Compute and store a grade. Used by the owner's button (both fresh) and by the
 * scheduled refresh (popularity daily, quality monthly). Returns the grade row or an error string.
 */
export async function runGrade(env: Env, sql: Sql, e: EntryRow, opts: GradeOptions): Promise<GradeRow | string> {
  const prevRows = (await sql`select * from grades where entry_id = ${e.id} order by created_at desc limit 1`) as GradeRow[];
  const prev = prevRows[0];

  // Popularity and Quality are read concurrently: Google and GitHub each take a few seconds.
  const popularityP = (async () => {
    if (!(opts.refreshPopularity || !prev)) return { score: prev.popularity_score, input: prev.popularity_input as unknown };
    const reading = await readAnalytics(env, sql, e);
    if (typeof reading === 'string') {
      // Remember why, so the owner sees it on the entry and can reconnect.
      await sql`update entries set analytics_error = ${reading} where id = ${e.id}`;
      e.analytics_error = reading;
      if (opts.onAnalyticsError !== 'degrade') return `analytics: ${reading}`;
      return { score: null, input: { note: `Google Analytics could not be read (${reading}). Reconnect it to restore Popularity.` } as unknown };
    }
    if (e.analytics_error) {
      await sql`update entries set analytics_error = null where id = ${e.id}`;
      e.analytics_error = null;
    }
    const popularity = reading ? scorePopularity(reading) : null;
    // Nothing from Google is kept: not the counts, not the property. Only the subscores and the score.
    const input = reading && popularity ? { provider: reading.provider, window: reading.window, reach: popularity.reach, returning: popularity.returning, note: popularity.note, version: popularity.version } : { note: 'No analytics connected: popularity is unknown.' };
    return { score: popularity ? popularity.score : null, input };
  })();

  type Quality = { score: number | null; signals: unknown[]; repo: string | null; version: string; note?: string };
  const repoUrl = e.kind === 'github' ? e.url : e.repo_url;
  const qualityP = (async (): Promise<Quality | string> => {
    if (!(opts.refreshQuality || !prev)) return prev.quality_breakdown as Quality;
    if (!repoUrl) return { score: null, signals: [], repo: null, version: QUALITY_VERSION, note: 'No repository linked: quality is unknown. Link a repo to be scored.' };
    const t = normalizeTarget(repoUrl);
    if (typeof t === 'string' || !t.repo) return 'linked repo is not a valid github.com/owner/repo URL';
    const token = await ownerGithubToken(env, sql, e);
    if (!token) return 'the owner must be signed in with GitHub so the repo can be read with their token';
    const facts = await collectRepoFacts(t.repo.owner, t.repo.name, token);
    if (typeof facts === 'string') return facts;
    let quality: Quality = scoreQuality(facts);
    // A repo can go private after it was linked: trust what GitHub says now, and remember it.
    if (facts.isPrivate !== e.repo_private) {
      await sql`update entries set repo_private = ${facts.isPrivate} where id = ${e.id}`;
      e.repo_private = facts.isPrivate;
    }
    if (facts.isPrivate || e.repo_private) quality = { ...quality, repo: 'private repository' };
    return quality;
  })();

  const [pop, quality] = await Promise.all([popularityP, qualityP]);
  if (typeof pop === 'string') return pop;
  if (typeof quality === 'string') return quality;
  const popularityScore = pop.score;
  const popularityInput = pop.input;

  const v = verdict(quality.score, popularityScore);
  const sl = sloppy(quality.score, popularityScore);
  const rows = (await sql`
    insert into grades (entry_id, quality_score, popularity_score, sloppy, verdict, quality_breakdown, popularity_input, heuristics_version)
    values (${e.id}, ${quality.score}, ${popularityScore}, ${sl}, ${v}, ${JSON.stringify(quality)}::jsonb, ${JSON.stringify(popularityInput)}::jsonb, ${QUALITY_VERSION})
    returning *
  `) as GradeRow[];
  return rows[0];
}

grade.post('/entries/:id/grade', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (!e.verified_at) return c.json({ error: 'entry is not verified; only the verified owner can request a grade' }, 403);
  if (!(await requireOwner(c, e, sql))) return c.json({ error: 'sign in as the owner' }, 401);
  if (!(await rateLimit(sql, `grade:${e.id}`, 5, 86400))) return c.json({ error: 'at most 5 grades per entry per day' }, 429);

  const body = await c.req.json().catch(() => ({}));
  if (body.acceptTerms !== true) {
    return c.json({ error: `you must accept the terms (version ${TERMS_VERSION}) by sending acceptTerms: true`, termsUrl: `${c.env.PUBLIC_SITE_URL}/terms`, termsVersion: TERMS_VERSION }, 400);
  }
  await sql`update entries set terms_version = ${TERMS_VERSION}, terms_accepted_at = now() where id = ${e.id}`;
  // The work finishes even if the browser leaves (a reload mid-grade used to cancel it).
  const pending = runGrade(c.env, sql, e, { refreshQuality: true, refreshPopularity: true });
  c.executionCtx.waitUntil(pending.catch(() => undefined));
  const g = await pending;
  if (typeof g === 'string') return c.json({ error: g }, g.startsWith('analytics:') || g.includes('rate limit') || g.includes('not found') ? 422 : g.includes('signed in') ? 428 : 400);
  return c.json({ grade: publicGrade(g, e.repo_private) }, 201);
});
