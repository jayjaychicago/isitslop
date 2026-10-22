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
  visitors: number;
  activated: number;
  returned: number;
};

export type PopularityResult = {
  score: number;
  conversion: number | null;
  returnRate: number | null;
  note: string;
  selfReported: true;
  version: string;
};

export type Verdict = 'not_slop' | 'mixed' | 'slop';
