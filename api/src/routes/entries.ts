import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { normalizeTarget } from '../lib/url.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { requireOwner } from './grade.ts';
import { collectRepoFacts, scoreQuality } from '../heuristics/quality.ts';
import { userGithubToken } from './github.ts';
import { repoPermission, repoInfo } from '../lib/github-auth.ts';
import { currentUser, isAdminUser } from '../lib/session.ts';
import { randomToken, sha256 } from '../lib/crypto.ts';
import { getEntry, latestGrade, publicAppeal, publicEntry, publicGrade, type AppealRow, type EntryRow, type GradeRow } from '../lib/entries.ts';

export const entries = new Hono<{ Bindings: Env }>();

const ip = (c: { req: { header: (n: string) => string | undefined } }) => c.req.header('cf-connecting-ip') ?? 'unknown';

entries.get('/entries', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const q = (c.req.query('q') ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 20) || 20));
  const offset = Math.max(0, Number(c.req.query('offset') ?? 0) || 0);
  const like = `%${q.replace(/[%_]/g, '')}%`;
  const rows = (await sql`
    select e.*, g.quality_score, g.popularity_score, g.overall, g.verdict, g.created_at as graded_at,
      case
        when ${q} = '' then 0
        when e.domain = ${q} then 3
        when e.domain like ${q + '%'} or e.url like ${'https://' + q + '%'} then 2
        else 1
      end as rank
    from entries e
    left join lateral (select * from grades where entry_id = e.id order by created_at desc limit 1) g on true
    where ${q} = ''
       or ((e.url ilike ${like} or e.domain ilike ${like}) and not (e.kind = 'github' and e.repo_private))
       or (coalesce(e.title,'') ilike ${like} and not (e.kind = 'github' and e.repo_private))
    order by rank desc, (g.verdict is not null) desc, e.created_at desc
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

/**
 * The simplest thing: the current score of a URL. One fixed API key, no side effects.
 *   GET /v1/score?url=example.com  (Authorization: Bearer <API_KEY>)
 * -> { found, url, quality, popularity, verdict, label, gradedAt, page }
 */
entries.get('/score', async (c) => {
  const presented = (c.req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim() || (c.req.header('x-api-key') ?? '').trim();
  if (!c.env.API_KEY) return c.json({ error: 'score API not enabled on this deployment' }, 503);
  if (presented !== c.env.API_KEY) return c.json({ error: 'missing or invalid API key' }, 401);
  const sql = db(c.env.DATABASE_URL);
  const t = normalizeTarget(c.req.query('url') ?? '');
  if (typeof t === 'string') return c.json({ error: t }, 400);
  const rows = (await sql`
    select e.*, g.quality_score, g.popularity_score, g.overall, g.verdict, g.created_at as graded_at
    from entries e
    left join lateral (select * from grades where entry_id = e.id order by created_at desc limit 1) g on true
    where e.url = ${t.url} or (e.kind = 'site' and e.domain = ${t.domain} and ${t.kind} = 'site')
    order by (e.url = ${t.url}) desc, e.created_at asc
    limit 1
  `) as (EntryRow & { quality_score: number | null; popularity_score: number | null; overall: number | null; verdict: string | null; graded_at: string | null })[];
  const e = rows[0];
  // A private repository is never confirmed to exist here, so its path cannot be probed.
  if (!e || (e.kind === 'github' && e.repo_private)) return c.json({ found: false, url: t.url, label: 'Not in the index' }, 404);
  const label = verdictLabel(e.verdict);
  return c.json({
    found: true,
    url: e.url,
    overall: e.overall,
    popularity: e.popularity_score,
    quality: e.quality_score,
    verdict: e.verdict,
    label,
    gradedAt: e.graded_at,
    page: `${c.env.PUBLIC_SITE_URL}/s/${e.id}`,
  });
});

/** Plain words for a verdict, for people who do not want to parse `${popularity}_${quality}`. */
function verdictLabel(v: string | null): string {
  if (!v) return 'Not graded';
  const [p, q] = v.split('_');
  const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
  if (p === 'unknown' && q === 'unknown') return 'Nothing connected';
  if (p === 'unknown') return `${cap(q)} of unknown popularity`;
  if (q === 'unknown') return `${cap(p)} stuff of unknown quality`;
  return `${cap(p)} ${cap(q)}`;
}

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
    grade: g ? publicGrade(g, e.repo_private) : null,
    history: history.map((h) => ({ id: h.id, quality: h.quality_score, popularity: h.popularity_score, overall: h.overall, verdict: h.verdict, heuristicsVersion: h.heuristics_version, createdAt: h.created_at })),
    appeals: appeals.map(publicAppeal),
  });
});

/**
 * Link a GitHub repo to a site entry, so one thing is one entry. The signed-in owner's
 * GitHub account must have push access to the repo. Private repos are fine; their URL is never published.
 */
entries.post('/entries/:id/repo', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (e.kind !== 'site') return c.json({ error: 'only site entries can link a repo' }, 400);
  const u = await currentUser(c, sql);
  if (!u || e.owner_user_id !== u.id) return c.json({ error: 'sign in as the owner' }, 401);
  const body = await c.req.json().catch(() => ({}));
  if (body.repoUrl === null) {
    const rows = (await sql`update entries set repo_url = null, repo_private = false where id = ${e.id} returning *`) as EntryRow[];
    return c.json({ entry: publicEntry(rows[0]) });
  }
  const t = normalizeTarget(String(body.repoUrl ?? ''));
  if (typeof t === 'string' || t.kind !== 'github' || !t.repo) return c.json({ error: 'repoUrl must be a github.com/owner/repo URL' }, 400);
  const token = await userGithubToken(c.env, sql, u);
  if (!token) return c.json({ error: 'your GitHub sign-in has expired; sign in again' }, 428);
  const info = await repoInfo(token, t.repo.owner, t.repo.name);
  if (info === 'invisible') return c.json({ error: `the Is It Slop app cannot see ${t.url}; install it on that account at https://github.com/apps/${c.env.GITHUB_APP_SLUG ?? 'is-it-slop'}/installations/new` }, 422);
  if (info.permission !== 'admin' && info.permission !== 'push') return c.json({ error: `${u.github_login} does not have push access to ${t.url}` }, 403);
  const rows = (await sql`update entries set repo_url = ${t.url}, repo_private = ${info.isPrivate} where id = ${e.id} returning *`) as EntryRow[];
  return c.json({ entry: publicEntry(rows[0]) });
});

