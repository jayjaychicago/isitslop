export type Signal = {
  id: string;
  /** What this signal measures and why it is hard to fake. Shown on /methodology. */
  description: string;
  /** Max points this signal can contribute. */
  weight: number;
  /** Returned score in [0, 1]; multiplied by weight. */
  score: number;
  /** Short human-readable evidence, e.g. "31 of 52 weeks with commits". */
  evidence: string[];
};

export type QualityResult = {
  score: number; // 0..100
  signals: Signal[];
  repo: string;
  version: string;
  note?: string;
};

export type PopularityInput = {
  provider: string;
  visitors: number;
  returning: number;
  window: string;
};

export type PopularityResult = {
  score: number;
  returningRate: number;
  note: string;
  version: string;
};

export type Verdict = 'fringe_slop' | 'popular_slop' | 'fringe_craft' | 'popular_craft';
