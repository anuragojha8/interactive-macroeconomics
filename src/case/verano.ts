/**
 * The case of Verano.
 *
 * A running case study, carried across all four chapters. Each part asks a
 * question the chapter's tools can answer, and no part can be answered by the
 * chapter before it.
 *
 * Verano is invented. That is deliberate and not a shortcut: a case built on a
 * real country would need real figures, and this project does not hand-type
 * figures (spec §5.7). Everything below is a *calibration* — a set of inputs —
 * and every answer in the text is computed from it by the same engine that runs
 * the chapters. Change a number here and the case rewrites itself.
 */
import type { VarId } from '../engine/types';

/** Verano's national accounts, in billions of veral per year. */
export const VERANO_ACCOUNTS: Record<VarId, number> = {
  C: 2100,
  I: 540,
  G: 600,
  NX: -216,
  T: 660,
  W: 1900,
  Pi: 464,
  nominalY: 3024,
  deflator: 100,
};

/**
 * The figure the ministry actually published for wages. It is fifty short, and
 * the discrepancy is the point of Part Two.
 */
export const VERANO_PUBLISHED: Record<VarId, number> = {
  ...VERANO_ACCOUNTS,
  W: 1850,
};

/** Verano's productive side: two million workers, and capital well below rest. */
export const VERANO_PRODUCTION: Record<VarId, number> = {
  A: 1.2,
  K: 4000,
  L: 2000,
};

/** Castellan, the neighbour: eight times the capital per worker, twice the productivity. */
export const CASTELLAN_PRODUCTION: Record<VarId, number> = {
  A: 2.4,
  K: 32000,
  L: 2000,
};

/** The same economy with the capital of the sovereign fund proposal added. */
export const VERANO_DOUBLED_CAPITAL: Record<VarId, number> = {
  ...VERANO_PRODUCTION,
  K: 8000,
};

/** Verano over time, before the National Investment Plan. */
export const VERANO_SOLOW: Record<VarId, number> = {
  ...VERANO_PRODUCTION,
  s: 0.18,
  d: 0.06,
};

/** The plan: raise the investment rate by ten points, permanently. */
export const VERANO_PLAN_RATE = 0.28;

/** The hurricane: two fifths of the capital stock, gone in a night. */
export const VERANO_AFTER_STORM: Record<VarId, number> = {
  ...VERANO_SOLOW,
  K: VERANO_PRODUCTION.K! * 0.6,
};

export interface CaseClaim {
  id: string;
  latex: string;
  answer: 'accounting' | 'assumption';
  because: string;
}

/** Six lines from the Finance Minister's briefing note, unlabelled. */
export const VERANO_BRIEFING: CaseClaim[] = [
  {
    id: 'v-output',
    latex: '\\text{Output} = C + I + G + NX',
    answer: 'accounting',
    because:
      'Every unit Verano produced was bought by a household, a firm, the state, or a foreigner. The line describes how the total was assembled.',
  },
  {
    id: 'v-saving',
    latex: '\\text{Households set aside } 18\\% \\text{ of income}',
    answer: 'assumption',
    because:
      'A claim about what Veranese households choose. It could have been any figure, and it will move when interest rates or expectations move.',
  },
  {
    id: 'v-deficit',
    latex: 'S_p + S_g - I = NX',
    answer: 'accounting',
    because:
      'Follows from the expenditure identity and the definitions of saving. The minister may dispute the cause of the deficit but not this equation.',
  },
  {
    id: 'v-investment',
    latex: '\\text{Firms invest more when } r \\text{ is higher}',
    answer: 'assumption',
    because:
      'A statement about how Veranese firms respond to the return on capital. Plausible, widely assumed, and not true by construction.',
  },
  {
    id: 'v-spending',
    latex: '\\text{Verano\u2019s imports are somebody\u2019s exports}',
    answer: 'accounting',
    because:
      'Two names for one transaction. The arrows have two ends, which is the whole content of the circular flow.',
  },
  {
    id: 'v-wages',
    latex: 'w = MPL',
    answer: 'assumption',
    because:
      'True where employers compete for workers. Verano has three large employers, so the assumption is doing real work and is worth contesting.',
  },
];
