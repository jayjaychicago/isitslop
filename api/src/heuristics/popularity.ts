/**
 * POPULARITY: do the people who find it actually use it?
 *
 * Read from the owner's connected analytics, never typed in. Two numbers for
 * the last 30 days, available from any analytics product:
 *   visitors   unique people who visited
 *   returning  of those, how many came on at least two different days
 *
 * Coming back is the cheapest honest definition of "using it". Returning rate
 * carries most of the weight; absolute reach adds the rest so that two friends
 * visiting daily does not look like a product.
 */
import type { PopularityInput, PopularityResult } from './types.ts';

export const POPULARITY_VERSION = '0.4.0';

/** Piecewise-linear bands. Values past the last point saturate at 1. */
const RETURN_BANDS: [number, number][] = [
  [0, 0],
  [0.1, 0.3],
  [0.25, 0.6],
  [0.4, 0.85],
  [0.6, 1],
];
/** log10(visitors): 100 -> 0, 1k -> 0.4, 10k -> 0.7, 100k -> 1 */
const REACH_BANDS: [number, number][] = [
  [2, 0],
  [3, 0.4],
  [4, 0.7],
  [5, 1],
];
export const RETURN_WEIGHT = 0.55;
export const REACH_WEIGHT = 0.45;

export function band(x: number, pts: [number, number][]): number {
  if (x <= pts[0][0]) return pts[0][1];
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return pts[pts.length - 1][1];
}

export function scorePopularity(p: PopularityInput): PopularityResult {
  const visitors = Math.max(0, p.visitors);
  const returning = Math.min(visitors, Math.max(0, p.returning));
  if (visitors === 0) return { score: 0, returningRate: 0, note: 'No visitors in the last 30 days.', version: POPULARITY_VERSION };
  const returningRate = returning / visitors;
  const score = Math.round(100 * (RETURN_WEIGHT * band(returningRate, RETURN_BANDS) + REACH_WEIGHT * band(Math.log10(visitors), REACH_BANDS)));
  return { score, returningRate, note: `${visitors.toLocaleString()} visitors, ${returning.toLocaleString()} came back on another day, read from ${p.provider}.`, version: POPULARITY_VERSION };
}

export function methodologyPopularity() {
  return {
    version: POPULARITY_VERSION,
    source: 'Read from the owner\'s connected analytics (Google Analytics, PostHog or Plausible in v0) for the last 30 days: unique visitors, and how many of them came on at least two different days.',
    weights: { returning: RETURN_WEIGHT, reach: REACH_WEIGHT },
    returnBands: RETURN_BANDS,
    reachBands: REACH_BANDS,
    missing: 'No analytics connected, or no visitors, is a popularity of 0. A thing nobody uses is slop, however well built.',
    caveat: 'Analytics keys are stored encrypted and used read-only at grading time. Google Analytics and others are open contributions.',
  };
}
