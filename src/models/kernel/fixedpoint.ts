/**
 * Chapter 0, P5 — market clearing as a fixed point.
 *
 * One price, two schedules, and an adjustment rule. The price stops moving when
 * excess demand is zero, which is a fixed point and nothing more mysterious than
 * that. Turn the adjustment speed up far enough and it never converges — worth
 * seeing, because "the market clears" is an assumption about a process, not a
 * guarantee.
 */
import type { Model, Relation, Variable } from '../../engine/types';
import { DIMENSIONLESS, PER_YEAR, YEAR, u } from '../../engine/units';

const param = (
  id: string,
  symbol: string,
  name: string,
  gloss: string,
  domain: { min: number; max: number; step: number },
): Variable => ({
  id,
  symbol,
  name,
  unit: DIMENSIONLESS,
  kind: 'parameter',
  domain,
  introducedIn: 'ch0-kernel#clearing',
  gloss,
});

const variables: Variable[] = [
  {
    id: 'p',
    symbol: 'p',
    name: 'Price',
        unit: DIMENSIONLESS,
    kind: 'price',
    domain: { min: 0, max: 100, step: 1 },
    introducedIn: 'ch0-kernel#clearing',
    gloss:
      'The price this round. The model carries it forward the way it carries a stock, because each round starts where the last one ended.',
  },
  param('a', 'a', 'Demand intercept', 'What buyers would take at a price of zero.', { min: 10, max: 200, step: 5 }),
  param('b', 'b', 'Demand slope', 'How much less they buy when the price rises.', { min: 0.1, max: 10, step: 0.1 }),
  param('c', 'c', 'Supply intercept', 'What sellers offer at a price of zero.', { min: 0, max: 100, step: 5 }),
  param('e', 'e', 'Supply slope', 'How much more they offer when the price rises.', { min: 0.1, max: 10, step: 0.1 }),
  {
    id: 'lambda',
    symbol: '\\lambda',
    name: 'Adjustment speed',
    unit: PER_YEAR,
    kind: 'parameter',
    domain: { min: 0.01, max: 1, step: 0.01 },
    introducedIn: 'ch0-kernel#clearing',
    gloss: 'How fast the price responds to a shortage. This is where convergence lives or dies.',
  },
  {
    id: 'dt',
    symbol: '\\Delta t',
    name: 'Round length',
    unit: YEAR,
    kind: 'parameter',
    domain: { min: 0.1, max: 1, step: 0.1 },
    introducedIn: 'ch0-kernel#clearing',
    gloss: 'How long one round of price-setting takes.',
  },
  {
    id: 'D',
    symbol: 'D',
    name: 'Quantity demanded',
    unit: DIMENSIONLESS,
    kind: 'flow',
    introducedIn: 'ch0-kernel#clearing',
    gloss: 'How much buyers want at the current price.',
  },
  {
    id: 'Sq',
    symbol: 'S',
    name: 'Quantity supplied',
    unit: DIMENSIONLESS,
    kind: 'flow',
    introducedIn: 'ch0-kernel#clearing',
    gloss: 'How much sellers offer at the current price.',
  },
  {
    id: 'ED',
    symbol: 'ED',
    name: 'Excess demand',
    unit: DIMENSIONLESS,
    kind: 'flow',
    introducedIn: 'ch0-kernel#clearing',
    gloss: 'Demand minus supply. The market clears when this is zero, and only then.',
  },
];

const relations: Relation[] = [
  {
    id: 'demand',
    kind: 'behavior',
    target: 'D',
    inputs: ['a', 'b', 'p'],
    latex: 'D = a - b\\,p',
    compute: (s) => s('a') - s('b') * s('p'),
    unitCheck: () => u(DIMENSIONLESS).sub(u(DIMENSIONLESS).mul(DIMENSIONLESS)),
    because: 'Buyers want less as the price rises.',
    arguable: 'A straight line, and no income or substitutes anywhere in it.',
  },
  {
    id: 'supply',
    kind: 'behavior',
    target: 'Sq',
    inputs: ['c', 'e', 'p'],
    latex: 'S = c + e\\,p',
    compute: (s) => s('c') + s('e') * s('p'),
    unitCheck: () => u(DIMENSIONLESS).add(u(DIMENSIONLESS).mul(DIMENSIONLESS)),
    because: 'Sellers offer more as the price rises.',
    arguable: 'Also a straight line, and it ignores capacity limits entirely.',
  },
  {
    id: 'excess-demand',
    kind: 'definition',
    target: 'ED',
    inputs: ['D', 'Sq'],
    latex: 'ED = D - S',
    compute: (s) => s('D') - s('Sq'),
    unitCheck: () => u(DIMENSIONLESS).sub(DIMENSIONLESS),
    because: 'The gap between what is wanted and what is offered.',
  },
  {
    id: 'price-adjustment',
    kind: 'accumulation',
    target: 'p',
    inputs: ['p', 'lambda', 'ED', 'dt'],
    latex: 'p_{t+1} = p_t + \\lambda\\,ED_t\\,\\Delta t',
    compute: (s) => s('p') + s('lambda') * s('ED') * s('dt'),
    unitCheck: () => u(DIMENSIONLESS).add(u(PER_YEAR).mul(u(DIMENSIONLESS)).mul(u(YEAR))),
    because: 'A shortage pushes the price up; a glut pushes it down.',
    arguable:
      '"The market clears" describes where this process ends, if it ends. The speed of ' +
      'adjustment relative to how sharply quantities respond decides whether it does.',
  },
];

export const fixedPointModel: Model = {
  id: 'fixed-point',
  title: 'One price, found by groping',
  timing: 'dynamic',
  variables,
  relations,
  invariants: [],
  // Starting price chosen so that a convergent adjustment speed stays inside the
  // feasible region. From further out, even a convergent search overshoots below
  // zero on its first step, which says more about the starting point than about
  // the process.
  defaults: { p: 25, a: 100, b: 2, c: 20, e: 3, lambda: 0.1, dt: 1 },
  periods: 200,
};

/** The clearing price, straight from the algebra: p* = (a − c)/(b + e). */
export function clearingPrice(p: { a: number; b: number; c: number; e: number }): number {
  return (p.a - p.c) / (p.b + p.e);
}

/**
 * The adjustment converges when |1 − λ(b+e)Δt| < 1, i.e. λ(b+e)Δt < 2.
 * Returned as the factor itself so a test can assert the boundary.
 */
export function adjustmentFactor(p: {
  b: number;
  e: number;
  lambda: number;
  dt: number;
}): number {
  return 1 - p.lambda * (p.b + p.e) * p.dt;
}
