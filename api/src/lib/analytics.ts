/**
 * Popularity is read from the owner's Google Analytics 4 property, connected
 * with Google sign-in (read-only scope). Two numbers for the last 30 days:
 *   visitors   active users
 *   returning  of those, the ones Google classes as returning
 */
export type AnalyticsConfig = { refreshToken: string; propertyId: string };
export type AnalyticsReading = { provider: 'ga4'; visitors: number; returning: number; window: string };
export type GoogleEnv = { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string };

const UA = 'isitslop-bot/0.6 (+https://isitslop.org/methodology)';

export const googleEnabled = (env: GoogleEnv) => !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

/** Short-lived access token from the owner's refresh token. */
export async function googleUserToken(env: GoogleEnv, refreshToken: string): Promise<string | null> {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID ?? '', client_secret: env.GOOGLE_CLIENT_SECRET ?? '', refresh_token: refreshToken, grant_type: 'refresh_token' }),
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string };
  return j.access_token ?? null;
}

/**
 * Revoke the owner's grant at Google. Called when the owner disconnects or deletes the entry, so the app
 * disappears from their Google permissions page without them having to go there. Best effort: Google
 * answers 400 for a token it no longer knows, and the stored copy is erased regardless.
 */
export async function revokeGoogleToken(refreshToken: string): Promise<boolean> {
  try {
    const r = await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
      body: new URLSearchParams({ token: refreshToken }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** GA4 properties the signed-in account can see, for the picker. */
export async function listGa4Properties(token: string): Promise<{ id: string; name: string }[]> {
  const r = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries?pageSize=200', { headers: { authorization: `Bearer ${token}`, 'user-agent': UA } });
  if (!r.ok) return [];
  const j = (await r.json()) as { accountSummaries?: { displayName: string; propertySummaries?: { property: string; displayName: string }[] }[] };
  const out: { id: string; name: string }[] = [];
  for (const a of j.accountSummaries ?? []) for (const p of a.propertySummaries ?? []) out.push({ id: p.property.replace('properties/', ''), name: p.displayName }); // the property's own name only: the account name is not published
  return out;
}

export async function ga4Report(token: string, propertyId: string): Promise<AnalyticsReading | string> {
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': UA },
    body: JSON.stringify({ dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }], dimensions: [{ name: 'newVsReturning' }], metrics: [{ name: 'activeUsers' }] }),
  });
  if (r.status === 403) return `Google Analytics denied access to property ${propertyId}`;
  if (r.status === 404) return `GA4 property ${propertyId} not found`;
  if (!r.ok) return `Google Analytics returned ${r.status}: ${(await r.text()).slice(0, 120)}`;
  const j = (await r.json()) as { rows?: { dimensionValues: { value: string }[]; metricValues: { value: string }[] }[] };
  let visitors = 0;
  let returning = 0;
  for (const row of j.rows ?? []) {
    const n = Number(row.metricValues[0]?.value ?? 0);
    visitors += n;
    if (row.dimensionValues[0]?.value === 'returning') returning += n;
  }
  return { provider: 'ga4', visitors, returning, window: '30d' };
}

/** Read a connected property. */
export async function readGa4(env: GoogleEnv, cfg: AnalyticsConfig): Promise<AnalyticsReading | string> {
  if (!googleEnabled(env)) return 'Google Analytics is not configured on this deployment';
  const token = await googleUserToken(env, cfg.refreshToken);
  if (!token) return 'Google sign-in expired; connect Google Analytics again';
  return ga4Report(token, cfg.propertyId);
}
