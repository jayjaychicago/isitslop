import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import type { Sql } from '../lib/db.ts';
import { open, refreshTokens, seal } from '../lib/github-auth.ts';
import type { EntryRow } from '../lib/entries.ts';
import type { User } from '../lib/session.ts';

export const github = new Hono<{ Bindings: Env }>();

/** A usable GitHub access token for a user, refreshing if needed. */
export async function userGithubToken(env: Env, sql: Sql, u: User): Promise<string | null> {
  if (!u.github_token) return null;
  const expired = u.github_token_expires_at ? new Date(u.github_token_expires_at).getTime() < Date.now() + 60_000 : false;
  if (!expired) return open(env, u.github_token);
  if (!u.github_refresh_token) return null;
  const refresh = await open(env, u.github_refresh_token);
  if (!refresh) return null;
  const t = await refreshTokens(env, refresh);
  if (typeof t === 'string') return null;
  await sql`update users set github_token = ${await seal(env, t.accessToken)}, github_refresh_token = ${t.refreshToken ? await seal(env, t.refreshToken) : null}, github_token_expires_at = ${t.expiresAt} where id = ${u.id}`;
  return t.accessToken;
}

/** The token of the user who owns the entry. Null if no owner or the owner has no GitHub token. */
export async function ownerGithubToken(env: Env, sql: Sql, e: EntryRow): Promise<string | null> {
  if (!e.owner_user_id) return null;
  const rows = (await sql`select * from users where id = ${e.owner_user_id}`) as User[];
  return rows[0] ? userGithubToken(env, sql, rows[0]) : null;
}
