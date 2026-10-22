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
      question: 'Definition: does it say clearly what it is, why it needs to exist, who it is for, and what it is not?',
      source: 'The landing page HTML for sites, the README for GitHub repos. Fetched once at grading time.',
      maxPositive: MAX_POSITIVE,
      rules: methodologyCritics(),
    },
    people: { question: 'Usage: do the people who find it actually use it?', ...methodologyPeople() },
    verdict: {
      rule: 'Both halves at or above notSlop is Not slop. Either half below slop is Slop. Everything else is Mixed. No usage data counts as a usage score of 0, so an unused thing is Slop however well defined.',
      thresholds: VERDICT_THRESHOLDS,
    },
  }),
);
