/**
 * PEOPLE: "Do the people who find it use it?"
 *
 * v0 is owner-attested. The verified owner reports three numbers for the last
 * 30 days. We do not trust them; we label them. Verified analytics connections
 * are the obvious next contribution (GA4, PostHog, Plausible, Stripe).
 *
 * Conversion carries most of the weight. Return rate is a sanity check so a
 * page that converts but is abandoned the next day does not pass.
 */
import type { PeopleInput, PeopleResult } from './types.ts';

export const PEOPLE_VERSION = '0.1.0';
export const MIN_VISITORS = 100;

/** Piecewise-linear bands. Rates above the last point saturate at 1. */
const CONVERSION_BANDS: [number, number][] = [
  [0, 0],
  [0.005, 0.2],
  [0.02, 0.5],
  [0.05, 0.8],
  [0.1, 1],
];
const RETURN_BANDS: [number, number][] = [
  [0, 0],
  [0.1, 0.3],
  [0.25, 0.6],
  [0.4, 0.85],
  [0.6, 1],
];
export const CONVERSION_WEIGHT = 0.7;
export const RETURN_WEIGHT = 0.3;

export function band(rate: number, bands: [number, number][]): number {
  if (rate <= bands[0][0]) return bands[0][1];
  for (let i = 1; i < bands.length; i++) {
    const [x0, y0] = bands[i - 1];
    const [x1, y1] = bands[i];
    if (rate <= x1) return y0 + ((rate - x0) / (x1 - x0)) * (y1 - y0);
  }
  return bands[bands.length - 1][1];
}

export function validatePeople(p: unknown): PeopleInput | string {
  if (!p || typeof p !== 'object') return 'people must be an object';
  const o = p as Record<string, unknown>;
  const n = (k: string) => {
    const v = o[k];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || !Number.isInteger(v)) return null;
    return v;
  };
  const visitors = n('visitors');
  const activated = n('activated');
  const returned = n('returned');
  if (visitors === null || activated === null || returned === null) return 'visitors, activated and returned must be non-negative integers';
  if (activated > visitors) return 'activated cannot exceed visitors';
  if (returned > activated) return 'returned cannot exceed activated';
  return { visitors, activated, returned };
}

export function scorePeople(p: PeopleInput): PeopleResult {
  if (p.visitors < MIN_VISITORS) {
    return {
      score: null,
      conversion: null,
      returnRate: null,
      note: `Fewer than ${MIN_VISITORS} visitors in 30 days: not enough data to rate.`,
      selfReported: true,
      version: PEOPLE_VERSION,
    };
  }
  const conversion = p.activated / p.visitors;
  const returnRate = p.activated ? p.returned / p.activated : 0;
  const score = Math.round(100 * (CONVERSION_WEIGHT * band(conversion, CONVERSION_BANDS) + RETURN_WEIGHT * band(returnRate, RETURN_BANDS)));
  return {
    score,
    conversion,
    returnRate,
    note: 'Self-reported by the verified owner. Not independently checked.',
    selfReported: true,
    version: PEOPLE_VERSION,
  };
}

export function methodologyPeople() {
  return {
    version: PEOPLE_VERSION,
    source: 'Owner-attested numbers for the last 30 days: visitors, activated (took the core action), returned (activated users who came back at least once).',
    minVisitors: MIN_VISITORS,
    weights: { conversion: CONVERSION_WEIGHT, return: RETURN_WEIGHT },
    conversionBands: CONVERSION_BANDS,
    returnBands: RETURN_BANDS,
    caveat: 'Numbers are labelled self-reported on every page. Verified analytics connections are an open contribution.',
  };
}
