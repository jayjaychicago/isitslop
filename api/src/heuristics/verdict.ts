import type { Verdict } from './types.ts';

export const VERDICT_THRESHOLDS = { notSlop: 60, slop: 40 };

/**
 * Both halves must be good to be "Not slop"; either bad makes it "Slop".
 * No usage data is not "unknown": a thing nobody uses is slop, however well
 * defined. Missing usage counts as zero.
 */
export function verdict(critics: number, people: number | null): Verdict {
  const { notSlop, slop } = VERDICT_THRESHOLDS;
  const usage = people ?? 0;
  if (critics < slop || usage < slop) return 'slop';
  if (critics >= notSlop && usage >= notSlop) return 'not_slop';
  return 'mixed';
}

export function overall(critics: number, people: number | null): number {
  return Math.round((critics + (people ?? 0)) / 2);
}
