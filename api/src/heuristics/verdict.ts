import type { Verdict } from './types.ts';

/** Each axis is a single cut. Quality: Slop below, Craft at or above. Popularity: Fringe below, Popular at or above. */
export const VERDICT_THRESHOLDS = { craft: 50, popular: 50 };

/**
 * The verdict is two words, one per axis. An axis with nothing connected is
 * "unknown", not zero. Connected and empty (no users, no history) is zero.
 */
export function verdict(quality: number | null, popularity: number | null): Verdict {
  const q = quality === null ? 'unknown' : quality >= VERDICT_THRESHOLDS.craft ? 'craft' : 'slop';
  const p = popularity === null ? 'unknown' : popularity >= VERDICT_THRESHOLDS.popular ? 'popular' : 'fringe';
  return `${p}_${q}`;
}

/**
 * The sloppiness score: Popularity and Quality averaged, 0 to 100, higher is better.
 * Unknown (null) if either half is unknown, so a missing connection is never read as zero.
 */
export function overall(quality: number | null, popularity: number | null): number | null {
  return quality === null || popularity === null ? null : Math.round((quality + popularity) / 2);
}
