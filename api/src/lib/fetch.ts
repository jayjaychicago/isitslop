const UA = 'isitslop-bot/0.3 (+https://isitslop.org/methodology)';

/** raw.githubusercontent.com caches for ~5 minutes; a unique query string makes the fetch see the latest commit. */
export const rawGithub = (owner: string, name: string, branch: string, file: string) =>
  `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${file}?nocache=${Date.now()}`;

/** Fetch a small text file (verification files). Null on any failure. */
export async function fetchText(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept: 'text/plain,*/*' }, redirect: 'follow', signal: ctrl.signal });
    if (!r.ok) return null;
    return (await r.text()).slice(0, 10_000);
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}
