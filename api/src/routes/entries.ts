import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { normalizeTarget } from '../lib/url.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { fetchTargetText, fetchText, rawGithub } from '../lib/fetch.ts';
import { requireOwner } from './grade.ts';
import { scoreCritics } from '../heuristics/critics.ts';
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
    select e.*, g.critics_score, g.people_score, g.overall, g.verdict, g.created_at as graded_at
    from entries e
    left join lateral (select * from grades where entry_id = e.id order by created_at desc limit 1) g on true
    where ${q} = '' or e.url ilike ${like} or e.domain ilike ${like} or coalesce(e.title,'') ilike ${like}
    order by e.created_at desc
    limit ${limit} offset ${offset}
  `) as (EntryRow & { critics_score: number | null; people_score: number | null; overall: number | null; verdict: string | null; graded_at: string | null })[];
  return c.json({
    items: rows.map((r) => ({
      ...publicEntry(r),
      grade: r.verdict ? { critics: r.critics_score, people: r.people_score, overall: r.overall, verdict: r.verdict, createdAt: r.graded_at } : null,
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
  const history = (await sql`select id, critics_score, people_score, overall, verdict, heuristics_version, created_at from grades where entry_id = ${e.id} order by created_at desc limit 20`) as GradeRow[];
  const appeals = (await sql`select * from appeals where entry_id = ${e.id} order by created_at desc`) as AppealRow[];
  return c.json({
    entry: publicEntry(e),
    grade: g ? publicGrade(g) : null,
    history: history.map((h) => ({ id: h.id, critics: h.critics_score, people: h.people_score, overall: h.overall, verdict: h.verdict, heuristicsVersion: h.heuristics_version, createdAt: h.created_at })),
    appeals: appeals.map(publicAppeal),
  });
});

/**
 * Link a public GitHub repo to a site entry, so one thing is one entry.
 * Both sides must be proven: the caller holds the site's owner key, and the repo's
 * default branch contains a `.isitslop` file with the line `isitslop-site=<entry id>`.
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
  const expected = `isitslop-site=${e.id}`;
  let found: string | null = null;
  for (const br of ['main', 'master']) {
    found = await fetchText(rawGithub(t.repo.owner, t.repo.name, br, '.isitslop'));
    if (found) break;
  }
  if (!found || !found.includes(expected)) {
    return c.json({ error: `commit a .isitslop file to the root of ${t.url} containing the line ${expected}, then retry`, file: { path: '.isitslop', line: expected } }, 422);
  }
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

/** Dry run: anyone can see what the definition heuristics think of any URL. Nothing is stored. */
entries.get('/preview', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  if (!(await rateLimit(sql, `preview:${ip(c)}`, 30, 3600))) return c.json({ error: 'rate limited' }, 429);
  const t = normalizeTarget(c.req.query('url') ?? '');
  if (typeof t === 'string') return c.json({ error: t }, 400);
  const r = await fetchTargetText(t);
  if ('error' in r) return c.json({ error: r.error }, 422);
  const critics = scoreCritics(r.extracted);
  return c.json({ target: t, source: r.source, title: r.extracted.title, critics, preview: true });
});
