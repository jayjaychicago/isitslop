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
import { overall, verdict } from '../heuristics/verdict.ts';
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

export type GradeOptions = { refreshQuality: boolean; refreshPopularity: boolean };

/**
 * Compute and store a grade. Used by the owner's button (both fresh) and by the
 * scheduled refresh (popularity daily, quality monthly). Returns the grade row or an error string.
 */
export async function runGrade(env: Env, sql: Sql, e: EntryRow, opts: GradeOptions): Promise<GradeRow | string> {
  const prevRows = (await sql`select * from grades where entry_id = ${e.id} order by created_at desc limit 1`) as GradeRow[];
  const prev = prevRows[0];

  // Popularity: read from the owner's connected Google Analytics. Nothing connected is unknown; connected and empty is zero.
  let popularityScore: number | null;
  let popularityInput: unknown;
  if (opts.refreshPopularity || !prev) {
    const reading = await readAnalytics(env, sql, e);
    if (typeof reading === 'string') return `analytics: ${reading}`;
    const popularity = reading ? scorePopularity(reading) : null;
    popularityScore = popularity ? popularity.score : null;
    popularityInput = reading ? { ...reading, ...popularity, note: popularity?.note } : { note: 'No analytics connected: popularity is unknown.' };
  } else {
    popularityScore = prev.popularity_score;
    popularityInput = prev.popularity_input;
  }

  // Quality: GitHub signals on the repo (the entry itself, or the repo linked to the site). No repo is unknown.
  let quality: { score: number | null; signals: unknown[]; repo: string | null; version: string; note?: string };
  const repoUrl = e.kind === 'github' ? e.url : e.repo_url;
  if (opts.refreshQuality || !prev) {
    if (!repoUrl) {
      quality = { score: null, signals: [], repo: null, version: QUALITY_VERSION, note: 'No repository linked: quality is unknown. Link a repo to be scored.' };
    } else {
      const t = normalizeTarget(repoUrl);
      if (typeof t === 'string' || !t.repo) return 'linked repo is not a valid github.com/owner/repo URL';
      const token = await ownerGithubToken(env, sql, e);
      if (!token) return 'the owner must be signed in with GitHub so the repo can be read with their token';
      const facts = await collectRepoFacts(t.repo.owner, t.repo.name, token);
      if (typeof facts === 'string') return facts;
      quality = scoreQuality(facts);
      // A repo can go private after it was linked: trust what GitHub says now, and remember it.
      if (facts.isPrivate !== e.repo_private) {
        await sql`update entries set repo_private = ${facts.isPrivate} where id = ${e.id}`;
        e.repo_private = facts.isPrivate;
      }
      if (facts.isPrivate || e.repo_private) quality = { ...quality, repo: 'private repository' };
    }
  } else {
    quality = prev.quality_breakdown as typeof quality;
  }

  const v = verdict(quality.score, popularityScore);
  const ov = overall(quality.score, popularityScore);
  const rows = (await sql`
    insert into grades (entry_id, quality_score, popularity_score, overall, verdict, quality_breakdown, popularity_input, heuristics_version)
    values (${e.id}, ${quality.score}, ${popularityScore}, ${ov}, ${v}, ${JSON.stringify(quality)}::jsonb, ${JSON.stringify(popularityInput)}::jsonb, ${QUALITY_VERSION})
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
  const g = await runGrade(c.env, sql, e, { refreshQuality: true, refreshPopularity: true });
  if (typeof g === 'string') return c.json({ error: g }, g.startsWith('analytics:') || g.includes('rate limit') || g.includes('not found') ? 422 : g.includes('signed in') ? 428 : 400);
  return c.json({ grade: publicGrade(g, e.repo_private) }, 201);
});
