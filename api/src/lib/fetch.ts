import { extractHtml, extractMarkdown, type Extracted } from '../heuristics/text.ts';
import type { Target } from './url.ts';

const UA = 'isitslop-bot/0.1 (+https://isitslop.org/methodology)';
const MAX_BYTES = 1_500_000;

/** raw.githubusercontent.com caches for ~5 minutes; a unique query string makes the fetch see the latest commit. */
export const rawGithub = (owner: string, name: string, branch: string, file: string) =>
  `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${file}?nocache=${Date.now()}`;

async function get(url: string, accept: string): Promise<{ ok: boolean; status: number; body: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept }, redirect: 'follow', signal: ctrl.signal });
    const body = (await r.text()).slice(0, MAX_BYTES);
    return { ok: r.ok, status: r.status, body };
  } catch (e) {
    return { ok: false, status: 0, body: '' };
  } finally {
    clearTimeout(t);
  }
}

export async function fetchTargetText(t: Target): Promise<{ extracted: Extracted; source: string; status: number } | { error: string }> {
  if (t.kind === 'github' && t.repo) {
    const { owner, name } = t.repo;
    for (const branch of ['main', 'master']) {
      for (const file of ['README.md', 'readme.md', 'README.MD', 'README', 'README.rst', 'README.txt']) {
        const src = rawGithub(owner, name, branch, file);
        const r = await get(src, 'text/plain');
        if (r.ok) return { extracted: extractMarkdown(r.body), source: src.replace(/\?nocache=\d+$/, ''), status: r.status };
      }
    }
    return { error: 'could not fetch README on main or master (private repos are not supported in v0)' };
  }
  const r = await get(t.url, 'text/html,application/xhtml+xml');
  if (!r.ok) return { error: `fetch failed with status ${r.status || 'network error'}` };
  return { extracted: extractHtml(r.body), source: t.url, status: r.status };
}

export async function fetchText(url: string): Promise<string | null> {
  const r = await get(url, 'text/plain,*/*');
  return r.ok ? r.body : null;
}
