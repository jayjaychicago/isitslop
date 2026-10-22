import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { db } from '../lib/db.ts';
import { randomToken, sha256 } from '../lib/crypto.ts';
import { seal, signState, verifyState } from '../lib/github-auth.ts';
import { ga4Report, listGa4Properties } from '../lib/analytics.ts';
import { getEntry } from '../lib/entries.ts';
import { currentUser } from '../lib/session.ts';

export const google = new Hono<{ Bindings: Env }>();

const SCOPE = 'https://www.googleapis.com/auth/analytics.readonly';

/** "Connect Google Analytics": owner key required, then off to Google. */
google.get('/google/login', async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID || !c.env.GOOGLE_CLIENT_SECRET || !c.env.TOKEN_KEY) return c.json({ error: 'Google OAuth not configured on this deployment' }, 503);
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, c.req.query('entry') ?? '');
  if (!e) return c.json({ error: 'entry not found' }, 404);
  const u = await currentUser(c, sql);
  const key = (c.req.query('ownerKey') ?? '').trim();
  const byKey = !!key && !!e.owner_key_hash && (await sha256(key)) === e.owner_key_hash;
  if (!byKey && (!u || e.owner_user_id !== u.id)) return c.json({ error: 'sign in as the owner' }, 401);
  const state = await signState(c.env, { entry: e.id, nonce: randomToken(8), google: true });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', c.env.GOOGLE_CLIENT_ID);
  url.searchParams.set('redirect_uri', `${c.env.OAUTH_CALLBACK_ORIGIN}/v1/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('state', state);
  return c.redirect(url.toString(), 302);
});

/**
 * Back from Google. Exchanges the code, lists the GA4 properties the account can see, and either
 * connects the only one, or sends the owner back to the page with the list to pick from.
 */
google.get('/google/callback', async (c) => {
  const state = await verifyState(c.env, c.req.query('state') ?? '');
  const code = c.req.query('code') ?? '';
  const back = (entryId: string, params: Record<string, string>) => {
    const u = new URL(`${c.env.PUBLIC_SITE_URL}/s/${entryId}`);
    u.hash = new URLSearchParams(params).toString();
    return c.redirect(u.toString(), 302);
  };
  if (!state || !state.google) return c.json({ error: 'invalid or expired state' }, 400);
  const sql = db(c.env.DATABASE_URL);
  const e = await getEntry(sql, String(state.entry));
  if (!e) return c.json({ error: 'entry not found' }, 404);
  if (!code) return back(e.id, { google: 'error', detail: c.req.query('error') ?? 'no code' });

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: c.env.GOOGLE_CLIENT_ID!, client_secret: c.env.GOOGLE_CLIENT_SECRET!, redirect_uri: `${c.env.OAUTH_CALLBACK_ORIGIN}/v1/google/callback`, grant_type: 'authorization_code' }),
  });
  const t = (await r.json().catch(() => ({}))) as { access_token?: string; refresh_token?: string; error_description?: string };
  if (!t.access_token || !t.refresh_token) return back(e.id, { google: 'error', detail: t.error_description ?? 'token exchange failed (no refresh token: revoke the app at myaccount.google.com/permissions and retry)' });

  const props = await listGa4Properties(t.access_token);
  if (!props.length) return back(e.id, { google: 'error', detail: 'that Google account has no GA4 properties' });

  // Park the refresh token on the entry (encrypted) with no property yet; the picker completes it.
  const cfg = { refreshToken: t.refresh_token, propertyId: props.length === 1 ? props[0].id : '', propertyName: props.length === 1 ? props[0].name : undefined };
  await sql`update entries set analytics_provider = 'ga4', analytics_config = ${await seal(c.env, JSON.stringify(cfg))} where id = ${e.id}`;
  if (props.length === 1) {
    const reading = await ga4Report(t.access_token, props[0].id);
    return back(e.id, { google: 'ok', property: props[0].name, ...(typeof reading === 'string' ? { detail: reading } : { visitors: String(reading.visitors), returning: String(reading.returning) }) });
  }
  return back(e.id, { google: 'pick', properties: JSON.stringify(props) });
});
