/**
 * QUALITY: is this real, maintained work by more than one person over time?
 *
 * Measured from the public GitHub repository with signals that are expensive
 * to fake: you cannot buy months of commit history, closed issues from other
 * people, or releases the way you can buy stars. Stars and forks are not used.
 *
 * Every signal is a plain function over GitHub REST responses. Add a signal,
 * describe it in one sentence, bump QUALITY_VERSION. No LLMs. No paid APIs.
 * A GITHUB_TOKEN secret (free, read-only public access) raises the rate limit
 * from 60 to 5000 requests per hour; without it, about 7 grades per hour.
 */
import type { QualityResult, Signal } from './types.ts';

export const QUALITY_VERSION = '0.3.0';

const UA = 'isitslop-bot/0.3 (+https://isitslop.org/methodology)';
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const days = (iso: string | null | undefined) => (iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : Infinity);

/** Piecewise-linear interpolation through [x, y] points; saturates at the ends. */
export function band(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
}

export type RepoFacts = {
  fullName: string;
  createdAt: string;
  pushedAt: string | null;
  archived: boolean;
  isFork: boolean;
  defaultBranch: string;
  license: string | null;
  weeksWithCommits: number; // of the last 52
  humansWithTwoPlusCommits: number;
  issuesTotal: number; // excluding pull requests
  issuesClosed: number;
  issueAuthorsOutsideOwner: number;
  releases: number;
  lastReleaseAt: string | null;
  hasWorkflows: boolean;
  hasTests: boolean;
  readmeWords: number;
};

type Rule = { id: string; description: string; weight: number; run: (f: RepoFacts) => { score: number; evidence: string[] } };

export const RULES: Rule[] = [
  {
    id: 'activity',
    description:
      'Sustained work over time: the share of the last 52 weeks with at least one commit, discounted for repos younger than six months. Months of history cannot be bought.',
    weight: 25,
    run: (f) => {
      const ageMonths = days(f.createdAt) / 30;
      const ageFactor = band(ageMonths, [[0, 0.2], [1, 0.35], [3, 0.6], [6, 1]]);
      const cadence = f.weeksWithCommits / 52;
      return { score: clamp01(cadence * ageFactor), evidence: [`${f.weeksWithCommits} of 52 weeks with commits`, `${ageMonths.toFixed(1)} months old`] };
    },
  },
  {
    id: 'contributors',
    description:
      'People other than a single author have put real work in: humans (not bots) with at least two commits. Sock puppets are possible but cost effort.',
    weight: 20,
    run: (f) => ({ score: band(f.humansWithTwoPlusCommits, [[0, 0], [1, 0.25], [2, 0.55], [4, 0.8], [8, 1]]), evidence: [`${f.humansWithTwoPlusCommits} humans with 2+ commits`] }),
  },
  {
    id: 'issues',
    description:
      'Other people file issues and they get resolved: share of non-PR issues closed, scaled by whether anyone outside the owner has filed one. Fewer than three issues is no signal and scores low.',
    weight: 20,
    run: (f) => {
      if (f.issuesTotal < 3) return { score: 0.15, evidence: [`${f.issuesTotal} issues: too few to tell`] };
      const ratio = f.issuesClosed / f.issuesTotal;
      const outside = band(f.issueAuthorsOutsideOwner, [[0, 0.4], [1, 0.7], [3, 1]]);
      return { score: clamp01(ratio * outside), evidence: [`${f.issuesClosed} of ${f.issuesTotal} issues closed`, `${f.issueAuthorsOutsideOwner} outside issue authors`] };
    },
  },
  {
    id: 'releases',
    description: 'Versions get cut and shipped: number of releases or tags, with a bonus if the latest is under six months old.',
    weight: 15,
    run: (f) => {
      const count = band(f.releases, [[0, 0], [1, 0.4], [3, 0.7], [10, 1]]);
      const recent = f.lastReleaseAt && days(f.lastReleaseAt) < 180 ? 1 : 0.6;
      const ev = [`${f.releases} releases/tags`];
      if (f.lastReleaseAt) ev.push(`latest ${Math.round(days(f.lastReleaseAt))} days ago`);
      return { score: clamp01(count * recent), evidence: ev };
    },
  },
  {
    id: 'tests_ci',
    description: 'Someone cared enough to automate checking it: a GitHub Actions workflow exists, and a test directory exists at the repo root.',
    weight: 10,
    run: (f) => ({ score: (f.hasWorkflows ? 0.5 : 0) + (f.hasTests ? 0.5 : 0), evidence: [f.hasWorkflows ? 'CI workflows present' : 'no CI workflows', f.hasTests ? 'tests directory present' : 'no tests directory'] }),
  },
  {
    id: 'docs_license',
    description: 'It can be understood and legally used: README of at least 300 words, and a license file GitHub recognises.',
    weight: 10,
    run: (f) => ({ score: (f.readmeWords >= 300 ? 0.6 : band(f.readmeWords, [[0, 0], [300, 0.6]])) + (f.license ? 0.4 : 0), evidence: [`README ~${f.readmeWords} words`, f.license ? `license: ${f.license}` : 'no license'] }),
  },
];

