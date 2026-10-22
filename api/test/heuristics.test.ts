import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreQuality, RULES, MAX_POINTS, band, type RepoFacts } from '../src/heuristics/quality.ts';
import { scorePopularity } from '../src/heuristics/popularity.ts';
import { verdict, overall } from '../src/heuristics/verdict.ts';
import { normalizeTarget } from '../src/lib/url.ts';

const ago = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

const HEALTHY: RepoFacts = {
  fullName: 'a/b', createdAt: ago(900), pushedAt: ago(2), archived: false, isFork: false, defaultBranch: 'main', license: 'MIT',
  weeksWithCommits: 40, humansWithTwoPlusCommits: 6, issuesTotal: 80, issuesClosed: 70, issueAuthorsOutsideOwner: 25,
};
const FRESH: RepoFacts = {
  fullName: 'a/new', createdAt: ago(1), pushedAt: ago(0), archived: false, isFork: false, defaultBranch: 'main', license: 'MIT',
  weeksWithCommits: 1, humansWithTwoPlusCommits: 1, issuesTotal: 0, issuesClosed: 0, issueAuthorsOutsideOwner: 0,
};

test('a long-lived, multi-contributor repo scores high; a day-old solo repo scores zero', () => {
  const h = scoreQuality(HEALTHY);
  const f = scoreQuality(FRESH);
  assert.ok(h.score >= 80, `healthy=${h.score} ${JSON.stringify(h.signals.map((s) => [s.id, s.score]))}`);
  assert.equal(f.score, 0, `fresh=${f.score} ${JSON.stringify(f.signals.map((s) => [s.id, s.score]))}`);
  // Six months of solid pushes, solo, no issues: not yet good.
  const six = scoreQuality({ ...FRESH, createdAt: ago(185), weeksWithCommits: 26 });
  assert.ok(six.score < 40, `six months solo=${six.score}`);
  // A year of weekly pushes alone gets you to the edge of good; people and issues take you over.
  const year = scoreQuality({ ...FRESH, createdAt: ago(370), weeksWithCommits: 52 });
  assert.ok(year.score >= 55 && year.score < 65, `year solo=${year.score}`);
  assert.ok(scoreQuality({ ...FRESH, createdAt: ago(370), weeksWithCommits: 52, issuesTotal: 100 }).score > year.score);
});

test('archived repos are capped; every rule is described; weights sum to 100', () => {
  assert.ok(scoreQuality({ ...HEALTHY, archived: true }).score <= 20);
  for (const r of RULES) assert.ok(r.description.length > 20 && (r.kind === 'multiplier' || r.weight > 0), r.id);
  assert.equal(MAX_POINTS, 100);
  assert.equal(band(0, [[0, 0], [1, 1]]), 0);
  assert.equal(band(2, [[0, 0], [1, 1]]), 1);
});

test('popularity: returning rate carries most weight, reach the rest, nobody is zero', () => {
  const r = (visitors: number, returning: number) => scorePopularity({ provider: 'test', visitors, returning, window: '30d' }).score;
  assert.equal(r(0, 0), 0);
  assert.equal(r(46, 11), 0, 'a few dozen people, however loyal, is nobody');
  assert.ok(r(1000, 250) < 30, `1k users = ${r(1000, 250)}`);
  assert.ok(r(20000, 9000) >= 55 && r(20000, 9000) < 75, String(r(20000, 9000)));
  assert.ok(r(200000, 120000) >= 85, String(r(200000, 120000)));
  assert.ok(r(20000, 200) < r(20000, 9000) / 2, 'big reach nobody returns to scores half');
  assert.ok(r(5000, 2500) > r(5000, 500));
});

test('verdict: two words, one per axis', () => {
  assert.equal(verdict(80, 80), 'popular_craft');
  assert.equal(verdict(80, 30), 'fringe_craft');
  assert.equal(verdict(30, 80), 'popular_slop');
  assert.equal(verdict(49, 49), 'fringe_slop');
  assert.equal(verdict(95, 0), 'fringe_craft');
  assert.equal(verdict(null, 80), 'popular_unknown');
  assert.equal(verdict(20, null), 'unknown_slop');
  assert.equal(overall(80, null), null);
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
