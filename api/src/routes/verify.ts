import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { randomCode, randomToken, sha256 } from '../lib/crypto.ts';
import { lookupTxt } from '../lib/dns.ts';
import { fetchText, rawGithub } from '../lib/fetch.ts';
import { emailEnabled, sendEmail } from '../lib/ses.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { getEntry, publicEntry } from '../lib/entries.ts';

export const verify = new Hono<{ Bindings: Env }>();

export const EMAIL_LOCALPARTS = ['admin', 'webmaster', 'postmaster', 'hostmaster'];

type VerificationRow = {
  id: string;
  entry_id: string;
  method: 'dns' | 'file' | 'email' | 'repo_file';
  token: string;
  email: string | null;
  code_hash: string | null;
  status: string;
  attempts: number;
  expires_at: string;
};

function instructions(method: string, domain: string, token: string, url: string, email?: string) {
  switch (method) {
    case 'dns':
      return { record: { type: 'TXT', name: `_isitslop.${domain}`, value: `isitslop-verify=${token}` }, text: `Add a TXT record at _isitslop.${domain} with the value isitslop-verify=${token}, then call check. DNS can take a few minutes to propagate.` };
    case 'file':
      return { file: { url: `https://${domain}/.well-known/isitslop.txt`, content: `isitslop-verify=${token}` }, text: `Serve a plain-text file at https://${domain}/.well-known/isitslop.txt containing isitslop-verify=${token}, then call check.` };
    case 'repo_file':
      return { file: { path: '.isitslop', content: `isitslop-verify=${token}` }, text: `Commit a file named .isitslop to the root of the default branch of ${url} containing isitslop-verify=${token}, then call check.` };
    case 'email':
      return { email, text: `A 6-digit code was sent to ${email}. Call check with the code within 24 hours.` };
  }
  return {};
}

verify.post('/entries/:id/verify/start', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  if (!(await rateLimit(sql, `vstart:${ip}`, 10, 3600))) return c.json({ error: 'rate limited' }, 429);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  const body = await c.req.json().catch(() => ({}));
  const method = String(body.method ?? '');

  const allowed = e.kind === 'github' ? ['repo_file'] : ['dns', 'file', 'email'];
  if (!allowed.includes(method)) return c.json({ error: `method must be one of ${allowed.join(', ')}` }, 400);

  const token = randomToken(16);
  let email: string | null = null;
  let codeHash: string | null = null;

  if (method === 'email') {
    if (!emailEnabled(c.env)) return c.json({ error: 'email verification is not configured on this deployment; use dns or file' }, 503);
    const local = String(body.email ?? '').split('@')[0].toLowerCase();
    if (!EMAIL_LOCALPARTS.includes(local)) return c.json({ error: `email must be one of ${EMAIL_LOCALPARTS.map((l) => `${l}@${e.domain}`).join(', ')}` }, 400);
    if (!(await rateLimit(sql, `vemail:${e.domain}`, 5, 86400))) return c.json({ error: 'too many emails sent to this domain today' }, 429);
    email = `${local}@${e.domain}`;
    const code = randomCode();
    codeHash = await sha256(code);
    const sent = await sendEmail(
      c.env,
      email,
      `isitslop.org verification code: ${code}`,
      `Someone (probably you) asked to verify ownership of ${e.domain} on isitslop.org.\n\nYour code: ${code}\n\nIt expires in 24 hours. If you did not request this, ignore this email.\n\n${c.env.PUBLIC_SITE_URL}/s/${e.id}`,
    );
    if (!sent) return c.json({ error: 'could not send email' }, 502);
  }

  const rows = (await sql`
    insert into verifications (entry_id, method, token, email, code_hash)
    values (${e.id}, ${method}, ${token}, ${email}, ${codeHash})
    returning id, expires_at
  `) as { id: string; expires_at: string }[];

  return c.json({ verificationId: rows[0].id, method, expiresAt: rows[0].expires_at, ...instructions(method, e.domain, token, e.url, email ?? undefined) }, 201);
});

verify.post('/entries/:id/verify/check', async (c) => {
  const sql = db(c.env.DATABASE_URL);
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  if (!(await rateLimit(sql, `vcheck:${ip}`, 60, 3600))) return c.json({ error: 'rate limited' }, 429);
  const e = await getEntry(sql, c.req.param('id'));
  if (!e) return c.json({ error: 'not found' }, 404);
  const body = await c.req.json().catch(() => ({}));
  const vid = String(body.verificationId ?? '');
  const rows = (await sql`select * from verifications where id = ${vid} and entry_id = ${e.id}`) as VerificationRow[];
  const v = rows[0];
  if (!v) return c.json({ error: 'verification not found' }, 404);
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
      const txts = await lookupTxt(`_isitslop.${e.domain}`);
      ok = txts.some((t) => t.trim() === expected);
      detail = ok ? 'TXT record found' : `no matching TXT record at _isitslop.${e.domain} (found ${txts.length})`;
      break;
    }
    case 'file': {
      const body = await fetchText(`https://${e.domain}/.well-known/isitslop.txt`);
      ok = !!body && body.includes(expected);
      detail = ok ? 'file found' : body === null ? 'file not reachable' : 'file reachable but token not found';
      break;
    }
    case 'repo_file': {
      const m = e.url.match(/github\.com\/([^/]+)\/([^/]+)/)!;
      let found: string | null = null;
      for (const br of ['main', 'master']) {
        found = await fetchText(rawGithub(m[1], m[2], br, '.isitslop'));
        if (found) break;
      }
      ok = !!found && found.includes(expected);
      detail = ok ? '.isitslop file found' : found === null ? '.isitslop not found on main or master' : 'file found but token does not match';
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

  // Issue the owner key. Shown once. Re-verifying rotates it.
  const ownerKey = `isk_${randomToken(24)}`;
  const hash = await sha256(ownerKey);
  await sql`update verifications set status = 'verified' where id = ${v.id}`;
  const updated = (await sql`update entries set verified_at = now(), owner_key_hash = ${hash} where id = ${e.id} returning *`) as (typeof e)[];
  return c.json({ verified: true, detail, ownerKey, note: 'Store this key. It is shown once. It is required to request a grade or file an appeal. Re-verifying issues a new key and invalidates this one.', entry: publicEntry(updated[0]) });
});