export const MAX_POINTS = RULES.reduce((a, r) => a + r.weight, 0);

export function scoreQuality(f: RepoFacts): QualityResult {
  const signals: Signal[] = RULES.map((r) => {
    const { score, evidence } = r.run(f);
    return { id: r.id, description: r.description, weight: r.weight, score, evidence };
  });
  let score = Math.round(clamp01(signals.reduce((a, s) => a + s.weight * s.score, 0) / MAX_POINTS) * 100);
  let note: string | undefined;
  if (f.archived) {
    score = Math.min(score, 20);
    note = 'Repository is archived: quality capped at 20.';
  }
  return { score, signals, repo: f.fullName, version: QUALITY_VERSION, note };
}

export function methodologyQuality() {
  return RULES.map((r) => ({ id: r.id, description: r.description, weight: r.weight }));
}

/* ---------------- GitHub REST collection ---------------- */

async function gh(path: string, token?: string): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = { 'user-agent': UA, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
  if (token) headers.authorization = `Bearer ${token}`;
  const r = await fetch(`https://api.github.com${path}`, { headers });
  if (r.status === 204) return { status: 204, json: null };
  const json = await r.json().catch(() => null);
  return { status: r.status, json };
}

type Issue = { pull_request?: unknown; state: string; user?: { login?: string; type?: string } };

