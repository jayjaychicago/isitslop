/**
 * Read-only analytics connections for the Popularity score.
 * Each provider answers the same two questions for the last 30 days:
 *   visitors   unique people
 *   returning  of those, how many came on at least two different days
 * Add a provider by implementing `AnalyticsProvider` and registering it in PROVIDERS.
 */
export type AnalyticsConfig = { apiKey: string; host?: string; projectId?: string; siteId?: string };
export type AnalyticsReading = { provider: string; visitors: number; returning: number; window: string; note?: string };

export type AnalyticsProvider = {
  id: string;
  name: string;
  /** Which config fields the owner must supply. */
  fields: { key: keyof AnalyticsConfig; label: string; placeholder: string; required: boolean }[];
  read: (cfg: AnalyticsConfig) => Promise<AnalyticsReading | string>;
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

export const PROVIDERS: Record<string, AnalyticsProvider> = { posthog, plausible };

export function providerList() {
  return Object.values(PROVIDERS).map((p) => ({ id: p.id, name: p.name, fields: p.fields }));
}
