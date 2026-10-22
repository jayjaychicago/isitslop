/**
 * Ownership first. Nothing enters the index until someone proves a URL is theirs:
 * a repository by signing in with a GitHub account that can push to it, a site by a
 * DNS record, a well-known file, or an email to the domain. Pending site checks live in
 * `verifications` with the URL on them; the entry row is created the moment a check passes.
 */
import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db, type Sql } from '../lib/db.ts';
import { randomCode, randomToken, sha256 } from '../lib/crypto.ts';
import { lookupTxt } from '../lib/dns.ts';
import { fetchText } from '../lib/fetch.ts';
import { emailEnabled, sendEmail } from '../lib/ses.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { publicEntry, type EntryRow } from '../lib/entries.ts';
import { currentUser, type User } from '../lib/session.ts';
import { normalizeTarget, type Target } from '../lib/url.ts';
import { userGithubToken } from './github.ts';
import { repoInfo } from '../lib/github-auth.ts';

export const verify = new Hono<{ Bindings: Env }>();

export const EMAIL_LOCALPARTS = ['admin', 'webmaster', 'postmaster', 'hostmaster'];

type VerificationRow = {
  id: string;
  entry_id: string | null;
  url: string | null;
  domain: string | null;
  user_id: string | null;
  method: 'dns' | 'file' | 'email';
  token: string;
  email: string | null;
  code_hash: string | null;
  status: string;
  attempts: number;
  expires_at: string;
};

const ip = (c: { req: { header: (n: string) => string | undefined } }) => c.req.header('cf-connecting-ip') ?? 'unknown';

function instructions(method: string, domain: string, token: string, email?: string) {
  switch (method) {
    case 'dns':
      return { record: { type: 'TXT', name: `_isitslop.${domain}`, value: `isitslop-verify=${token}` }, text: `Add a TXT record at _isitslop.${domain} with the value isitslop-verify=${token}, then call check. DNS can take a few minutes to propagate.` };
    case 'file':
      return { file: { url: `https://${domain}/.well-known/isitslop.txt`, content: `isitslop-verify=${token}` }, text: `Serve a plain-text file at https://${domain}/.well-known/isitslop.txt containing isitslop-verify=${token}, then call check.` };
    case 'email':
      return { email, text: `A 6-digit code was sent to ${email}. Call check with the code within 24 hours.` };
  }
  return {};
}

/** Create the entry (or take over an existing one) for a proven owner. Returns the row and a fresh owner key. */
export async function ownEntry(sql: Sql, t: Target, u: User, extra: { repoPrivate?: boolean } = {}): Promise<{ entry: EntryRow; ownerKey: string }> {
  const ownerKey = `isk_${randomToken(24)}`;
  const hash = await sha256(ownerKey);
  const rows = (await sql`
    insert into entries (url, kind, domain, verified_at, owner_user_id, owner_key_hash, repo_private)
    values (${t.url}, ${t.kind}, ${t.domain}, now(), ${u.id}, ${hash}, ${extra.repoPrivate ?? false})
    on conflict (url) do update set
      verified_at = now(), owner_user_id = excluded.owner_user_id, owner_key_hash = excluded.owner_key_hash,
      repo_private = case when entries.kind = 'github' then excluded.repo_private else entries.repo_private end
    returning *
  `) as EntryRow[];
  return { entry: rows[0], ownerKey };
}

/**
 * Claim a repository: the signed-in GitHub account must have push access. That is the
 * ownership proof, and the entry is created in the same call. Sites go through /verify/start.
 */