/** Collect the facts a quality score needs. Roughly 8 requests. Returns a string error on failure. */
export async function collectRepoFacts(owner: string, name: string, token?: string): Promise<RepoFacts | string> {
  const repo = await gh(`/repos/${owner}/${name}`, token);
  if (repo.status === 404) return 'repository not found (private repos are not supported)';
  if (repo.status === 403 || repo.status === 429) return 'GitHub rate limit reached; try again later';
  if (repo.status !== 200 || !repo.json) return `GitHub returned ${repo.status}`;
  const r = repo.json as { full_name: string; created_at: string; pushed_at: string | null; archived: boolean; fork: boolean; default_branch: string; license: { spdx_id?: string; name?: string } | null; owner: { login: string } };

  // Commit cadence over the last 52 weeks. GitHub computes this lazily (202 = not ready yet).
  let weeks: { total: number }[] | null = null;
  for (let attempt = 0; attempt < 3 && !weeks; attempt++) {
    const s = await gh(`/repos/${owner}/${name}/stats/commit_activity`, token);
    if (s.status === 200 && Array.isArray(s.json)) weeks = s.json as { total: number }[];
    else if (s.status === 202) await new Promise((res) => setTimeout(res, 1500));
    else break;
  }
  let weeksWithCommits = 0;
  if (weeks) weeksWithCommits = weeks.filter((w) => w.total > 0).length;
  else {
    // Fallback: distinct ISO weeks among the last 100 commits in the past year.
    const since = new Date(Date.now() - 365 * 86_400_000).toISOString();
    const c = await gh(`/repos/${owner}/${name}/commits?per_page=100&since=${since}`, token);
    const set = new Set<string>();
    if (Array.isArray(c.json)) for (const x of c.json as { commit: { author: { date: string } } }[]) set.add(x.commit.author.date.slice(0, 10).replace(/-\d\d$/, ''));
    weeksWithCommits = Math.min(52, set.size * 4);
  }

  const contrib = await gh(`/repos/${owner}/${name}/contributors?per_page=100`, token);
  const humansWithTwoPlusCommits = Array.isArray(contrib.json)
    ? (contrib.json as { login: string; type: string; contributions: number }[]).filter((c) => c.type !== 'Bot' && !/\[bot\]$/.test(c.login) && c.contributions >= 2).length
    : 0;

  // True open/closed totals come from the search API; the newest 100 issues give the outside-author count.
  const q = encodeURIComponent(`repo:${owner}/${name} is:issue`);
  const [openRes, closedRes, issuesRes] = await Promise.all([
    gh(`/search/issues?q=${q}+is:open&per_page=1`, token),
    gh(`/search/issues?q=${q}+is:closed&per_page=1`, token),
    gh(`/repos/${owner}/${name}/issues?state=all&per_page=100&sort=created&direction=desc`, token),
  ]);
  const total = (x: { status: number; json: unknown }) => (x.status === 200 && x.json ? ((x.json as { total_count?: number }).total_count ?? 0) : 0);
  const issues = (Array.isArray(issuesRes.json) ? (issuesRes.json as Issue[]) : []).filter((i) => !i.pull_request && i.user?.type !== 'Bot');
  let issuesClosed = total(closedRes);
  let issuesTotal = issuesClosed + total(openRes);
  if (openRes.status !== 200 || closedRes.status !== 200) {
    // Search API unavailable (rate limited): fall back to the sample.
    issuesClosed = issues.filter((i) => i.state === 'closed').length;
    issuesTotal = issues.length;
  }
  const issueAuthorsOutsideOwner = new Set(issues.map((i) => i.user?.login).filter((l) => l && l.toLowerCase() !== r.owner.login.toLowerCase())).size;

  let releases = 0;
  let lastReleaseAt: string | null = null;
  const rel = await gh(`/repos/${owner}/${name}/releases?per_page=100`, token);
  if (Array.isArray(rel.json) && (rel.json as unknown[]).length) {
    const list = rel.json as { published_at: string | null; draft: boolean }[];
    releases = list.filter((x) => !x.draft).length;
    lastReleaseAt = list.map((x) => x.published_at).filter(Boolean).sort().pop() ?? null;
  } else {
    const tags = await gh(`/repos/${owner}/${name}/tags?per_page=100`, token);
    releases = Array.isArray(tags.json) ? (tags.json as unknown[]).length : 0;
  }

  const root = await gh(`/repos/${owner}/${name}/contents/?ref=${encodeURIComponent(r.default_branch)}`, token);
  const names = Array.isArray(root.json) ? (root.json as { name: string; type: string }[]) : [];
  const hasTests = names.some((n) => n.type === 'dir' && /^(test|tests|spec|specs|__tests__|e2e)$/i.test(n.name)) || names.some((n) => /\.(test|spec)\.[cm]?[jt]sx?$/.test(n.name));
  let hasWorkflows = false;
  if (names.some((n) => n.name === '.github')) {
    const wf = await gh(`/repos/${owner}/${name}/contents/.github/workflows?ref=${encodeURIComponent(r.default_branch)}`, token);
    hasWorkflows = Array.isArray(wf.json) && (wf.json as unknown[]).length > 0;
  }

  const readme = await gh(`/repos/${owner}/${name}/readme`, token);
  const readmeWords = readme.status === 200 && readme.json ? Math.round(((readme.json as { size: number }).size ?? 0) / 6) : 0;

  return {
    fullName: r.full_name,
    createdAt: r.created_at,
    pushedAt: r.pushed_at,
    archived: !!r.archived,
    isFork: !!r.fork,
    defaultBranch: r.default_branch,
    license: r.license?.spdx_id && r.license.spdx_id !== 'NOASSERTION' ? r.license.spdx_id : r.license?.name ?? null,
    weeksWithCommits,
    humansWithTwoPlusCommits,
    issuesTotal,
    issuesClosed,
    issueAuthorsOutsideOwner,
    releases,
    lastReleaseAt,
    hasWorkflows,
    hasTests,
    readmeWords,
  };
}
