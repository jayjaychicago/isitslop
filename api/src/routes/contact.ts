import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { emailEnabled, sendEmail } from '../lib/ses.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { SUPPORT_EMAIL } from './feedback.ts';

export const contact = new Hono<{ Bindings: Env }>();

/** Ask Cloudflare whether the Turnstile token the browser got is good. */
async function turnstileOk(secret: string, token: string, ip: string): Promise<boolean> {
  const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret, response: token, ...(ip !== 'unknown' ? { remoteip: ip } : {}) }),
  });
  const j = (await r.json().catch(() => ({}))) as { success?: boolean };
  return j.success === true;
}

/**
 * POST /contact { name, email, message, token }
 * The contact form: a Cloudflare Turnstile check, then the message goes to support@isitslop.org through
 * SES with the sender as reply-to. Nothing is stored. No account needed.
 */
contact.post('/contact', async (c) => {
  const b = (await c.req.json().catch(() => ({}))) as { name?: string; email?: string; message?: string; token?: string };
  const name = String(b.name ?? '').trim().slice(0, 120);
  const email = String(b.email ?? '').trim();
  const message = String(b.message ?? '').trim();
  const token = String(b.token ?? '');
  if (!name) return c.json({ error: 'your name is required' }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'that email does not look right' }, 400);
  if (message.length < 5) return c.json({ error: 'say a little more' }, 400);
  if (message.length > 5000) return c.json({ error: 'at most 5000 characters' }, 400);
  if (!c.env.TURNSTILE_SECRET_KEY) return c.json({ error: 'the contact form is not configured on this deployment' }, 503);
  if (!emailEnabled(c.env)) return c.json({ error: 'email is not configured on this deployment' }, 503);
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  if (!token || !(await turnstileOk(c.env.TURNSTILE_SECRET_KEY, token, ip))) return c.json({ error: 'the human check did not pass; reload and try again' }, 400);

  const sql = db(c.env.DATABASE_URL);
  if (!(await rateLimit(sql, `contact:${ip}`, 5, 3600))) return c.json({ error: 'rate limited: at most 5 messages an hour' }, 429);

  const text = [message, '', '--', `From: ${name} <${email}>`, `IP: ${ip}`, `Sent: ${new Date().toISOString()}`].join('\n');
  const subject = `[isitslop contact] ${name}: ${message.replace(/\s+/g, ' ').slice(0, 50)}${message.length > 50 ? '…' : ''}`;
  const ok = await sendEmail(c.env, SUPPORT_EMAIL, subject, text, email);
  if (!ok) return c.json({ error: 'could not send right now, try again later' }, 502);
  return c.json({ ok: true });
});
