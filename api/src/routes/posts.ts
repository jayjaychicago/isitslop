import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { currentUser, isAdminUser } from '../lib/session.ts';
import { purge } from '../lib/edgecache.ts';

/**
 * The blog. Posts are rows, written and edited on the site by the operator (ADMIN_GITHUB_LOGINS),
 * read by everyone. Drafts are visible to the operator only.
 */
export const posts = new Hono<{ Bindings: Env }>();

type PostRow = { slug: string; title: string; description: string; author: string; date: string; draft: boolean; body: string; updated_at: string };
const pub = (p: PostRow) => ({ slug: p.slug, title: p.title, description: p.description, author: p.author, date: p.date, draft: p.draft, body: p.body, updatedAt: p.updated_at });
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
  const origin = new URL(c.req.url).origin;
  await purge([`${origin}/v1/posts`, `${origin}/v1/posts/${slug}`]);
  return c.json({ post: pub(rows[0]) });
});

posts.delete('/posts/:slug', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  if (!isAdminUser(c.env, await currentUser(c, sql))) return c.json({ error: 'operator only' }, 403);
  const slug = c.req.param('slug');
  await sql`delete from posts where slug = ${slug}`;
  const origin = new URL(c.req.url).origin;
  await purge([`${origin}/v1/posts`, `${origin}/v1/posts/${slug}`]);
  return c.json({ deleted: slug });
});
