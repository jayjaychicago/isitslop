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

  // Popularity: read from the owner's connected analytics. Nothing connected is unknown; connected and empty is zero.
  const reading = await readAnalytics(c.env, sql, e);
  if (typeof reading === 'string') return c.json({ error: `analytics: ${reading}` }, 422);
  const popularity = reading ? scorePopularity(reading) : null;
  const popularityScore: number | null = popularity ? popularity.score : null;
  const popularityInput = reading ? { ...reading, ...popularity, note: popularity?.note } : { note: 'No analytics connected: popularity is unknown.' };

  // Quality: GitHub signals on the repo (the entry itself, or the repo linked to the site). No repo is unknown.
  const repoUrl = e.kind === 'github' ? e.url : e.repo_url;
  let quality: { score: number | null; signals: unknown[]; repo: string | null; version: string; note?: string };
  if (!repoUrl) {
    quality = { score: null, signals: [], repo: null, version: QUALITY_VERSION, note: 'No repository linked: quality is unknown. Link a repo to be scored.' };
  } else {
    const t = normalizeTarget(repoUrl);
    if (typeof t === 'string' || !t.repo) return c.json({ error: 'linked repo is not a valid github.com/owner/repo URL' }, 400);
    // Read with the owner's own GitHub token: their rate limit, their private repos.
    const token = await ownerGithubToken(c.env, sql, e);
    if (!token) return c.json({ error: 'the owner must be signed in with GitHub so the repo can be read with their token' }, 428);
    const facts = await collectRepoFacts(t.repo.owner, t.repo.name, token);
    if (typeof facts === 'string') return c.json({ error: facts }, 422);
    quality = scoreQuality(facts);
    if (e.repo_private) quality = { ...quality, repo: 'private repository' };
  }

  const v = verdict(quality.score, popularityScore);
  const ov = overall(quality.score, popularityScore);

  await sql`update entries set terms_version = ${TERMS_VERSION}, terms_accepted_at = now() where id = ${e.id}`;
  const rows = (await sql`
    insert into grades (entry_id, quality_score, popularity_score, overall, verdict, quality_breakdown, popularity_input, heuristics_version)
    values (${e.id}, ${quality.score}, ${popularityScore}, ${ov}, ${v}, ${JSON.stringify(quality)}::jsonb, ${JSON.stringify(popularityInput)}::jsonb, ${QUALITY_VERSION})
    returning *
  `) as GradeRow[];
  return c.json({ grade: publicGrade(rows[0]) }, 201);
});