verify.post('/claim', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  if (!(await rateLimit(sql, `claim:${ip(c)}`, 20, 3600))) return c.json({ error: 'rate limited' }, 429);
  const u = await currentUser(c, sql);
  if (!u) return c.json({ error: 'sign in with GitHub first' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const t = normalizeTarget(String(body.url ?? ''));
  if (typeof t === 'string') return c.json({ error: t }, 400);
  if (t.kind !== 'github' || !t.repo) return c.json({ error: 'sites are verified by DNS, file or email: POST /v1/verify/start', kind: t.kind }, 400);
  const token = await userGithubToken(c.env, sql, u);
  if (!token) return c.json({ error: 'your GitHub sign-in has expired; sign in again' }, 428);
  const info = await repoInfo(token, t.repo.owner, t.repo.name);
  if (info === 'invisible') return c.json({ error: `the Is It Slop app cannot see ${t.url}; install it on that account at https://github.com/apps/${c.env.GITHUB_APP_SLUG ?? 'is-it-slop'}/installations/new` }, 422);
  if (info.permission !== 'admin' && info.permission !== 'push') return c.json({ error: `${u.github_login} does not have push access to ${t.url}` }, 403);
  const { entry, ownerKey } = await ownEntry(sql, t, u, { repoPrivate: info.isPrivate });
  await sql`insert into verifications (entry_id, url, domain, user_id, method, token, status) values (${entry.id}, ${t.url}, ${t.domain}, ${u.id}, 'github', ${u.github_login}, 'verified')`;
  return c.json({ entry: publicEntry(entry), ownerKey, note: 'ownerKey is only needed for API use; the website uses your sign-in.' }, 201);
});

/** Start proving a site is yours. Nothing is indexed until the check passes. */
verify.post('/verify/start', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  if (!(await rateLimit(sql, `vstart:${ip(c)}`, 10, 3600))) return c.json({ error: 'rate limited' }, 429);
  const u = await currentUser(c, sql);
  if (!u) return c.json({ error: 'sign in with GitHub first' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const t = normalizeTarget(String(body.url ?? ''));
  if (typeof t === 'string') return c.json({ error: t }, 400);
  if (t.kind === 'github') return c.json({ error: 'repositories are claimed by signing in with GitHub: POST /v1/claim' }, 400);
  const method = String(body.method ?? '');
  const allowed = ['dns', 'file', 'email'];
  if (!allowed.includes(method)) return c.json({ error: `method must be one of ${allowed.join(', ')}` }, 400);

  const token = randomToken(16);
  let email: string | null = null;
  let codeHash: string | null = null;

  if (method === 'email') {
    if (!emailEnabled(c.env)) return c.json({ error: 'email verification is not configured on this deployment; use dns or file' }, 503);
    const local = String(body.email ?? '').split('@')[0].toLowerCase();
    if (!EMAIL_LOCALPARTS.includes(local)) return c.json({ error: `email must be one of ${EMAIL_LOCALPARTS.map((l) => `${l}@${t.domain}`).join(', ')}` }, 400);
    if (!(await rateLimit(sql, `vemail:${t.domain}`, 5, 86400))) return c.json({ error: 'too many emails sent to this domain today' }, 429);
    email = `${local}@${t.domain}`;
    const code = randomCode();
    codeHash = await sha256(code);
    const sent = await sendEmail(
      c.env,
      email,
      `isitslop.org verification code: ${code}`,
      `${u.github_login} on GitHub asked to claim ${t.domain} on isitslop.org.\n\nYour code: ${code}\n\nIt expires in 24 hours. If you did not request this, ignore this email and nothing happens.\n\n${c.env.PUBLIC_SITE_URL}/claim?url=${encodeURIComponent(t.domain)}`,
    );
    if (!sent) return c.json({ error: 'could not send email' }, 502);
  }

  const rows = (await sql`
    insert into verifications (url, domain, user_id, method, token, email, code_hash)
    values (${t.url}, ${t.domain}, ${u.id}, ${method}, ${token}, ${email}, ${codeHash})
    returning id, expires_at
  `) as { id: string; expires_at: string }[];

  return c.json({ verificationId: rows[0].id, url: t.url, method, expiresAt: rows[0].expires_at, ...instructions(method, t.domain, token, email ?? undefined) }, 201);
});

/** Check a pending site verification. On success the entry is created and owned by whoever started the check. */
verify.post('/verify/check', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  if (!(await rateLimit(sql, `vcheck:${ip(c)}`, 60, 3600))) return c.json({ error: 'rate limited' }, 429);
  const u = await currentUser(c, sql);
  if (!u) return c.json({ error: 'sign in with GitHub first' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const vid = String(body.verificationId ?? '');
  const rows = (await sql`select * from verifications where id = ${vid} and user_id = ${u.id} and url is not null`) as VerificationRow[];
  const v = rows[0];
  if (!v || !v.url || !v.domain) return c.json({ error: 'verification not found' }, 404);
  if (v.status !== 'pending') return c.json({ error: `verification is ${v.status}` }, 409);
  if (new Date(v.expires_at) < new Date()) {
    await sql`update verifications set status = 'expired' where id = ${v.id}`;
    return c.json({ error: 'verification expired, start again' }, 410);
  }

  const expected = `isitslop-verify=${v.token}`;
  let ok = false;
  let detail = '';
  switch (v.method) {
    case 'dns': {
      const txts = await lookupTxt(`_isitslop.${v.domain}`);
      ok = txts.some((t) => t.trim() === expected);
      detail = ok ? 'TXT record found' : `no matching TXT record at _isitslop.${v.domain} (found ${txts.length})`;
      break;
    }
    case 'file': {
      const text = await fetchText(`https://${v.domain}/.well-known/isitslop.txt`);
      ok = !!text && text.includes(expected);
      detail = ok ? 'file found' : text === null ? 'file not reachable' : 'file reachable but token not found';
      break;
    }
    case 'email': {
      if (v.attempts >= 5) return c.json({ error: 'too many attempts, start again' }, 429);
      await sql`update verifications set attempts = attempts + 1 where id = ${v.id}`;
      ok = (await sha256(String(body.code ?? '').trim())) === v.code_hash;
      detail = ok ? 'code matches' : 'wrong code';
      break;
    }
  }
  if (!ok) return c.json({ verified: false, detail }, 200);

  const t = normalizeTarget(v.url);
  if (typeof t === 'string') return c.json({ error: t }, 400);
  const { entry, ownerKey } = await ownEntry(sql, t, u);
  await sql`update verifications set status = 'verified', entry_id = ${entry.id} where id = ${v.id}`;
  return c.json({ verified: true, detail, ownerKey, entry: publicEntry(entry), note: 'You own this entry now. The ownerKey is only needed for API use.' });
});
