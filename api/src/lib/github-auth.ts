/**
 * Owners connect their GitHub account through the isitslop GitHub App.
 * We read repository facts with the owner's own token: their rate limit, their
 * private repos, nothing shared. Tokens are encrypted at rest with TOKEN_KEY.
 */
import type { Env } from './env.ts';

const enc = new TextEncoder();
const dec = new TextDecoder();

export function githubEnabled(env: Env): boolean {
  return !!(env.GITHUB_APP_CLIENT_ID && env.GITHUB_APP_CLIENT_SECRET && env.TOKEN_KEY);
}

async function key(env: Env): Promise<CryptoKey> {
  const raw = Uint8Array.from((env.TOKEN_KEY ?? '').match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function seal(env: Env, plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(env), enc.encode(plain)));
  return `${b64(iv)}.${b64(ct)}`;
}

export async function open(env: Env, sealed: string): Promise<string | null> {
  try {
    const [iv, ct] = sealed.split('.');
    return dec.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(iv) }, await key(env), unb64(ct)));
  } catch {
    return null;
  }
}

/** Signed, short-lived state for the OAuth round trip. */
export async function signState(env: Env, payload: Record<string, unknown>): Promise<string> {
  const body = b64(enc.encode(JSON.stringify({ ...payload, exp: Date.now() + 10 * 60_000 })));
  const k = await crypto.subtle.importKey('raw', enc.encode(env.TOKEN_KEY!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(body))));
  return `${body}.${sig}`.replace(/\+/g, '-').replace(/\//g, '_');
}

export async function verifyState(env: Env, state: string): Promise<Record<string, unknown> | null> {
  const [body, sig] = state.replace(/-/g, '+').replace(/_/g, '/').split('.');
  if (!body || !sig) return null;
  const k = await crypto.subtle.importKey('raw', enc.encode(env.TOKEN_KEY!), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('HMAC', k, unb64(sig), enc.encode(body));
  if (!ok) return null;
  const payload = JSON.parse(dec.decode(unb64(body))) as Record<string, unknown>;
  if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
  return payload;
}

export type TokenSet = { accessToken: string; refreshToken: string | null; expiresAt: string | null };

async function tokenRequest(env: Env, params: Record<string, string>): Promise<TokenSet | string> {
  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json', 'user-agent': 'isitslop-bot/0.3' },
    body: JSON.stringify({ client_id: env.GITHUB_APP_CLIENT_ID, client_secret: env.GITHUB_APP_CLIENT_SECRET, ...params }),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!j.access_token) return j.error_description ?? j.error ?? 'token exchange failed';
  return {
    accessToken: j.access_token,
    refreshToken: j.refresh_token ?? null,
    expiresAt: j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null,
  };
}

export const exchangeCode = (env: Env, code: string) => tokenRequest(env, { code });
export const refreshTokens = (env: Env, refreshToken: string) => tokenRequest(env, { grant_type: 'refresh_token', refresh_token: refreshToken });

export async function githubUser(token: string): Promise<{ login: string; id: number } | null> {
  const r = await fetch('https://api.github.com/user', { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'isitslop-bot/0.3' } });
  if (!r.ok) return null;
  const j = (await r.json()) as { login: string; id: number };
  return { login: j.login, id: j.id };
}

/** Permission plus visibility. 'invisible' means the app cannot see the repo (not installed there, or no such repo). */
export async function repoInfo(token: string, owner: string, name: string): Promise<{ permission: 'admin' | 'push' | 'pull' | 'none'; isPrivate: boolean } | 'invisible'> {
  const r = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'isitslop-bot/0.3' } });
  if (r.status === 404) return 'invisible';
  if (!r.ok) return { permission: 'none', isPrivate: false };
  const j = (await r.json()) as { private?: boolean; permissions?: { admin?: boolean; push?: boolean; pull?: boolean } };
  const permission = j.permissions?.admin ? 'admin' : j.permissions?.push ? 'push' : j.permissions?.pull ? 'pull' : 'none';
  return { permission, isPrivate: !!j.private };
}

/** Does this token's user have push (or better) on the repo? Also tells us if the app can see it at all. */
export async function repoPermission(token: string, owner: string, name: string): Promise<'admin' | 'push' | 'pull' | 'none' | 'invisible'> {
  const r = await fetch(`https://api.github.com/repos/${owner}/${name}`, { headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'user-agent': 'isitslop-bot/0.3' } });
  if (r.status === 404) return 'invisible';
  if (!r.ok) return 'none';
  const j = (await r.json()) as { permissions?: { admin?: boolean; push?: boolean; pull?: boolean } };
  if (j.permissions?.admin) return 'admin';
  if (j.permissions?.push) return 'push';
  if (j.permissions?.pull) return 'pull';
  return 'none';
}
