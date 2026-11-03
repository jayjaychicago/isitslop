import { Hono, type Context } from 'hono';
import type { Sql } from '../lib/db.ts';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { currentUser, isAdminUser } from '../lib/session.ts';
import { purge } from '../lib/edgecache.ts';
import { rateLimit } from '../lib/ratelimit.ts';

/**
 * The blog. Posts are rows, written and edited on the site by the operator (ADMIN_GITHUB_LOGINS),
 * read by everyone. Drafts are visible to the operator only.
 */
export const posts = new Hono<{ Bindings: Env }>();

type PostRow = { slug: string; title: string; description: string; author: string; date: string; draft: boolean; body: string; updated_at: string };
const pub = (p: PostRow) => ({ slug: p.slug, title: p.title, description: p.description, author: p.author, date: p.date, draft: p.draft, body: p.body, updatedAt: p.updated_at });
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** The list and the post, under both path forms the API answers on. */
const purgePost = (reqUrl: string, slug: string) => {
  const origin = new URL(reqUrl).origin;
  return purge(['', '/v1'].flatMap((b) => [`${origin}${b}/posts`, `${origin}${b}/posts/${slug}`]));
};

posts.get('/posts', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const admin = isAdminUser(c.env, await currentUser(c, sql));
  const all = admin && c.req.query('all') === '1';
  const rows = (await sql`select slug, title, description, author, to_char(date, 'YYYY-MM-DD') as date, draft, body, updated_at from posts where ${all} or not draft order by date desc, created_at desc`) as PostRow[];
  return c.json({ items: rows.map(pub) });
});

posts.get('/posts/:slug', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const rows = (await sql`select slug, title, description, author, to_char(date, 'YYYY-MM-DD') as date, draft, body, updated_at from posts where slug = ${c.req.param('slug')}`) as PostRow[];
  const p = rows[0];
  if (!p) return c.json({ error: 'not found' }, 404);
  if (p.draft && !isAdminUser(c.env, await currentUser(c, sql))) return c.json({ error: 'not found' }, 404);
  return c.json({ post: pub(p) });
});

/** Create or replace a post. Operator only. */
posts.put('/posts/:slug', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  if (!isAdminUser(c.env, await currentUser(c, sql))) return c.json({ error: 'operator only' }, 403);
  const slug = c.req.param('slug');
  if (!SLUG.test(slug) || slug.length > 80) return c.json({ error: 'slug: lowercase letters, digits and dashes' }, 400);
  const b = (await c.req.json().catch(() => ({}))) as Partial<{ title: string; description: string; author: string; date: string; draft: boolean; body: string }>;
  const title = String(b.title ?? '').trim();
  if (!title) return c.json({ error: 'title is required' }, 400);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b.date ?? '')) ? String(b.date) : new Date().toISOString().slice(0, 10);
  const rows = (await sql`
    insert into posts (slug, title, description, author, date, draft, body)
    values (${slug}, ${title}, ${String(b.description ?? '').trim()}, ${String(b.author ?? '').trim()}, ${date}::date, ${!!b.draft}, ${String(b.body ?? '')})
    on conflict (slug) do update set title = excluded.title, description = excluded.description, author = excluded.author,
      date = excluded.date, draft = excluded.draft, body = excluded.body, updated_at = now()
    returning slug, title, description, author, to_char(date, 'YYYY-MM-DD') as date, draft, body, updated_at
  `) as PostRow[];
  await purgePost(c.req.url, slug);
  return c.json({ post: pub(rows[0]) });
});

posts.delete('/posts/:slug', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  if (!isAdminUser(c.env, await currentUser(c, sql))) return c.json({ error: 'operator only' }, 403);
  const slug = c.req.param('slug');
  await sql`delete from posts where slug = ${slug}`;
  await purgePost(c.req.url, slug);
  return c.json({ deleted: slug });
});

/**
 * Comments. Anyone signed in with GitHub can leave one under a published post; the author or the operator
 * can remove it. Plain text, shown as written. Not edge cached: they are read with the cookie anyway.
 */
type CommentRow = { id: string; github_login: string; body: string; created_at: string };
const pubComment = (r: CommentRow) => ({ id: r.id, githubLogin: r.github_login, body: r.body, createdAt: r.created_at });

async function publishedPost(c: Context<{ Bindings: Env }>, sql: Sql, slug: string): Promise<boolean> {
  const rows = (await sql`select draft from posts where slug = ${slug}`) as { draft: boolean }[];
  if (!rows[0]) return false;
  return !rows[0].draft || isAdminUser(c.env, await currentUser(c, sql));
}

posts.get('/posts/:slug/comments', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const slug = c.req.param('slug');
  if (!(await publishedPost(c, sql, slug))) return c.json({ error: 'not found' }, 404);
  const rows = (await sql`select id, github_login, body, created_at from comments where post_slug = ${slug} order by created_at`) as CommentRow[];
  return c.json({ items: rows.map(pubComment) });
});

posts.post('/posts/:slug/comments', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const u = await currentUser(c, sql);
  if (!u) return c.json({ error: 'sign in with GitHub to comment' }, 401);
  const slug = c.req.param('slug');
  if (!(await publishedPost(c, sql, slug))) return c.json({ error: 'not found' }, 404);
  const b = (await c.req.json().catch(() => ({}))) as { body?: string };
  const body = String(b.body ?? '').replace(/\r\n/g, '\n').trim();
  if (!body) return c.json({ error: 'say something' }, 400);
  if (body.length > 2000) return c.json({ error: 'at most 2000 characters' }, 400);
  if (!(await rateLimit(sql, `comment:${u.id}`, 20, 3600))) return c.json({ error: 'at most 20 comments an hour' }, 429);
  const rows = (await sql`
    insert into comments (post_slug, user_id, github_login, body) values (${slug}, ${u.id}, ${u.github_login}, ${body})
    returning id, github_login, body, created_at
  `) as CommentRow[];
  return c.json({ comment: pubComment(rows[0]) }, 201);
});

posts.delete('/posts/:slug/comments/:id', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const u = await currentUser(c, sql);
  if (!u) return c.json({ error: 'sign in with GitHub' }, 401);
  const id = c.req.param('id');
  if (!/^[0-9a-f-]{36}$/.test(id)) return c.json({ error: 'not found' }, 404);
  const rows = (await sql`select user_id from comments where id = ${id} and post_slug = ${c.req.param('slug')}`) as { user_id: string | null }[];
  if (!rows[0]) return c.json({ error: 'not found' }, 404);
  if (rows[0].user_id !== u.id && !isAdminUser(c.env, u)) return c.json({ error: 'only the author or the operator can remove a comment' }, 403);
  await sql`delete from comments where id = ${id}`;
  return c.json({ deleted: id });
});
