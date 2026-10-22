import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { emailEnabled, sendEmail } from '../lib/ses.ts';
import { rateLimit } from '../lib/ratelimit.ts';
import { currentUser } from '../lib/session.ts';

export const SUPPORT_EMAIL = 'support@isitslop.org';

export const feedback = new Hono<{ Bindings: Env }>();

/**
 * POST /v1/feedback { message, email?, page? }
 * Emails the message to support@isitslop.org through SES. No storage, no account needed.
 * `website` is a honeypot: bots fill it, people never see it.
 */
feedback.post('/feedback', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as { message?: string; email?: string; page?: string; website?: string };
  if (body.website) return c.json({ ok: true }); // honeypot: pretend it worked
  const message = (body.message ?? '').trim();
  const email = (body.email ?? '').trim();
  const page = (body.page ?? '').trim().slice(0, 300);
  if (message.length < 5) return c.json({ error: 'say a little more' }, 400);
  if (message.length > 5000) return c.json({ error: 'at most 5000 characters' }, 400);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return c.json({ error: 'that email does not look right' }, 400);
  if (!emailEnabled(c.env)) return c.json({ error: 'email is not configured on this deployment' }, 503);

  const sql = db(c.env.DATABASE_URL);
  const ip = c.req.header('cf-connecting-ip') ?? 'unknown';
  if (!(await rateLimit(sql, `feedback:${ip}`, 5, 3600))) return c.json({ error: 'rate limited: at most 5 messages an hour' }, 429);
  const user = await currentUser(c, sql).catch(() => null);

  const text = [
    message,
    '',
    '--',
    `From: ${email || 'not given'}`,
    `GitHub: ${user ? `@${user.github_login}` : 'not signed in'}`,
    `Page: ${page || 'not given'}`,
    `IP: ${ip}`,
    `Sent: ${new Date().toISOString()}`,
  ].join('\n');
  const subject = `[isitslop feedback] ${message.replace(/\s+/g, ' ').slice(0, 60)}${message.length > 60 ? '…' : ''}`;
  const ok = await sendEmail(c.env, SUPPORT_EMAIL, subject, text, email || undefined);
  if (!ok) return c.json({ error: 'could not send right now, try again later' }, 502);
  return c.json({ ok: true });
});
