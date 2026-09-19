/**
 * Chapter 3 — The Solow model.
 *
 * Chapter 2's model plus one accumulation relation and one consumption rule.
 * That is the entire chapter, and the reader is shown the diff.
 *
 * The `dt` factor in the accumulation relation is not decoration: without it the
 * expression adds a stock to a flow, which the unit checker rejects. That
 * rejection is the lesson.
 */
import { extendModel } from '../engine/model';
import type { Invariant, Model, Relation, Variable } from '../engine/types';
import {
  DIMENSIONLESS,
  MONEY_PER_PERSON_YEAR,
  MONEY_PER_YEAR_REAL,
  MONEY_REAL,
  PERSON,
  PER_YEAR,
  YEAR,
  u,
} from '../engine/units';
import { productionModel } from './production';

/** Restates an inherited relation with new notation, keeping its behaviour. */
export function restate(id: string, latex: string): Relation {
  const base = productionModel.relations.find((r) => r.id === id);
  if (!base) throw new Error(`Cannot restate unknown relation "${id}"`);
  return { ...base, latex };
}

const variables: Variable[] = [
  {
    // Restated: Chapter 2 wrote K̄ because nothing could change it. Now
    // something does, so the overbar comes off and the subscript goes on.
    ...productionModel.variables.find((v) => v.id === 'K')!,
    symbol: 'K_t',
    gloss:
      'Machines, buildings, infrastructure. Now a state variable: it changes ' +
      'because one relation accumulates it.',
  },
  {
    id: 's',
    symbol: '\\bar{s}',
    name: 'Investment rate',
    unit: DIMENSIONLESS,
    kind: 'parameter',
    domain: { min: 0, max: 1, step: 0.01 },
    format: 'percent',
    introducedIn: 'ch3-solow#saving',
    gloss: 'The fraction of output put back into building capital instead of consumed.',
  },
  {
    id: 'd',
    symbol: '\\bar{d}',
    name: 'Depreciation rate',
    unit: PER_YEAR,
    kind: 'parameter',
    domain: { min: 0, max: 1, step: 0.01 },
    format: 'percent',
    introducedIn: 'ch3-solow#depreciation',
    gloss: 'The fraction of the capital stock that wears out each year.',
  },
  {
    id: 'dt',
    symbol: '\\Delta t',
    name: 'Period length',
    unit: YEAR,
    kind: 'parameter',
    domain: { min: 0.01, max: 1, step: 0.01 },
    format: 'ratio',
    introducedIn: 'ch3-solow#accumulation',
    gloss: 'How long one period lasts. One year by default.',
  },
  {
    id: 'I',
    symbol: 'I',
    name: 'Investment',
    unit: MONEY_PER_YEAR_REAL,
    kind: 'flow',
    format: 'currency',
    introducedIn: 'ch3-solow#saving',
    gloss: 'Output devoted to building new capital. A flow.',
  },
  {
    id: 'depreciation',
    symbol: '\\bar{d}K',
    name: 'Depreciation',
    unit: MONEY_PER_YEAR_REAL,
    kind: 'flow',
    format: 'currency',
    introducedIn: 'ch3-solow#depreciation',
    gloss: 'Capital lost to wear each year. A flow out of the capital stock.',
  },
  {
    id: 'C',
    symbol: 'C',
    name: 'Consumption',
    unit: MONEY_PER_YEAR_REAL,
    kind: 'flow',
    format: 'currency',
    introducedIn: 'ch3-solow#consumption',
    gloss: 'What is left of output after investment. The point of the whole exercise.',
  },
  {
    id: 'c',
    symbol: 'c',
    name: 'Consumption per worker',
    unit: MONEY_PER_PERSON_YEAR,
    kind: 'derived',
    format: 'currency',
    introducedIn: 'ch3-solow#consumption',
    gloss: 'What steady-state welfare actually depends on.',
  },
];

