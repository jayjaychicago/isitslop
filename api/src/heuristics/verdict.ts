import type { Verdict } from './types.ts';

/** Each axis is a single cut. Quality: Slop below, Craft at or above. Popularity: Fringe below, Popular at or above. */
export const VERDICT_THRESHOLDS = { craft: 50, popular: 50 };

/** The verdict is two words, one per axis. Missing data is zero, never "unknown". */
export function verdict(quality: number, popularity: number): Verdict {
  const q = quality >= VERDICT_THRESHOLDS.craft ? 'craft' : 'slop';
  const p = popularity >= VERDICT_THRESHOLDS.popular ? 'popular' : 'fringe';
  return `${p}_${q}` as Verdict;
}

export function overall(quality: number, popularity: number): number {
  return Math.round((quality + popularity) / 2);
}
