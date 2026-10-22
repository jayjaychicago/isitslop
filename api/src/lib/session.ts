/**
 * Sessions. Owners sign in with GitHub (through the GitHub App) once; a cookie
 * on .isitslop.org identifies them to the API after that. No passwords.
 */
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Context } from 'hono';
import type { Env } from './env.ts';
import type { Sql } from './db.ts';
import { randomToken } from './crypto.ts';

export const SESSION_COOKIE = 'isitslop_session';

export type User = {
  id: string;
  github_id: number;
  github_login: string;
  github_token: string | null;
  github_refresh_token: string | null;
  github_token_expires_at: string | null;
};

function cookieDomain(env: Env): string | undefined {
  try {
    const host = new URL(env.PUBLIC_SITE_URL).hostname;
    return host === 'localhost' ? undefined : host.replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

export async function createSession(c: Context<{ Bindings: Env }>, sql: Sql, userId: string): Promise<void> {
  const id = randomToken(32);
  await sql`insert into sessions (id, user_id) values (${id}, ${userId})`;
  setCookie(c, SESSION_COOKIE, id, { path: '/', httpOnly: true, secure: true, sameSite: 'Lax', domain: cookieDomain(c.env), maxAge: 30 * 86400 });
}

export async function destroySession(c: Context<{ Bindings: Env }>, sql: Sql): Promise<void> {
  const id = getCookie(c, SESSION_COOKIE);
  if (id) await sql`delete from sessions where id = ${id}`;
  deleteCookie(c, SESSION_COOKIE, { path: '/', domain: cookieDomain(c.env) });
}

export async function currentUser(c: Context<{ Bindings: Env }>, sql: Sql): Promise<User | null> {
  const id = getCookie(c, SESSION_COOKIE);
  if (!id) return null;
  const rows = (await sql`
    select u.* from sessions s join users u on u.id = s.user_id
    where s.id = ${id} and s.expires_at > now()
  `) as User[];
  return rows[0] ?? null;
}

/** The operator: a signed-in GitHub login listed in ADMIN_GITHUB_LOGINS. Can delete any entry. */
export const isAdminUser = (env: Env, u: User | null): boolean =>
  !!u && (env.ADMIN_GITHUB_LOGINS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean).includes(u.github_login.toLowerCase());

export const publicUser = (env: Env, u: User) => ({ id: u.id, githubLogin: u.github_login, githubConnected: !!u.github_token, isAdmin: isAdminUser(env, u) });