const relations: Relation[] = [
  restate('production-function', 'Y_t = \\bar{A}\\,K_t^{\\alpha_K}\\,\\bar{L}^{\\alpha_L}'),
  restate('capital-per-worker', 'k_t = \\frac{K_t}{\\bar{L}}'),
  {
    id: 'investment',
    kind: 'behavior',
    target: 'I',
    inputs: ['s', 'Y'],
    latex: 'I = \\bar{s}Y',
    compute: (s) => s('s') * s('Y'),
    unitCheck: () => u(DIMENSIONLESS).mul(u(MONEY_PER_YEAR_REAL)),
    because: 'A fixed fraction of output is invested rather than consumed.',
    arguable:
      'A constant investment rate is an assumption, not a law. Households and firms ' +
      'choose how much to save, and that choice responds to interest rates, ' +
      'demographics, and expectations. A later chapter turns it into a choice rather than a constant.',
    citation: 'Jones 5e, ch. 5',
  },
  {
        id: 'depreciation-flow',
    kind: 'technology',
    target: 'depreciation',
    inputs: ['d', 'K'],
    latex: '\\text{depreciation} = \\bar{d}K',
    compute: (s) => s('d') * s('K'),
    unitCheck: () => u(PER_YEAR).mul(u(MONEY_REAL)),
        because: 'A fixed fraction of the existing capital stock wears out each year.',
    arguable:
      'Geometric depreciation at a constant rate. Buildings, vehicles and software do not wear ' +
      'out on the same schedule, and the rate is itself an estimate rather than an observation.',
  },
  {
        id: 'consumption',
    kind: 'identity',
    target: 'C',
    inputs: ['Y', 'I'],
    latex: 'C = Y - I',
    compute: (s) => s('Y') - s('I'),
    unitCheck: () => u(MONEY_PER_YEAR_REAL).sub(MONEY_PER_YEAR_REAL),
    because:
      'Consumption is the part of output that was not invested. With no government and no ' +
      'trade in this model, there is nowhere else for it to go.',
    citation: 'Jones 5e, ch. 5',
  },
  {
    id: 'consumption-per-worker',
    kind: 'definition',
    target: 'c',
    inputs: ['C', 'L'],
    latex: 'c = \\frac{C}{\\bar{L}}',
    compute: (s) => s('C') / s('L'),
    unitCheck: () => u(MONEY_PER_YEAR_REAL).div(u(PERSON)),
    because: 'Consumption per person is what living standards mean.',
  },
  {
    id: 'capital-accumulation',
    kind: 'accumulation',
    target: 'K',
    inputs: ['K', 'I', 'depreciation', 'dt'],
    latex: 'K_{t+1} = K_t + (I_t - \\bar{d}K_t)\\,\\Delta t',
    compute: (s) => s('K') + (s('I') - s('depreciation')) * s('dt'),
    // Without the `dt` factor this is `$ + $/year`, and the unit checker throws.
    unitCheck: () =>
      u(MONEY_REAL).add(u(MONEY_PER_YEAR_REAL).sub(u(MONEY_PER_YEAR_REAL)).mul(u(YEAR))),
    because: 'Next year’s capital is this year’s capital, plus what was built, minus what wore out.',
    citation: 'Jones 5e, ch. 5',
  },
];

const invariants: Invariant[] = [
  {
    id: 'output-uses',
        name: 'Output is either consumed or invested',
    latex: 'Y = C + I',
    check: (s) => ({ lhs: s('Y'), rhs: s('C') + s('I') }),
    tolerance: 1e-12,
    why:
      'Chapter 1’s expenditure identity, with government purchases and net exports set to ' +
      'zero as a modelling restriction. Consumption is derived as the residual, so this holds ' +
      'whatever rule sets investment \u2014 change the investment rule and the accounting survives.',
  },
];

export const solowModel: Model = extendModel(productionModel, {
  id: 'solow-v1',
  title: 'The Solow model',
  timing: 'dynamic',
  variables,
  relations,
  invariants,
  defaults: { s: 0.2, d: 0.1, dt: 1, K: 1000 },
  periods: 500,
});

/** Closed-form steady state, for checking the simulation against the algebra. */
export interface SolowSteadyState {
  K: number;
  Y: number;
  y: number;
  c: number;
  C: number;
}

export function solowSteadyState(p: {
  A: number;
  L: number;
  s: number;
  d: number;
  alphaK?: number;
  alphaL?: number;
}): SolowSteadyState {
  const alphaK = p.alphaK ?? 1 / 3;
  const alphaL = p.alphaL ?? 2 / 3;
  // s·A·K^αK·L^αL = d·K  ⇒  K* = (s·A·L^αL / d)^(1/(1−αK))
  const K = Math.pow((p.s * p.A * Math.pow(p.L, alphaL)) / p.d, 1 / (1 - alphaK));
  const Y = p.A * Math.pow(K, alphaK) * Math.pow(p.L, alphaL);
  const C = (1 - p.s) * Y;
  return { K, Y, y: Y / p.L, C, c: C / p.L };
}

/**
 * The investment rate that maximises steady-state consumption.
 *
 * Maximising `(1 − s)·s^(αK/(1−αK))` gives `s = αK`, so it is a property of the
 * technology rather than a number. Hard-coding it would let Chapter 2's
 * "break it" exercise silently invalidate it.
 */
export function goldenRuleRate(alphaK = 1 / 3): number {
  return alphaK;
}

export const GOLDEN_RULE_S = goldenRuleRate();
