/**
 * CRITICS: "Is there a quality product definition?"
 *
 * In a world where AI can deliver any spec, the hard part is the definition:
 * what it is, why it must exist, who it is for, and what it deliberately is not.
 * These rules look for that definition in the landing page or README text.
 *
 * Every rule is a plain function from extracted text to a score in [0, 1] plus
 * evidence. Add a rule, give it a description, bump HEURISTICS_VERSION.
 * No LLMs. No paid APIs. If you cannot explain the rule in two sentences, it
 * does not belong here.
 */
import type { CriticsResult, Signal } from './types.ts';
import type { Extracted } from './text.ts';

export const HEURISTICS_VERSION = '0.1.0';

type Rule = {
  id: string;
  description: string;
  weight: number;
  run: (x: Extracted, lead: string) => { score: number; evidence: string[] };
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function matches(re: RegExp, s: string, max = 5): string[] {
  const out: string[] = [];
  for (const m of s.matchAll(re)) {
    out.push(m[0].trim());
    if (out.length >= max) break;
  }
  return out;
}

const WHY = /\b(because|the problem (is|with)|problem:|why (we|i|this|it)|so (that )?you (can|don't|never)|instead of|without (having to|needing)|tired of|sick of|struggl\w+|painful|pain point|frustrat\w+|hard to|too (slow|expensive|complicated|hard)|shouldn'?t have to|manually|by hand|wastes? (time|hours|money)|nobody (wants|likes)|every(one|body) (hates|struggles))\b/gi;
const WHO = /\b(for (indie|solo|small|busy|non-technical|technical|early-stage)?\s?(developers|devs|engineers|teams|founders|designers|marketers|writers|students|teachers|researchers|freelancers|agencies|creators|makers|startups|enterprises|families|parents|doctors|lawyers|nurses|musicians|photographers|gamers|ops|sres|data scientists|analysts|pms|product managers|sales|recruiters|clinics|restaurants|shops|landlords|tenants|nonprofits)|built for|designed for|made for|if you('re| are) (a |an )?\w+|whether you('re| are)|aimed at|intended for|target(ed|s) (at )?\w+ users)\b/gi;
const NOT_FOR = /\b(not (for|a|an|meant|intended|designed)|isn'?t (for|a|an|meant)|we don'?t|doesn'?t (try|do|support)|out of scope|limitations?|known issues|non-goals?|trade-?offs?|unlike|vs\.?|compared to|alternative to|instead of)\b/gi;
const PROOF = /\b(changelog|release notes|roadmap|v\d+\.\d+(\.\d+)?|version \d|last updated|updated (on )?\w+ \d{1,2},? \d{4}|\d{4}-\d{2}-\d{2}|docs|documentation|api reference|case stud(y|ies)|used by|trusted by|customers?|testimonials?|\d[\d,.]*\s?(k|m|\+)? (users|developers|teams|companies|downloads|stars|installs|customers))\b/gi;
const PRICING = /\b(pricing|price|\$\d+|free (plan|tier|forever)|per (month|seat|user)|\/mo\b|monthly|annual(ly)?|open[- ]source|mit licen[cs]e|apache|gpl|agpl|self-host)\b/gi;
const SLOP = /\b(revolutioni[sz]e|revolutionary|seamless(ly)?|cutting[- ]edge|state[- ]of[- ]the[- ]art|unlock (the|your)|empower(s|ing)?|leverag(e|es|ing)|game[- ]chang(er|ing)|next[- ]gen(eration)?|supercharge|effortless(ly)?|in today'?s (fast[- ]paced|digital|modern)|elevate (your|the)|transform (the way|your)|unleash|the ultimate|all[- ]in[- ]one (solution|platform)|delve|robust (solution|platform)|streamline (your|the)|take .{0,30} to the next level|like never before|limitless|endless possibilities|synerg(y|ies)|best[- ]in[- ]class|world[- ]class|10x your|your (one[- ]stop|go[- ]to)|say goodbye to|say hello to|look no further|we'?ve got you covered|whether you'?re a .{0,40} or a)\b/gi;
const PARKED = /\b(this domain (is|may be) for sale|buy this domain|domain parking|coming soon|under construction|lorem ipsum|hello world|welcome to (nginx|apache)|it works!|default web page|site is being built|stay tuned|launching soon)\b/gi;
const SPECIFIC = /\b(\d[\d,.]*\s?(ms|s|sec|seconds?|min|minutes?|hours?|days?|%|x|mb|gb|kb|req|requests?|rows?|files?|users?|lines?|tokens?|per))|\b(postgres(ql)?|sqlite|redis|kubernetes|docker|terraform|aws|gcp|azure|react|next\.?js|vue|svelte|rust|go|python|typescript|javascript|swift|kotlin|graphql|rest api|webhook|cli|sdk|csv|json|pdf|markdown|excel|notion|slack|github|stripe|shopify|figma|chrome extension|ios|android|mac|windows|linux)\b/gi;

export const RULES: Rule[] = [
  {
    id: 'what',
    description:
      'There is a clear one-line statement of what this is. We look at the title, meta description and first heading: present, between 15 and 220 characters, and not just a brand name.',
    weight: 20,
    run: (x) => {
      const candidates = [x.description, x.headings[0] ?? '', x.title].filter(Boolean);
      const good = candidates.filter((c) => c.length >= 15 && c.length <= 220 && c.split(/\s+/).length >= 4);
      if (!good.length) return { score: candidates.length ? 0.25 : 0, evidence: candidates.slice(0, 2) };
      const best = good[0];
      const hasVerb = /\b(is|are|lets|helps|makes|turns|builds|tracks|finds|sends|runs|generates|converts|monitors|manages|replaces|automates|connects|stores|syncs|teaches|measures|scores|grades)\b/i.test(best);
      return { score: hasVerb ? 1 : 0.7, evidence: [best] };
    },
  },
  {
    id: 'why',
    description:
      'There is a stated reason it needs to exist: a problem, a pain, a "because", an "instead of". Definition without a why is a feature list.',
    weight: 20,
    run: (_x, lead) => {
      const ev = matches(WHY, lead);
      return { score: clamp01(ev.length / 2), evidence: ev };
    },
  },
  {
    id: 'who',
    description:
      'It names who it is for. "For everyone" is for no one. We look for an explicit audience ("for indie developers", "built for clinics", "if you are a landlord").',
    weight: 15,
    run: (_x, lead) => {
      const ev = matches(WHO, lead);
      return { score: clamp01(ev.length / 1.5), evidence: ev };
    },
  },
  {
    id: 'specificity',
    description:
      'The text contains concrete things: numbers with units, named technologies, formats, platforms. Vague text is a symptom of a vague definition. Measured as specific terms per 100 words, saturating at 3.',
    weight: 15,
    run: (x) => {
      const ev = matches(SPECIFIC, x.text, 8);
      const total = [...x.text.matchAll(SPECIFIC)].length;
      const per100 = x.words ? (total / x.words) * 100 : 0;
      return { score: clamp01(per100 / 3), evidence: ev };
    },
  },
  {
    id: 'scope',
    description:
      'It says what it is not, what it is compared to, or what it costs. Trade-offs, limitations, "unlike X", pricing and license are all evidence that someone made decisions.',
    weight: 10,
    run: (x, lead) => {
      const ev = [...matches(NOT_FOR, lead, 3), ...matches(PRICING, x.text, 3)];
      const hasPricingLink = x.links.some((l) => /pricing|plans|license/.test(l));
      if (hasPricingLink) ev.push('link: pricing');
      return { score: clamp01(ev.length / 2), evidence: ev };
    },
  },
  {
    id: 'proof',
    description:
      'Signs that it is alive and used: changelog, roadmap, version numbers, dates, docs, named customers or user counts. These are cheap to check and expensive to fake for long.',
    weight: 10,
    run: (x) => {
      const ev = matches(PROOF, x.text, 4);
      const links = x.links.filter((l) => /changelog|releases|roadmap|docs|documentation|blog/.test(l));
      if (links.length) ev.push(`links: ${[...new Set(links.map((l) => l.match(/changelog|releases|roadmap|docs|documentation|blog/)![0]))].join(', ')}`);
      return { score: clamp01(ev.length / 3), evidence: ev };
    },
  },
  {
    id: 'hygiene',
    description:
      'Basic sanity: the page loaded, has a title, has at least 80 words of real text, and is not a parked or placeholder page.',
    weight: 10,
    run: (x) => {
      const ev: string[] = [];
      let s = 0;
      if (x.title) s += 0.3; else ev.push('no <title>');
      if (x.words >= 80) s += 0.4; else ev.push(`only ${x.words} words`);
      const parked = matches(PARKED, x.text, 2);
      if (!parked.length) s += 0.3; else ev.push(...parked.map((p) => `placeholder: "${p}"`));
      return { score: clamp01(s), evidence: ev };
    },
  },
  {
    id: 'slop_language',
    description:
      'Penalty for marketing filler that says nothing: "seamless", "revolutionize", "unlock your potential", "in today\'s fast-paced world", "say goodbye to". Counted per 100 words; 1.5 per 100 words is the full penalty. Also penalises heavy emoji and exclamation use.',
    weight: -20,
    run: (x) => {
      const hits = [...x.text.matchAll(SLOP)];
      const ev = hits.slice(0, 6).map((m) => m[0]);
      const per100 = x.words ? (hits.length / x.words) * 100 : 0;
      const emoji = (x.text.match(/\p{Extended_Pictographic}/gu) ?? []).length;
      const bangs = (x.text.match(/!/g) ?? []).length;
      const emojiPer100 = x.words ? (emoji / x.words) * 100 : 0;
      const bangPer100 = x.words ? (bangs / x.words) * 100 : 0;
      if (emojiPer100 > 1) ev.push(`${emoji} emoji`);
      if (bangPer100 > 1) ev.push(`${bangs} exclamation marks`);
      const score = clamp01(per100 / 1.5) * 0.7 + clamp01(emojiPer100 / 3) * 0.15 + clamp01(bangPer100 / 3) * 0.15;
      return { score: clamp01(score), evidence: ev };
    },
  },
];

export const MAX_POSITIVE = RULES.filter((r) => r.weight > 0).reduce((a, r) => a + r.weight, 0);

export function scoreCritics(x: Extracted): CriticsResult {
  // The "lead" is the top of the page: where a definition lives if it exists at all.
  const lead = [x.title, x.description, ...x.headings.slice(0, 6), x.text.split(/\s+/).slice(0, 400).join(' ')].join(' \n ');
  const signals: Signal[] = RULES.map((r) => {
    const { score, evidence } = r.run(x, lead);
    return { id: r.id, description: r.description, weight: r.weight, score, evidence };
  });
  const raw = signals.reduce((a, s) => a + s.weight * s.score, 0);
  const score = Math.round(clamp01(raw / MAX_POSITIVE) * 100);
  const confidence = x.words < 80 ? 'low' : x.words < 300 ? 'medium' : 'high';
  return { score, signals, confidence, words: x.words, version: HEURISTICS_VERSION };
}

export function methodologyCritics() {
  return RULES.map((r) => ({ id: r.id, description: r.description, weight: r.weight }));
}
