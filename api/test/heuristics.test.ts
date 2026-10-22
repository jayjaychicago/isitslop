import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCritics, RULES, MAX_POSITIVE } from '../src/heuristics/critics.ts';
import { extractHtml, extractMarkdown } from '../src/heuristics/text.ts';
import { scorePeople, validatePeople, band } from '../src/heuristics/people.ts';
import { verdict, overall } from '../src/heuristics/verdict.ts';
import { normalizeTarget } from '../src/lib/url.ts';

const GOOD = `<html><head><title>Ledgerly: bookkeeping for freelance photographers</title>
<meta name="description" content="Ledgerly turns your Stripe and PayPal exports into a tax-ready ledger in 5 minutes, built for freelance photographers who hate spreadsheets."></head>
<body><h1>Bookkeeping for freelance photographers</h1>
<p>The problem is simple: you shoot 30 weddings a year and spend 40 hours doing books by hand because QuickBooks is built for accountants, not for you.</p>
<p>Ledgerly imports CSV exports from Stripe, PayPal and Square, categorises 95% of lines automatically, and produces a Schedule C summary as PDF.</p>
<h2>What it is not</h2><p>It is not an invoicing tool and it does not do payroll. Unlike QuickBooks, there are no 400 features you never use.</p>
<h2>Pricing</h2><p>$9 per month, free for your first 100 transactions. <a href="/pricing">Pricing</a> <a href="/changelog">Changelog</a></p>
<p>Version 2.3.1, last updated 2026-09-14. Used by 1,200 photographers.</p>
<p>${'Concrete words about CSV imports and Schedule C forms. '.repeat(12)}</p>
</body></html>`;

const SLOP = `<html><head><title>Nexora</title><meta name="description" content="Unlock your potential with Nexora!"></head>
<body><h1>Welcome to the future! 🚀🚀🚀</h1>
<p>Nexora is a revolutionary, cutting-edge, all-in-one platform that empowers you to seamlessly unlock limitless possibilities in today's fast-paced digital world! Say goodbye to the old way and say hello to the next generation! 🎉</p>
<p>Elevate your workflow like never before! Transform the way you work! Supercharge everything! Leverage synergy! 💡✨</p>
<p>${'Seamless. Effortless. Revolutionary! '.repeat(20)}</p>
</body></html>`;

test('a well-defined product scores well above a slop page', () => {
  const g = scoreCritics(extractHtml(GOOD));
  const s = scoreCritics(extractHtml(SLOP));
  assert.ok(g.score >= 60, `good=${g.score} ${JSON.stringify(g.signals.map((x) => [x.id, x.score]))}`);
  assert.ok(s.score < 40, `slop=${s.score} ${JSON.stringify(s.signals.map((x) => [x.id, x.score]))}`);
  assert.ok(g.score > s.score + 30);
});

test('every rule has a description and non-zero weight; score bounded', () => {
  for (const r of RULES) {
    assert.ok(r.description.length > 20, r.id);
    assert.notEqual(r.weight, 0, r.id);
  }
  assert.ok(MAX_POSITIVE > 0);
  const empty = scoreCritics(extractHtml(''));
  assert.ok(empty.score >= 0 && empty.score <= 100);
  assert.equal(empty.confidence, 'low');
});

test('markdown README extraction', () => {
  const x = extractMarkdown('# tool\n\nA CLI that converts CSV to Parquet for data engineers because pandas is too slow.\n\n## Install\n\n```sh\nnpm i tool\n```\n');
  assert.equal(x.title, 'tool');
  assert.ok(x.description.startsWith('A CLI that converts'));
  assert.ok(!x.text.includes('npm i tool'));
});

test('people: bands, thresholds and validation', () => {
  assert.equal(band(0, [[0, 0], [1, 1]]), 0);
  assert.equal(band(2, [[0, 0], [1, 1]]), 1);
  assert.equal(scorePeople({ visitors: 50, activated: 10, returned: 5 }).score, 0);
  const strong = scorePeople({ visitors: 1000, activated: 120, returned: 80 });
  const weak = scorePeople({ visitors: 1000, activated: 3, returned: 0 });
  assert.ok(strong.score! >= 90, String(strong.score));
  assert.ok(weak.score! < 20, String(weak.score));
  assert.equal(typeof validatePeople({ visitors: 10, activated: 20, returned: 0 }), 'string');
  assert.equal(typeof validatePeople({ visitors: 10.5, activated: 1, returned: 0 }), 'string');
  assert.deepEqual(validatePeople({ visitors: 100, activated: 10, returned: 2 }), { visitors: 100, activated: 10, returned: 2 });
});

test('verdict: both halves good is not slop, either bad is slop', () => {
  assert.equal(verdict(80, 80), 'not_slop');
  assert.equal(verdict(80, 30), 'slop');
  assert.equal(verdict(30, 80), 'slop');
  assert.equal(verdict(50, 70), 'mixed');
  assert.equal(verdict(70, null), 'slop', 'no users is slop however well defined');
  assert.equal(verdict(95, 0), 'slop');
  assert.equal(overall(80, null), 40);
  assert.equal(overall(80, 40), 60);
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
