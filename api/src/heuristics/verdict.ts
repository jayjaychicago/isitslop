import type { Verdict } from './types.ts';

export const VERDICT_THRESHOLDS = { notSlop: 60, slop: 40 };

/**
 * Both halves must be good to be "Not slop"; either bad makes it "Slop".
 * Missing data is not "unknown". No repo is no visible quality; no users is no
 * popularity. Both are zero.
 */
export function verdict(quality: number, popularity: number): Verdict {
  const { notSlop, slop } = VERDICT_THRESHOLDS;
  if (quality < slop || popularity < slop) return 'slop';
  if (quality >= notSlop && popularity >= notSlop) return 'not_slop';
  return 'mixed';
}

export function overall(quality: number, popularity: number): number {
  return Math.round((quality + popularity) / 2);
}
