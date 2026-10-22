import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { randomToken, sha256 } from '../lib/crypto.ts';
import { exchangeCode, githubEnabled, githubUser, open, refreshTokens, repoPermission, seal, signState, verifyState } from '../lib/github-auth.ts';
import { getEntry, type EntryRow } from '../lib/entries.ts';
import { normalizeTarget } from '../lib/url.ts';
import { requireOwner } from './grade.ts';
import type { Sql } from '../lib/db.ts';

export const github = new Hono<{ Bindings: Env }>();

/**
 * Start: send the owner to GitHub.
 * Site entries: caller must already hold the owner key (domain proven); the GitHub login just attaches a token.
 * Repo entries: the GitHub login *is* the ownership proof (push permission on the repo) and issues the owner key.
 */
github.get('/github/login', async (c) => {
  if (!githubEnabled(c.env)) return c.json({ error: 'GitHub App not configured on this deployment' }, 503);
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.query('entry') ?? '');
  if (!e) return c.json({ error: 'entry not found' }, 404);
  let ownerKeyHash: string | null = null;
  if (e.kind === 'site') {
    const key = (c.req.query('ownerKey') ?? '').trim();
    if (!key || !e.owner_key_hash || (await sha256(key)) !== e.owner_key_hash) return c.json({ error: 'site entries need a valid ownerKey to connect GitHub' }, 401);
    ownerKeyHash = e.owner_key_hash;
  }
  const state = await signState(c.env, { entry: e.id, ownerKeyHash, nonce: randomToken(8) });
  // The app's install page handles both cases: install on an account, or pick an account where it is
  // already installed. With "request user authorization during installation" on, GitHub then sends the
  // user to our callback with a code. One click from isitslop.org, no separate authorize step.
  const url = new URL(`https://github.com/apps/${c.env.GITHUB_APP_SLUG ?? 'is-it-slop'}/installations/new`);
  url.searchParams.set('state', state);
  return c.redirect(url.toString(), 302);
});

github.get('/github/callback', async (c) => {
  if (!githubEnabled(c.env)) return c.json({ error: 'GitHub App not configured' }, 503);
  const back = (entryId: string, params: Record<string, string>) => {
    const u = new URL(`${c.env.PUBLIC_SITE_URL}/s/${entryId}`);
    // Fragment, so nothing sensitive lands in server logs.
    u.hash = new URLSearchParams(params).toString();
    return c.redirect(u.toString(), 302);
  };
  const state = await verifyState(c.env, c.req.query('state') ?? '');
  const code = c.req.query('code') ?? '';
  // Installed straight from GitHub rather than from an entry page: nothing to attach it to.
  if (!state) return c.redirect(`${c.env.PUBLIC_SITE_URL}/?github=installed`, 302);
  if (!code) return back(String(state.entry), { github: 'error', detail: 'GitHub did not return an authorization code; check that "request user authorization during installation" is on' });
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, String(state.entry));
  if (!e) return c.json({ error: 'entry not found' }, 404);
  if (e.kind === 'site' && e.owner_key_hash !== state.ownerKeyHash) return back(e.id, { github: 'error', detail: 'owner key changed, start again' });

  const tokens = await exchangeCode(c.env, code);
  if (typeof tokens === 'string') return back(e.id, { github: 'error', detail: tokens });
  const user = await githubUser(tokens.accessToken);
  if (!user) return back(e.id, { github: 'error', detail: 'could not read GitHub user' });

  const sealedAccess = await seal(c.env, tokens.accessToken);
  const sealedRefresh = tokens.refreshToken ? await seal(c.env, tokens.refreshToken) : null;

  if (e.kind === 'github') {
    const t = normalizeTarget(e.url);
    if (typeof t === 'string' || !t.repo) return back(e.id, { github: 'error', detail: 'bad repo url' });
    const perm = await repoPermission(tokens.accessToken, t.repo.owner, t.repo.name);
    if (perm === 'invisible') return back(e.id, { github: 'error', detail: `the app cannot see ${t.url}. Install it on that account: https://github.com/apps/${c.env.GITHUB_APP_SLUG}/installations/new` });
    if (perm !== 'admin' && perm !== 'push') return back(e.id, { github: 'error', detail: `${user.login} does not have push access to ${t.url}` });
    const ownerKey = `isk_${randomToken(24)}`;
    await sql`insert into verifications (entry_id, method, token, status) values (${e.id}, 'github', ${user.login}, 'verified')`;
    await sql`update entries set verified_at = now(), owner_key_hash = ${await sha256(ownerKey)}, github_login = ${user.login}, github_token = ${sealedAccess}, github_refresh_token = ${sealedRefresh}, github_token_expires_at = ${tokens.expiresAt} where id = ${e.id}`;
    return back(e.id, { github: 'ok', login: user.login, ownerKey });
  }

  await sql`update entries set github_login = ${user.login}, github_token = ${sealedAccess}, github_refresh_token = ${sealedRefresh}, github_token_expires_at = ${tokens.expiresAt} where id = ${e.id}`;
  return back(e.id, { github: 'ok', login: user.login });
});

github.post('/entries/:id/github/disconnect', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  if (!(await requireOwner(c, e))) return c.json({ error: 'invalid owner key' }, 401);
  await sql`update entries set github_login = null, github_token = null, github_refresh_token = null, github_token_expires_at = null where id = ${e.id}`;
  return c.json({ ok: true });
});

/** A usable access token for this entry's connected GitHub account, refreshing if needed. Null if not connected. */
export async function ownerGithubToken(env: Env, sql: Sql, e: EntryRow): Promise<string | null> {
  if (!e.github_token) return null;
  const expired = e.github_token_expires_at ? new Date(e.github_token_expires_at).getTime() < Date.now() + 60_000 : false;
  if (!expired) return open(env, e.github_token);
  if (!e.github_refresh_token) return null;
  const refresh = await open(env, e.github_refresh_token);
  if (!refresh) return null;
  const t = await refreshTokens(env, refresh);
  if (typeof t === 'string') return null;
  await sql`update entries set github_token = ${await seal(env, t.accessToken)}, github_refresh_token = ${t.refreshToken ? await seal(env, t.refreshToken) : null}, github_token_expires_at = ${t.expiresAt} where id = ${e.id}`;
  return t.accessToken;
}
