/**
 * Read-only analytics connections for the Popularity score.
 * Each provider answers the same two questions for the last 30 days:
 *   visitors   unique people
 *   returning  of those, how many came on at least two different days
 * Add a provider by implementing `AnalyticsProvider` and registering it in PROVIDERS.
 */
export type AnalyticsConfig = { apiKey: string; host?: string; projectId?: string; siteId?: string };
export type AnalyticsReading = { provider: string; visitors: number; returning: number; window: string; note?: string };

export type ProviderEnv = { GA_SERVICE_ACCOUNT_JSON?: string };

export type AnalyticsProvider = {
  id: string;
  name: string;
  /** Which config fields the owner must supply. */
  fields: { key: keyof AnalyticsConfig; label: string; placeholder: string; required: boolean }[];
  /** Text shown to the owner before the fields, e.g. which email to grant access to. */
  instructions?: (env: ProviderEnv) => string;
  read: (cfg: AnalyticsConfig, env: ProviderEnv) => Promise<AnalyticsReading | string>;
};

const UA = 'isitslop-bot/0.4 (+https://isitslop.org/methodology)';

const posthog: AnalyticsProvider = {
  id: 'posthog',
  name: 'PostHog',
  fields: [
    { key: 'apiKey', label: 'Personal API key (phx_…, scope query:read)', placeholder: 'phx_…', required: true },
    { key: 'projectId', label: 'Project ID (number in the project URL)', placeholder: '12345', required: true },
    { key: 'host', label: 'Host', placeholder: 'https://us.posthog.com', required: false },
  ],
  async read(cfg) {
    const host = (cfg.host || 'https://us.posthog.com').replace(/\/$/, '');
    const query = `
      SELECT count() AS visitors, countIf(days >= 2) AS returning
      FROM (
        SELECT person_id, count(DISTINCT toDate(timestamp)) AS days
        FROM events
        WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY person_id
      )`;
    const r = await fetch(`${host}/api/projects/${encodeURIComponent(cfg.projectId ?? '')}/query/`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json', 'user-agent': UA },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    });
    if (r.status === 401 || r.status === 403) return 'PostHog rejected the key (needs a personal API key with query:read on this project)';
    if (!r.ok) return `PostHog returned ${r.status}`;
    const j = (await r.json()) as { results?: [number, number][] };
    const row = j.results?.[0];
    if (!row) return 'PostHog returned no rows';
    return { provider: 'posthog', visitors: Number(row[0]) || 0, returning: Number(row[1]) || 0, window: '30d' };
  },
};

const plausible: AnalyticsProvider = {
  id: 'plausible',
  name: 'Plausible',
  fields: [
    { key: 'apiKey', label: 'Stats API key', placeholder: '…', required: true },
    { key: 'siteId', label: 'Site ID (your domain as shown in Plausible)', placeholder: 'example.com', required: true },
    { key: 'host', label: 'Host (self-hosted only)', placeholder: 'https://plausible.io', required: false },
  ],
  async read(cfg) {
    const host = (cfg.host || 'https://plausible.io').replace(/\/$/, '');
    const r = await fetch(`${host}/api/v2/query`, {
      method: 'POST',
      headers: { authorization: `Bearer ${cfg.apiKey}`, 'content-type': 'application/json', 'user-agent': UA },
      body: JSON.stringify({ site_id: cfg.siteId, metrics: ['visitors', 'visits'], date_range: '30d' }),
    });
    if (r.status === 401 || r.status === 403) return 'Plausible rejected the key';
    if (!r.ok) return `Plausible returned ${r.status}: ${(await r.text()).slice(0, 120)}`;
    const j = (await r.json()) as { results?: { metrics: number[] }[] };
    const m = j.results?.[0]?.metrics;
    if (!m) return 'Plausible returned no rows';
    const visitors = m[0] ?? 0;
    const visits = m[1] ?? 0;
    // Plausible has no returning-visitor metric; visits beyond one per visitor is the closest honest proxy.
    const returning = Math.min(visitors, Math.max(0, visits - visitors));
    return { provider: 'plausible', visitors, returning, window: '30d', note: 'Plausible has no returning-visitor metric; extra visits per visitor are used as the proxy.' };
  },
};

/* ---------------- Google Analytics 4 via a project-owned service account ---------------- */

function b64url(b: ArrayBuffer | Uint8Array): string {
  return btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function serviceAccount(env: ProviderEnv): { client_email: string; private_key: string } | null {
  try {
    return env.GA_SERVICE_ACCOUNT_JSON ? (JSON.parse(env.GA_SERVICE_ACCOUNT_JSON) as { client_email: string; private_key: string }) : null;
  } catch {
    return null;
  }
}

/** OAuth2 access token for the service account via a signed JWT. No user consent, no OAuth app. */
async function googleAccessToken(sa: { client_email: string; private_key: string }): Promise<string | string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = b64url(new TextEncoder().encode(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })));
  const pem = sa.private_key.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claims}`));
  const jwt = `${header}.${claims}.${b64url(sig)}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${jwt}`,
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; error_description?: string };
  return j.access_token ?? `google token error: ${j.error_description ?? r.status}`;
}

const ga4: AnalyticsProvider = {
  id: 'ga4',
  name: 'Google Analytics 4',
  fields: [{ key: 'projectId', label: 'GA4 property ID (Admin → Property details, a number)', placeholder: '123456789', required: true }],
  instructions: (env) => {
    const sa = serviceAccount(env);
    return sa
      ? `In Google Analytics, Admin → Property access management → Add users, add ${sa.client_email} with the Viewer role. Then enter your property ID.`
      : 'Google Analytics is not configured on this deployment.';
  },
  async read(cfg, env) {
    const sa = serviceAccount(env);
    if (!sa) return 'Google Analytics is not configured on this deployment';
    const token = await googleAccessToken(sa);
    if (token.startsWith('google token error')) return token;
    const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(cfg.projectId ?? '')}:runReport`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': UA },
      body: JSON.stringify({
        dateRanges: [{ startDate: '30daysAgo', endDate: 'yesterday' }],
        dimensions: [{ name: 'newVsReturning' }],
        metrics: [{ name: 'activeUsers' }],
      }),
    });
    if (r.status === 403) return `Google Analytics denied access: add ${sa.client_email} as Viewer on property ${cfg.projectId}`;
    if (r.status === 404) return `GA4 property ${cfg.projectId} not found (use the numeric property ID, not the measurement ID)`;
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
  },
};

export const PROVIDERS: Record<string, AnalyticsProvider> = { ga4, posthog, plausible };

export function providerList(env: ProviderEnv) {
  return Object.values(PROVIDERS).map((p) => ({ id: p.id, name: p.name, fields: p.fields, instructions: p.instructions?.(env) ?? null, available: p.id !== 'ga4' || !!serviceAccount(env) }));
}
