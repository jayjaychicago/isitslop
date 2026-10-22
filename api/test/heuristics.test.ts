import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreQuality, RULES, MAX_POINTS, band, type RepoFacts } from '../src/heuristics/quality.ts';
import { scorePopularity, validatePopularity } from '../src/heuristics/popularity.ts';
import { verdict, overall } from '../src/heuristics/verdict.ts';
import { normalizeTarget } from '../src/lib/url.ts';

const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

const HEALTHY: RepoFacts = {
  fullName: 'a/b', createdAt: ago(900), pushedAt: ago(2), archived: false, isFork: false, defaultBranch: 'main', license: 'MIT',
  weeksWithCommits: 40, humansWithTwoPlusCommits: 6, issuesTotal: 80, issuesClosed: 70, issueAuthorsOutsideOwner: 25,
  releases: 20, lastReleaseAt: ago(30), hasWorkflows: true, hasTests: true, readmeWords: 900,
};
const FRESH: RepoFacts = {
  fullName: 'a/new', createdAt: ago(1), pushedAt: ago(0), archived: false, isFork: false, defaultBranch: 'main', license: 'MIT',
  weeksWithCommits: 1, humansWithTwoPlusCommits: 1, issuesTotal: 0, issuesClosed: 0, issueAuthorsOutsideOwner: 0,
  releases: 0, lastReleaseAt: null, hasWorkflows: true, hasTests: true, readmeWords: 400,
};

test('a long-lived, multi-contributor repo scores high; a day-old solo repo scores low', () => {
  const h = scoreQuality(HEALTHY);
  const f = scoreQuality(FRESH);
  assert.ok(h.score >= 85, `healthy=${h.score} ${JSON.stringify(h.signals.map((s) => [s.id, s.score]))}`);
  assert.ok(f.score < 30, `fresh=${f.score} ${JSON.stringify(f.signals.map((s) => [s.id, s.score]))}`);
});

test('archived repos are capped; every rule is described; weights sum to 100', () => {
  assert.ok(scoreQuality({ ...HEALTHY, archived: true }).score <= 20);
  for (const r of RULES) assert.ok(r.description.length > 20 && r.weight > 0, r.id);
  assert.equal(MAX_POINTS, 100);
  assert.equal(band(0, [[0, 0], [1, 1]]), 0);
  assert.equal(band(2, [[0, 0], [1, 1]]), 1);
});

test('popularity: thresholds and validation', () => {
  assert.equal(scorePopularity({ visitors: 50, activated: 10, returned: 5 }).score, 0);
  const strong = scorePopularity({ visitors: 1000, activated: 120, returned: 80 });
  const weak = scorePopularity({ visitors: 1000, activated: 3, returned: 0 });
  assert.ok(strong.score >= 90, String(strong.score));
  assert.ok(weak.score < 20, String(weak.score));
  assert.equal(typeof validatePopularity({ visitors: 10, activated: 20, returned: 0 }), 'string');
  assert.equal(typeof validatePopularity({ visitors: 10.5, activated: 1, returned: 0 }), 'string');
  assert.deepEqual(validatePopularity({ visitors: 100, activated: 10, returned: 2 }), { visitors: 100, activated: 10, returned: 2 });
});

test('verdict: both halves good is not slop, either bad is slop, nothing is unknown', () => {
  assert.equal(verdict(80, 80), 'not_slop');
  assert.equal(verdict(80, 30), 'slop');
  assert.equal(verdict(30, 80), 'slop');
  assert.equal(verdict(50, 70), 'mixed');
  assert.equal(verdict(95, 0), 'slop');
  assert.equal(overall(80, 40), 60);
  assert.equal(overall(80, 0), 40);
});

test('url normalisation', () => {
  assert.deepEqual(normalizeTarget('WWW.Example.com/'), { url: 'https://example.com', kind: 'site', domain: 'example.com' });
  assert.equal((normalizeTarget('https://github.com/foo/bar.git') as any).url, 'https://github.com/foo/bar');
  assert.equal((normalizeTarget('github.com/foo/bar') as any).repo.name, 'bar');
  assert.equal(typeof normalizeTarget('localhost:3000'), 'string');
  assert.equal(typeof normalizeTarget('10.0.0.1'), 'string');
  assert.equal(typeof normalizeTarget('github.com/onlyowner'), 'string');
  assert.equal(typeof normalizeTarget(''), 'string');
});
