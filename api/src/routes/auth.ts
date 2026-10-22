import { Hono, type Context } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { randomToken } from '../lib/crypto.ts';
import { exchangeCode, githubEnabled, githubUser, seal, signState, verifyState } from '../lib/github-auth.ts';
import { createSession, currentUser, destroySession, publicUser, type User } from '../lib/session.ts';
import { publicEntry, type EntryRow, type GradeRow } from '../lib/entries.ts';

export const auth = new Hono<{ Bindings: Env }>();

/** Sign in with GitHub. `return` is a path on the website to come back to. */
auth.get('/auth/github', async (c) => {
  if (!githubEnabled(c.env)) return c.json({ error: 'GitHub App not configured on this deployment' }, 503);
  const ret = (c.req.query('return') ?? '/').replace(/[^\w\-./?=&]/g, '');
  const state = await signState(c.env, { login: true, ret: ret.startsWith('/') ? ret : '/', nonce: randomToken(8) });
  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', c.env.GITHUB_APP_CLIENT_ID!);
  // The GitHub App has /v1/github/callback registered as its callback URL.
  url.searchParams.set('redirect_uri', `${c.env.OAUTH_CALLBACK_ORIGIN}/v1/github/callback`);
  url.searchParams.set('state', state);
  return c.redirect(url.toString(), 302);
});

const callback = async (c: Context<{ Bindings: Env }>) => {
  const state = await verifyState(c.env, c.req.query('state') ?? '');
  const code = c.req.query('code') ?? '';
  const site = c.env.PUBLIC_SITE_URL;
  if (!state || !state.login) return c.redirect(`${site}/?signin=error`, 302);
  if (!code) return c.redirect(`${site}${state.ret}?signin=denied`, 302);
  const tokens = await exchangeCode(c.env, code);
  if (typeof tokens === 'string') return c.redirect(`${site}${state.ret}?signin=error`, 302);
  const gh = await githubUser(tokens.accessToken);
  if (!gh) return c.redirect(`${site}${state.ret}?signin=error`, 302);
  const sql = db(c.env.DATABASE_URL);
  const rows = (await sql`
    insert into users (github_id, github_login, github_token, github_refresh_token, github_token_expires_at)
    values (${gh.id}, ${gh.login}, ${await seal(c.env, tokens.accessToken)}, ${tokens.refreshToken ? await seal(c.env, tokens.refreshToken) : null}, ${tokens.expiresAt})
    on conflict (github_id) do update set
      github_login = excluded.github_login, github_token = excluded.github_token,
      github_refresh_token = excluded.github_refresh_token, github_token_expires_at = excluded.github_token_expires_at, last_seen_at = now()
    returning *
  `) as User[];
  await createSession(c, sql, rows[0].id);
  return c.redirect(`${site}${state.ret}`, 302);
};
auth.get('/github/callback', callback);
auth.get('/auth/github/callback', callback);

auth.post('/auth/logout', async (c) => {
  await destroySession(c, db(c.env.DATABASE_URL));
  return c.json({ ok: true });
});

/** Who am I, and what do I own. */
auth.get('/me', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const u = await currentUser(c, sql);
  if (!u) return c.json({ user: null, entries: [] });
  const rows = (await sql`
    select e.*, g.quality_score, g.popularity_score, g.verdict, g.created_at as graded_at
    from entries e
    left join lateral (select * from grades where entry_id = e.id order by created_at desc limit 1) g on true
    where e.owner_user_id = ${u.id} order by e.created_at desc
  `) as (EntryRow & Partial<GradeRow> & { graded_at: string | null })[];
  return c.json({
    user: publicUser(c.env, u),
    entries: rows.map((r) => ({ ...publicEntry(r), grade: r.verdict ? { quality: r.quality_score, popularity: r.popularity_score, verdict: r.verdict, createdAt: r.graded_at } : null })),
  });
});
