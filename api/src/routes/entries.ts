import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { normalizeTarget } from '../lib/url.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { requireOwner } from './grade.ts';
import { collectRepoFacts, scoreQuality } from '../heuristics/quality.ts';
import { ownerGithubToken } from './github.ts';
import { repoPermission } from '../lib/github-auth.ts';
import { getEntry, latestGrade, publicAppeal, publicEntry, publicGrade, type AppealRow, type EntryRow, type GradeRow } from '../lib/entries.ts';

export const entries = new Hono<{ Bindings: Env }>();

const ip = (c: { req: { header: (n: string) => string | undefined } }) => c.req.header('cf-connecting-ip') ?? 'unknown';

entries.get('/entries', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const q = (c.req.query('q') ?? '').trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 20) || 20));
  const offset = Math.max(0, Number(c.req.query('offset') ?? 0) || 0);
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const rows = (await sql`
    select e.*, g.quality_score, g.popularity_score, g.overall, g.verdict, g.created_at as graded_at
    from entries e
    left join lateral (select * from grades where entry_id = e.id order by created_at desc limit 1) g on true
    where ${q} = '' or e.url ilike ${like} or e.domain ilike ${like} or coalesce(e.title,'') ilike ${like}
    order by e.created_at desc
    limit ${limit} offset ${offset}
  `) as (EntryRow & { quality_score: number | null; popularity_score: number | null; overall: number | null; verdict: string | null; graded_at: string | null })[];
  return c.json({
    items: rows.map((r) => ({
      ...publicEntry(r),
      grade: r.verdict ? { quality: r.quality_score, popularity: r.popularity_score, overall: r.overall, verdict: r.verdict, createdAt: r.graded_at } : null,
    })),
    limit,
    offset,
  });
});

entries.post('/entries', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  if (!(await rateLimit(sql, `add:${ip(c)}`, 20, 3600))) return c.json({ error: 'rate limited' }, 429);
  const body = await c.req.json().catch(() => ({}));
  const t = normalizeTarget(String(body.url ?? ''));
  if (typeof t === 'string') return c.json({ error: t }, 400);
  const rows = (await sql`
    insert into entries (url, kind, domain) values (${t.url}, ${t.kind}, ${t.domain})
    on conflict (url) do update set url = excluded.url
    returning *
  `) as EntryRow[];
  const e = rows[0];
  return c.json({ entry: publicEntry(e) }, 201);
});

entries.get('/entries/:id', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  const g = await latestGrade(sql, e.id);
  const history = (await sql`select id, quality_score, popularity_score, overall, verdict, heuristics_version, created_at from grades where entry_id = ${e.id} order by created_at desc limit 20`) as GradeRow[];
  const appeals = (await sql`select * from appeals where entry_id = ${e.id} order by created_at desc`) as AppealRow[];
  return c.json({
    entry: publicEntry(e),
    grade: g ? publicGrade(g) : null,
    history: history.map((h) => ({ id: h.id, quality: h.quality_score, popularity: h.popularity_score, overall: h.overall, verdict: h.verdict, heuristicsVersion: h.heuristics_version, createdAt: h.created_at })),
    appeals: appeals.map(publicAppeal),
  });
});

/**
 * Link a GitHub repo to a site entry, so one thing is one entry.
 * Both sides must be proven: the caller holds the site's owner key, and the
 * connected GitHub account has push access to the repo.
 */
entries.post('/entries/:id/repo', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (e.kind !== 'site') return c.json({ error: 'only site entries can link a repo' }, 400);
  if (!(await requireOwner(c, e))) return c.json({ error: 'invalid owner key' }, 401);
  const body = await c.req.json().catch(() => ({}));
  if (body.repoUrl === null) {
    const rows = (await sql`update entries set repo_url = null where id = ${e.id} returning *`) as EntryRow[];
    return c.json({ entry: publicEntry(rows[0]) });
  }
  const t = normalizeTarget(String(body.repoUrl ?? ''));
  if (typeof t === 'string' || t.kind !== 'github' || !t.repo) return c.json({ error: 'repoUrl must be a public github.com/owner/repo URL' }, 400);
  const token = await ownerGithubToken(c.env, sql, e);
  if (!token) return c.json({ error: 'connect your GitHub account first (GET /v1/github/login?entry=...&ownerKey=...)' }, 428);
  const perm = await repoPermission(token, t.repo.owner, t.repo.name);
  if (perm === 'invisible') return c.json({ error: `the isitslop app cannot see ${t.url}; install it on that account at https://github.com/apps/${c.env.GITHUB_APP_SLUG ?? 'isitslop'}/installations/new` }, 422);
  if (perm !== 'admin' && perm !== 'push') return c.json({ error: `${e.github_login} does not have push access to ${t.url}` }, 403);
  const rows = (await sql`update entries set repo_url = ${t.url} where id = ${e.id} returning *`) as EntryRow[];
  return c.json({ entry: publicEntry(rows[0]) });
});

/** Remove an entry and everything attached to it. Owner key or admin token. See terms, section 9. */
entries.delete('/entries/:id', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  const auth = (c.req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const isAdmin = !!c.env.ADMIN_TOKEN && auth === c.env.ADMIN_TOKEN;
  if (!isAdmin && !(await requireOwner(c, e))) return c.json({ error: 'invalid owner key' }, 401);
  await sql`delete from entries where id = ${e.id}`;
  return c.json({ deleted: e.id });
});

/** Dry run: anyone can see the quality signals for any public GitHub repo. Nothing is stored. */
entries.get('/preview', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  if (!(await rateLimit(sql, `preview:${ip(c)}`, 20, 3600))) return c.json({ error: 'rate limited' }, 429);
  const t = normalizeTarget(c.req.query('url') ?? '');
  if (typeof t === 'string') return c.json({ error: t }, 400);
  if (t.kind !== 'github' || !t.repo) return c.json({ error: 'preview takes a public github.com/owner/repo URL; sites are scored on their linked repo' }, 400);
  const facts = await collectRepoFacts(t.repo.owner, t.repo.name, c.env.GITHUB_TOKEN); // anonymous preview: shared, optional token
  if (typeof facts === 'string') return c.json({ error: facts }, 422);
  return c.json({ target: t, quality: scoreQuality(facts), facts, preview: true });
});