/** Claim a repository entry: the signed-in user's GitHub account must have push access. This is the ownership proof. */
entries.post('/entries/:id/claim', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (e.kind !== 'github') return c.json({ error: 'sites are verified by DNS, file or email' }, 400);
  const u = await currentUser(c, sql);
  if (!u) return c.json({ error: 'sign in with GitHub first' }, 401);
  const t = normalizeTarget(e.url);
  if (typeof t === 'string' || !t.repo) return c.json({ error: 'bad repo url' }, 400);
  const token = await userGithubToken(c.env, sql, u);
  if (!token) return c.json({ error: 'your GitHub sign-in has expired; sign in again' }, 428);
  const info = await repoInfo(token, t.repo.owner, t.repo.name);
  if (info === 'invisible') return c.json({ error: `the Is It Slop app cannot see ${t.url}; install it on that account at https://github.com/apps/${c.env.GITHUB_APP_SLUG ?? 'is-it-slop'}/installations/new` }, 422);
  if (info.permission !== 'admin' && info.permission !== 'push') return c.json({ error: `${u.github_login} does not have push access to ${t.url}` }, 403);
  const ownerKey = `isk_${randomToken(24)}`;
  await sql`insert into verifications (entry_id, method, token, status) values (${e.id}, 'github', ${u.github_login}, 'verified')`;
  const rows = (await sql`update entries set verified_at = now(), owner_user_id = ${u.id}, owner_key_hash = ${await sha256(ownerKey)}, repo_private = ${info.isPrivate} where id = ${e.id} returning *`) as EntryRow[];
  return c.json({ entry: publicEntry(rows[0]), ownerKey, note: 'ownerKey is only needed for API use; the website uses your sign-in.' });
});

/** Remove an entry and everything attached to it (grades, verifications, appeals, analytics). Owner key, admin token, or the signed-in operator. See terms, section 9. */
entries.delete('/entries/:id', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  const auth = (c.req.header('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  const isAdmin = (!!c.env.ADMIN_TOKEN && auth === c.env.ADMIN_TOKEN) || isAdminUser(c.env, await currentUser(c, sql));
  if (!isAdmin && !(await requireOwner(c, e, sql))) return c.json({ error: 'sign in as the owner' }, 401);
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
