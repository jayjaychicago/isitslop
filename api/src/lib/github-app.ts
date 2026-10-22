/**
 * The GitHub App's own identity, for reads that belong to nobody in particular
 * (anonymous /v1/preview). A short-lived JWT signed with the app's private key is
 * exchanged for an installation token: 5,000 calls an hour, owned by the app, not a person.
 * The token is cached for 50 minutes; GitHub issues them for 60.
 */
import type { Env } from './env.ts';
import type { Sql } from './db.ts';
import { cacheGet, cacheSet } from './cache.ts';

const UA = 'isitslop/0.1 (+https://isitslop.org)';
const TOKEN_CACHE_KEY = 'github:installation-token';

export const appTokenEnabled = (env: Env) => !!(env.GITHUB_APP_ID && env.GITHUB_APP_PRIVATE_KEY);

const b64url = (b: Uint8Array | string) =>
  btoa(typeof b === 'string' ? b : String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/** DER length prefix. */
function derLen(n: number): number[] {
  if (n < 0x80) return [n];
  const bytes: number[] = [];
  for (let x = n; x > 0; x >>= 8) bytes.unshift(x & 0xff);
  return [0x80 | bytes.length, ...bytes];
}

/**
 * GitHub hands out PKCS#1 keys ("BEGIN RSA PRIVATE KEY"); WebCrypto only imports PKCS#8.
 * Wrapping is a fixed header: SEQ { INT 0, SEQ { OID rsaEncryption, NULL }, OCTET STRING { pkcs1 } }.
 */
export function pemToPkcs8(pem: string): Uint8Array {
  const body = pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  if (!/BEGIN RSA PRIVATE KEY/.test(pem)) return der; // already PKCS#8
  const algo = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00];
  const octet = [0x04, ...derLen(der.length)];
  const inner = 3 + algo.length + octet.length + der.length; // INT 0 is 3 bytes
  return Uint8Array.from([0x30, ...derLen(inner), 0x02, 0x01, 0x00, ...algo, ...octet, ...der]);
}

export async function appJwt(appId: string, pem: string, now = Math.floor(Date.now() / 1000)): Promise<string> {
  const key = await crypto.subtle.importKey('pkcs8', pemToPkcs8(pem), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iat: now - 60, exp: now + 9 * 60, iss: appId }));
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`)));
  return `${header}.${payload}.${b64url(sig)}`;
}

/** An installation token for the app, or null when the app key is not configured or GitHub refuses. */
export async function installationToken(env: Env, sql: Sql): Promise<string | null> {
  if (!appTokenEnabled(env)) return null;
  const cached = await cacheGet<{ token: string }>(sql, TOKEN_CACHE_KEY);
  if (cached) return cached.token;

  const jwt = await appJwt(env.GITHUB_APP_ID!, env.GITHUB_APP_PRIVATE_KEY!);
  const headers = { authorization: `Bearer ${jwt}`, accept: 'application/vnd.github+json', 'user-agent': UA, 'x-github-api-version': '2022-11-28' };
  const list = await fetch('https://api.github.com/app/installations?per_page=100', { headers });
  if (!list.ok) return null;
  const installs = (await list.json()) as { id: number; account?: { login?: string } }[];
  const want = (env.GITHUB_APP_INSTALL_ACCOUNT ?? '').toLowerCase();
  const inst = installs.find((i) => i.account?.login?.toLowerCase() === want) ?? installs[0];
  if (!inst) return null;

  const r = await fetch(`https://api.github.com/app/installations/${inst.id}/access_tokens`, { method: 'POST', headers });
  if (!r.ok) return null;
  const j = (await r.json()) as { token: string };
  await cacheSet(sql, TOKEN_CACHE_KEY, { token: j.token }, 50 * 60);
  return j.token;
}
