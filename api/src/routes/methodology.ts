import { Hono } from 'hono';
import type { Env } from '../lib/env.ts';
import { HEURISTICS_VERSION, MAX_POSITIVE, methodologyCritics } from '../heuristics/critics.ts';
import { methodologyPeople } from '../heuristics/people.ts';
import { VERDICT_THRESHOLDS } from '../heuristics/verdict.ts';
import { TERMS_VERSION } from '../lib/env.ts';

export const methodology = new Hono<{ Bindings: Env }>();

/** Generated from the code, so the website always shows what the score is made of today. */
methodology.get('/methodology', (c) =>
  c.json({
    heuristicsVersion: HEURISTICS_VERSION,
    termsVersion: TERMS_VERSION,
    critics: {
      question: 'Is there a quality product definition? What it is, why it must exist, who it is for, what it is not.',
      source: 'The landing page HTML for sites, the README for GitHub repos. Fetched once at grading time.',
      maxPositive: MAX_POSITIVE,
      rules: methodologyCritics(),
    },
    people: { question: 'Do the people who find it actually use it?', ...methodologyPeople() },
    verdict: {
      rule: 'Both halves at or above notSlop is Not Slop. Either half below slop is Slop. Everything else is Mixed. Without People data, Critics alone decides and People shows as unrated.',
      thresholds: VERDICT_THRESHOLDS,
    },
  }),
);
