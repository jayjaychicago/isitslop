import type { Verdict } from './types.ts';

export const VERDICT_THRESHOLDS = { notSlop: 60, slop: 40 };

/** Rotten Tomatoes style: both halves must be good to be "Not Slop"; either bad makes it "Slop". */
export function verdict(critics: number, people: number | null): Verdict {
  const { notSlop, slop } = VERDICT_THRESHOLDS;
  if (people === null) {
    if (critics >= notSlop) return 'not_slop';
    if (critics < slop) return 'slop';
    return 'mixed';
  }
  if (critics < slop || people < slop) return 'slop';
  if (critics >= notSlop && people >= notSlop) return 'not_slop';
  return 'mixed';
}

export function overall(critics: number, people: number | null): number {
  return people === null ? critics : Math.round((critics + people) / 2);
}
