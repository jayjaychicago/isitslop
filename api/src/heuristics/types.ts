export type Signal = {
  id: string;
  /** What this rule looks for and why it matters for product definition. Shown on /methodology. */
  description: string;
  /** Max points this rule can contribute. Negative for penalties. */
  weight: number;
  /** Returned score in [0, 1]; multiplied by weight. */
  score: number;
  /** Short human-readable evidence, e.g. matched phrases. */
  evidence: string[];
};

export type CriticsResult = {
  score: number; // 0..100
  signals: Signal[];
  confidence: 'low' | 'medium' | 'high';
  words: number;
  version: string;
};

export type PeopleInput = {
  visitors: number;
  activated: number;
  returned: number;
};

export type PeopleResult = {
  score: number | null; // null = not enough data
  conversion: number | null;
  returnRate: number | null;
  note: string;
  selfReported: true;
  version: string;
};

export type Verdict = 'not_slop' | 'mixed' | 'slop' | 'unrated';
