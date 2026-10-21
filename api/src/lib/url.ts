export type Target = { url: string; kind: 'site' | 'github'; domain: string; repo?: { owner: string; name: string } };

const BLOCKED_HOSTS = /^(localhost|.*\.local|.*\.internal|\d{1,3}(\.\d{1,3}){3}|\[.*\])$/i;

/** Normalise a user-supplied URL into an index key. Returns a string error on failure. */
export function normalizeTarget(input: string): Target | string {
  let raw = (input ?? '').trim();
  if (!raw) return 'url is required';
  if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return 'not a valid URL';
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return 'only http(s) URLs';
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  if (!host.includes('.') || BLOCKED_HOSTS.test(host)) return 'not a public hostname';
  if (u.username || u.password) return 'credentials in URL not allowed';

  if (host === 'github.com') {
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length < 2) return 'github URL must be github.com/owner/repo';
    const owner = parts[0];
    const name = parts[1].replace(/\.git$/, '');
    if (!/^[\w.-]+$/.test(owner) || !/^[\w.-]+$/.test(name)) return 'invalid github repo path';
    return { url: `https://github.com/${owner}/${name}`, kind: 'github', domain: host, repo: { owner, name } };
  }

  // Sites are indexed at the origin level: the domain is what gets verified.
  const path = u.pathname.replace(/\/+$/, '');
  const url = `https://${host}${path}`;
  return { url, kind: 'site', domain: host };
}
