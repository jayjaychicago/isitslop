import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { QUALITY_VERSION, MAX_POINTS, methodologyQuality } from '../heuristics/quality.ts';
import { methodologyPopularity } from '../heuristics/popularity.ts';
import { VERDICT_THRESHOLDS } from '../heuristics/verdict.ts';
import { TERMS_VERSION } from '../lib/env.ts';

export const methodology = new Hono<{ Bindings: Env }>();

/** Generated from the code, so the website always shows what the score is made of today. */
methodology.get('/methodology', (c) =>
  c.json({
    heuristicsVersion: QUALITY_VERSION,
    termsVersion: TERMS_VERSION,
    quality: {
      question: 'Quality: is this real, maintained work by more than one person over time?',
      source: 'Public GitHub repository signals that are expensive to fake. Stars and forks are not used. Sites are scored on the repo they link; no repo is zero.',
      maxPoints: MAX_POINTS,
      rules: methodologyQuality(),
    },
    popularity: { question: 'Popularity: do the people who find it actually use it?', ...methodologyPopularity() },
    verdict: {
      rule: 'Two words, one per axis. Quality below the cut is Slop, at or above is Craft. Popularity below the cut is Fringe, at or above is Popular. Nothing connected is Unknown, not zero. Connected and empty (no history, no visitors) is zero.',
      thresholds: VERDICT_THRESHOLDS,
      overall: 'The overall score is Popularity and Quality averaged, 0 to 100, higher is better. It is unknown if either half is unknown.',
    },
  }),
);
